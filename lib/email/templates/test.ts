/**
 * Test email — used by the admin "Send test email" action to confirm
 * Resend + DNS + From address are all wired correctly. Keeps the
 * body minimal so any rendering issue is obvious.
 */

import { emailButton, emailLayout, escapeHtml } from "./layout";

export function renderTestEmail(recipientName: string): {
  subject: string;
  html: string;
} {
  const subject = "Test email from Credibly";
  const html = emailLayout({
    preview: "Your Credibly email infrastructure is working.",
    body: `
      <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;line-height:28px;">
        ✅ Email infrastructure is working
      </h1>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Hi ${escapeHtml(recipientName)},
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        If you're reading this, Resend is correctly configured for the
        Credibly app. You can now safely enable renewal reminders,
        commission notifications and auto-sent affiliate invites.
      </p>
      ${emailButton("Open Credibly", "https://www.crediblyai.com/admin")}
      <p style="margin:0;font-size:13px;line-height:20px;color:#555866;">
        This is a one-off test message — no further action needed.
      </p>
    `,
    footer: "Sent from the Credibly admin → Send test email action.",
  });
  return { subject, html };
}
