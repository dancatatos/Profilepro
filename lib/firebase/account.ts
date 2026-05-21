import type { User } from "firebase/auth";
import {
  getProfile,
  getUserDoc,
  isUsernameAvailable,
  saveProfile,
  upsertUserDoc,
} from "./firestore";
import { createDefaultProfile } from "@/lib/defaults";
import { slugify } from "@/lib/utils";
import type { AccountUser } from "@/types";

async function uniqueUsername(base: string, ownerId: string): Promise<string> {
  const root = slugify(base) || "user";
  if (await isUsernameAvailable(root, ownerId)) return root;
  for (let i = 0; i < 5; i += 1) {
    const candidate = `${root}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (await isUsernameAvailable(candidate, ownerId)) return candidate;
  }
  return `${root}-${ownerId.slice(0, 5)}`;
}

/**
 * Loads the account record for a signed-in user, creating the user
 * doc + a starter profile on first sign-in (e.g. via Google).
 */
export async function ensureAccount(user: User): Promise<AccountUser> {
  const existing = await getUserDoc(user.uid);
  if (existing) return existing;

  const fallbackName = user.email ? user.email.split("@")[0] : "user";
  const displayName = user.displayName || fallbackName;
  const username = await uniqueUsername(displayName, user.uid);
  const now = Date.now();

  const account: AccountUser = {
    uid: user.uid,
    email: user.email || "",
    displayName,
    photoURL: user.photoURL || "",
    role: "user",
    plan: "free",
    username,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  };

  await upsertUserDoc(account);

  const profile = await getProfile(user.uid);
  if (!profile) {
    await saveProfile(createDefaultProfile(user.uid, username, displayName));
  }
  return account;
}
