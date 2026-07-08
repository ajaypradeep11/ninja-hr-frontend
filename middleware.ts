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
