/**
 * Email automation engine — server-only (Firebase Admin SDK + Resend).
 *
 * Adapted from the Legends System automation engine. Flow:
 *
 *   enrollLead()   — lead captured → create an enrollment in every
 *                    matching published automation, then run it until
 *                    the first wait (or completion).
 *   processDue()   — cron entry point: claim active enrollments whose
 *                    dueAt has passed and continue them.
 *
 * Emails send through the existing sendEmail() helper with the
 * leader-personalized sender ("Maria Santos via Credibly") and
 * Reply-To pointing at the leader's inbox. Every email embeds an
 * open pixel (/e/o/{sendId}), wraps links in a click redirect
 * (/e/c/{sendId}?u=…), and carries an unsubscribe link (/e/u/{leadId})
 * — unsubscribed leads are never emailed again and their active
 * enrollments are canceled.
 *
 * Send window: emails that come due outside the automation's window
 * (default 8:00–20:00 Asia/Manila) are held — the enrollment's dueAt
 * moves to the next window opening instead of sending at 3 AM.
 */

import { getAdminDb } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/send";
import { emailLayout, escapeHtml } from "@/lib/email/templates/layout";
import type {
  AccountUser,
  Automation,
  AutomationEnrollment,
  AutomationNode,
  AutomationSettings,
  Booking,
  Lead,
  Pipeline,
} from "@/types";

const APP_URL = () =>
  (process.env.NEXT_PUBLIC_APP_URL || "https://www.crediblyai.com").replace(
    /\/$/,
    "",
  );

/** Hard cap on nodes executed in one pass — guards against bad data. */
const MAX_STEPS_PER_RUN = 50;

/**
 * Lateness grace for schedule steps with ifPast "skip". The cron ticks
 * every ~10 minutes, so a send firing a few minutes after its exact
 * moment is normal operation — within this grace it still sends.
 * Beyond it (cron outage, secret missing, long downtime) the moment is
 * considered gone and the flow stops instead of sending stale,
 * time-bound content.
 */
const SCHEDULE_GRACE_MS = 3_600_000; // 1 hour

/* ── Send window ─────────────────────────────────────────────── */

function hourIn(d: Date, tz: string): number {
  try {
    return Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).format(d),
    );
  } catch {
    return d.getUTCHours();
  }
}

/**
 * Push a timestamp forward until it falls inside the send window.
 * Walks hour-by-hour (48 max) with a small random minute offset so a
 * burst of held sends spreads across the window-open hour instead of
 * all firing at exactly :00.
 */
export function applyWindow(at: Date, s: AutomationSettings): Date {
  const tz = s.timezone || "Asia/Manila";
  const d = new Date(at);
  for (let i = 0; i < 48; i++) {
    const h = hourIn(d, tz);
    if (h >= s.windowStart && h < s.windowEnd) return d;
    d.setTime(d.getTime() + 3_600_000);
    d.setMinutes(Math.floor(Math.random() * 20), 0, 0);
  }
  return d;
}

function waitMs(node: AutomationNode): number {
  if (node.type !== "wait") return 0;
  const mult =
    node.unit === "minutes"
      ? 60_000
      : node.unit === "hours"
        ? 3_600_000
        : 86_400_000;
  return Math.max(0, node.amount) * mult;
}

/* ── Recipient abstraction ───────────────────────────────────────
   lead_captured enrollments email a Lead; appointment_booked ones
   email a Booking's visitor. Same merge fields either way, with
   {date}/{time} extras for bookings. */

interface Recipient {
  kind: "lead" | "booking";
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  unsubscribed: boolean;
  /** Extra merge fields — {date} / {time} for bookings. */
  extra: Record<string, string>;
}

