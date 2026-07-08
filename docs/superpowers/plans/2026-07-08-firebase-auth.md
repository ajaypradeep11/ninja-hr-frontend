# Firebase Auth (End-to-End) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real sign-in (Firebase email/password + Google) with the NestJS backend verifying every user request's Firebase token itself; demo switcher becomes HR-only impersonation.

**Architecture:** Firebase Web SDK signs users in on a new `/login` page; a server action mints an httpOnly Firebase **session cookie**. The server-only API layer forwards that cookie as `Authorization: Bearer`; a backend guard verifies it (`verifyIdToken` → `verifySessionCookie` fallback) and resolves the user by `firebaseUid`/email into the existing `ActorContext`. The internal-key path survives as the trusted server-to-server lane (health, seeds, existing e2e, preboard provisioning). Frontend deploys to Firebase App Hosting; backend to Cloud Run (config + docs only, no deploy execution).

**Tech Stack:** firebase@^11 (web), firebase-admin@^13 (both repos), Firebase Auth emulator for dev/tests, Next.js 15 middleware, NestJS 11 guards, Prisma 7.

## Global Constraints

- All Firebase credentials are `YOUR_...` placeholders in `.env.example` files — NEVER write real values, NEVER edit the user's `.env` (standing preference).
- Do not break the internal-key lane: existing backend e2e suites (10 suites / 52 tests) must pass unchanged.
- `x-actor-id` impersonation only honored when the *verified* caller is HR_ADMIN (or the caller is on the trusted internal-key lane, as today).
- Public surface stays tokenless: `@Public()` routes, `/careers/*`, candidate tracking, `/login`, `/welcome/*`.
- Frontend components must be theme-safe (semantic tokens; both light and dark).
- Backend boot fails fast if neither `FIREBASE_AUTH_EMULATOR_HOST` nor full `FIREBASE_*` credentials are configured **and** `FIREBASE_AUTH_DISABLED=1` is not set (that escape hatch keeps `docker compose up` working before the user has a Firebase project; document it).
- Commit after every task, in the repo the task touches.

## Decisions locked during planning

- Existing e2e suites keep using the internal-key lane (it remains a supported trusted path); a **new** `auth.e2e-spec.ts` exercises the Firebase lane against the emulator via `firebase emulators:exec`. This narrows the spec's "swap all suites" to YAGNI-honest scope.
- Session cookie name: `hr-session`. Impersonation cookie stays `hr-actor-id`.
- `User.email` does not exist; email lives on `Employee.email` (unique). Lookup joins through the relation.
- Invite acceptance sets the password server-side via Admin SDK `updateUser` after validating the existing onboarding case token — no Firebase oob-code flow needed.

---

### Task 1: Backend — `firebaseUid` column + firebase-admin service

