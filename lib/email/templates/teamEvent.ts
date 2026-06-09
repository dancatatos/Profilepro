/**
 * Team event email templates — three variants for the lifecycle:
 *   - renderEventCreatedEmail:   sent to all team members on event create
 *                                 (the "save the date" notification)
 *   - renderEventReminderEmail:  sent 24h before to RSVP'd "going" members
 *                                 (the "tomorrow!" reminder)
 *   - renderEventCanceledEmail:  sent to RSVP'd members when event is canceled
 *
 * Each renders subject + HTML body via the shared emailLayout helper
 * so the visual style stays consistent with renewal / commission /
 * invite emails. All copy is mobile-first (single-column, short
 * paragraphs, one strong CTA).
 */

import {
  emailButton,
  emailLayout,
  emailMutedText,
  escapeHtml,
} from "./layout";

interface EventEmailArgs {
  teamName: string;
  eventTitle: string;
  eventDescription?: string;
  /** Human-readable date+time string in the event's timezone. */
  whenLine: string;
  locationLabel?: string;
  /** Direct join + RSVP URL (the /join/event/[id] page). */
  joinUrl: string;
  /** Recipient's first name for the greeting. Falls back to "there". */
  recipientName?: string;
}

/* ── 1. EVENT CREATED ─────────────────────────────────────────── */

export function renderEventCreatedEmail(args: EventEmailArgs): {
  subject: string;
  html: string;
} {
  const subject = `New event in ${args.teamName}: ${args.eventTitle}`;
  const greeting = args.recipientName?.trim() || "there";
  const html = emailLayout({
    preview: `${args.eventTitle} — ${args.whenLine}`,
    body: `
      <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;line-height:28px;">
        📅 New event in ${escapeHtml(args.teamName)}
      </h1>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Hi ${escapeHtml(greeting)},
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        Your team just scheduled <strong>${escapeHtml(args.eventTitle)}</strong>.
      </p>
      <p style="margin:12px 0 4px 0;font-size:14px;line-height:22px;color:#555866;">
        <strong>When:</strong> ${escapeHtml(args.whenLine)}
      </p>
      ${
        args.locationLabel
          ? `<p style="margin:0 0 4px 0;font-size:14px;line-height:22px;color:#555866;"><strong>Where:</strong> ${escapeHtml(args.locationLabel)}</p>`
          : ""
      }
      ${
        args.eventDescription
          ? `<p style="margin:12px 0 0 0;font-size:14px;line-height:22px;color:#555866;white-space:pre-wrap;">${escapeHtml(args.eventDescription)}</p>`
          : ""
      }
      ${emailButton("RSVP now", args.joinUrl)}
      ${emailMutedText("You're getting this because you joined this team. RSVPs help the leader plan headcount.")}
    `,
  });
  return { subject, html };
}

/* ── 2. EVENT REMINDER (24h before) ──────────────────────────── */

export function renderEventReminderEmail(args: EventEmailArgs): {
  subject: string;
  html: string;
} {
  const subject = `Tomorrow: ${args.eventTitle}`;
  const greeting = args.recipientName?.trim() || "there";
  const html = emailLayout({
    preview: `Reminder — ${args.eventTitle} is tomorrow.`,
    body: `
      <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;line-height:28px;">
        ⏰ ${escapeHtml(args.eventTitle)} is tomorrow
      </h1>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Hi ${escapeHtml(greeting)},
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        Just a heads-up — <strong>${escapeHtml(args.eventTitle)}</strong>
        in <strong>${escapeHtml(args.teamName)}</strong> is happening tomorrow.
      </p>
      <p style="margin:12px 0 4px 0;font-size:14px;line-height:22px;color:#555866;">
        <strong>When:</strong> ${escapeHtml(args.whenLine)}
      </p>
      ${
        args.locationLabel
          ? `<p style="margin:0 0 4px 0;font-size:14px;line-height:22px;color:#555866;"><strong>Where:</strong> ${escapeHtml(args.locationLabel)}</p>`
          : ""
      }
      ${emailButton("Open event", args.joinUrl)}
      ${emailMutedText("You're getting this because you RSVP'd 'going'. Plans changed? Update your RSVP from the event page.")}
    `,
  });
  return { subject, html };
}

/* ── 3. EVENT CANCELED ───────────────────────────────────────── */

export function renderEventCanceledEmail(args: EventEmailArgs): {
  subject: string;
  html: string;
} {
  const subject = `Canceled: ${args.eventTitle}`;
  const greeting = args.recipientName?.trim() || "there";
  const html = emailLayout({
    preview: `${args.eventTitle} has been canceled.`,
    body: `
      <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;line-height:28px;">
        Event canceled
      </h1>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Hi ${escapeHtml(greeting)},
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        <strong>${escapeHtml(args.eventTitle)}</strong> in
        <strong>${escapeHtml(args.teamName)}</strong> (${escapeHtml(args.whenLine)})
        has been canceled by the team leader.
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        You don&rsquo;t need to do anything — your RSVP has been kept on file
        for reference. Other events from this team will still come through.
      </p>
      ${emailMutedText("If you have questions, please contact the team leader directly.")}
    `,
  });
  return { subject, html };
}
