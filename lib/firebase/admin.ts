import "server-only";
import * as admin from "firebase-admin";

/** Lazily initialized Firebase Admin Auth instance (emulator-aware). */
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
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }
  }
  return admin.auth();
}