**Files:**
- Modify: `ninja-hr-backend/prisma/schema.prisma` (User model, line ~164)
- Create: `ninja-hr-backend/prisma/migrations/<timestamp>_user_firebase_uid/migration.sql` (via prisma)
- Create: `ninja-hr-backend/src/platform/auth/firebase-admin.service.ts`
- Modify: `ninja-hr-backend/src/platform/database/database.module.ts` (export the service — it's the shared platform module)
- Modify: `ninja-hr-backend/.env.example`
- Test: `ninja-hr-backend/src/platform/auth/firebase-admin.service.spec.ts`

**Interfaces:**
- Produces: `FirebaseAdminService` with `verifyBearer(token: string): Promise<{ uid: string; email: string | null }>` (tries `verifyIdToken`, falls back to `verifySessionCookie`), `provisionUser(email: string): Promise<string | null>` (creates-or-gets Firebase user, returns uid; returns null when auth disabled), `createSessionCookie(idToken: string, expiresInMs: number): Promise<string>`, `revokeSessions(uid: string): Promise<void>`, and `get enabled(): boolean`.
- Produces: `User.firebaseUid: string | null` (`@unique`) in Prisma.

- [ ] **Step 1: Schema change**

```prisma
model User {
  id          String   @id @default(cuid())
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId  String   @unique
  role        Role     @default(EMPLOYEE)
  /// Firebase Auth uid — stamped on first token-authenticated request (email match).
  firebaseUid String?  @unique
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2: Create migration + regenerate client**

Run: `cd ninja-hr-backend && npx prisma migrate dev --name user_firebase_uid && npm run prisma:generate`
Expected: new migration folder; client regenerated. (If the permission classifier blocks `migrate dev`, ask the user to run it — do not work around.)

- [ ] **Step 3: Install firebase-admin**

Run: `cd ninja-hr-backend && npm install firebase-admin`

- [ ] **Step 4: Failing unit test**

```typescript
// src/platform/auth/firebase-admin.service.spec.ts
import { FirebaseAdminService } from './firebase-admin.service';

describe('FirebaseAdminService', () => {
  afterEach(() => {
    delete process.env.FIREBASE_AUTH_DISABLED;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.FIREBASE_PROJECT_ID;
  });

  it('reports disabled when FIREBASE_AUTH_DISABLED=1', () => {
    process.env.FIREBASE_AUTH_DISABLED = '1';
    const svc = new FirebaseAdminService();
    expect(svc.enabled).toBe(false);
  });

  it('is enabled with emulator host + project id', () => {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    process.env.FIREBASE_PROJECT_ID = 'demo-ninjahr';
    const svc = new FirebaseAdminService();
    expect(svc.enabled).toBe(true);
  });

  it('throws at construction when enabled but unconfigured', () => {
    expect(() => new FirebaseAdminService()).toThrow(/FIREBASE/);
  });

  it('verifyBearer rejects when disabled', async () => {
    process.env.FIREBASE_AUTH_DISABLED = '1';
    const svc = new FirebaseAdminService();
    await expect(svc.verifyBearer('x')).rejects.toThrow(/disabled/);
  });
});
```

- [ ] **Step 5: Run test — expect FAIL** (`npm test -- firebase-admin.service`)

- [ ] **Step 6: Implement service**

```typescript
// src/platform/auth/firebase-admin.service.ts
// Wraps firebase-admin so the rest of the app never imports it directly.
// Three modes:
//  - disabled (FIREBASE_AUTH_DISABLED=1): guard rejects bearer auth; internal-key lane still works
//  - emulator (FIREBASE_AUTH_EMULATOR_HOST set): no credentials needed, project id only
//  - production: FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (service account)
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface VerifiedFirebaseUser {
  uid: string;
  email: string | null;
}

@Injectable()
export class FirebaseAdminService {
  private app: admin.app.App | null = null;

  constructor() {
    if (process.env.FIREBASE_AUTH_DISABLED === '1') return;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (emulator) {
      if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required with the auth emulator');
      this.app = admin.apps.length
        ? admin.app()
        : admin.initializeApp({ projectId });
      return;
    }
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'FIREBASE_* credentials missing. Set FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY, ' +
          'or FIREBASE_AUTH_EMULATOR_HOST for local dev, or FIREBASE_AUTH_DISABLED=1 to run without auth.',
      );
    }
    this.app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  }

  get enabled(): boolean {
    return this.app !== null;
  }

  private auth(): admin.auth.Auth {
    if (!this.app) throw new UnauthorizedException('firebase auth is disabled');
    return this.app.auth();
  }

  /** Verify a bearer credential: browser ID token first, then SSR session cookie. */
  async verifyBearer(token: string): Promise<VerifiedFirebaseUser> {
    const auth = this.auth();
    try {
      const t = await auth.verifyIdToken(token, true);
      return { uid: t.uid, email: t.email ?? null };
    } catch {
      const c = await auth.verifySessionCookie(token, true).catch(() => {
        throw new UnauthorizedException('invalid or expired token');
      });
      return { uid: c.uid, email: c.email ?? null };
    }
  }

  /** Create-or-get a Firebase user for an invited employee. Null when disabled. */
  async provisionUser(email: string): Promise<string | null> {
    if (!this.app) return null;
    const auth = this.auth();
    try {
      return (await auth.getUserByEmail(email)).uid;
    } catch {
      const u = await auth.createUser({ email, emailVerified: false });
      return u.uid;
    }
  }

  async setPassword(uid: string, password: string): Promise<void> {
    await this.auth().updateUser(uid, { password });
  }

  async createSessionCookie(idToken: string, expiresInMs: number): Promise<string> {
    return this.auth().createSessionCookie(idToken, { expiresIn: expiresInMs });
  }

  async revokeSessions(uid: string): Promise<void> {
    await this.auth().revokeRefreshTokens(uid);
  }
}
```

Register in `DatabaseModule` (it is `@Global()` — check; if not, add to its `providers`+`exports` anyway since every context imports it):

```typescript
// database.module.ts — add
import { FirebaseAdminService } from '../auth/firebase-admin.service';
// providers: [..., FirebaseAdminService], exports: [..., FirebaseAdminService]
```

- [ ] **Step 7: Run test — expect PASS**; **Step 8: Commit** (`feat(auth): firebaseUid column + firebase-admin service`)

---

### Task 2: Backend — bearer verification in the outer guard

**Files:**
- Modify: `ninja-hr-backend/src/platform/auth/internal-key.guard.ts`
- Modify: `ninja-hr-backend/src/main.ts:18` (guard needs the service — instantiate via `app.get(...)`)
- Modify: `ninja-hr-backend/test/e2e-utils.ts` (mirror main.ts wiring)
- Test: `ninja-hr-backend/src/platform/auth/internal-key.guard.spec.ts`

**Interfaces:**
- Consumes: `FirebaseAdminService.verifyBearer` (Task 1).
- Produces: request gains `firebaseUser?: { uid: string; email: string | null }` and `trusted?: boolean` (internal-key lane). Guard renamed conceptually to "edge auth": `@Public()` → pass; valid `x-internal-key` → `trusted=true`; `Authorization: Bearer <jwt>` → verify → `firebaseUser`; else 401.

- [ ] **Step 1: Failing unit test**

```typescript
// internal-key.guard.spec.ts — add cases (keep existing ones green)
import { UnauthorizedException } from '@nestjs/common';
import { InternalKeyGuard } from './internal-key.guard';

function ctxWith(headers: Record<string, string>, req: Record<string, unknown> = {}) {
  Object.assign(req, { headers });
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as never;
}
const reflectorPass = { getAllAndOverride: () => false } as never;

describe('InternalKeyGuard bearer lane', () => {
  it('verifies bearer tokens and attaches firebaseUser', async () => {
    const fb = { enabled: true, verifyBearer: jest.fn().mockResolvedValue({ uid: 'u1', email: 'a@b.c' }) };
    const guard = new InternalKeyGuard(reflectorPass, fb as never);
    const req: Record<string, unknown> = {};
    await expect(guard.canActivate(ctxWith({ authorization: 'Bearer tok' }, req))).resolves.toBe(true);
    expect(req.firebaseUser).toEqual({ uid: 'u1', email: 'a@b.c' });
  });

  it('rejects garbage bearer', async () => {
    const fb = { enabled: true, verifyBearer: jest.fn().mockRejectedValue(new UnauthorizedException()) };
    const guard = new InternalKeyGuard(reflectorPass, fb as never);
    await expect(guard.canActivate(ctxWith({ authorization: 'Bearer bad' }))).rejects.toThrow(UnauthorizedException);
  });

  it('marks internal-key requests trusted', async () => {
    process.env.INTERNAL_API_KEY = 'k';
    const guard = new InternalKeyGuard(reflectorPass, { enabled: false } as never);
    const req: Record<string, unknown> = {};
    await expect(guard.canActivate(ctxWith({ 'x-internal-key': 'k' }, req))).resolves.toBe(true);
    expect(req.trusted).toBe(true);
  });
});
```

- [ ] **Step 2: Run — FAIL.** **Step 3: Implement**

```typescript
// internal-key.guard.ts — reshape canActivate (keep timing-safe compare helper)
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import { IS_PUBLIC } from './public.decorator';
import { FirebaseAdminService, VerifiedFirebaseUser } from './firebase-admin.service';

