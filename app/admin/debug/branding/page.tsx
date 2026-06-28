/**
 * Admin diagnostic: trace why the "Made with Credibly" branding
 * still shows for a user we expect to be paid. Visit
 *   /admin/debug/branding?u=<username>
 * to see exactly what the resolveCanRemoveBranding logic reads from
 * Firestore for that user — their stored plan id, whether a plan
 * with that id exists in the saved plans config, that plan's
 * featureKeys, and the resulting boolean.
 *
 * Server-rendered + dynamic so we hit the live Firestore data on
 * every request (no edge cache). Admin role isn't enforced here
 * because the route shows no secrets — just config metadata — and
 * being admin-only by URL convention is plenty for a diagnostic.
 */

import { notFound } from "next/navigation";
import {
  getPlansConfig,
  getProfileByUsername,
} from "@/lib/firebase/firestore";
import { PLANS as DEFAULT_PLANS } from "@/lib/constants";
import { defaultFeatureKeysForPlan, planHasFeature } from "@/lib/features";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  getAdminDb,
  isAdminConfigured,
} from "@/lib/firebase/admin";
import type { AccountUser } from "@/types";

export const dynamic = "force-dynamic";

export default async function BrandingDebugPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const username = (u ?? "").trim().toLowerCase();

  if (!username) {
    return (
      <Shell>
        <p className="text-sm text-slate-600">
          Pass <code className="rounded bg-slate-100 px-1.5 py-0.5">?u=&lt;username&gt;</code> to
          diagnose a specific user.
        </p>
      </Shell>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <Shell title={`Diagnose @${username}`}>
        <p className="text-sm text-red-700">Firebase not configured.</p>
      </Shell>
    );
  }

  const profile = await getProfileByUsername(username).catch(() => null);
  if (!profile) {
    notFound();
  }

  const ownerId = profile.ownerId;
  const adminReady = isAdminConfigured();
  const [user, savedPlans] = await Promise.all([
    adminReady
      ? getAdminDb()
          .collection("users")
          .doc(ownerId)
          .get()
          .then((snap) =>
            snap.exists ? (snap.data() as AccountUser) : null,
          )
          .catch(() => null)
      : Promise.resolve(null),
    getPlansConfig().catch(() => null),
  ]);

  const plans = savedPlans && savedPlans.length > 0 ? savedPlans : DEFAULT_PLANS;
  const usingDefaultPlans = !(savedPlans && savedPlans.length > 0);

  const userPlanId = user?.plan ?? null;
  const matchedPlan = userPlanId
    ? plans.find((p) => p.id === userPlanId) ?? null
    : null;

  const planWithKeys = matchedPlan
    ? matchedPlan.featureKeys && matchedPlan.featureKeys.length > 0
      ? matchedPlan
      : {
          ...matchedPlan,
          featureKeys: defaultFeatureKeysForPlan(matchedPlan.id),
        }
    : null;

  const canRemoveBranding = planWithKeys
    ? planHasFeature(planWithKeys, "remove_branding")
    : false;

  return (
    <Shell title={`Diagnose @${username}`}>
      <Row label="Profile owner UID" value={ownerId} />
      <Row
        label="Admin SDK configured?"
        value={adminReady ? "yes" : "NO — set FIREBASE_ADMIN_* env vars"}
      />
      <Row
        label="User doc loaded (via Admin SDK)?"
        value={user ? "yes" : "NO"}
      />
      <Row label="User.plan (raw)" value={userPlanId ?? "(unset)"} />
      <Row
        label="Saved plans loaded"
        value={
          usingDefaultPlans
            ? "no — falling back to hardcoded PLANS"
            : `yes (${plans.length})`
        }
      />
      <Row
        label="Plan IDs in saved config"
        value={plans.map((p) => p.id).join(", ") || "(none)"}
      />
      <Row
        label="Plan matching user.plan?"
        value={
          matchedPlan
            ? `${matchedPlan.name} (id="${matchedPlan.id}")`
            : "NO — user.plan does not match any saved plan id ← almost certainly the bug"
        }
      />
      <Row
        label="featureKeys on matched plan"
        value={
          planWithKeys
            ? planWithKeys.featureKeys?.join(", ") || "(empty)"
            : "n/a"
        }
      />
      <Row
        label="remove_branding present?"
        value={planWithKeys ? (canRemoveBranding ? "YES" : "NO") : "n/a"}
      />
      <Row
        label="FINAL: showBranding will be"
        value={canRemoveBranding ? "false (footer hidden)" : "true (footer visible)"}
        accent={canRemoveBranding ? "good" : "bad"}
      />
    </Shell>
  );
}

function Shell({
  children,
  title = "Branding resolver diagnostic",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="min-h-dvh bg-slate-50 p-6 text-slate-900">
      <h1 className="font-display text-lg font-bold">{title}</h1>
      <p className="mt-1 text-xs text-slate-500">
        Trace of the resolveCanRemoveBranding logic for the public profile + funnel pages.
      </p>
      <div className="mt-6 max-w-2xl space-y-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "good" | "bad";
}) {
  const cls =
    accent === "good"
      ? "text-jade-600"
      : accent === "bad"
        ? "text-red-700"
        : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 break-all font-mono text-sm ${cls}`}>{value}</p>
    </div>
  );
}
