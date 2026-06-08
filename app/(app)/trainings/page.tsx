"use client";

/**
 * Trainings landing page — the user's hub for their user-owned courses.
 *
 * Two tabs:
 *   - "Created by me"  → trainings the user authored or cloned
 *   - "My library"     → trainings other creators have given them
 *                        access to (Session 2)
 *
 * Session 1 ships the "Created by me" side end-to-end (list +
 * create + placeholder editor). The library tab renders an empty
 * "coming soon" state for now so the navigation feels complete.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap, KeyRound, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanAccess } from "@/components/providers/PlanProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { FullScreenLoader } from "@/components/ui/Spinner";
import {
  cloneTraining,
  createTraining,
  getProfile,
  getTraining,
  getTrainingByShareCode,
  listTrainingAccessForUser,
  listTrainingsByOwner,
} from "@/lib/firebase/firestore";
import { resolveUserTrainingsCreateLimit } from "@/lib/constants";
import { cn, timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Training, TrainingAccess } from "@/types";

/* Build a URL-safe slug from a title. Mirrors the funnel slug helper. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

type TabKey = "created" | "library";

export default function TrainingsPage() {
  const router = useRouter();
  const { account, loading: authLoading } = useAuth();
  const { plans } = usePlanAccess();

  /* Plan limit. 0 = blocked from creating; positive = creator. The
     library tab is always accessible regardless of this number. */
  const createLimit = resolveUserTrainingsCreateLimit(account, plans);
  const canCreate = createLimit > 0;

  const [tab, setTab] = useState<TabKey>("created");
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(false);

  /* Create modal state. */
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  /* Clone-with-code modal state. */
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneCode, setCloneCode] = useState("");
  const [cloning, setCloning] = useState(false);

  const load = useCallback(async () => {
    if (!account) return;
    if (account.uid === "demo") {
      setTrainings([]);
      return;
    }
    setLoading(true);
    try {
      setTrainings(await listTrainingsByOwner(account.uid));
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    load();
  }, [load]);

  const remainingSlots = Math.max(0, createLimit - trainings.length);

  const handleClone = async () => {
    if (!account) return;
    const raw = cloneCode.trim().toUpperCase();
    if (!raw) {
      toast.error("Paste a share code first.");
      return;
    }
    if (trainings.length >= createLimit) {
      toast.error(
        "You've used all your training slots. Upgrade your plan to clone more.",
      );
      return;
    }
    setCloning(true);
    try {
      const source = await getTrainingByShareCode(raw);
      if (!source) {
        toast.error("That share code didn't match any training.");
        setCloning(false);
        return;
      }
      if (source.ownerId === account.uid) {
        toast.error("You can't clone your own training.");
        setCloning(false);
        return;
      }
      const newId = await cloneTraining(source, account.uid);
      toast.success("Cloned — open it to edit your copy and share with your team.");
      router.push(`/trainings/${newId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clone failed.");
      setCloning(false);
    }
  };

  const handleCreate = async () => {
    if (!account) return;
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Give your training a title first.");
      return;
    }
    if (trainings.length >= createLimit) {
      toast.error(
        "You've used all your training slots. Upgrade your plan to create more.",
      );
      return;
    }
    setCreating(true);
    try {
      const slug =
        slugify(trimmed) || `training-${Math.random().toString(36).slice(2, 8)}`;
      const id = await createTraining(account.uid, { title: trimmed, slug });
      toast.success("Training created — let's add some lessons.");
      router.push(`/trainings/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create training.");
      setCreating(false);
    }
  };

  if (authLoading || !account) {
    return <FullScreenLoader label="Loading…" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trainings"
        subtitle={
          canCreate
            ? `${trainings.length} of ${createLimit === 999 ? "unlimited" : createLimit} training slot${createLimit === 1 ? "" : "s"} used`
            : "Watch the trainings your team leader gave you access to."
        }
        action={
          canCreate && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCloneOpen(true)}
                leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                disabled={trainings.length >= createLimit}
              >
                Clone with code
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                disabled={trainings.length >= createLimit}
              >
                New training
              </Button>
            </div>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.07]">
        {(
          [
            { key: "created" as const, label: "Created by me" },
            { key: "library" as const, label: "My library" },
          ]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "relative -mb-px px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "text-white"
                : "text-white/45 hover:text-white/75",
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-electric-400" />
            )}
          </button>
        ))}
      </div>

      {tab === "created" ? (
        <CreatedTab
          loading={loading}
          trainings={trainings}
          canCreate={canCreate}
          remainingSlots={remainingSlots}
          onCreate={() => setCreateOpen(true)}
        />
      ) : (
        <LibraryTab />
      )}

      <Modal
        open={cloneOpen}
        onClose={() => !cloning && setCloneOpen(false)}
        title="Clone a training"
        description="Paste a share code from another leader to make your own copy."
        size="sm"
      >
        <div className="space-y-3 pb-2">
          <input
            autoFocus
            value={cloneCode}
            onChange={(e) => setCloneCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !cloning && cloneCode.trim()) handleClone();
            }}
            placeholder="SHARE-XXXXX"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 font-mono text-sm uppercase tracking-wider text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
            disabled={cloning}
          />
          <p className="rounded-lg bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/55">
            Cloning makes an independent copy that <strong>you own</strong>. You&apos;ll
            get your own activation code so progress from your team goes to you,
            not the original leader. Uses one of your training slots.
          </p>
          <div className="flex gap-2">
            <Button
              fullWidth
              variant="outline"
              onClick={() => setCloneOpen(false)}
              disabled={cloning}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={handleClone}
              loading={cloning}
              disabled={cloning || !cloneCode.trim()}
              leftIcon={<KeyRound className="h-3.5 w-3.5" />}
            >
              Clone
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="New training"
        description="Give your training a working title. You can change it later."
        size="sm"
      >
        <div className="space-y-3 pb-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !creating && title.trim()) handleCreate();
            }}
            placeholder="e.g. Team Onboarding 101"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60"
            disabled={creating}
          />
          <div className="flex gap-2">
            <Button
              fullWidth
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={handleCreate}
              loading={creating}
              disabled={creating || !title.trim()}
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- Created tab ---------------- */