interface EdgeRequest {
  headers: Record<string, string | undefined>;
  trusted?: boolean;
  firebaseUser?: VerifiedFirebaseUser;
}

@Injectable()
export class InternalKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly firebase: FirebaseAdminService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<EdgeRequest>();

    // Lane 1 — trusted server-to-server (BFF, seeds, e2e): constant-time key check.
    const expected = process.env.INTERNAL_API_KEY;
    const provided = req.headers['x-internal-key'];
    if (typeof provided === 'string' && expected) {
      const a = Buffer.from(provided);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) {
        req.trusted = true;
        return true;
      }
    }

    // Lane 2 — end-user requests: Firebase bearer token / session cookie.
    const authz = req.headers['authorization'];
    if (authz?.startsWith('Bearer ')) {
      req.firebaseUser = await this.firebase.verifyBearer(authz.slice(7));
      return true;
    }

    throw new UnauthorizedException('missing credentials');
  }
}
```

`main.ts`: `app.useGlobalGuards(new InternalKeyGuard(app.get(Reflector), app.get(FirebaseAdminService)));` — same line in `test/e2e-utils.ts` (`app.get(FirebaseAdminService)`), and export `FIREBASE_AUTH_DISABLED=1` default in e2e-utils before app creation so suites run without the emulator: `process.env.FIREBASE_AUTH_DISABLED ??= '1';` at top.

- [ ] **Step 4: Run unit + full backend tests — PASS** (`npm test`). **Step 5: Commit** (`feat(auth): bearer lane in edge guard`)

---

### Task 3: Backend — ActorGuard resolves Firebase users + impersonation rules

**Files:**
- Modify: `ninja-hr-backend/src/platform/auth/actor-context.ts` (add `realUserId`)
- Modify: `ninja-hr-backend/src/platform/auth/actor.guard.ts`
- Test: `ninja-hr-backend/src/platform/auth/actor.guard.spec.ts`

**Interfaces:**
- Consumes: `req.firebaseUser` / `req.trusted` (Task 2); Prisma `user.firebaseUid`.
- Produces: `ActorContext.realUserId: string | null` (the verified user when impersonating; equals `userId` otherwise). Resolution rules:
  1. `req.trusted` → existing behavior verbatim (x-actor-id → user; else persona fallback).
  2. `req.firebaseUser` → find user `{ firebaseUid: uid }`; else join `employee.email === email` and stamp `firebaseUid`; else `ForbiddenException('account not provisioned')`.
  3. Firebase user is HR_ADMIN **and** `x-actor-id` present → actor becomes target user, `realUserId` stays the admin's id. Non-admin + `x-actor-id` → header ignored.

- [ ] **Step 1: Failing tests**

```typescript
// actor.guard.spec.ts
import { ForbiddenException } from '@nestjs/common';
import { ActorGuard } from './actor.guard';

const HR = { id: 'hr1', employeeId: 'e-hr', role: 'HR_ADMIN', firebaseUid: 'fb-hr',
  employee: { name: 'Sarah', department: 'HR', email: 'sarah@x.ca' } };
const EMP = { id: 'emp1', employeeId: 'e-emp', role: 'EMPLOYEE', firebaseUid: null,
  employee: { name: 'Maya', department: 'Dev', email: 'maya@x.ca' } };

function makePrisma(users: unknown[]) {
  return {
    user: {
      findUnique: jest.fn(async ({ where }: never) =>
        users.find((u: never) =>
          (where.firebaseUid && u.firebaseUid === where.firebaseUid) || (where.id && u.id === where.id)) ?? null),
      findFirst: jest.fn(async ({ where }: never) =>
        users.find((u: never) => u.employee.email === where.employee.email) ?? null),
      update: jest.fn(async ({ where, data }: never) => {
        const u = users.find((x: never) => x.id === where.id) as never;
        Object.assign(u, data);
        return u;
      }),
    },
  };
}
const ctxFor = (req: Record<string, unknown>) =>
  ({ switchToHttp: () => ({ getRequest: () => req }) }) as never;

