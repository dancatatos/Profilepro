/**
 * Commission paid notification — sent when an admin marks commissions
 * as paid (single or batch). One email per affiliate with a summary
 * of which commissions were paid in this batch, so an affiliate who
 * had 5 commissions paid out doesn't get 5 separate emails.
 */

import { emailButton, emailLayout, emailMutedText, escapeHtml } from "./layout";

interface CommissionPaidLine {
  customerName: string;
  planName: string;
  amount: number;
}

interface CommissionPaidArgs {
  affiliateFirstName: string;
  lines: CommissionPaidLine[];
  totalAmount: number;
  payoutMethod?: string;
}

export function renderCommissionPaidEmail(args: CommissionPaidArgs): {
  subject: string;
  html: string;
} {
  const { affiliateFirstName, lines, totalAmount, payoutMethod } = args;
  const formattedTotal = `₱${totalAmount.toLocaleString()}`;
  const itemCount = lines.length;
  const subject =
    itemCount === 1
      ? `${formattedTotal} paid out — ${escapeHtml(lines[0]?.customerName ?? "")}`
      : `${formattedTotal} paid out (${itemCount} commissions)`;

  const lineRows = lines
    .map(
      (l) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #E4E7EE;">
          <p style="margin:0;font-size:13px;line-height:20px;color:#0A0A10;">
            ${escapeHtml(l.customerName)}
          </p>
          <p style="margin:2px 0 0 0;font-size:12px;line-height:18px;color:#555866;">
            ${escapeHtml(l.planName)}
          </p>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #E4E7EE;text-align:right;font-size:13px;font-weight:600;color:#0A0A10;">
          ₱${l.amount.toLocaleString()}
        </td>
      </tr>
    `,
    )
    .join("");

  const html = emailLayout({
    preview: `Your ${formattedTotal} payout has been processed.`,
    body: `
      <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;line-height:30px;">
        ✅ ${escapeHtml(formattedTotal)} just paid out
      </h1>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Hi ${escapeHtml(affiliateFirstName)},
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        Your admin has just processed your payout. The full amount of
        <strong>${escapeHtml(formattedTotal)}</strong> covers
        <strong>${itemCount}</strong> ${itemCount === 1 ? "commission" : "commissions"}${
          payoutMethod ? ` and was sent via <strong>${escapeHtml(payoutMethod)}</strong>` : ""
        }.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;width:100%;background:#F6F7FB;border-radius:10px;">
        <thead>
          <tr>
            <th align="left" style="padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#555866;border-bottom:1px solid #E4E7EE;">Customer</th>
            <th align="right" style="padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#555866;border-bottom:1px solid #E4E7EE;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineRows}
          <tr>
            <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#0A0A10;">Total</td>
            <td style="padding:12px 14px;text-align:right;font-size:16px;font-weight:700;color:#2E6BFF;">${escapeHtml(formattedTotal)}</td>
          </tr>
        </tbody>
      </table>
      ${emailButton("View payout history", "https://www.crediblyai.com/affiliate/earnings")}
      ${emailMutedText("If the money hasn't arrived yet, give it up to 24 hours depending on the payment method. Reach out to your admin if anything looks off.")}
    `,
  });
  return { subject, html };
}
