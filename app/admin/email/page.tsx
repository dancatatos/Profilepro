"use client";

/**
 * Admin → Email infrastructure status + send-test action.
 *
 * Phase 6B home: confirms Resend is wired correctly and lets the admin
 * send a test email to any address. Once the renewal-reminder cron lands
 * in Phase 6C, this page will also surface recent sends + bounces.
 */

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/store/uiStore";

type Status = "idle" | "sending" | "sent" | "error";

export default function AdminEmailPage() {
  const { account } = useAuth();
  const [to, setTo] = useState(account?.email ?? "");
  const [name, setName] = useState(account?.displayName ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const sendTest = async () => {
    setStatus("sending");
    setErrorMessage("");
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), name: name.trim() }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        message?: string;
        error?: string;
      };
      if (!data.ok) {
        setStatus("error");
        setErrorMessage(
          data.message ||
            data.error ||
            (data.reason === "not_configured"
              ? "Resend isn't configured. Add RESEND_API_KEY in Vercel."
              : data.reason === "invalid_email"
                ? "That's not a valid email address."
                : "Send failed."),
        );
        toast.error("Send failed.");
        return;
      }
      setStatus("sent");
      toast.success(`Test email sent to ${to.trim()}.`);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Network error.",
      );
      toast.error("Send failed.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Email</h1>
        <p className="text-sm text-white/45">
          Transactional email infrastructure. Used for renewal reminders,
          commission notifications and affiliate invites.
        </p>
      </div>

      {/* Status overview */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold text-white">
            Resend status
          </h2>
          <Badge tone="jade">Phase 6B</Badge>
        </div>
        <div className="space-y-2 text-xs text-white/55">
          <p>
            ✅ <strong className="text-white/85">SDK installed</strong> · Resend
            client + send helper are in place.
          </p>
          <p>
            ✅{" "}
            <strong className="text-white/85">Test endpoint live</strong> ·{" "}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-white/70">
              POST /api/email/test
            </code>{" "}
            wraps the send helper.
          </p>
          <p>
            ⚙️{" "}
            <strong className="text-white/85">
              Needs RESEND_API_KEY set in Vercel
            </strong>{" "}
            — if you see &ldquo;not configured&rdquo; below, add it in
            Settings → Environment Variables and redeploy.
          </p>
          <p>
            ⚙️{" "}
            <strong className="text-white/85">
              Needs custom domain verified in Resend
            </strong>{" "}
            (so emails come from{" "}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-white/70">
              noreply@crediblyai.com
            </code>{" "}
            instead of the fallback{" "}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-white/70">
              onboarding@resend.dev
            </code>
            ). Once verified, set{" "}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-white/70">
              EMAIL_FROM
            </code>{" "}
            env var to{" "}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-white/70">
              Credibly &lt;noreply@crediblyai.com&gt;
            </code>
            .
          </p>
        </div>
      </Card>

      {/* Send test */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-electric-300" />
          <h2 className="font-display text-sm font-semibold text-white">
            Send a test email
          </h2>
        </div>
        <p className="text-xs text-white/45">
          Useful right after adding the API key — confirms end-to-end
          delivery before we wire up renewal reminders.
        </p>
        <Input
          label="Send to"
          type="email"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          placeholder="you@example.com"
        />
        <Input
          label="Recipient name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dan"
          hint="Just used in the email greeting."
        />
        <Button
          onClick={sendTest}
          loading={status === "sending"}
          disabled={status === "sending" || !to.trim()}
          leftIcon={<Send className="h-4 w-4" />}
        >
          Send test email
        </Button>

        {status === "sent" && (
          <div className="flex items-start gap-2 rounded-xl border border-jade-500/30 bg-jade-500/[0.05] p-3 text-xs text-jade-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p>
              Sent. Check the inbox at <strong>{to.trim()}</strong>. If it
              landed in spam, that&apos;s usually a DNS verification issue —
              double-check the 3 DNS records show as verified in the Resend
              Domains tab.
            </p>
          </div>
        )}
        {status === "error" && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.05] p-3 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}
        {status === "sending" && (
          <div className="flex items-center gap-2 text-xs text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </div>
        )}
      </Card>

      {/* What's next */}
      <Card className="border border-electric-500/20 bg-electric-500/[0.04] p-5">
        <h3 className="font-display text-sm font-semibold text-white">
          Coming next (Phase 6C)
        </h3>
        <ul className="mt-2 space-y-1.5 text-xs text-white/60">
          <li>
            • Vercel Cron daily run → checks for subscriptions expiring in
            14 days, 3 days, and yesterday.
          </li>
          <li>
            • Renewal-reminder emails to BOTH the customer (heads-up) AND
            their affiliate (commission opportunity).
          </li>
          <li>• Commission notifications when an admin marks one as paid.</li>
          <li>• Auto-sent affiliate invite emails (replaces copy-paste).</li>
        </ul>
      </Card>
    </div>
  );
}
