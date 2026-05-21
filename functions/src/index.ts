/* ============================================================
   Credibly — Cloud Functions (Gen 2)
   Secure AI proxy, lead processing, scheduled automations.
   Deploy:  npm run deploy   (from /functions)
   ============================================================ */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger, setGlobalOptions } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

const db = getFirestore();

/** Gemini key kept server-side — set with: firebase functions:secrets:set GEMINI_API_KEY */
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/* ------------------------------------------------------------
   aiProxy — secure, authenticated Gemini call.
   Use this from the client instead of exposing the API key.
   ------------------------------------------------------------ */
export const aiProxy = onCall(
  { secrets: [GEMINI_API_KEY], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const prompt = String(request.data?.prompt ?? "").trim();
    if (!prompt) {
      throw new HttpsError("invalid-argument", "A prompt is required.");
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY.value()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!res.ok) {
      logger.error("Gemini request failed", { status: res.status });
      throw new HttpsError("internal", "AI request failed.");
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";

    await db.collection("ai_generations").add({
      ownerId: request.auth.uid,
      action: "proxy",
      promptSummary: prompt.slice(0, 120),
      createdAt: Date.now(),
    });

    return { text };
  },
);

/* ------------------------------------------------------------
   onLeadCreated — runs whenever a lead is captured.
   Maintains a denormalised lead counter on the profile.
   ------------------------------------------------------------ */
export const onLeadCreated = onDocumentCreated(
  "leads/{leadId}",
  async (event) => {
    const lead = event.data?.data();
    if (!lead?.ownerId) return;

    logger.info("New lead captured", {
      ownerId: lead.ownerId,
      profileId: lead.profileId,
    });

    await db
      .collection("profiles")
      .doc(String(lead.ownerId))
      .set({ leadCount: FieldValue.increment(1) }, { merge: true })
      .catch((err) => logger.warn("lead counter update failed", err));

    // TODO: send a push notification to the owner (FCM) here.
  },
);

/* ------------------------------------------------------------
   onAnalyticsEvent — lightweight rollup placeholder.
   ------------------------------------------------------------ */
export const onAnalyticsEvent = onDocumentCreated(
  "analytics_events/{eventId}",
  async (event) => {
    const ev = event.data?.data();
    if (!ev?.ownerId || !ev?.type) return;
    // TODO: aggregate into a daily stats doc for fast dashboards.
    logger.debug("analytics event", { type: ev.type });
  },
);

/* ------------------------------------------------------------
   dailyMaintenance — scheduled automation hook.
   ------------------------------------------------------------ */
export const dailyMaintenance = onSchedule("every 24 hours", async () => {
  logger.info("Daily maintenance tick — wire digests / retention here.");
});
