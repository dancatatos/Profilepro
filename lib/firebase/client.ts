import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig, isFirebaseConfigured } from "./config";

/**
 * Single shared Firebase app instance. Re-uses the existing app during
 * Next.js hot-reload / multiple imports instead of re-initialising.
 * When real credentials are absent (build time / demo mode) we initialise
 * with a safe placeholder so the module doesn't throw at import time.
 */
const safeConfig = isFirebaseConfigured
  ? firebaseConfig
  : {
      apiKey: "demo-not-configured",
      authDomain: "demo.firebaseapp.com",
      projectId: "demo",
      storageBucket: "demo.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:demo",
    };

const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(safeConfig);

export const firebaseApp = app;
export const auth: Auth = getAuth(app);

/**
 * Firestore client with `ignoreUndefinedProperties: true` so writes that
 * include `undefined` fields don't throw — Firestore just omits them.
 * Without this, calling setDoc with any object that has an optional
 * field set to undefined raises "Function setDoc() called with invalid
 * data: Unsupported field value: undefined". We initialize once at module
 * load — re-initialising on hot-reload would throw, so fall back to
 * getFirestore when the instance already exists.
 */
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    // Already initialised (hot-reload) — reuse it.
    return getFirestore(app);
  }
})();

export const storage: FirebaseStorage = getStorage(app);
export { isFirebaseConfigured };
