/**
 * Commission earned notification — sent the moment an admin upgrades
 * a referred user to a paid plan, generating a new commission record.
 *
 * Designed as the instant gratification moment for affiliates: they
 * see the email pop in their inbox seconds after the admin confirms
 * the upgrade. Subject leads with the ₱ amount because that's what
 * the affiliate cares about.
 */

import { emailButton, emailLayout, emailMutedText, escapeHtml } from "./layout";

interface CommissionEarnedArgs {
  affiliateFirstName: string;
  customerName: string;
  planName: string;
  amount: number;
  type: "signup" | "renewal" | "adjustment";
}

export function renderCommissionEarnedEmail(args: CommissionEarnedArgs): {
  subject: string;
  html: string;
} {
  const { affiliateFirstName, customerName, planName, amount, type } = args;
  const formattedAmount = `₱${amount.toLocaleString()}`;
  const typeLabel =
    type === "renewal"
      ? "renewal"
      : type === "adjustment"
        ? "adjustment"
        : "signup";
  const subject = `${formattedAmount} commission credited — ${customerName} (${typeLabel})`;
  const html = emailLayout({
    preview: `${customerName} just activated ${planName}. ${formattedAmount} added to your pending payout.`,
    body: `
      <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;line-height:30px;">
        💰 ${escapeHtml(formattedAmount)} commission earned
      </h1>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Hi ${escapeHtml(affiliateFirstName)},
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        <strong>${escapeHtml(customerName)}</strong> just got activated on the
        <strong>${escapeHtml(planName)}</strong> plan${type === "renewal" ? " (renewal)" : ""}.
        That&rsquo;s another <strong>${escapeHtml(formattedAmount)}</strong> heading
        your way.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;width:100%;background:#F6F7FB;border-radius:10px;">
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0;font-size:12px;line-height:18px;color:#555866;text-transform:uppercase;letter-spacing:0.04em;">
              ${type === "renewal" ? "Renewal commission" : type === "adjustment" ? "Adjustment" : "Signup commission"}
            </p>
            <p style="margin:4px 0 0 0;font-size:18px;line-height:24px;color:#0A0A10;font-weight:700;">
              ${escapeHtml(formattedAmount)}
            </p>
            <p style="margin:2px 0 0 0;font-size:13px;line-height:20px;color:#555866;">
              ${escapeHtml(customerName)} · ${escapeHtml(planName)}
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:15px;line-height:24px;">
        It&rsquo;s now in your <strong>Pending payout</strong> bucket. Your admin
        processes payouts manually — sit tight, the payment confirmation
        email will land when the money is on its way.
      </p>
      ${emailButton("View my earnings", "https://www.crediblyai.com/affiliate/earnings")}
      ${emailMutedText("Tip: customers in your referral list are likely to renew if you stay in touch. A quick check-in message every few months keeps your renewal rate high.")}
    `,
  });
  return { subject, html };
}
