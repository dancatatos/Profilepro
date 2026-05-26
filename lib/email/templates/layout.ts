/**
 * Shared HTML email layout — every template wraps its body with this.
 *
 * Inline styles only (Gmail strips <style> tags), max 600px wide,
 * neutral color palette that renders consistently in light + dark
 * mode mail clients. The "view in browser" link is left as a future
 * enhancement once we add a hosted version of each email.
 *
 * Helpers exported alongside the layout:
 *   - emailButton: branded primary CTA
 *   - emailMutedText: secondary copy (legalese, signature)
 */

const BRAND = {
  primary: "#2E6BFF",
  text: "#0A0A10",
  textMuted: "#555866",
  bg: "#F6F7FB",
  cardBg: "#FFFFFF",
  border: "#E4E7EE",
};

interface LayoutOptions {
  /** Pre-header text — first preview line in most inboxes. */
  preview?: string;
  /** Body HTML to inject inside the centered card. */
  body: string;
  /** Footer line(s). Defaults to the app brand line. */
  footer?: string;
}

export function emailLayout({ preview, body, footer }: LayoutOptions): string {
  const previewBlock = preview
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preview)}</div>`
    : "";
  const footerLine =
    footer ??
    `You're receiving this because you have an account at <a href="https://www.crediblyai.com" style="color:${BRAND.textMuted};text-decoration:underline;">crediblyai.com</a>.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Credibly</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};">
${previewBlock}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td align="left" style="padding:0 0 24px 0;">
            <a href="https://www.crediblyai.com" style="text-decoration:none;color:${BRAND.text};">
              <span style="display:inline-block;font-weight:700;font-size:18px;letter-spacing:-0.01em;">Credibly</span>
            </a>
          </td>
        </tr>
        <!-- Card -->
        <tr>
          <td style="background:${BRAND.cardBg};border:1px solid ${BRAND.border};border-radius:16px;padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="left" style="padding:20px 4px 0 4px;font-size:12px;line-height:18px;color:${BRAND.textMuted};">
            ${footerLine}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Primary CTA button, inline-styled for email-client compatibility. */
export function emailButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="background:${BRAND.primary};border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:12px 20px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

/** Secondary muted paragraph — for legalese, signature, etc. */
export function emailMutedText(text: string): string {
  return `<p style="margin:16px 0 0 0;font-size:13px;line-height:20px;color:${BRAND.textMuted};">${escapeHtml(text)}</p>`;
}

/** Minimal HTML escape so dynamic values (names, emails) don't break the markup. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