describe('ActorGuard firebase lane', () => {
  it('resolves by firebaseUid', async () => {
    const req: Record<string, unknown> = { headers: {}, firebaseUser: { uid: 'fb-hr', email: 'sarah@x.ca' } };
    await new ActorGuard(makePrisma([HR]) as never).canActivate(ctxFor(req));
    expect((req.actor as never)['userId']).toBe('hr1');
    expect((req.actor as never)['realUserId']).toBe('hr1');
  });

  it('falls back to email match and stamps the uid', async () => {
    const prisma = makePrisma([{ ...EMP }]);
    const req: Record<string, unknown> = { headers: {}, firebaseUser: { uid: 'fb-new', email: 'maya@x.ca' } };
    await new ActorGuard(prisma as never).canActivate(ctxFor(req));
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { firebaseUid: 'fb-new' } }));
    expect((req.actor as never)['userId']).toBe('emp1');
  });

  it('403s an unprovisioned firebase user', async () => {
    const req = { headers: {}, firebaseUser: { uid: 'ghost', email: 'ghost@x.ca' } };
    await expect(new ActorGuard(makePrisma([HR]) as never).canActivate(ctxFor(req)))
      .rejects.toThrow(ForbiddenException);
  });

  it('lets HR impersonate via x-actor-id, keeping realUserId', async () => {
    const req: Record<string, unknown> = {
      headers: { 'x-actor-id': 'emp1' }, firebaseUser: { uid: 'fb-hr', email: 'sarah@x.ca' } };
    await new ActorGuard(makePrisma([HR, EMP]) as never).canActivate(ctxFor(req));
    expect((req.actor as never)['userId']).toBe('emp1');
    expect((req.actor as never)['realUserId']).toBe('hr1');
  });

  it('ignores x-actor-id for non-admin firebase users', async () => {
    const req: Record<string, unknown> = {
      headers: { 'x-actor-id': 'hr1' }, firebaseUser: { uid: 'fb-new', email: 'maya@x.ca' } };
    await new ActorGuard(makePrisma([HR, { ...EMP }]) as never).canActivate(ctxFor(req));
    expect((req.actor as never)['userId']).toBe('emp1');
  });
});
```

- [ ] **Step 2: Run — FAIL.** **Step 3: Implement**

```typescript
// actor.guard.ts — replace canActivate body; keep trusted-lane branch identical to today.
async canActivate(ctx: ExecutionContext): Promise<boolean> {
  const req = ctx.switchToHttp().getRequest<ActorRequest>();

  if (req.firebaseUser) {
    const { uid, email } = req.firebaseUser;
    let user = await this.prisma.user.findUnique({ where: { firebaseUid: uid }, include: { employee: true } });
    if (!user && email) {
      user = await this.prisma.user.findFirst({ where: { employee: { email } }, include: { employee: true } });
      if (user) {
        await this.prisma.user.update({ where: { id: user.id }, data: { firebaseUid: uid } });
      }
    }
    if (!user) throw new ForbiddenException('account not provisioned — contact HR');

    let acting = user;
    const targetId = req.headers['x-actor-id'];
    if (user.role === 'HR_ADMIN' && typeof targetId === 'string' && targetId.length > 0 && targetId !== user.id) {
      const target = await this.prisma.user.findUnique({ where: { id: targetId }, include: { employee: true } });
      if (!target) throw new UnauthorizedException('unknown impersonation target');
      acting = target;
    }
    req.actor = {
      userId: acting.id,
      employeeId: acting.employeeId,
      employeeName: acting.employee.name,
      department: acting.employee.department,
      role: acting.role as ActorRole,
      realUserId: user.id,
    };
    return true;
  }

  // Trusted lane (internal key) — unchanged legacy behavior, realUserId mirrors userId.
  /* existing x-actor-id block, then persona fallback, each setting realUserId: userId */
}
```

`actor-context.ts`: add `realUserId: string | null;` to the interface and to the fallback object in `ActorCtx` (`realUserId: null`). The `ActorRequest` interface gains `firebaseUser?: { uid: string; email: string | null }`. Import `ForbiddenException`.

- [ ] **Step 4: `npm test` (all suites) — PASS.** **Step 5: Commit** (`feat(auth): actor resolution for firebase users + HR-only impersonation`)

---

### Task 4: Backend — `GET /identity/me` + invite provisioning hook

**Files:**
- Modify: `ninja-hr-backend/src/contexts/identity/interface/identity.controller.ts` (add `me` route; check exact filename with `ls src/contexts/identity/interface/`)
- Modify: `ninja-hr-backend/src/contexts/onboarding/application/...` create-case command handler (the one behind `POST /onboarding/cases`, `onboarding.controller.ts:42`) — call `FirebaseAdminService.provisionUser(workEmail)` after case creation; non-fatal on failure (log warning)
- Test: `ninja-hr-backend/test/auth.e2e-spec.ts` (created fully in Task 5; here add the `me` unit-level spec to identity if the context has one, else rely on Task 5)

**Interfaces:**
- Produces: `GET /api/v1/identity/me` → `200 { userId, employeeId, name, title, department, role, roleCode, realUserId }` for any authenticated caller (both lanes). Shape mirrors `identity/users` items + `realUserId`.
- Consumes: `ActorCtx` decorator, `GetUserByIdQuery` (exists at `src/contexts/identity/application/queries/get-user-by-id.query.ts`).

- [ ] **Step 1: Add route**

```typescript
// identity.controller.ts — add
@Get('me')
async me(@ActorCtx() actor: ActorContext) {
  // Trusted-lane persona fallback has no user id; report the coarse role.
  if (!actor.userId) {
    return { userId: null, employeeId: null, name: null, title: null,
      department: null, role: actor.role, roleCode: actor.role, realUserId: null };
  }
  const user = await this.queryBus.execute(new GetUserByIdQuery(actor.userId));
  return { ...user, realUserId: actor.realUserId };
}
```

(Match the controller's existing constructor/query-bus idioms; reuse the mapper the `users` route uses so the shape is identical.)

- [ ] **Step 2: Provisioning hook** — in the create-case handler, after persisting the case:

```typescript
// inside the existing handler class; inject FirebaseAdminService in the constructor
const uid = await this.firebase.provisionUser(dto.workEmail).catch((e) => {
  this.logger.warn(`firebase provisioning failed for ${dto.workEmail}: ${e.message}`);
  return null;
});
```

(Find the exact DTO field for work email in `onboarding.dto.ts` — it's the email the invite is sent to. If only `personalEmail` exists at preboard time, provision that and note it in the code comment.)

- [ ] **Step 3: `npm test` + `npm run test:e2e` — all green (provisioning is a no-op with `FIREBASE_AUTH_DISABLED=1`).** **Step 4: Commit** (`feat(identity): /me endpoint + invite-time firebase provisioning`)

---

### Task 5: Backend — Firebase-lane e2e against the emulator

**Files:**
- Create: `ninja-hr-backend/firebase.json`
- Create: `ninja-hr-backend/test/auth.e2e-spec.ts`
- Modify: `ninja-hr-backend/test/e2e-utils.ts` (emulator token helper)
- Modify: `ninja-hr-backend/package.json` (script)

**Interfaces:**
- Produces: `mintEmulatorToken(email: string): Promise<string>` in e2e-utils — creates/signs-in an emulator user via the Auth emulator REST API (`http://$FIREBASE_AUTH_EMULATOR_HOST/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`) and returns the `idToken`.
- Produces: npm script `test:e2e:auth`: `firebase emulators:exec --only auth --project demo-ninjahr \"FIREBASE_AUTH_DISABLED= FIREBASE_PROJECT_ID=demo-ninjahr jest --config ./test/jest-e2e.json --runInBand --testPathPattern auth\"`.

- [ ] **Step 1: `firebase.json`**

```json
{ "emulators": { "auth": { "port": 9099 }, "singleProject": true } }
```

