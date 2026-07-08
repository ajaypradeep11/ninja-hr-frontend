// Firebase Web SDK — safe to import from client components only.
import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cached: Auth | null = null;

/** Lazily initialized Firebase Auth instance (emulator-aware). */
export function firebaseClientAuth(): Auth {
  if (cached) return cached;
  const app = getApps()[0] ?? initializeApp(config);
  cached = getAuth(app);
  const emu = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emu) connectAuthEmulator(cached, `http://${emu}`, { disableWarnings: true });
  return cached;
}