function CreatedTab({
  loading,
  trainings,
  canCreate,
  remainingSlots,
  onCreate,
}: {
  loading: boolean;
  trainings: Training[];
  canCreate: boolean;
  remainingSlots: number;
  onCreate: () => void;
}) {
  if (loading && trainings.length === 0) {
    return <Card className="p-8 text-center text-sm text-white/40">Loading…</Card>;
  }

  if (!canCreate) {
    return (
      <EmptyState
        icon="GraduationCap"
        title="Creating trainings is a Pro feature"
        description="Upgrade to Pro to build your own training that you can share with your team via an activation code. Each Pro plan includes 1 training slot."
        action={
          <Button href="/billing" leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
            See plans
          </Button>
        }
      />
    );
  }

  if (trainings.length === 0) {
    return (
      <EmptyState
        icon="GraduationCap"
        title="No trainings yet"
        description="Bundle your knowledge into a training your team can watch anytime. Pick team mode (share-code unlock), paid mode (receipt-approval), or public mode (anyone with the link)."
        action={
          <Button onClick={onCreate} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            Create your first training
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {trainings.map((t) => (
        <TrainingRow key={t.id} training={t} />
      ))}
      {remainingSlots > 0 && (
        <p className="pt-1 text-xs text-white/35">
          {remainingSlots} more training slot{remainingSlots === 1 ? "" : "s"} available.
        </p>
      )}
    </div>
  );
}

function TrainingRow({ training }: { training: Training }) {
  const router = useRouter();
  return (
    <Card
      onClick={() => router.push(`/trainings/${training.id}`)}
      className="flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:border-electric-500/30"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-500/15 text-electric-300">
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {training.title}
        </p>
        <p className="mt-0.5 text-xs text-white/45">
          {training.lessons?.length ?? 0} lesson
          {(training.lessons?.length ?? 0) === 1 ? "" : "s"} · Updated{" "}
          {timeAgo(training.updatedAt)}
        </p>
      </div>
      <div className="hidden gap-1.5 sm:flex">
        <Badge tone={training.status === "published" ? "blue" : "neutral"}>
          {training.status === "published" ? "Published" : "Draft"}
        </Badge>
        <Badge tone="neutral">
          {training.distribution === "paid"
            ? "Paid"
            : training.distribution === "team"
              ? "Team"
              : "Public"}
        </Badge>
      </div>
    </Card>
  );
}

/* ---------------- Library tab ---------------- */

interface LibraryRow {
  access: TrainingAccess;
  training: Training | null;
  ownerUsername: string | null;
}

function LibraryTab() {
  const { account } = useAuth();
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!account || account.uid === "demo") {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const accesses = await listTrainingAccessForUser(account.uid);
      /* Fan out training + owner-profile reads. For the typical "1-10
         unlocked trainings" case the parallel reads are fine; if the
         library grows beyond ~50 we'd batch with `in`-queries. */
      const built = await Promise.all(
        accesses.map(async (a) => {
          const [training, profile] = await Promise.all([
            getTraining(a.trainingId).catch(() => null),
            getProfile(a.ownerId).catch(() => null),
          ]);
          return {
            access: a,
            training,
            ownerUsername: profile?.username ?? null,
          } as LibraryRow;
        }),
      );
      if (!cancelled) {
        /* Filter out rows whose underlying training was deleted —
           cleanup happens elsewhere; here we just hide the broken card. */
        setRows(built.filter((r) => r.training !== null));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  if (loading) {
    return (
      <Card className="p-8 text-center text-sm text-white/40">
        Loading your library…
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="BookOpen"
        title="Your library is empty"
        description="When your team leader gives you an activation code, the unlocked training will appear here."
        action={
          <Button
            href="/training"
            leftIcon={<KeyRound className="h-3.5 w-3.5" />}
          >
            Have a code? Unlock it
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <LibraryRowCard key={row.access.id} row={row} />
      ))}
      <div className="pt-1 text-center">
        <Link
          href="/training"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-electric-300 hover:text-electric-200"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Have another code? Unlock more
        </Link>
      </div>
    </div>
  );
}

function LibraryRowCard({ row }: { row: LibraryRow }) {
  const t = row.training;
  if (!t) return null;
  const watchHref =
    row.ownerUsername ? `/${row.ownerUsername}/t/${t.slug}` : "#";
  return (
    <Link href={watchHref}>
      <Card className="flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:border-electric-500/30">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-500/15 text-electric-300">
          <BookOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{t.title}</p>
          <p className="mt-0.5 text-xs text-white/45">
            {t.lessons?.length ?? 0} lesson
            {(t.lessons?.length ?? 0) === 1 ? "" : "s"} · Unlocked{" "}
            {timeAgo(row.access.unlockedAt)}
          </p>
        </div>
        <Badge tone="neutral">Watch</Badge>
      </Card>
    </Link>
  );
}
