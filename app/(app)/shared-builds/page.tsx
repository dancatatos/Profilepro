"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Copy,
  Crown,
  Eye,
  EyeOff,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileStore } from "@/store/profileStore";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FullScreenLoader } from "@/components/ui/Spinner";
import {
  deleteSavedBuild,
  deleteSharedBuild,
  listMySharedBuilds,
  listSavedBuilds,
  lookupSharedBuildByCode,
  saveBuildToLocker,
  saveProfile,
  setSharedBuildRevoked,
} from "@/lib/firebase/firestore";
import { applyExactBuild } from "@/lib/sharedBuilds";
import { applyGeneratedContent } from "@/lib/ai/generators";
import { getTemplateLockerSlots, THEMES } from "@/lib/constants";
import { cn, copyToClipboard, timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type {
  GeneratedProfileContent,
  Profile,
  SavedBuild,
  SharedBuild,
  SharedBuildContent,
  ThemeId,
} from "@/types";

/** A build queued for the apply modal — works for saved or code-found builds. */
interface ApplyTarget {
  name: string;
  ownerName: string;
  themeId: ThemeId;
  build: SharedBuildContent;
}

function themeBackground(themeId: ThemeId): string {
  return (THEMES.find((t) => t.id === themeId) ?? THEMES[0]).background;
}

export default function SharedBuildsPage() {
  const router = useRouter();
  const { account, loading: authLoading } = useAuth();
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);

  const plan = account?.plan ?? "free";
  const isPaid = plan === "pro" || plan === "team";
  const slots = getTemplateLockerSlots(plan);

  const [saved, setSaved] = useState<SavedBuild[]>([]);
  const [published, setPublished] = useState<SharedBuild[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [code, setCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<SharedBuild | null>(null);
  const [savingCode, setSavingCode] = useState(false);

  const [applyFor, setApplyFor] = useState<ApplyTarget | null>(null);
  const [applyMode, setApplyMode] = useState<"exact" | "ai">("exact");
  const [applying, setApplying] = useState(false);

  const [replaceFor, setReplaceFor] = useState<SharedBuild | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!account || !isPaid) return;
    setLoadingData(true);
    try {
      const [s, p] = await Promise.all([
        listSavedBuilds(account.uid),
        listMySharedBuilds(account.uid),
      ]);
      setSaved(s);
      setPublished(p);
    } catch {
      toast.error("Couldn't load your shared builds.");
    } finally {
      setLoadingData(false);
    }
  }, [account, isPaid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const findCode = async () => {
    const c = code.trim();
    if (c.length < 3) {
      toast.error("Enter a share code.");
      return;
    }
    setLooking(true);
    setFound(null);
    try {
      const result = await lookupSharedBuildByCode(c);
      if (!result) toast.error("No active build found for that code.");
      else setFound(result);
    } catch {
      toast.error("Lookup failed — please try again.");
    } finally {
      setLooking(false);
    }
  };

  const saveToLocker = async (build: SharedBuild, replaceId?: string) => {
    if (!account) return;
    setSavingCode(true);
    try {
      await saveBuildToLocker(
        account.uid,
        {
          sourceId: build.id,
          shareCode: build.shareCode,
          name: build.name,
          ownerName: build.ownerName,
          themeId: build.themeId,
          build: build.build,
        },
        replaceId,
      );
      toast.success("Saved to your locker.");
      setReplaceFor(null);
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save — try again.",
      );
    } finally {
      setSavingCode(false);
    }
  };

  const onSaveCodeBuild = (build: SharedBuild) => {
    if (saved.some((s) => s.sourceId === build.id)) {
      toast.info("That build is already in your locker.");
      return;
    }
    if (saved.length >= slots) setReplaceFor(build);
    else saveToLocker(build);
  };

  const openApply = (src: SharedBuild | SavedBuild) => {
    setApplyMode("exact");
    setApplyFor({
      name: src.name,
      ownerName: src.ownerName,
      themeId: src.themeId,
      build: src.build,
    });
  };

  const doApply = async () => {
    if (!applyFor || !account) return;
    if (!profile) {
      toast.error("Your profile is still loading — try again in a moment.");
      return;
    }
    setApplying(true);
    try {
      let next: Profile;
      if (applyMode === "exact") {
        next = applyExactBuild(profile, applyFor.build, applyFor.themeId);
      } else {
        const res = await fetch("/api/ai/clone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: {
              ...profile,
              themeId: applyFor.themeId,
              header: {
                ...profile.header,
                displayName: applyFor.ownerName,
                headline: applyFor.build.headline,
                bio: applyFor.build.bio,
              },
              sections: applyFor.build.sections,
            },
            newName: profile.header.displayName,
            mode: "professional",
            language: "english",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "AI rewrite failed.");
        next = applyGeneratedContent(
          { ...profile, themeId: applyFor.themeId },
          json.data as GeneratedProfileContent,
        );
      }
      setProfile(next);
      await saveProfile(next);
      toast.success("Build applied — opening your profile…");
      setApplyFor(null);
      router.push("/profile");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't apply the build.",
      );
    } finally {
      setApplying(false);
    }
  };

  const removeSaved = async (id: string) => {
    if (!account) return;
    setBusyId(id);
    try {
      await deleteSavedBuild(account.uid, id);
      setSaved((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Couldn't remove that build.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleRevoke = async (b: SharedBuild) => {
    setBusyId(b.id);
    try {
      await setSharedBuildRevoked(b.id, !b.revoked);
      setPublished((prev) =>
        prev.map((x) => (x.id === b.id ? { ...x, revoked: !x.revoked } : x)),
      );
      toast.success(
        b.revoked ? "Share code re-enabled." : "Share code disabled.",
      );
    } catch {
      toast.error("Couldn't update that build.");
    } finally {
      setBusyId(null);
    }
  };

  const removePublished = async (id: string) => {
    setBusyId(id);
    try {
      await deleteSharedBuild(id);
      setPublished((prev) => prev.filter((x) => x.id !== id));
      toast.success("Shared build deleted.");
    } catch {
      toast.error("Couldn't delete that build.");
    } finally {
      setBusyId(null);
    }
  };

  const copyText = async (text: string) => {
    if (await copyToClipboard(text)) toast.success("Copied");
    else toast.error("Couldn't copy.");
  };

  if (authLoading || !account) {
    return <FullScreenLoader label="Loading shared builds…" />;
  }

  /* ── Free users: upgrade prompt ── */
  if (!isPaid) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Shared Builds"
          subtitle="Pass your profile build to others — or use theirs."
        />
        <Card className="border border-gold-400/20 bg-gradient-to-b from-gold-400/[0.06] to-transparent p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500">
            <Crown className="h-6 w-6 text-ink-950" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-gold-200">
            Shared Builds is a Pro feature
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/50">
            Upgrade to publish your profile as a template, and save builds
            shared with you by your team.
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-gold-300 to-gold-500 px-5 py-2.5 text-sm font-bold text-ink-950"
          >
            Upgrade to Pro
          </Link>
        </Card>
      </div>
    );
  }

  /* ── Paid users: the full feature ── */
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Shared Builds"
          subtitle="Use a build shared with you, or manage the ones you've shared."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          loading={loadingData}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Add a build with a code */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-white">
          Add a build with a code
        </h2>
        <p className="mt-0.5 text-xs text-white/45">
          Got a share code from someone? Paste it to preview their build.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") findCode();
            }}
            placeholder="ABC-XXXXXX"
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm tracking-widest text-white outline-none placeholder:text-white/25 focus:border-electric-500/60"
          />
          <Button
            onClick={findCode}
            loading={looking}
            leftIcon={<Search className="h-4 w-4" />}
          >
            Find
          </Button>
        </div>

        {found && (
          <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 shrink-0 rounded-lg"
                style={{ background: themeBackground(found.themeId) }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {found.name}
                </p>
                <p className="truncate text-xs text-white/45">
                  Shared by {found.ownerName} · {found.build.sections.length}{" "}
                  sections
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSaveCodeBuild(found)}
                loading={savingCode}
              >
                Save to locker
              </Button>
              <Button size="sm" onClick={() => openApply(found)}>
                Use now
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Locker */}
      <div>
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/35">
          Your saved builds ({saved.length}/{slots})
        </h2>
        {saved.length === 0 ? (
          <Card className="p-6 text-center">
            <Package className="mx-auto h-7 w-7 text-white/20" />
            <p className="mt-2 text-sm font-medium text-white">
              No saved builds yet
            </p>
            <p className="mx-auto mt-0.5 max-w-xs text-xs text-white/45">
              Enter a share code above to save a build you can apply any time.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {saved.map((s) => (
              <Card key={s.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 shrink-0 rounded-lg"
                    style={{ background: themeBackground(s.themeId) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {s.name}
                    </p>
                    <p className="truncate text-xs text-white/45">
                      Shared by {s.ownerName} · saved {timeAgo(s.savedAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" fullWidth onClick={() => openApply(s)}>
                    Use this build
                  </Button>
                  <button
                    onClick={() => removeSaved(s.id)}
                    disabled={busyId === s.id}
                    aria-label="Remove saved build"
                    className="shrink-0 rounded-lg p-2 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Published builds */}
      <div>
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/35">
          Builds you&apos;ve shared ({published.length})
        </h2>
        {published.length === 0 ? (
          <Card className="p-6 text-center">
            <Sparkles className="mx-auto h-7 w-7 text-white/20" />
            <p className="mt-2 text-sm font-medium text-white">
              You haven&apos;t shared a build
            </p>
            <p className="mx-auto mt-0.5 max-w-xs text-xs text-white/45">
              Open the Profile Builder and tap &ldquo;Publish Build&rdquo; to
              share yours with a code.
            </p>
            <Link
              href="/profile"
              className="mt-3 inline-flex rounded-xl border border-white/12 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
            >
              Open Profile Builder
            </Link>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {published.map((b) => (
              <Card key={b.id} className="p-3.5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {b.name}
                    </p>
                    <p className="mt-0.5 text-xs text-white/45">
                      Created {timeAgo(b.createdAt)}
                      {b.revoked && (
                        <span className="text-red-400"> · disabled</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => copyText(b.shareCode)}
                    aria-label="Copy share code"
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-display text-xs font-bold tracking-widest transition-colors",
                      b.revoked
                        ? "border-white/10 text-white/30"
                        : "border-electric-500/30 bg-electric-500/10 text-electric-300 hover:bg-electric-500/15",
                    )}
                  >
                    {b.shareCode}
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-2.5 flex items-center gap-2 border-t border-white/[0.06] pt-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleRevoke(b)}
                    disabled={busyId === b.id}
                    leftIcon={
                      b.revoked ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )
                    }
                  >
                    {b.revoked ? "Re-enable" : "Disable"}
                  </Button>
                  <button
                    onClick={() => removePublished(b.id)}
                    disabled={busyId === b.id}
                    aria-label="Delete shared build"
                    className="ml-auto shrink-0 rounded-lg p-2 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="p-4">
        <p className="text-xs text-white/45">
          Applying a build replaces your current theme, sections, headline and
          bio. Your name, photo and contact details always stay yours, and
          shared links come in blank so you add your own.
        </p>
      </Card>

      {/* Apply modal */}
      <Modal
        open={!!applyFor}
        onClose={() => !applying && setApplyFor(null)}
        title="Use this build"
        description={
          applyFor
            ? `${applyFor.name} · shared by ${applyFor.ownerName}`
            : undefined
        }
      >
        {applyFor && (
          <div className="space-y-3 pb-2">
            <p className="text-xs text-white/45">Choose how to apply it:</p>
            <button
              onClick={() => setApplyMode("exact")}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors",
                applyMode === "exact"
                  ? "border-electric-500 bg-electric-500/10"
                  : "border-white/10 hover:border-white/20",
              )}
            >
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Copy className="h-4 w-4 text-electric-400" />
                Exact copy
              </p>
              <p className="mt-0.5 text-xs text-white/45">
                Copy the theme, layout and copy as-is — then edit it yourself.
              </p>
            </button>
            <button
              onClick={() => setApplyMode("ai")}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors",
                applyMode === "ai"
                  ? "border-electric-500 bg-electric-500/10"
                  : "border-white/10 hover:border-white/20",
              )}
            >
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Wand2 className="h-4 w-4 text-electric-400" />
                AI rewrite
              </p>
              <p className="mt-0.5 text-xs text-white/45">
                AI rewrites the copy so the build reads as original to you.
              </p>
            </button>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-xs leading-relaxed text-white/45">
                This replaces your current theme, sections, headline and bio.
                Your name, photo and contact details stay yours.
              </p>
            </div>
            <Button fullWidth onClick={doApply} loading={applying}>
              {applyMode === "ai" ? "Rewrite & apply build" : "Apply build"}
            </Button>
          </div>
        )}
      </Modal>

      {/* Replace-slot modal */}
      <Modal
        open={!!replaceFor}
        onClose={() => !savingCode && setReplaceFor(null)}
        title="Your locker is full"
        description={`Your plan keeps ${slots} saved builds. Pick one to replace.`}
      >
        <div className="space-y-2 pb-2">
          {saved.map((s) => (
            <button
              key={s.id}
              onClick={() => replaceFor && saveToLocker(replaceFor, s.id)}
              disabled={savingCode}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-2.5 text-left transition-colors hover:border-white/25 disabled:opacity-50"
            >
              <div
                className="h-9 w-9 shrink-0 rounded-md"
                style={{ background: themeBackground(s.themeId) }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {s.name}
                </p>
                <p className="truncate text-xs text-white/40">
                  Shared by {s.ownerName}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-red-400">
                Replace
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