- [ ] **Step 2: Token helper in e2e-utils**

```typescript
export async function mintEmulatorToken(email: string, password = 'demo-password'): Promise<string> {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host) throw new Error('auth e2e requires the Firebase auth emulator (npm run test:e2e:auth)');
  const base = `http://${host}/identitytoolkit.googleapis.com/v1`;
  const signUp = await fetch(`${base}/accounts:signUp?key=fake`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (signUp.ok) return (await signUp.json() as { idToken: string }).idToken;
  const signIn = await fetch(`${base}/accounts:signInWithPassword?key=fake`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!signIn.ok) throw new Error(`emulator sign-in failed: ${await signIn.text()}`);
  return (await signIn.json() as { idToken: string }).idToken;
}
```

- [ ] **Step 3: The spec**

```typescript
// test/auth.e2e-spec.ts — runs ONLY under test:e2e:auth (emulator env present).
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createE2eApp, fetchSeededUsers, mintEmulatorToken, KEY, SeededUsers } from './e2e-utils';

describe('Firebase auth lane (e2e)', () => {
  let app: INestApplication;
  let seeded: SeededUsers;
  let hrEmail: string;

  beforeAll(async () => {
    app = await createE2eApp();
    seeded = await fetchSeededUsers(app);
    // Seeded HR user's employee email — fetch via identity/users' employee join
    // (identity/users returns name/roleCode; resolve email through people endpoint):
    const res = await request(app.getHttpServer())
      .get('/api/v1/people/employees')
      .set('x-internal-key', KEY).set('x-actor-persona', 'admin').expect(200);
    hrEmail = res.body.find((e: { id: string }) => e.id === seeded.hr.employeeId).email;
  });
  afterAll(async () => app.close());

  it('401s with no credentials', () =>
    request(app.getHttpServer()).get('/api/v1/identity/me').expect(401));

  it('401s with a garbage bearer', () =>
    request(app.getHttpServer()).get('/api/v1/identity/me')
      .set('authorization', 'Bearer nonsense').expect(401));

  it('403s an authenticated-but-unprovisioned user', async () => {
    const token = await mintEmulatorToken('stranger@nowhere.test');
    await request(app.getHttpServer()).get('/api/v1/identity/me')
      .set('authorization', `Bearer ${token}`).expect(403);
  });

  it('resolves a provisioned user by email and stamps firebaseUid', async () => {
    const token = await mintEmulatorToken(hrEmail);
    const res = await request(app.getHttpServer()).get('/api/v1/identity/me')
      .set('authorization', `Bearer ${token}`).expect(200);
    expect(res.body.userId).toBe(seeded.hr.id);
    expect(res.body.roleCode ?? res.body.role).toBe('HR_ADMIN');
  });

  it('HR impersonates an employee; realUserId is preserved', async () => {
    const token = await mintEmulatorToken(hrEmail);
    const res = await request(app.getHttpServer()).get('/api/v1/identity/me')
      .set('authorization', `Bearer ${token}`)
      .set('x-actor-id', seeded.employee.id).expect(200);
    expect(res.body.userId).toBe(seeded.employee.id);
    expect(res.body.realUserId).toBe(seeded.hr.id);
  });
});
```

Note: `test:e2e` (default) must exclude this file — add `"testPathIgnorePatterns": ["auth.e2e-spec"]` to `test/jest-e2e.json` and have `test:e2e:auth` override with `--testPathPattern auth --testPathIgnorePatterns ''`.

- [ ] **Step 4: Install firebase-tools as devDependency** (`npm i -D firebase-tools`) — needed for `emulators:exec`.
- [ ] **Step 5: Run `npm run test:e2e` (still green, auth spec skipped) and `npm run test:e2e:auth` (needs DB up + seeded; 5 tests green).**
- [ ] **Step 6: Commit** (`test(auth): firebase-lane e2e via auth emulator`)

---

### Task 6: Frontend — Firebase SDKs, env placeholders, session actions

**Files:**
- Create: `ninja-hr-frontend/lib/firebase/client.ts`
- Create: `ninja-hr-frontend/lib/firebase/admin.ts`
- Create: `ninja-hr-frontend/app/actions/auth.ts`
- Create: `ninja-hr-frontend/.env.example`
- Modify: `ninja-hr-frontend/package.json` (deps)

**Interfaces:**
- Produces: `firebaseClientAuth()` (lazy web-SDK Auth, emulator-aware); `adminAuth()` (lazy admin Auth, emulator-aware); server actions `createSession(idToken: string): Promise<void>` (verifies, mints 5-day session cookie `hr-session`, httpOnly+lax+secure-in-prod), `signOutSession(): Promise<void>` (revokes + clears both `hr-session` and `hr-actor-id`); `SESSION_COOKIE = 'hr-session'` exported from `app/actions/auth.ts`.

- [ ] **Step 1: `npm install firebase firebase-admin`** (frontend repo)

- [ ] **Step 2: Client init**

```typescript
// lib/firebase/client.ts — safe to import from client components only.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cached: Auth | null = null;
export function firebaseClientAuth(): Auth {
  if (cached) return cached;
  const app = getApps()[0] ?? initializeApp(config);
  cached = getAuth(app);
  const emu = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emu) connectAuthEmulator(cached, `http://${emu}`, { disableWarnings: true });
  return cached;
}
```

- [ ] **Step 3: Admin init**

```typescript
// lib/firebase/admin.ts
import 'server-only';
import * as admin from 'firebase-admin';

export function adminAuth(): admin.auth.Auth {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      admin.initializeApp({ projectId });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }
  return admin.auth();
}
```

- [ ] **Step 4: Session actions**

```typescript
// app/actions/auth.ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '@/lib/firebase/admin';
import { ACTOR_COOKIE } from '@/lib/actor';

export const SESSION_COOKIE = 'hr-session';
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export async function createSession(idToken: string): Promise<void> {
  const auth = adminAuth();
  await auth.verifyIdToken(idToken, true); // reject forged/expired before minting
  const session = await auth.createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
  const store = await cookies();
  store.set(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: FIVE_DAYS_MS / 1000,
  });
}

