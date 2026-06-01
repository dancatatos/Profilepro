import type { User } from "firebase/auth";
import {
  getProfile,
  getUserDoc,
  isUsernameAvailable,
  saveProfile,
  upsertUserDoc,
} from "./firestore";
import { createDefaultProfile } from "@/lib/defaults";
import { clearRefCookies, getRefCookie } from "@/lib/referral";
import { consumePendingConsent } from "@/lib/consent";
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
 *
 * Also handles affiliate referral attribution: if a `cred_ref` cookie
 * is present (dropped earlier by `/r/<code>`), the code is stamped onto
 * the new user doc as `affiliateId` and the cookie is cleared so a
 * second signup in the same browser doesn't get re-attributed.
 */
export async function ensureAccount(user: User): Promise<AccountUser> {
  const existing = await getUserDoc(user.uid);
  if (existing) return existing;

  const fallbackName = user.email ? user.email.split("@")[0] : "user";
  const displayName = user.displayName || fallbackName;
  const username = await uniqueUsername(displayName, user.uid);
  const now = Date.now();

  /* Check the referral cookie BEFORE we create the user doc so we can
     stamp the affiliateId on the initial write. Reading it once also
     lets us avoid clearing the cookie if there was nothing to attribute. */
  const refCode = getRefCookie();

  /* Pull the pending consent that the signup page stashed in
     sessionStorage. consumePendingConsent() removes the entry as a
     side-effect so a second signup in the same tab can't reuse it.
     Null is fine — Google sign-ins from /login don't go through the
     signup checkbox, and existing users are grandfathered. */
  const pendingConsent = consumePendingConsent();

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
    ...(refCode
      ? { affiliateId: refCode, affiliateAttributedAt: now }
      : {}),
    ...(pendingConsent ? { consent: pendingConsent } : {}),
  };

  await upsertUserDoc(account);

  if (refCode) {
    /* One-shot — once we've successfully written the attribution, drop the
       cookies so subsequent signups (e.g. someone else using the same
       browser) aren't accidentally credited to the original affiliate. */
    clearRefCookies();
  }

  const profile = await getProfile(user.uid);
  if (!profile) {
    await saveProfile(createDefaultProfile(user.uid, username, displayName));
  }
  return account;
}
