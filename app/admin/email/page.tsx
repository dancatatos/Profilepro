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
  CalendarClock,
  CheckCircle2,
  Loader2,
  Mail,
  PlayCircle,
  Send,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auth as firebaseAuth } from "@/lib/firebase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/store/uiStore";

type Status = "idle" | "sending" | "sent" | "error";
type CronStatus = "idle" | "running" | "done" | "error";

interface CronResult {
  scanned: number;
  windowsMatched: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  windows?: { label: string; sent: number; skipped: number; failed: number }[];
}

export default function AdminEmailPage() {
  const { account } = useAuth();
  const [to, setTo] = useState(account?.email ?? "");
  const [name, setName] = useState(account?.displayName ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  /* Cron testing state */
  const [cronStatus, setCronStatus] = useState<CronStatus>("idle");
  const [cronResult, setCronResult] = useState<CronResult | null>(null);
  const [cronError, setCronError] = useState("");

  const runCron = async () => {
    setCronStatus("running");
    setCronError("");
    setCronResult(null);
    try {
      const user = firebaseAuth.currentUser;
      if (!user) {
        setCronStatus("error");
        setCronError("Not signed in.");
        return;
      }
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/run-cron", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        result?: CronResult;
      };
      if (!data.ok) {
        setCronStatus("error");
        setCronError(
          data.reason === "firebase_admin_not_configured"
            ? "FIREBASE_ADMIN_* env vars aren't set in Vercel — see /admin/email setup notes."
            : data.reason === "cron_secret_not_set"
              ? "CRON_SECRET env var isn't set in Vercel."
              : data.reason === "not_admin"
                ? "Your account isn't marked as admin."
                : data.reason === "email_not_configured"
                  ? "RESEND_API_KEY isn't set in Vercel."
                  : data.reason || "Cron run failed.",
        );
        toast.error("Cron run failed.");
        return;
      }
      setCronStatus("done");
      setCronResult(data.result ?? null);
      toast.success(
        `Cron ran — ${data.result?.emailsSent ?? 0} email${
          data.result?.emailsSent === 1 ? "" : "s"
        } sent.`,
      );
    } catch (err) {
      setCronStatus("error");
      setCronError(err instanceof Error ? err.message : "Network error.");
      toast.error("Cron run failed.");
    }
  };

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
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
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

      {/* Renewal reminder cron — Phase 6C */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-electric-300" />
          <h2 className="font-display text-sm font-semibold text-white">
            Renewal reminders cron
          </h2>
          <Badge tone="blue">Daily 9 AM PHT</Badge>
        </div>
        <p className="text-xs text-white/55">
          Runs once a day and emails: a heads-up to customers whose plan
          expires in 14 days or 3 days, plus a commission-opportunity ping
          to their affiliate. Also sends a recovery prompt the day after
          a plan has expired. Each (user, window, day) combo is dedup&apos;d via
          Firestore so re-runs are safe.
        </p>
        <p className="text-xs text-white/55">
          You can trigger it manually below for testing — useful if you want
          to send today&apos;s reminders before the morning cron fires.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={runCron}
            loading={cronStatus === "running"}
            disabled={cronStatus === "running"}
            leftIcon={<PlayCircle className="h-4 w-4" />}
          >
            Run renewal cron now
          </Button>
          {cronStatus === "running" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Scanning users…
            </span>
          )}
        </div>
        {cronStatus === "done" && cronResult && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-jade-500/30 bg-jade-500/[0.05] p-3 text-xs text-jade-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">
                  Scanned {cronResult.scanned} users.{" "}
                  {cronResult.emailsSent} email
                  {cronResult.emailsSent === 1 ? "" : "s"} sent,{" "}
                  {cronResult.emailsSkipped} skipped (already sent today),{" "}
                  {cronResult.emailsFailed} failed.
                </p>
                {cronResult.windowsMatched === 0 && (
                  <p className="mt-1 text-jade-300/75">
                    No users currently fall in any of the reminder windows —
                    that&apos;s expected if no subscriptions are within 14
                    days of expiring.
                  </p>
                )}
              </div>
            </div>
            {cronResult.windows && cronResult.windowsMatched > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {cronResult.windows.map((w) => (
                  <div
                    key={w.label}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                      {w.label}
                    </p>
                    <p className="mt-1 text-xs text-white">
                      <span className="font-semibold text-jade-300">
                        {w.sent}
                      </span>{" "}
                      sent
                      {w.skipped > 0 && (
                        <span className="text-white/40">
                          {" "}
                          · {w.skipped} skipped
                        </span>
                      )}
                      {w.failed > 0 && (
                        <span className="text-red-300">
                          {" "}
                          · {w.failed} failed
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {cronStatus === "error" && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.05] p-3 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>{cronError}</p>
          </div>
        )}
      </Card>

      {/* Setup checklist for Phase 6C */}
      <Card className="border border-electric-500/20 bg-electric-500/[0.04] p-5">
        <h3 className="font-display text-sm font-semibold text-white">
          Phase 6C setup — extra env vars needed
        </h3>
        <p className="mt-1 text-xs text-white/55">
          The cron needs server-side Firebase Admin credentials and a
          random secret. Add these to Vercel → Settings → Environment
          Variables, then redeploy.
        </p>
        <ul className="mt-3 space-y-2 text-xs text-white/65">
          <li>
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-white/85">
              FIREBASE_ADMIN_PROJECT_ID
            </code>
            ,{" "}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-white/85">
              FIREBASE_ADMIN_CLIENT_EMAIL
            </code>
            ,{" "}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-white/85">
              FIREBASE_ADMIN_PRIVATE_KEY
            </code>{" "}
            — generate at Firebase Console → Project Settings → Service
            Accounts → &ldquo;Generate new private key&rdquo;. Paste the
            three values from the downloaded JSON.
          </li>
          <li>
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-white/85">
              CRON_SECRET
            </code>{" "}
            — any random string (e.g.{" "}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-white/85">
              openssl rand -hex 32
            </code>
            ). Vercel automatically passes it as a Bearer token when
            calling the cron route.
          </li>
        </ul>
      </Card>

      {/* What's next */}
      <Card className="border border-white/[0.06] bg-white/[0.02] p-5">
        <h3 className="font-display text-sm font-semibold text-white">
          Coming after Phase 6C
        </h3>
        <ul className="mt-2 space-y-1.5 text-xs text-white/60">
          <li>• Commission-earned email to affiliate (on admin upgrade).</li>
          <li>• Commission-paid email to affiliate (on payout marking).</li>
          <li>• Auto-sent invite emails (replacing copy-paste).</li>
          <li>• Customer welcome &amp; lifecycle sequences.</li>
        </ul>
      </Card>
    </div>
  );
}
