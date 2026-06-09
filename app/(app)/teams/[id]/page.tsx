"use client";

/**
 * Team space editor — tabs: Events / Members / Settings.
 *
 * Session 1 ships:
 *   - Events: list (newest first) + "New event" CTA → /teams/[id]/events/new
 *   - Members: count + list with join-via badge
 *   - Settings: name, description, banner, join code (copy + regenerate),
 *               share-team URL display, delete with confirm
 *
 * Session 2 adds: QR generator, link share modal, event detail editor.
 * Session 3 adds: notification triggers (email + push).
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Plus,
  QrCode,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { QRBlock } from "@/components/qr/QRBlock";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUploadField } from "@/components/profile/ImageUploadField";
import {
  deleteTeamSpace,
  getTeamSpace,
  listEventsForTeamSpace,
  listTeamMembershipsForSpace,
  updateTeamSpace,
} from "@/lib/firebase/firestore";
import { cn, getAppOrigin, timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { TeamEvent, TeamMembership, TeamSpace } from "@/types";

type TabKey = "events" | "members" | "settings";

export default function TeamEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { account, loading: authLoading } = useAuth();

  const [space, setSpace] = useState<TeamSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("events");

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    const s = await getTeamSpace(params.id);
    setSpace(s);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) {
    return <FullScreenLoader label="Loading team…" />;
  }

  if (!space) {
    return (
      <div className="space-y-5">
        <PageHeader title="Team not found" />
        <Button href="/teams" variant="outline">
          ← Back
        </Button>
      </div>
    );
  }

  if (account && space.ownerId !== account.uid) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Not your team"
          subtitle="You can only edit teams you own."
        />
        <Button href="/teams" variant="outline">
          ← Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button
          href="/teams"
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Back
        </Button>
        <Badge tone="blue">
          {space.memberCount ?? 0} member
          {(space.memberCount ?? 0) === 1 ? "" : "s"}
        </Badge>
      </div>

      <PageHeader title={space.name} subtitle={space.description ?? "Team space"} />

      <div className="flex gap-1 border-b border-white/[0.07]">
        {(
          [
            { key: "events" as const, label: "Events", icon: Calendar },
            { key: "members" as const, label: "Members", icon: Users },
            { key: "settings" as const, label: "Settings", icon: Settings },
          ]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "relative -mb-px flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "text-white"
                : "text-white/45 hover:text-white/75",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-electric-400" />
            )}
          </button>
        ))}
      </div>

      {tab === "events" && <EventsTab space={space} />}
      {tab === "members" && <MembersTab spaceId={space.id} />}
      {tab === "settings" && (
        <SettingsTab
          space={space}
          onChange={(next) => setSpace(next)}
          onDeleted={() => router.push("/teams")}
        />
      )}
    </div>
  );
}

/* ============================================================
   EVENTS TAB
   ============================================================ */