async function loadRecipient(
  enrollment: AutomationEnrollment,
): Promise<Recipient | null> {
  const db = getAdminDb();
  if (enrollment.leadId) {
    const snap = await db.collection("leads").doc(enrollment.leadId).get();
    if (!snap.exists) return null;
    const lead = snap.data() as Lead;
    return {
      kind: "lead",
      id: snap.id,
      name: lead.name,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      unsubscribed: !!lead.unsubscribed,
      extra: {},
    };
  }
  if (enrollment.bookingId) {
    const snap = await db
      .collection("bookings")
      .doc(enrollment.bookingId)
      .get();
    if (!snap.exists) return null;
    const booking = snap.data() as Booking;
    const when = enrollment.anchorAt ? new Date(enrollment.anchorAt) : null;
    return {
      kind: "booking",
      id: snap.id,
      name: booking.name,
      email: booking.email ?? null,
      phone: booking.phone ?? null,
      unsubscribed: !!booking.unsubscribed,
      extra: {
        date: when
          ? when.toLocaleDateString("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "Asia/Manila",
            })
          : booking.date,
        time: when
          ? when.toLocaleTimeString("en-PH", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Asia/Manila",
            })
          : booking.time,
      },
    };
  }
  return null;
}

/* ── Email rendering ─────────────────────────────────────────── */

function fillMergeFields(text: string, r: Recipient): string {
  const firstName = r.name.split(/\s+/)[0] || r.name;
  let out = text
    .replace(/\{name\}/gi, firstName)
    .replace(/\{fullname\}/gi, r.name)
    .replace(/\{email\}/gi, r.email ?? "")
    .replace(/\{phone\}/gi, r.phone ?? "");
  for (const [k, v] of Object.entries(r.extra)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "gi"), v);
  }
  return out;
}

