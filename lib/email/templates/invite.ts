/**
 * Affiliate invite email — auto-sent when admin clicks "Create invite"
 * in /admin/affiliates. Replaces the previous copy-paste-the-link
 * workflow (which still works as a backup if the admin wants to send
 * the link manually via WhatsApp/Messenger).
 *
 * Subject + copy emphasises exclusivity since this is an invite-only
 * program. The accept link expires after 14 days — matching the
 * invite token expiry in the data layer.
 */

import { emailButton, emailLayout, emailMutedText, escapeHtml } from "./layout";

interface InviteEmailArgs {
  inviteeName: string;
  affiliateCode: string;
  acceptUrl: string;
  expiresInDays: number;
}

export function renderInviteEmail(args: InviteEmailArgs): {
  subject: string;
  html: string;
} {
  const { inviteeName, affiliateCode, acceptUrl, expiresInDays } = args;
  const firstName = inviteeName.split(" ")[0] || "there";
  const subject = `You're invited to the Credibly affiliate program`;
  const html = emailLayout({
    preview: `Activate your affiliate account to start earning commissions.`,
    body: `
      <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;line-height:30px;">
        🤝 You&rsquo;re invited, ${escapeHtml(firstName)}
      </h1>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Hi ${escapeHtml(firstName)},
      </p>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:24px;">
        We&rsquo;d like to bring you on board as a Credibly affiliate. The
        program is invite-only — referrals you bring earn you a commission
        on signup AND every time they renew, for as long as they stay
        subscribed.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;width:100%;background:#F6F7FB;border-radius:10px;">
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0;font-size:12px;line-height:18px;color:#555866;text-transform:uppercase;letter-spacing:0.04em;">
              Your reserved code
            </p>
            <p style="margin:4px 0 0 0;font-family:'SF Mono','Monaco','Courier New',monospace;font-size:18px;line-height:24px;color:#2E6BFF;font-weight:700;letter-spacing:0.04em;">
              ${escapeHtml(affiliateCode)}
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:15px;line-height:24px;">
        Click the button below to activate your account — you&rsquo;ll just
        need to set a password. Takes less than 60 seconds.
      </p>
      ${emailButton("Activate my affiliate account", acceptUrl)}
      <p style="margin:0;font-size:13px;line-height:20px;color:#555866;">
        Or copy this link:<br>
        <span style="word-break:break-all;color:#2E6BFF;">${escapeHtml(acceptUrl)}</span>
      </p>
      ${emailMutedText(`This invite expires in ${expiresInDays} day${expiresInDays === 1 ? "" : "s"}. If you didn't expect this email, you can ignore it — no account will be created.`)}
    `,
  });
  return { subject, html };
}
