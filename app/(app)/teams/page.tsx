"use client";

/**
 * /teams — leader's hub for team spaces.
 *
 * Gated on the Events add-on. Users without it see an "ask admin"
 * empty state instead of the actual list. (Member-facing pages
 * for joining + viewing events live elsewhere — /my-events,
 * /join/team/{code}, /join/event/{eventId}.)
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { FullScreenLoader } from "@/components/ui/Spinner";
import {
  createTeamSpace,
  listTeamSpacesByOwner,
} from "@/lib/firebase/firestore";
import {
  resolveAddOnLimit,
  userHasEventsAddOn,
} from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { TeamSpace } from "@/types";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export default function TeamsPage() {
  const router = useRouter();
  const { account, loading: authLoading } = useAuth();

  const hasAddOn = userHasEventsAddOn(account);
  const cap = resolveAddOnLimit(account, "teamSpaces");

  const [spaces, setSpaces] = useState<TeamSpace[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!account || !hasAddOn || account.uid === "demo") {
      setSpaces([]);
      return;
    }
    setLoading(true);
    try {
      setSpaces(await listTeamSpacesByOwner(account.uid));
    } catch (err) {
      console.error("[Credibly] listTeamSpacesByOwner failed:", err);
      toast.error("Couldn't load your teams.");
    } finally {
      setLoading(false);
    }
  }, [account, hasAddOn]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || !account) {
    return <FullScreenLoader label="Loading…" />;
  }

  if (!hasAddOn) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Teams"
          subtitle="Run team spaces with events + notifications for your members."
        />
        <EmptyState
          icon="Users"
          title="Events add-on isn't enabled on your account"
          description="The Events add-on lets you create team spaces, host events with reminders, and accept QR-based crowd registration. Ask your admin to enable it on your account — it isn't part of the standard plans."
          action={
            <Button href="/settings">Contact support</Button>
          }
        />
      </div>
    );
  }

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give your team a name first.");
      return;
    }
    if (spaces.length >= cap) {
      toast.error(
        `You've used all your team-space slots (${cap}). Ask your admin to raise the cap.`,
      );
      return;
    }
    setCreating(true);
    try {
      const slug =
        slugify(trimmed) || `team-${Math.random().toString(36).slice(2, 8)}`;
      const id = await createTeamSpace(account.uid, {
        name: trimmed,
        slug,
      });
      toast.success("Team created — add your first event next.");
      router.push(`/teams/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create team.");
      setCreating(false);
    }
  };

  const remaining = Math.max(0, cap - spaces.length);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teams"
        subtitle={
          cap >= 999
            ? `${spaces.length} team space${spaces.length === 1 ? "" : "s"}`
            : `${spaces.length} of ${cap} team space${cap === 1 ? "" : "s"} used`
        }
        action={
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={spaces.length >= cap}
          >
            New team
          </Button>
        }
      />

      {loading && spaces.length === 0 ? (
        <Card className="p-8 text-center text-sm text-white/40">Loading…</Card>
      ) : spaces.length === 0 ? (
        <EmptyState
          icon="Users"
          title="No team spaces yet"
          description="Create a team space, share its join link or QR with your downline / students, then start hosting events. Members get push + email reminders automatically."
          action={
            <Button
              onClick={() => setCreateOpen(true)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Create your first team
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {spaces.map((s) => (
            <TeamRow key={s.id} space={s} />
          ))}
          {remaining > 0 && cap < 999 && (
            <p className="pt-1 text-xs text-white/35">
              {remaining} more team-space slot{remaining === 1 ? "" : "s"} available.
            </p>
          )}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="New team space"
        description="Give your team a name. Members will see this on join + in their library."
        size="sm"
      >
        <div className="space-y-3 pb-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !creating && name.trim()) handleCreate();
            }}
            placeholder="e.g. Amare PH Team"
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
              disabled={creating || !name.trim()}
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

function TeamRow({ space }: { space: TeamSpace }) {
  const router = useRouter();
  return (
    <Card
      onClick={() => router.push(`/teams/${space.id}`)}
      className="flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:border-electric-500/30"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-500/15 text-electric-300">
        <Users className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {space.name}
        </p>
        <p className="mt-0.5 text-xs text-white/45">
          {space.memberCount ?? 0} member
          {(space.memberCount ?? 0) === 1 ? "" : "s"} · Updated{" "}
          {timeAgo(space.updatedAt)}
        </p>
      </div>
    </Card>
  );
}
