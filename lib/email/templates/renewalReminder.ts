/**
 * Renewal reminder templates — two variants:
 *   - renderCustomerRenewalEmail: heads-up to the customer themselves
 *   - renderAffiliateRenewalEmail: opportunity ping to the affiliate
 *
 * Both share the same email layout; only the copy differs. The cron
 * job in Phase 6C picks which one to send (or both) based on the
 * days-until-expiry window.
 */

import { emailButton, emailLayout, emailMutedText, escapeHtml } from "./layout";

interface CustomerRenewalArgs {
  customerName: string;
  planName: string;
  daysUntilExpiry: number;
}

/** Email body sent to the customer whose plan is about to expire. */
export function renderCustomerRenewalEmail(args: CustomerRenewalArgs): {
  subject: string;
  html: string;
} {
  const { customerName, planName, daysUntilExpiry } = args;
  const isUrgent = daysUntilExpiry <= 3;
  const subject = isUrgent
    ? `Last chance — your ${planName} plan expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`
    : `Heads-up — your ${planName} plan expires in ${daysUntilExpiry} days`;
  const html = emailLayout({
    preview: `Renew your Credibly subscription to keep access uninterrupted.`,
    body: `
      <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;line-height:28px;">
        ${isUrgent ? "⏰ " : ""}Your ${escapeHtml(planName)} plan is about to expire
      </h1>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Hi ${escapeHtml(customerName)},
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        Your Credibly <strong>${escapeHtml(planName)}</strong> plan expires in
        <strong>${daysUntilExpiry} ${daysUntilExpiry === 1 ? "day" : "days"}</strong>.
        To keep your profile, analytics, AI features and HD QR codes
        active without interruption, please renew before then.
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        Contact your account manager to renew, or sign in to your
        dashboard for more details.
      </p>
      ${emailButton("Go to my dashboard", "https://www.crediblyai.com/dashboard")}
      ${emailMutedText("If your subscription has already been renewed by your account manager, please disregard this message.")}
    `,
  });
  return { subject, html };
}

interface AffiliateRenewalArgs {
  affiliateFirstName: string;
  /** Masked email of the referred customer (e.g. "m******a@gmail.com"). */
  customerEmailMasked: string;
  customerName: string;
  planName: string;
  daysUntilExpiry: number;
  /** Commission amount the affiliate earns if the customer renews. */
  commissionAmount: number;
}

/** Email body sent to the affiliate to notify of a renewal opportunity. */
export function renderAffiliateRenewalEmail(args: AffiliateRenewalArgs): {
  subject: string;
  html: string;
} {
  const {
    affiliateFirstName,
    customerEmailMasked,
    customerName,
    planName,
    daysUntilExpiry,
    commissionAmount,
  } = args;
  const formattedAmount = `₱${commissionAmount.toLocaleString()}`;
  const isUrgent = daysUntilExpiry <= 3;
  const subject = isUrgent
    ? `${formattedAmount} renewal opportunity — ${customerName} expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`
    : `${formattedAmount} renewal opportunity — ${customerName} expires in ${daysUntilExpiry} days`;
  const html = emailLayout({
    preview: `Reach out to ${customerName} to renew their ${planName} plan and earn another ${formattedAmount}.`,
    body: `
      <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;line-height:28px;">
        ${isUrgent ? "⏰ " : "💰 "}${formattedAmount} renewal opportunity
      </h1>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Hi ${escapeHtml(affiliateFirstName)},
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        One of your referrals is up for renewal:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;width:100%;background:#F6F7FB;border-radius:10px;">
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0;font-size:14px;line-height:20px;color:#0A0A10;">
              <strong>${escapeHtml(customerName)}</strong>
            </p>
            <p style="margin:2px 0 0 0;font-size:12px;line-height:18px;color:#555866;">
              ${escapeHtml(customerEmailMasked)} · ${escapeHtml(planName)} · expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? "day" : "days"}
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Reach out to them with a renewal nudge. When they pay, forward
        the payment to the admin and you&rsquo;ll earn another
        <strong>${formattedAmount}</strong> commission.
      </p>
      ${emailButton("Open my affiliate dashboard", "https://www.crediblyai.com/affiliate")}
      ${emailMutedText("Tip: customers respond better to a quick personal message than a generic reminder. Mention the specific feature they got the most value from.")}
    `,
  });
  return { subject, html };
}