export async function signOutSession(): Promise<void> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  if (session) {
    const decoded = await adminAuth().verifySessionCookie(session).catch(() => null);
    if (decoded) await adminAuth().revokeRefreshTokens(decoded.uid);
  }
  store.delete(SESSION_COOKIE);
  store.delete(ACTOR_COOKIE);
  redirect('/login');
}
```

- [ ] **Step 5: `.env.example` (frontend)**

```bash
# ninja-hr-frontend/.env.example — copy to .env and fill in. NEVER commit real values.
NINJA_HR_API_URL=http://localhost:4000/api/v1
INTERNAL_API_KEY=dev-internal-key

# Firebase web app config (Console → Project settings → Your apps → Web)
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
# Local dev with the emulator (leave set for docker/dev; unset in production)
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# Service account (Console → Project settings → Service accounts → Generate key)
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@YOUR_PROJECT_ID.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

Backend `.env.example` gains the `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY/FIREBASE_AUTH_EMULATOR_HOST/FIREBASE_AUTH_DISABLED` block with the same placeholders.

- [ ] **Step 6: `npx tsc --noEmit` clean. Commit** (`feat(auth): firebase SDK init + session actions + env placeholders`)

---

### Task 7: Frontend — `/login` page

**Files:**
- Create: `ninja-hr-frontend/app/login/page.tsx` (server component shell)
- Create: `ninja-hr-frontend/app/login/login-form.tsx` (client component)

**Interfaces:**
- Consumes: `firebaseClientAuth()`, `createSession` (Task 6).
- Produces: `/login` route — centered card, brand logo, email/password form, "Continue with Google" button, error banner; on success `router.replace("/admin")` (server middleware later re-routes non-admins; `/admin/layout.tsx` already redirects non-HR to `/employee`).

- [ ] **Step 1: Build the page**

```tsx
// app/login/page.tsx
import { Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata = { title: `Sign in · ${BRAND.name}` };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold text-ink">{BRAND.name}</span>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-ink-muted">
          Accounts are created by your HR team. No account? Ask your administrator.
        </p>
      </div>
    </div>
  );
}
```

