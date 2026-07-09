import "server-only";
import * as admin from "firebase-admin";

/** Lazily initialized Firebase Admin Auth instance (emulator/App Hosting-aware). */
export function adminAuth(): admin.auth.Auth {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      admin.initializeApp({ projectId });
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    } else {
      // App Hosting/Cloud Run provide application default credentials. App
      // Hosting also injects FIREBASE_CONFIG, so projectId may be omitted.
      admin.initializeApp(projectId ? { projectId } : undefined);
    }
  }
  return admin.auth();
}
