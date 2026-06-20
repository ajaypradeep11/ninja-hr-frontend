"use server";

import { prisma } from "@/lib/db";
import type { ProvinceCode } from "@/lib/compliance";
import {
  type OnboardingCase,
  type ChecklistTask,
  type FormFlags,
  type TaskStatus,
  generateChecklist,
  generateSubmittedDocuments,
  nextStatus,
  PRIVACY_POLICY_VERSION,
} from "@/lib/onboarding";
import {
  caseStatusFromDb,
  caseStatusToDb,
  ownerFromDb,
  ownerToDb,
  taskStatusFromDb,
  taskStatusToDb,
  accessFromDb,
  accessToDb,
  docStatusFromDb,
  docStatusToDb,
} from "@/lib/db-map";

const INCLUDE = {
  checklist: { orderBy: { order: "asc" } },
  documents: { orderBy: { name: "asc" } },
  consent: { orderBy: { timestamp: "asc" } },
  auditLog: { orderBy: { at: "asc" } },
} as const;

const d = (date: Date | null | undefined, len = 10) =>
  date ? date.toISOString().slice(0, len) : undefined;

/** Map a Prisma case (with relations) to the app's OnboardingCase shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toApp(row: any): OnboardingCase {
  return {
    id: row.id,
    token: row.token,
    name: row.name,
    title: row.title,
    department: row.department,
    province: row.province as ProvinceCode,
    startDate: d(row.startDate)!,
    personalEmail: row.personalEmail,
    status: caseStatusFromDb[row.status],
    createdAt: d(row.createdAt)!,
    forms: row.forms as FormFlags,
    policiesAttached: row.policiesAttached,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checklist: row.checklist.map((t: any) => ({
      id: t.id,
      label: t.label,
      owner: ownerFromDb[t.owner],
      status: taskStatusFromDb[t.status],
      blocking: t.blocking,
      dataAccess: accessFromDb[t.dataAccess],
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    documents: row.documents.map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      folder: doc.folder,
      status: docStatusFromDb[doc.status],
      signedAt: d(doc.signedAt),
      signedBy: doc.signedBy ?? undefined,
      ip: doc.ip ?? undefined,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    consent: row.consent.map((e: any) => ({
      policy: e.policy,
      version: e.version,
      timestamp: d(e.timestamp, 19)!,
      ip: e.ip,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auditLog: row.auditLog.map((a: any) => ({ at: d(a.at, 19)!, event: a.event })),
  };
}

async function loadById(id: string) {
  const row = await prisma.onboardingCase.findUnique({ where: { id }, include: INCLUDE });
  return row ? toApp(row) : null;
}
async function loadByToken(token: string) {
  const row = await prisma.onboardingCase.findUnique({ where: { token }, include: INCLUDE });
  return row ? toApp(row) : null;
}

/** Recompute + persist status after a mutation; returns the final app case. */
async function settle(id: string): Promise<OnboardingCase | null> {
  const app = await loadById(id);
  if (!app) return null;
  const ns = nextStatus(app);
  if (ns !== app.status) {
    await prisma.onboardingCase.update({
      where: { id },
      data: { status: caseStatusToDb[ns] as never },
    });
    app.status = ns;
  }
  return app;
}

/* ----------------------------- Queries ----------------------------- */