```tsx
// app/login/login-form.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { firebaseClientAuth } from "@/lib/firebase/client";
import { createSession } from "@/app/actions/auth";
import { Button } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function finish(idToken: string) {
    await createSession(idToken);
    router.replace("/admin");
    router.refresh();
  }

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(
        code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")
          ? "Email or password is incorrect."
          : "Sign-in failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void withBusy(async () => {
            const cred = await signInWithEmailAndPassword(firebaseClientAuth(), email, password);
            await finish(await cred.user.getIdToken());
          });
        }}
      >
        <div>
          <label className="field-label" htmlFor="email">Work email</label>
          <input id="email" type="email" required className="field-input" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <input id="password" type="password" required className="field-input" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-300" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-ink-faint">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <Button
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={() =>
          void withBusy(async () => {
            const cred = await signInWithPopup(firebaseClientAuth(), new GoogleAuthProvider());
            await finish(await cred.user.getIdToken());
          })
        }
      >
        Continue with Google
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Manual check** — with emulator running (`npx firebase emulators:start --only auth --project demo-ninjahr` in frontend repo; add matching `firebase.json` `{ "emulators": { "auth": { "port": 9099 } } }`), visit `/login`, sign in with an emulator-seeded user (Task 10 seeds them; for now create one via the emulator UI/REST). Verify `hr-session` cookie set.
- [ ] **Step 3: Commit** (`feat(auth): login page (email/password + Google)`)

---

### Task 8: Frontend — middleware, bearer-forwarding API client, getActor rewrite

**Files:**
- Create: `ninja-hr-frontend/middleware.ts`
- Modify: `ninja-hr-frontend/lib/api/client.ts`
- Modify: `ninja-hr-frontend/lib/actor.ts`
- Modify: `ninja-hr-frontend/lib/queries.ts:9-21` (the `api()` helper) and `app/actions/*` call sites that build clients

**Interfaces:**
- Produces: `middleware.ts` — no `hr-session` cookie → redirect `/login` for `/admin/:path*` and `/employee/:path*` (matcher-scoped; everything else untouched).
- Produces: `apiClient(persona, actorId, bearer?)` — when `bearer` is set, sends `Authorization: Bearer <bearer>` and **omits** `x-internal-key`; `authedApi(persona?, actorId?)` async variant that reads the session cookie itself and falls back to the internal-key lane when absent (`FIREBASE_AUTH_DISABLED=1` dev mode keeps working).
- Produces: `getActor()` — session cookie present → `GET /identity/me` with bearer (+ `x-actor-id` impersonation header when `hr-actor-id` cookie set); absent → legacy seeded-HR fallback ONLY when `FIREBASE_AUTH_DISABLED=1`, else `redirect('/login')`.

- [ ] **Step 1: middleware**

```typescript
// middleware.ts (repo root)
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Presence check only — cryptographic verification happens server-side
  // (backend verifySessionCookie on every API call). Edge runtime can't
  // run firebase-admin.
  if (process.env.FIREBASE_AUTH_DISABLED === "1") return NextResponse.next();
  if (req.cookies.get("hr-session")?.value) return NextResponse.next();
  const login = new URL("/login", req.url);
  login.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*", "/employee/:path*"] };
```

- [ ] **Step 2: client.ts** — extend signature:

```typescript
export function apiClient(persona: Persona = 'admin', actorId?: string, bearer?: string) {
  const rawBase = process.env.NINJA_HR_API_URL ?? '';
  const baseUrl = rawBase.replace(/\/api\/v1\/?$/, '');
  return createClient<paths>({
    baseUrl,
    headers: {
      ...(bearer
        ? { authorization: `Bearer ${bearer}` }
        : { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' }),
      'x-actor-persona': persona,
      ...(actorId ? { 'x-actor-id': actorId } : {}),
    },
    cache: 'no-store',
  });
}

/** Session-aware client: bearer when signed in, internal-key lane otherwise (dev). */
export async function authedApi(persona: Persona = 'admin', actorId?: string) {
  const { cookies } = await import('next/headers');
  const session = (await cookies()).get('hr-session')?.value;
  return apiClient(persona, actorId, session);
}
```

- [ ] **Step 3: `lib/queries.ts`** — swap its `api()` helper to `await authedApi(...)` (make the helper async; the exported query functions already `await` through `unwrap`, so only the helper body changes plus `await api()` at call sites in that file). Same one-line change in `lib/actor.ts` `getUsers` and any `app/actions/*.ts` that call `apiClient(...)` directly (grep `apiClient(` — update each to `await authedApi(`) **except** `app/actions/auth.ts` and tokenless public flows (careers submits use the internal-key lane by design — leave any `apiClient('admin')` in public candidate actions as-is, they are BFF-trusted).

- [ ] **Step 4: `getActor()` rewrite in `lib/actor.ts`**

```typescript
export const getActor = cache(async (): Promise<ActorUser> => {
  const store = await cookies();
  const session = store.get('hr-session')?.value;
  const impersonated = store.get(ACTOR_COOKIE)?.value;

  if (session) {
    const client = apiClient('admin', impersonated, session);
    const { data, error, response } = await client.GET('/api/v1/identity/me');
    if (error !== undefined || !response.ok) {
      if (response.status === 401) redirect('/login');
      if (response.status === 403) redirect('/login?error=unprovisioned');
      throw new Error(`identity/me failed: ${response.status}`);
    }
    return data as ActorUser; // /me returns the users-route shape + realUserId
  }

  if (process.env.FIREBASE_AUTH_DISABLED === '1') {
    /* existing seeded-HR fallback block, unchanged */
  }
  redirect('/login');
});
```

(Import `redirect` from `next/navigation`. Note: `/api/v1/identity/me` must be added to the OpenAPI types — run `npm run api:generate` with the backend up, and commit the regenerated `lib/api/generated/openapi.d.ts`.)

- [ ] **Step 5: `npm run build` clean; with emulator + backend up, sign in and load `/admin` — dashboard renders as the signed-in user. Commit** (`feat(auth): route protection + bearer-forwarding API layer`)

---

### Task 9: Frontend — impersonation switcher, sign-out, unprovisioned screen

**Files:**
- Modify: `ninja-hr-frontend/components/layout/user-switcher.tsx`
- Modify: `ninja-hr-frontend/components/layout/topbar.tsx`
- Modify: `ninja-hr-frontend/app/actions/identity.ts` (add `clearActor`)
- Modify: `ninja-hr-frontend/app/admin/layout.tsx` + `app/employee/layout.tsx` (pass real role)
- Modify: `ninja-hr-frontend/app/login/page.tsx` (unprovisioned error banner via `searchParams`)

**Interfaces:**
- Consumes: `getActor()` now returns `realUserId`; `getUsers()` unchanged; `signOutSession` (Task 6).
- Produces: switcher rendered only when the **real** user is HR_ADMIN (layouts compute `realIsAdmin = users.find(u => u.id === actor.realUserId)?.roleCode === 'HR_ADMIN'` — with `realUserId` added to the `ActorUser`/`SwitcherUser` types); "Viewing as {name} — Stop" pill when `actor.realUserId !== actor.userId` calling new server action `clearActor()` (deletes `hr-actor-id`, revalidates layout); "Sign out" item in the topbar avatar menu calling `signOutSession()`.

- [ ] **Step 1:** `clearActor` server action:

```typescript
export async function clearActor(): Promise<void> {
  (await cookies()).delete(ACTOR_COOKIE);
  revalidatePath("/", "layout");
}
```

- [ ] **Step 2:** Topbar: render `<UserSwitcher>` only if `realIsAdmin` prop true; add impersonation pill next to it when impersonating; wrap the `Avatar` in a small dropdown with one item, "Sign out" → `signOutSession()`. Follow the switcher's existing open/close pattern (`mousedown` outside listener).
- [ ] **Step 3:** `/login` reads `searchParams.error === 'unprovisioned'` → amber banner: "Your account isn't linked to an employee profile yet — contact HR."
- [ ] **Step 4:** Manual pass with emulator: sign in as HR → switcher visible, impersonate employee → pill shows, stop → back to self; sign in as employee → no switcher; sign out → back at `/login`. `npm run build` clean. Commit (`feat(auth): impersonation switcher + sign-out`)

---

### Task 10: Emulator dev-loop: seeding, docker-compose, invite acceptance page

**Files:**
- Create: `ninja-hr-backend/scripts/seed-auth-emulator.ts` + npm script `seed:auth`
- Modify: root `docker-compose.yml` (firebase emulator service + env wiring)
- Create: `ninja-hr-frontend/app/welcome/[token]/page.tsx` + `welcome-form.tsx` + server action `activateAccount` in `app/actions/auth.ts`
- Modify: `ninja-hr-frontend/app/admin/onboarding/preboard/page.tsx:44` (invite link → `/welcome/${created.token}`)

**Interfaces:**
- Produces: `npm run seed:auth` (backend) — reads seeded users' employee emails via Prisma and signs each up in the emulator with password `demo-password` (idempotent: signUp 400 → ignore).
- Produces: compose service `firebase-auth` (image `node:20-alpine`, `npx firebase-tools emulators:start --only auth --project demo-ninjahr`, port 9099) + backend env `FIREBASE_AUTH_EMULATOR_HOST=firebase-auth:9099`, `FIREBASE_PROJECT_ID=demo-ninjahr`, frontend env both emulator vars; compose seed command gains `&& npx tsx scripts/seed-auth-emulator.ts`.
- Produces: `activateAccount(caseToken: string, password: string): Promise<{ email: string }>` — server action: validates the case via existing backend `GET /onboarding/cases/by-token/{token}` (internal-key lane), `adminAuth().getUserByEmail(workEmail)` (provisioned at invite time; `createUser` fallback), `updateUser(uid, { password })`, returns the email; client form then `signInWithEmailAndPassword` + `createSession` and routes to `/employee/onboarding?case=<token>`.
- Produces: `/welcome/[token]` — themed card: "Welcome to {BRAND.name}, set your password" with password + confirm fields, or "Continue with Google" (just signs in; email must match).

- [ ] **Step 1:** seed script (backend):

```typescript
// scripts/seed-auth-emulator.ts
import 'dotenv/config';
import { PrismaClient } from '../src/platform/database/generated/prisma';