function EventsTab({ space }: { space: TeamSpace }) {
  const router = useRouter();
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await listEventsForTeamSpace(space.id).catch(() => []);
      if (!cancelled) {
        setEvents(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [space.id]);

  const now = Date.now();
  const upcoming = events
    .filter((e) => e.endAt >= now && e.status !== "canceled")
    .sort((a, b) => a.startAt - b.startAt);
  const past = events
    .filter((e) => e.endAt < now || e.status === "canceled")
    .sort((a, b) => b.startAt - a.startAt);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => router.push(`/teams/${space.id}/events/new`)}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          size="sm"
        >
          New event
        </Button>
      </div>

      {loading ? (
        <Card className="p-6 text-center text-sm text-white/40">Loading events…</Card>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05]">
            <Calendar className="h-6 w-6 text-white/40" />
          </span>
          <p className="text-sm font-medium text-white">No events yet</p>
          <p className="mt-1 text-xs text-white/50">
            Create your first event and your members get notified by email + push
            once you publish.
          </p>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Upcoming
              </p>
              {upcoming.map((e) => (
                <EventRow key={e.id} event={e} spaceId={space.id} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Past + canceled
              </p>
              {past.map((e) => (
                <EventRow key={e.id} event={e} spaceId={space.id} dimmed />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventRow({
  event,
  spaceId,
  dimmed,
}: {
  event: TeamEvent;
  spaceId: string;
  dimmed?: boolean;
}) {
  const router = useRouter();
  const start = new Date(event.startAt);
  const when = start.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <Card
      onClick={() =>
        router.push(`/teams/${spaceId}/events/${event.id}`)
      }
      className={cn(
        "flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:border-electric-500/30",
        dimmed && "opacity-60",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-500/15 text-electric-300">
        <Calendar className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{event.title}</p>
        <p className="mt-0.5 text-xs text-white/45">
          {when} · {event.timezone}
        </p>
      </div>
      {event.status === "canceled" && <Badge tone="neutral">Canceled</Badge>}
    </Card>
  );
}

/* ============================================================
   MEMBERS TAB
   ============================================================ */

function MembersTab({ spaceId }: { spaceId: string }) {
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await listTeamMembershipsForSpace(spaceId).catch(() => []);
      if (!cancelled) {
        setMembers(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  if (loading) {
    return (
      <Card className="p-6 text-center text-sm text-white/40">
        Loading members…
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-white/55">
        No members yet. Share your join link or QR from the Settings tab.
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-white/[0.06] p-0">
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-white/55">
            <Users className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {m.userId}
            </p>
            <p className="mt-0.5 text-xs text-white/45">
              Joined {timeAgo(m.joinedAt)} · via {m.joinedVia}
            </p>
          </div>
          {m.role === "owner" && <Badge tone="blue">Owner</Badge>}
        </div>
      ))}
    </Card>
  );
}

/* ============================================================
   SETTINGS TAB
   ============================================================ */

function SettingsTab({
  space,
  onChange,
  onDeleted,
}: {
  space: TeamSpace;
  onChange: (next: TeamSpace) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description ?? "");
  const [bannerUrl, setBannerUrl] = useState(space.bannerUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const joinUrl = `${getAppOrigin()}/join/team/${space.activationCode}`;

  const save = async () => {
    setSaving(true);
    try {
      const patch: Partial<TeamSpace> = {
        name: name.trim() || space.name,
        description,
        bannerUrl: bannerUrl || undefined,
      };
      await updateTeamSpace(space.id, patch);
      onChange({ ...space, ...patch });
      toast.success("Saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied.`),
      () => toast.error("Couldn't copy — copy manually."),
    );
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTeamSpace(space.id);
      toast.success("Team deleted.");
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Join link + code + QR */}
      <Card className="space-y-3 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
          Invite to team
        </p>
        <p className="text-xs text-white/55">
          Share this link, code, or QR with your team. Anyone who opens
          it can sign up + join in two taps.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-electric-300">
            {joinUrl}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(joinUrl, "Join link")}
            leftIcon={<Copy className="h-3.5 w-3.5" />}
          >
            Copy
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-white/80">
            {space.activationCode}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(space.activationCode, "Code")}
            leftIcon={<Copy className="h-3.5 w-3.5" />}
          >
            Copy code
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={() => setQrOpen(true)}
          leftIcon={<QrCode className="h-3.5 w-3.5" />}
        >
          Show QR code
        </Button>
      </Card>

      {/* Details */}
      <Card className="space-y-3 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
          Details
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/55">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-electric-500/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/55">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this team for?"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/55">
            Banner
          </label>
          <ImageUploadField
            value={bannerUrl}
            onChange={(url) => setBannerUrl(url ?? "")}
            folder="media"
          />
        </div>
        <Button onClick={save} loading={saving} disabled={saving}>
          Save
        </Button>
      </Card>

      {/* Danger zone */}
      <Card className="space-y-2 border-red-500/15 bg-red-500/[0.02] p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-red-300/80">
          Danger zone
        </p>
        <p className="text-xs text-white/55">
          Deleting removes the team, all events, all memberships, all RSVPs.
          Cannot be undone.
        </p>
        <Button
          variant="outline"
          onClick={() => setConfirmDelete(true)}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          className="!border-red-500/30 !text-red-300 hover:!bg-red-500/10"
        >
          Delete team
        </Button>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        loading={deleting}
        onCancel={() => !deleting && setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={`Delete "${space.name}"?`}
        confirmLabel="Delete team"
        body={
          <p>
            Every event, RSVP, and membership tied to this team will be
            permanently removed.
          </p>
        }
      />

      <Modal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title="Team join QR"
        description="Print this on banners or show on a screen — scanning takes anyone to the join page."
      >
        <div className="space-y-3 pb-2">
          <QRBlock value={joinUrl} display={260} fileName={`team-${space.id}`} />
          <p className="text-center text-[11px] text-white/45">
            Or share the direct link: <code>{joinUrl}</code>
          </p>
        </div>
      </Modal>
    </div>
  );
}