const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE_URL = /(https?:\/\/[^\s<>"')\]]+)/g;

/**
 * Render an email node's plain-text body into HTML:
 *   1. merge fields filled
 *   2. [text](url) → real <a> (click-tracked)
 *   3. remaining bare URLs → autolinked <a> (click-tracked)
 *   4. newlines → paragraphs / breaks
 */
function renderBodyHtml(
  rawBody: string,
  recipient: Recipient,
  wrapUrl: (url: string) => string,
): string {
  const filled = fillMergeFields(rawBody, recipient);

  /* Extract markdown links FIRST into placeholder tokens so the bare
     URL pass can't double-process their URLs. */
  const anchors: string[] = [];
  let working = filled.replace(MD_LINK, (_m, label: string, url: string) => {
    const idx =
      anchors.push(
        `<a href="${escapeHtml(wrapUrl(url))}" style="color:#2E6BFF;font-weight:600;">${escapeHtml(label)}</a>`,
      ) - 1;
    return `\u0000A${idx}\u0000`;
  });

  working = escapeHtml(working);

  working = working.replace(BARE_URL, (url) => {
    const shown = url.replace(/^https?:\/\//, "");
    const idx =
      anchors.push(
        `<a href="${escapeHtml(wrapUrl(url))}" style="color:#2E6BFF;font-weight:600;">${escapeHtml(shown)}</a>`,
      ) - 1;
    return `\u0000A${idx}\u0000`;
  });

  working = working.replace(
    /\u0000A(\d+)\u0000/g,
    (_m, i: string) => anchors[Number(i)] ?? "",
  );

  /* Paragraphs: blank line = new <p>, single newline = <br>. */
  return working
    .split(/\n{2,}/)
    .map(
      (para) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;">${para.replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

/* ── Core: run one enrollment until it has to stop ───────────── */

interface RunDeps {
  automation: Automation;
  enrollment: AutomationEnrollment;
}

async function runEnrollment({ automation, enrollment }: RunDeps): Promise<{
  sent: number;
}> {
  const db = getAdminDb();
  let sent = 0;

  /* Load the recipient fresh each run — unsubscribes / deletions
     between waits must stop the sequence. A deleted booking also
     cancels pending appointment reminders (cancel-safety). */
  const recipient = await loadRecipient(enrollment);

  const finish = async (
    patch: Partial<AutomationEnrollment>,
  ): Promise<void> => {
    await db
      .collection("automation_enrollments")
      .doc(enrollment.id)
      .update({ ...patch, updatedAt: Date.now() });
  };

  if (!recipient || recipient.unsubscribed || !recipient.email) {
    await finish({ status: "canceled" });
    return { sent };
  }

  /* Appointment reminders are time-critical — the send window must
     not hold a "starts in 1 hour" email until 8 AM tomorrow. */
  const timeCritical = automation.trigger === "appointment_booked";

  const ownerSnap = await db
    .collection("users")
    .doc(automation.ownerId)
    .get();
  const owner = ownerSnap.exists ? (ownerSnap.data() as AccountUser) : null;

  let i = enrollment.nextNodeIndex;
  for (let step = 0; step < MAX_STEPS_PER_RUN; step++) {
    const node = automation.nodes[i];

    if (!node) {
      await finish({ status: "completed", nextNodeIndex: i });
      return { sent };
    }

    if (node.type === "wait") {
      const raw = new Date(Date.now() + waitMs(node));
      const due = timeCritical ? raw : applyWindow(raw, automation.settings);
      await finish({ nextNodeIndex: i + 1, dueAt: due.getTime() });
      return { sent };
    }

    if (node.type === "schedule") {
      const lateMs = Date.now() - node.at;
      if (lateMs >= 0) {
        if (node.ifPast === "skip" && lateMs > SCHEDULE_GRACE_MS) {
          /* More than the grace past the moment — the time-bound
             campaign is over for this recipient. End cleanly. */
          await finish({ status: "completed", nextNodeIndex: i });
          return { sent };
        }
        /* On time or within grace — proceed. */
        i += 1;
        continue;
      }
      /* Exact datetime is the owner's explicit intent — no window. */
      await finish({ nextNodeIndex: i + 1, dueAt: node.at });
      return { sent };
    }

    if (node.type === "wait_until") {
      const anchor = enrollment.anchorAt ?? 0;
      if (!anchor || anchor <= Date.now()) {
        /* Appointment already happened (or anchor missing) — a "starts
           soon" reminder after the fact helps nobody. */
        await finish({ status: "completed", nextNodeIndex: i });
        return { sent };
      }
      const due = anchor - waitMs(node);
      if (due <= Date.now()) {
        /* Past the reminder mark but the appointment is still ahead —
           proceed immediately (late enroll / coarse cron tick). */
        i += 1;
        continue;
      }
      await finish({ nextNodeIndex: i + 1, dueAt: due });
      return { sent };
    }

    /* email node */
    /* An email directly after a schedule step inherits that step's
       explicit datetime — the owner picked 9 PM on purpose, so the
       send window must not push it to tomorrow morning. */
    const prevNode = automation.nodes[i - 1];
    const afterSchedule = prevNode?.type === "schedule";
    /* Grace check on RESUME: an enrollment parked at a schedule step
       that the cron only picked up much later (outage, missing
       secret) must honour the same 1-hour cutoff as late enrollees —
       otherwise a "doors open NOW" email could land a day late. */
    if (
      afterSchedule &&
      prevNode.ifPast === "skip" &&
      Date.now() - prevNode.at > SCHEDULE_GRACE_MS
    ) {
      await finish({ status: "completed", nextNodeIndex: i });
      return { sent };
    }
    if (!timeCritical && !afterSchedule) {
      const windowed = applyWindow(new Date(), automation.settings);
      if (windowed.getTime() > Date.now() + 60_000) {
        /* Outside the send window — hold THIS node until it opens. */
        await finish({ nextNodeIndex: i, dueAt: windowed.getTime() });
        return { sent };
      }
    }

    /* Pre-allocate the send doc id so tracking URLs can embed it. */
    const sendRef = db.collection("automation_sends").doc();
    const wrapUrl = (url: string) =>
      `${APP_URL()}/e/c/${sendRef.id}?u=${encodeURIComponent(url)}`;

    const subject = fillMergeFields(node.subject, recipient);
    const bodyHtml = renderBodyHtml(node.body, recipient, wrapUrl);
    const unsubUrl = `${APP_URL()}/e/u/${recipient.id}${
      recipient.kind === "booking" ? "?t=b" : ""
    }`;
    const pixel = `<img src="${APP_URL()}/e/o/${sendRef.id}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;">`;
    const senderName = owner?.displayName || "Your Credibly contact";
    const footer = `Sent on behalf of ${escapeHtml(senderName)} via <a href="https://www.crediblyai.com" style="color:#555866;">Credibly</a>. <a href="${unsubUrl}" style="color:#555866;">Unsubscribe</a>`;

    const html =
      emailLayout({
        preview: subject,
        body: bodyHtml,
        footer,
      }) + pixel;

    const res = await sendEmail({
      to: recipient.email,
      subject,
      html,
      category: "automation",
      fromName: owner?.displayName,
      replyTo: owner?.email,
    });

    if (res.ok) {
      sent += 1;
      await sendRef.set({
        id: sendRef.id,
        ownerId: automation.ownerId,
        automationId: automation.id,
        nodeId: node.id,
        enrollmentId: enrollment.id,
        ...(recipient.kind === "lead"
          ? { leadId: recipient.id }
          : { bookingId: recipient.id }),
        to: recipient.email,
        subject,
        sentAt: Date.now(),
      });
    }
    /* Send failures are skipped, not retried — a hard bounce retried
       daily forever would hurt the sending domain's reputation. The
       sequence continues so one bad send doesn't strand the lead. */

    i += 1;
  }

  /* MAX_STEPS safety valve — park the enrollment instead of looping. */
  await finish({ nextNodeIndex: i, dueAt: Date.now() + 3_600_000 });
  return { sent };
}

/* ── Public API ──────────────────────────────────────────────── */

/**
 * Route a freshly captured lead into a follow-up pipeline — the
 * server-side version of the long-dead autoEnrollLeadInDefaultPipeline
 * (which could never run: anonymous visitors can't read pipelines or
 * update leads under Firestore rules; the Admin SDK can).
 *
 * Pipeline resolution: the caller's preferred pipeline (the funnel's
 * or profile's pipelineId override, validated to belong to the owner)
 * → else the owner's default pipeline. The lead lands in the first
 * stage with the stage's daysBeforeNextTask driving nextTaskAt — the
 * exact shape moveLeadToStage() writes, so the Kanban, daily task
 * list, and nav badge all pick it up natively. No-ops when the lead
 * is already in a pipeline or the owner has none.
 */
export async function autoEnrollPipeline(
  leadId: string,
  ownerId: string,
  preferredPipelineId?: string,
): Promise<boolean> {
  const db = getAdminDb();
  const leadRef = db.collection("leads").doc(leadId);
  const leadSnap = await leadRef.get();
  if (!leadSnap.exists) return false;
  const lead = leadSnap.data() as Lead;
  if (lead.ownerId !== ownerId) return false;
  if (lead.pipelineId) return false;

  let pipeline: Pipeline | null = null;
  if (preferredPipelineId) {
    const ps = await db
      .collection("pipelines")
      .doc(preferredPipelineId)
      .get()
      .catch(() => null);
    if (ps?.exists) {
      const p = ps.data() as Pipeline;
      if (p.ownerId === ownerId) pipeline = { ...p, id: ps.id };
    }
  }
  if (!pipeline) {
    const ds = await db
      .collection("pipelines")
      .where("ownerId", "==", ownerId)
      .where("isDefault", "==", true)
      .limit(1)
      .get()
      .catch(() => null);
    if (ds && !ds.empty) {
      pipeline = { ...(ds.docs[0].data() as Pipeline), id: ds.docs[0].id };
    }
  }
  if (!pipeline || (pipeline.stages ?? []).length === 0) return false;

  const first = [...pipeline.stages].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[0];
  const now = Date.now();
  await leadRef.update({
    pipelineId: pipeline.id,
    stageId: first.id,
    stageEnteredAt: now,
    nextTaskAt:
      first.daysBeforeNextTask && first.daysBeforeNextTask > 0
        ? now + first.daysBeforeNextTask * 86_400_000
        : null,
  });
  return true;
}

/**
 * Enroll a freshly captured lead into every matching published
 * automation owned by `ownerId`. Idempotent per (automation, lead) —
 * re-posting the same lead doesn't double-enroll.
 */
export async function enrollLead(
  leadId: string,
  ownerId: string,
): Promise<{ enrolled: number; sent: number }> {
  const db = getAdminDb();

  const leadSnap = await db.collection("leads").doc(leadId).get();
  if (!leadSnap.exists) return { enrolled: 0, sent: 0 };
  const lead = { ...(leadSnap.data() as Lead), id: leadSnap.id } as Lead;
  /* Server-side ownership check — the enroll route is unauthenticated
     (public visitors trigger it), so never trust the caller's pairing
     of leadId + ownerId. */
  if (lead.ownerId !== ownerId) return { enrolled: 0, sent: 0 };
  if (!lead.email || lead.unsubscribed) return { enrolled: 0, sent: 0 };

  const autosSnap = await db
    .collection("automations")
    .where("ownerId", "==", ownerId)
    .where("status", "==", "published")
    .where("trigger", "==", "lead_captured")
    .get();

  /* Effective pipeline for filter checks. Leads don't reliably carry
     pipelineId at capture time, so when an automation filters by
     pipeline and the lead has none, treat the lead as belonging to
     the owner's DEFAULT pipeline (resolved lazily, once). */
  let defaultPipelineId: string | null | undefined;
  const effectivePipelineId = async (): Promise<string | null> => {
    if (lead.pipelineId) return lead.pipelineId;
    if (defaultPipelineId !== undefined) return defaultPipelineId;
    const ps = await db
      .collection("pipelines")
      .where("ownerId", "==", ownerId)
      .where("isDefault", "==", true)
      .limit(1)
      .get()
      .catch(() => null);
    defaultPipelineId = ps && !ps.empty ? ps.docs[0].id : null;
    return defaultPipelineId;
  };

  let enrolled = 0;
  let sent = 0;
  for (const doc of autosSnap.docs) {
    const automation = { ...(doc.data() as Automation), id: doc.id };

    /* Pipeline filter — empty/absent means every lead qualifies. */
    const filter = automation.pipelineIds ?? [];
    if (filter.length > 0) {
      const pid = await effectivePipelineId();
      if (!pid || !filter.includes(pid)) continue;
    }
    if ((automation.nodes ?? []).length === 0) continue;

    /* Dedup: one enrollment per (automation, lead) ever. */
    const existing = await db
      .collection("automation_enrollments")
      .where("automationId", "==", automation.id)
      .where("leadId", "==", leadId)
      .limit(1)
      .get();
    if (!existing.empty) continue;

    const now = Date.now();
    const enrollRef = db.collection("automation_enrollments").doc();
    const enrollment: AutomationEnrollment = {
      id: enrollRef.id,
      automationId: automation.id,
      ownerId,
      leadId,
      nextNodeIndex: 0,
      status: "active",
      dueAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await enrollRef.set(enrollment);
    await doc.ref.update({
      enrollCount: (automation.enrollCount ?? 0) + 1,
    });
    enrolled += 1;

    const r = await runEnrollment({ automation, enrollment });
    sent += r.sent;
  }
  return { enrolled, sent };
}

/**
 * Enroll a fresh appointment booking into every published
 * appointment_booked automation. The booking's start datetime becomes
 * the enrollment anchor that wait_until nodes count back from.
 * Bookings carry no timezone — PH-market product, so Asia/Manila
 * (UTC+8, no DST) is assumed when converting date+time to epoch.
 */
export async function enrollBooking(
  bookingId: string,
  ownerId: string,
): Promise<{ enrolled: number; sent: number }> {
  const db = getAdminDb();

  const snap = await db.collection("bookings").doc(bookingId).get();
  if (!snap.exists) return { enrolled: 0, sent: 0 };
  const booking = { ...(snap.data() as Booking), id: snap.id } as Booking;
  if (booking.ownerId !== ownerId) return { enrolled: 0, sent: 0 };
  if (!booking.email || booking.unsubscribed) return { enrolled: 0, sent: 0 };

  const anchorAt = Date.parse(`${booking.date}T${booking.time}:00+08:00`);
  if (!Number.isFinite(anchorAt) || anchorAt <= Date.now()) {
    return { enrolled: 0, sent: 0 };
  }

  const autosSnap = await db
    .collection("automations")
    .where("ownerId", "==", ownerId)
    .where("status", "==", "published")
    .where("trigger", "==", "appointment_booked")
    .get();

  let enrolled = 0;
  let sent = 0;
  for (const doc of autosSnap.docs) {
    const automation = { ...(doc.data() as Automation), id: doc.id };
    if ((automation.nodes ?? []).length === 0) continue;

    const existing = await db
      .collection("automation_enrollments")
      .where("automationId", "==", automation.id)
      .where("bookingId", "==", bookingId)
      .limit(1)
      .get();
    if (!existing.empty) continue;

    const now = Date.now();
    const enrollRef = db.collection("automation_enrollments").doc();
    const enrollment: AutomationEnrollment = {
      id: enrollRef.id,
      automationId: automation.id,
      ownerId,
      bookingId,
      anchorAt,
      nextNodeIndex: 0,
      status: "active",
      dueAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await enrollRef.set(enrollment);
    await doc.ref.update({
      enrollCount: (automation.enrollCount ?? 0) + 1,
    });
    enrolled += 1;

    const r = await runEnrollment({ automation, enrollment });
    sent += r.sent;
  }
  return { enrolled, sent };
}

/**
 * Cron worker: continue every active enrollment whose dueAt has
 * passed. Batched so a pile-up can't blow the function timeout —
 * anything beyond the batch waits for the next tick.
 */
export async function processDue(
  batchSize = 100,
): Promise<{ processed: number; sent: number }> {
  const db = getAdminDb();
  const dueSnap = await db
    .collection("automation_enrollments")
    .where("status", "==", "active")
    .where("dueAt", "<=", Date.now())
    .limit(batchSize)
    .get();

  let processed = 0;
  let sent = 0;
  /* Cache automations — many due enrollments usually share one. */
  const autoCache = new Map<string, Automation | null>();

  for (const doc of dueSnap.docs) {
    const enrollment = {
      ...(doc.data() as AutomationEnrollment),
      id: doc.id,
    };

    let automation = autoCache.get(enrollment.automationId);
    if (automation === undefined) {
      const as = await db
        .collection("automations")
        .doc(enrollment.automationId)
        .get();
      automation = as.exists
        ? ({ ...(as.data() as Automation), id: as.id } as Automation)
        : null;
      autoCache.set(enrollment.automationId, automation);
    }

    if (!automation || automation.status !== "published") {
      /* Deleted or paused automation — park paused, cancel deleted. */
      await doc.ref.update({
        status: automation ? "active" : "canceled",
        /* Paused: push dueAt out an hour so we re-check later without
           hammering every tick. */
        dueAt: Date.now() + 3_600_000,
        updatedAt: Date.now(),
      });
      continue;
    }

    const r = await runEnrollment({ automation, enrollment });
    sent += r.sent;
    processed += 1;
  }

  return { processed, sent };
}
