/**
 * Server-side Firebase Admin SDK initialization.
 *
 * Used exclusively by API routes that need to read/write Firestore
 * without a user auth context — primarily the renewal-reminder cron
 * job. The Admin SDK bypasses Firestore Security Rules entirely, so
 * keep its usage to routes that you've separately authenticated
 * (e.g. with CRON_SECRET or admin-only middleware).
 *
 * Initializes from three env vars — drop them into Vercel:
 *   FIREBASE_ADMIN_PROJECT_ID     = your-project-id
 *   FIREBASE_ADMIN_CLIENT_EMAIL   = firebase-adminsdk-xxxxx@<project>.iam.gserviceaccount.com
 *   FIREBASE_ADMIN_PRIVATE_KEY    = -----BEGIN PRIVATE KEY-----\n...
 *
 * To get these: Firebase Console → Project Settings → Service Accounts
 * → "Generate new private key". The downloaded JSON has all three.
 *
 * The private key contains `\n` characters that Vercel preserves as
 * literal `\n` in the value. We unescape them at load time so the
 * Admin SDK sees real line breaks.
 */

import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

/** True when the three required admin env vars are present. */
export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  );
}

/**
 * Return the shared admin app instance, initialising on first call.
 * Throws if env vars are missing — callers should check
 * `isAdminConfigured()` first and short-circuit gracefully if they
 * want a soft failure mode.
 */
export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!projectId || !clientEmail || !rawKey) {
    throw new Error(
      "Firebase Admin SDK not configured — set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in Vercel.",
    );
  }
  /* Vercel preserves `\n` as the literal two-character sequence — we
     need actual line breaks for the PEM-encoded private key parser. */
  const privateKey = rawKey.replace(/\\n/g, "\n");
  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return cachedApp;
}

/** Shared Firestore instance backed by the Admin SDK. */
export function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getAdminApp());
  return cachedDb;
}