export async function listCases(): Promise<OnboardingCase[]> {
  const rows = await prisma.onboardingCase.findMany({
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toApp);
}

/* ----------------------------- Mutations ---------------------------- */

export interface NewCaseInput {
  name: string;
  title?: string;
  department?: string;
  province: ProvinceCode;
  startDate: string;
  personalEmail: string;
}

export async function createCase(input: NewCaseInput): Promise<OnboardingCase> {
  const stamp = Date.now();
  const dept = input.department || "Operations";
  const checklist = generateChecklist(dept, input.province);
  const row = await prisma.onboardingCase.create({
    data: {
      token: `inv_${stamp.toString(36)}`,
      name: input.name,
      title: input.title || "New Hire",
      department: dept,
      province: input.province as never,
      startDate: new Date(input.startDate),
      personalEmail: input.personalEmail,
      status: "INVITED",
      forms: { personal: false, td1: false, directDeposit: false, benefits: false, handbook: false },
      policiesAttached: [],
      checklist: {
        create: checklist.map((t, i) => ({
          label: t.label,
          owner: ownerToDb[t.owner] as never,
          status: "PENDING",
          blocking: t.blocking,
          dataAccess: accessToDb[t.dataAccess] as never,
          order: i,
        })),
      },
      auditLog: {
        create: [
          { event: `Profile created; invite emailed to ${input.personalEmail}` },
          { event: "Agent generated department onboarding checklist" },
        ],
      },
    },
    include: INCLUDE,
  });
  return toApp(row);
}

export async function markForm(token: string, key: keyof FormFlags): Promise<OnboardingCase | null> {
  const c = await loadByToken(token);
  if (!c) return null;
  const forms = { ...c.forms, [key]: true };
  await prisma.onboardingCase.update({ where: { token }, data: { forms } });
  return settle(c.id);
}

export async function addConsent(token: string, policy: string): Promise<OnboardingCase | null> {
  const c = await loadByToken(token);
  if (!c) return null;
  await prisma.consentEntry.create({
    data: { caseId: c.id, policy, version: PRIVACY_POLICY_VERSION, ip: "203.0.113.42" },
  });
  return settle(c.id);
}

export async function finalizeSubmission(token: string): Promise<OnboardingCase | null> {
  const c = await loadByToken(token);
  if (!c) return null;
  const docs = generateSubmittedDocuments(c);
  await prisma.$transaction([
    prisma.caseDocument.deleteMany({ where: { caseId: c.id } }),
    prisma.caseDocument.createMany({
      data: docs.map((doc) => ({
        caseId: c.id,
        name: doc.name,
        type: doc.type,
        folder: doc.folder,
        status: docStatusToDb[doc.status] as never,
        signedAt: doc.signedAt ? new Date(doc.signedAt) : null,
        signedBy: doc.signedBy ?? null,
        ip: doc.ip ?? null,
      })),
    }),
    prisma.auditEntry.create({
      data: {
        caseId: c.id,
        event: "Employee submitted onboarding wizard (webhook: onboarding.workflow.finished)",
      },
    }),
    prisma.onboardingCase.update({
      where: { id: c.id },
      data: { status: "PENDING_VERIFICATION" },
    }),
  ]);
  return settle(c.id);
}

export async function setChecklist(id: string, tasks: ChecklistTask[]): Promise<OnboardingCase | null> {
  await prisma.$transaction([
    prisma.checklistTask.deleteMany({ where: { caseId: id } }),
    prisma.checklistTask.createMany({
      data: tasks.map((t, i) => ({
        caseId: id,
        label: t.label,
        owner: ownerToDb[t.owner] as never,
        status: taskStatusToDb[t.status] as never,
        blocking: t.blocking,
        dataAccess: accessToDb[t.dataAccess] as never,
        order: i,
      })),
    }),
    prisma.auditEntry.create({ data: { caseId: id, event: "Onboarding checklist updated" } }),
  ]);
  return settle(id);
}

export async function setTaskStatus(
  id: string,
  taskId: string,
  status: TaskStatus,
): Promise<OnboardingCase | null> {
  await prisma.checklistTask.update({
    where: { id: taskId },
    data: { status: taskStatusToDb[status] as never },
  });
  return settle(id);
}

export async function verifyDocument(id: string, docId: string): Promise<OnboardingCase | null> {
  await prisma.$transaction([
    prisma.caseDocument.update({ where: { id: docId }, data: { status: "VERIFIED" } }),
    prisma.auditEntry.create({ data: { caseId: id, event: `HR verified document ${docId}` } }),
  ]);
  return settle(id);
}

export async function togglePolicy(id: string, policy: string): Promise<OnboardingCase | null> {
  const c = await loadById(id);
  if (!c) return null;
  const policiesAttached = c.policiesAttached.includes(policy)
    ? c.policiesAttached.filter((p) => p !== policy)
    : [...c.policiesAttached, policy];
  await prisma.onboardingCase.update({ where: { id }, data: { policiesAttached } });
  return settle(id);
}

export async function activate(id: string): Promise<OnboardingCase | null> {
  await prisma.$transaction([
    prisma.onboardingCase.update({ where: { id }, data: { status: "ACTIVE" } }),
    prisma.auditEntry.create({
      data: { caseId: id, event: "Account activated — payroll set to Active, SSO provisioned" },
    }),
  ]);
  return loadById(id);
}
