"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Handshake,
  Link2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/uiStore";
import {
  createAffiliateInvite,
  isAffiliateCodeAvailable,
  listAffiliateInvites,
  listAffiliates,
  revokeAffiliateInvite,
} from "@/lib/firebase/firestore";
import { auth as firebaseAuth } from "@/lib/firebase/client";
import {
  generateInviteToken,
  INVITE_EXPIRY_MS,
  inviteAcceptUrl,
  isValidAffiliateCodeFormat,
  maskEmail,
  referralShareUrl,
  suggestAffiliateCode,
} from "@/lib/affiliate";
import { normalizeRefCode } from "@/lib/referral";
import { copyToClipboard, isValidEmail, timeAgo } from "@/lib/utils";
import type { Affiliate, AffiliateInvite } from "@/types";

function CodeBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-electric-500/12 px-2 py-0.5 font-mono text-[11px] font-semibold text-electric-300">
      {code}
    </span>
  );
}

/* ── Invite modal ── */

function InviteAffiliateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (invite: AffiliateInvite) => void;
}) {
  const [step, setStep] = useState<"form" | "share">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<AffiliateInvite | null>(null);
  const [copied, setCopied] = useState(false);
  /* Tracks whether the auto-send email arrived at Resend successfully.
     Affects the success copy in the share step — "Invite emailed to X"
     vs "Couldn't auto-send, copy the link below". */
  const [emailStatus, setEmailStatus] = useState<"pending" | "sent" | "failed">(
    "pending",
  );

  /* Reset when reopened */
  useEffect(() => {
    if (open) {
      setStep("form");
      setName("");
      setEmail("");
      setCode("");
      setAdminNotes("");
      setInvite(null);
      setCopied(false);
      setEmailStatus("pending");
    }
  }, [open]);

  /* Auto-suggest code when name changes (only if admin hasn't typed one) */
  useEffect(() => {
    if (!name) return;
    setCode((current) => current || suggestAffiliateCode(name));
  }, [name]);

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const normalisedCode = normalizeRefCode(code);

    if (trimmedName.length < 2) {
      toast.error("Enter the affiliate's full name.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!isValidAffiliateCodeFormat(normalisedCode)) {
      toast.error("Code must be 3-32 letters/numbers.");
      return;
    }

    setSubmitting(true);
    setChecking(true);
    try {
      const available = await isAffiliateCodeAvailable(normalisedCode);
      setChecking(false);
      if (!available) {
        toast.error(`Code "${normalisedCode}" is already taken.`);
        setSubmitting(false);
        return;
      }
      const now = Date.now();
      const newInvite: AffiliateInvite = {
        token: generateInviteToken(),
        email: trimmedEmail,
        displayName: trimmedName,
        code: normalisedCode,
        status: "pending",
        adminNotes: adminNotes.trim() || undefined,
        createdAt: now,
        expiresAt: now + INVITE_EXPIRY_MS,
      };
      await createAffiliateInvite(newInvite);
      setInvite(newInvite);
      setStep("share");
      onCreated(newInvite);
      toast.success("Invite created — emailing the link…");
      /* Auto-send invite email — non-blocking. We still keep the
         copyable link in the share step as a backup, so the admin can
         resend it manually if the email gets filtered. */
      void (async () => {
        try {
          const user = firebaseAuth.currentUser;
          if (!user) {
            setEmailStatus("failed");
            return;
          }
          const idToken = await user.getIdToken();
          const res = await fetch("/api/notify/invite-sent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              token: newInvite.token,
              acceptUrl: inviteAcceptUrl(newInvite.token),
            }),
          });
          const data = (await res.json()) as { ok: boolean };
          setEmailStatus(data.ok ? "sent" : "failed");
        } catch {
          setEmailStatus("failed");
        }
      })();
    } catch {
      toast.error("Couldn't create invite. Check Firestore rules and try again.");
    } finally {
      setSubmitting(false);
      setChecking(false);
    }
  };

  const copy = async (value: string, label: string) => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      toast.success(`${label} copied.`);
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Couldn't copy — copy it manually.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === "form" ? "Invite a new affiliate" : "Share the invite link"}
      description={
        step === "form"
          ? "They'll click your link, set a password, and land in their dashboard."
          : "Send this to the affiliate. The link works for 14 days."
      }
      size="md"
    >
      {step === "form" ? (
        <div className="space-y-4 pb-4">
          <Input
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maria Santos"
            leftIcon={<UserIcon className="h-4 w-4" />}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="maria@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
          />
          <Input
            label="Referral code"
            value={code}
            onChange={(e) =>
              setCode(normalizeRefCode(e.target.value))
            }
            placeholder="MARI123"
            leftIcon={<Handshake className="h-4 w-4" />}
            hint={
              code
                ? `Their referral link will be: /r/${code}`
                : "We'll suggest one based on the name — you can edit it."
            }
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Admin notes (optional)
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Private note about this affiliate — not visible to them."
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40"
            />
          </div>
        </div>
      ) : invite ? (
        <div className="space-y-4 pb-4">
          <div className="rounded-xl border border-jade-500/30 bg-jade-500/[0.05] p-4">
            <div className="flex items-center gap-2 text-jade-300">
              <Check className="h-4 w-4" />
              <p className="text-sm font-medium">
                {emailStatus === "sent"
                  ? `Invite emailed to ${invite.email}`
                  : emailStatus === "failed"
                    ? `Invite created — email auto-send failed`
                    : `Invite created for ${invite.displayName}`}
              </p>
            </div>
            <p className="mt-1 text-xs text-jade-300/70">
              Code reserved: <span className="font-mono">{invite.code}</span>
              {emailStatus === "failed" && (
                <>
                  {" "}
                  · share the link below manually
                </>
              )}
              {emailStatus === "pending" && <> · sending email…</>}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Accept link — share this with {invite.displayName}
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3">
              <span className="flex-1 truncate text-xs text-white/65">
                {inviteAcceptUrl(invite.token)}
              </span>
              <Button
                size="sm"
                variant={copied ? "outline" : "primary"}
                leftIcon={
                  copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )
                }
                onClick={() =>
                  copy(inviteAcceptUrl(invite.token), "Invite link")
                }
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-white/40">
              They&apos;ll set a password and immediately land in their dashboard.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-white/45">
              Preview — their referral link will be
            </p>
            <p className="font-mono text-xs text-electric-300">
              {referralShareUrl(invite.code)}
            </p>
          </div>
        </div>
      ) : null}

      {step === "form" ? (
        <div className="flex gap-2 border-t border-white/[0.06] p-4 pb-safe">
          <Button variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={submit}
            loading={submitting || checking}
            disabled={submitting || checking}
          >
            Create invite
          </Button>
        </div>
      ) : (
        <div className="border-t border-white/[0.06] p-4 pb-safe">
          <Button fullWidth onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}

/* ── Page ── */

export default function AdminAffiliatesPage() {
  const { account } = useAuth();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [invites, setInvites] = useState<AffiliateInvite[]>([]);
  const [fetching, setFetching] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedTokenLink, setCopiedTokenLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const [allAffiliates, allInvites] = await Promise.all([
        listAffiliates(),
        listAffiliateInvites(),
      ]);
      setAffiliates(allAffiliates);
      setInvites(allInvites);
    } catch {
      toast.error("Could not load affiliates. Check Firestore admin rules.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "admin") load();
  }, [account, load]);

  const pendingInvites = invites.filter((i) => i.status === "pending");

  const filteredAffiliates = affiliates.filter((a) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      a.displayName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q)
    );
  });

  const activeCount = affiliates.filter((a) => a.status === "active").length;
  const pausedCount = affiliates.filter((a) => a.status === "paused").length;

  const copyInviteLink = async (invite: AffiliateInvite) => {
    const ok = await copyToClipboard(inviteAcceptUrl(invite.token));
    if (ok) {
      setCopiedTokenLink(invite.token);
      toast.success("Invite link copied.");
      setTimeout(() => setCopiedTokenLink(null), 1800);
    } else {
      toast.error("Couldn't copy.");
    }
  };

  const copyReferralLink = async (code: string) => {
    const ok = await copyToClipboard(referralShareUrl(code));
    if (ok) toast.success("Referral link copied.");
    else toast.error("Couldn't copy.");
  };

  const revoke = async (invite: AffiliateInvite) => {
    if (!confirm(`Cancel invite to ${invite.displayName} (${invite.email})?`)) return;
    try {
      await revokeAffiliateInvite(invite.token);
      setInvites((prev) => prev.filter((i) => i.token !== invite.token));
      toast.success("Invite cancelled.");
    } catch {
      toast.error("Couldn't cancel invite.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Affiliates
          </h1>
          <p className="text-sm text-white/45">
            Invite affiliates, manage codes and track their referrals.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={load}
            loading={fetching}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            onClick={() => setInviteOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Invite affiliate
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total", value: affiliates.length },
          { label: "Active", value: activeCount },
          { label: "Paused", value: pausedCount },
          { label: "Pending invites", value: pendingInvites.length, electric: true },
        ].map((s) => (
          <div
            key={s.label}
            className={
              s.electric
                ? "rounded-xl border border-electric-500/30 bg-electric-500/[0.05] px-4 py-2 text-sm"
                : "rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm"
            }
          >
            <span
              className={
                s.electric ? "text-electric-300/80" : "text-white/40"
              }
            >
              {s.label}:{" "}
            </span>
            <span className="font-semibold text-white">
              {fetching ? "…" : s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Pending invites — only show if there are any */}
      {pendingInvites.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-electric-400" />
            <h2 className="font-display text-base font-semibold text-white">
              Pending invites
            </h2>
            <Badge tone="blue">{pendingInvites.length}</Badge>
          </div>
          <p className="mb-4 text-xs text-white/45">
            Invites that haven&apos;t been accepted yet. Each link works for 14
            days.
          </p>
          <div className="space-y-2">
            {pendingInvites.map((invite) => {
              const isCopied = copiedTokenLink === invite.token;
              const expired =
                invite.expiresAt != null && Date.now() > invite.expiresAt;
              return (
                <div
                  key={invite.token}
                  className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {invite.displayName}
                      </p>
                      <CodeBadge code={invite.code} />
                      {expired && <Badge tone="danger">Expired</Badge>}
                    </div>
                    <p className="text-xs text-white/45 truncate">
                      {invite.email} · created {timeAgo(invite.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={
                        isCopied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )
                      }
                      onClick={() => copyInviteLink(invite)}
                    >
                      {isCopied ? "Copied" : "Copy link"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => revoke(invite)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Affiliate list */}
      <Card className="p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-base font-semibold text-white">
            All affiliates
          </h2>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <Input
              placeholder="Search name, email or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
        </div>

        {fetching ? (
          <div className="flex h-40 items-center justify-center text-sm text-white/40">
            Loading affiliates…
          </div>
        ) : filteredAffiliates.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-white/40">
            <Handshake className="h-8 w-8 text-white/20" />
            <p>
              {search
                ? "No affiliates match that search."
                : affiliates.length === 0
                  ? "No affiliates yet — invite your first one to get started."
                  : "No matches."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-white/40">
                  <th className="pb-3 text-left font-medium">Affiliate</th>
                  <th className="pb-3 text-left font-medium">Code</th>
                  <th className="pb-3 text-left font-medium">Joined</th>
                  <th className="pb-3 text-left font-medium">Earned</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredAffiliates.map((a) => (
                  <tr key={a.uid} className="group">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-electric-500/15 text-xs font-bold uppercase text-electric-300">
                          {(a.displayName || a.email)[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">
                            {a.displayName || "—"}
                          </p>
                          <p className="text-xs text-white/40 truncate">
                            {maskEmail(a.email)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <CodeBadge code={a.code} />
                    </td>
                    <td className="py-3 pr-4 text-white/50">
                      {timeAgo(a.createdAt)}
                    </td>
                    <td className="py-3 pr-4 text-white/70">
                      ₱{(a.stats?.totalEarned ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={a.status === "active" ? "jade" : "gold"}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Link2 className="h-3.5 w-3.5" />}
                          onClick={() => copyReferralLink(a.code)}
                        >
                          Link
                        </Button>
                        <Link href={`/admin/affiliates/${a.uid}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredAffiliates.length > 0 && (
          <p className="mt-4 text-right text-xs text-white/30">
            Showing {filteredAffiliates.length} of {affiliates.length}{" "}
            affiliates
          </p>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-xs text-white/35">
          Each affiliate gets a unique <code>/r/CODE</code> link. New users who
          click it are silently attributed for 30 days — every plan you
          manually upgrade them to will create a commission record for the
          affiliate (wired up in the next step).
        </p>
      </Card>

      <InviteAffiliateModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={(invite) =>
          setInvites((prev) => [invite, ...prev])
        }
      />
    </div>
  );
}