const prisma = new PrismaClient();
const HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? 'localhost:9099';

async function main() {
  const users = await prisma.user.findMany({ include: { employee: true } });
  for (const u of users) {
    const res = await fetch(
      `http://${HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: u.employee.email, password: 'demo-password', returnSecureToken: false }),
      },
    );
    console.log(`${u.employee.email}: ${res.ok ? 'created' : 'exists'}`);
  }
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2:** compose service + env (backend/frontend blocks), documented in root compose comments; README quick-start updated in both repos ("demo login: any seeded work email / demo-password").
- [ ] **Step 3:** welcome page + `activateAccount` (code mirrors login-form patterns; validate password ≥ 8 chars client- and server-side; invalid/expired case token → error state with "ask HR to re-send").
- [ ] **Step 4:** e2e-manual: `docker compose up --build` → sign in at :3000 with `demo-password` → works. Commit both repos (`feat(auth): emulator dev loop + invite acceptance`)

---

### Task 11: Playwright e2e updates + deployment config

**Files:**
- Modify: `ninja-hr-frontend/playwright.config.ts` (webServer env + emulator boot)
- Create: `ninja-hr-frontend/e2e/auth.setup.ts` (login → storage state) and wire `storageState` into config
- Create: `ninja-hr-frontend/e2e/auth.spec.ts`
- Create: `ninja-hr-frontend/apphosting.yaml`
- Modify: `ninja-hr-frontend/Readme.md`, `ninja-hr-backend/Readme.md` (deployment section)

**Interfaces:**
- Consumes: emulator + seeded auth users (Task 10); login page (Task 7).
- Produces: all existing Playwright specs run signed-in via shared `storageState`; new spec asserts: unauthenticated `/admin` redirects to `/login`; login succeeds; impersonation pill round-trip; sign-out lands on `/login`; `/careers` loads with no session.

- [ ] **Step 1:** `auth.setup.ts` project (Playwright "setup" project pattern):

```typescript
import { test as setup, expect } from "@playwright/test";

setup("authenticate as HR", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(process.env.E2E_HR_EMAIL ?? "sarah.mitchell@ninjahr.test");
  await page.getByLabel("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin/);
  await page.context().storageState({ path: "e2e/.auth/hr.json" });
});
```

(Resolve the real seeded HR email once in the setup via the backend API rather than hardcoding — `GET /api/v1/people/employees` with the internal key, pick the HR admin's email; keep the env-var override.)
Config: add `projects: [{ name: 'setup', testMatch: /auth\.setup\.ts/ }, { name: 'chromium', use: { storageState: 'e2e/.auth/hr.json' }, dependencies: ['setup'] }]`; webServer commands get `FIREBASE_AUTH_EMULATOR_HOST` env and a third webServer entry starting the auth emulator (`npx firebase emulators:start --only auth --project demo-ninjahr`, port 9099, `reuseExistingServer: true`) plus `npm run seed:auth --prefix ../ninja-hr-backend` in the backend webServer command chain.

- [ ] **Step 2:** `auth.spec.ts` — the five assertions above, using `test.use({ storageState: { cookies: [], origins: [] } })` for the signed-out cases.
- [ ] **Step 3:** `apphosting.yaml`:

```yaml
# Firebase App Hosting config (frontend). Set real values in the console:
# App Hosting → Settings → Environment, or via `firebase apphosting:secrets:set`.
runConfig:
  cpu: 1
  memoryMiB: 512
env:
  - variable: NINJA_HR_API_URL
    value: https://YOUR_CLOUD_RUN_BACKEND_URL/api/v1
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    value: YOUR_FIREBASE_API_KEY
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: YOUR_PROJECT.firebaseapp.com
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: YOUR_PROJECT_ID
  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    value: YOUR_FIREBASE_APP_ID
  - variable: FIREBASE_PROJECT_ID
    value: YOUR_PROJECT_ID
  - variable: INTERNAL_API_KEY
    secret: internal-api-key
  - variable: FIREBASE_CLIENT_EMAIL
    secret: firebase-client-email
  - variable: FIREBASE_PRIVATE_KEY
    secret: firebase-private-key
```

README deployment section (both repos): frontend `firebase deploy` via App Hosting GitHub integration; backend `gcloud run deploy ninja-hr-api --source ninja-hr-backend --set-env-vars FIREBASE_PROJECT_ID=...` + Cloud SQL Postgres note + "App Hosting cannot host NestJS; Cloud Run is the pairing."

- [ ] **Step 4:** `npm run test:e2e` (frontend) — all specs green including new auth spec. Commit (`test(auth): playwright auth flow + App Hosting config`)

---

### Task 12: Full verification sweep

- [ ] Backend: `npm test` (unit, incl. new guard specs) → all green.
- [ ] Backend: `npm run test:e2e` (internal-key lane, 10 suites) → all green.
- [ ] Backend: `npm run test:e2e:auth` (emulator lane) → green.
- [ ] Frontend: `npm run build` + `npx tsc --noEmit` → clean.
- [ ] Frontend: `npm run test:e2e` → green.
- [ ] Manual: `docker compose up --build` → login with `demo-password`, impersonate, sign out, `/careers` public.
- [ ] Grep check: `grep -rn "AIza\|BEGIN PRIVATE KEY" --include='*.ts*' --include='*.yaml' --include='*.example'` returns only `YOUR_...` placeholders.
- [ ] Commit any stragglers; update `memory_about_project.md` + Obsidian mirror (sync-project-memory skill).
