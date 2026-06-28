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
  listFunnels,
  listPipelinesForUser,
  listTeamMembershipsForSpace,
  listTrainingsByOwner,
  updateTeamSpace,
} from "@/lib/firebase/firestore";
import { cn, getAppOrigin, timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type {
  Funnel,
  Pipeline,
  TeamEvent,
  TeamMembership,
  TeamSpace,
  Training,
} from "@/types";

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

      <div className="flex gap-1 border-b border-slate-200">
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
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-700",
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
        <Card className="p-6 text-center text-sm text-slate-400">Loading events…</Card>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Calendar className="h-6 w-6 text-slate-400" />
          </span>
          <p className="text-sm font-medium text-slate-900">No events yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Create your first event and your members get notified by email + push
            once you publish.
          </p>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Upcoming
              </p>
              {upcoming.map((e) => (
                <EventRow key={e.id} event={e} spaceId={space.id} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-500/15 text-electric-700">
        <Calendar className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{event.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">
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
      <Card className="p-6 text-center text-sm text-slate-400">
        Loading members…
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        No members yet. Share your join link or QR from the Settings tab.
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-slate-200 p-0">
      {members.map((m) => {
        /* Prefer the denormalised display name + email saved at join
           time. Falls back to the raw uid only for legacy memberships
           created before the denormalisation shipped — those will be
           refreshed the next time the user re-joins. */
        const name = m.userDisplayName?.trim() || m.userEmail || m.userId;
        const subtitle = m.userDisplayName && m.userEmail ? m.userEmail : null;
        return (
          <div key={m.id} className="flex items-center gap-3 p-3.5">
            {m.userPhotoURL ? (
              <img
                src={m.userPhotoURL}
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Users className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{name}</p>
              {subtitle && (
                <p className="truncate text-[11px] text-slate-500">
                  {subtitle}
                </p>
              )}
              <p className="mt-0.5 text-xs text-slate-500">
                Joined {timeAgo(m.joinedAt)} · via {m.joinedVia}
              </p>
            </div>
            {m.role === "owner" && <Badge tone="blue">Owner</Badge>}
          </div>
        );
      })}
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
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Invite to team
        </p>
        <p className="text-xs text-slate-500">
          Share this link, code, or QR with your team. Anyone who opens
          it can sign up + join in two taps.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-electric-700">
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
          <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
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
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Details
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-electric-500/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this team for?"
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-electric-500/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
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

      <BundleEditor space={space} onChange={onChange} />

      {/* Danger zone */}
      <Card className="space-y-2 border-red-500/15 bg-red-500/[0.02] p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-red-700/80">
          Danger zone
        </p>
        <p className="text-xs text-slate-500">
          Deleting removes the team, all events, all memberships, all RSVPs.
          Cannot be undone.
        </p>
        <Button
          variant="outline"
          onClick={() => setConfirmDelete(true)}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          className="!border-red-500/30 !text-red-700 hover:!bg-red-500/10"
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
          <p className="text-center text-[11px] text-slate-500">
            Or share the direct link: <code>{joinUrl}</code>
          </p>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
   ONBOARDING BUNDLE EDITOR
   ============================================================
   Lets the team owner pick which trainings / funnels / pipelines /
   events new members auto-receive when they join. Saves into the
   four autoGrant*Ids arrays on the TeamSpace doc. */

function BundleEditor({
  space,
  onChange,
}: {
  space: TeamSpace;
  onChange: (next: TeamSpace) => void;
}) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [trainingIds, setTrainingIds] = useState<string[]>(
    space.autoGrantTrainingIds ?? [],
  );
  const [funnelIds, setFunnelIds] = useState<string[]>(
    space.autoGrantFunnelIds ?? [],
  );
  const [pipelineIds, setPipelineIds] = useState<string[]>(
    space.autoGrantPipelineIds ?? [],
  );
  const [eventIds, setEventIds] = useState<string[]>(
    space.autoGrantEventIds ?? [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [t, f, p, ev] = await Promise.all([
        listTrainingsByOwner(space.ownerId).catch(() => []),
        listFunnels(space.ownerId).catch(() => []),
        listPipelinesForUser(space.ownerId).catch(() => []),
        listEventsForTeamSpace(space.id).catch(() => []),
      ]);
      if (cancelled) return;
      setTrainings(t);
      setFunnels(f);
      setPipelines(p);
      setEvents(ev.filter((e) => e.endAt > Date.now()));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [space.id, space.ownerId]);

  const totalSelected =
    trainingIds.length + funnelIds.length + pipelineIds.length + eventIds.length;
  const dirty =
    !sameSet(trainingIds, space.autoGrantTrainingIds) ||
    !sameSet(funnelIds, space.autoGrantFunnelIds) ||
    !sameSet(pipelineIds, space.autoGrantPipelineIds) ||
    !sameSet(eventIds, space.autoGrantEventIds);

  const save = async () => {
    setSaving(true);
    try {
      const patch: Partial<TeamSpace> = {
        autoGrantTrainingIds: trainingIds,
        autoGrantFunnelIds: funnelIds,
        autoGrantPipelineIds: pipelineIds,
        autoGrantEventIds: eventIds,
      };
      await updateTeamSpace(space.id, patch);
      onChange({ ...space, ...patch });
      toast.success("Onboarding bundle saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Onboarding bundle
        </p>
        <p className="mt-1 text-xs text-slate-500">
          When someone joins this team, automatically grant access to these
          items. Plan caps apply on the recruit&apos;s side — over-cap items
          are silently skipped.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Loading your library…</p>
      ) : (
        <>
          <BundleGroup
            label="Trainings"
            empty="You haven't created any trainings yet."
            items={trainings.map((t) => ({ id: t.id, label: t.title }))}
            selected={trainingIds}
            onChange={setTrainingIds}
          />
          <BundleGroup
            label="Funnels"
            empty="No funnels in your account yet."
            items={funnels.map((f) => ({ id: f.id, label: f.name }))}
            selected={funnelIds}
            onChange={setFunnelIds}
          />
          <BundleGroup
            label="Follow-up pipelines"
            empty="No pipelines in your account yet."
            items={pipelines.map((p) => ({ id: p.id, label: p.name }))}
            selected={pipelineIds}
            onChange={setPipelineIds}
          />
          <BundleGroup
            label="Upcoming events"
            empty="No upcoming events. Past events can't be auto-RSVP'd."
            items={events.map((e) => ({
              id: e.id,
              label: `${e.title} · ${new Date(e.startAt).toLocaleDateString()}`,
            }))}
            selected={eventIds}
            onChange={setEventIds}
          />

          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <p className="text-xs text-slate-500">
              {totalSelected === 0
                ? "No items selected. New members get team access only."
                : `${totalSelected} item${totalSelected === 1 ? "" : "s"} will be granted on join.`}
            </p>
            <Button
              size="sm"
              onClick={save}
              loading={saving}
              disabled={!dirty || saving}
            >
              {dirty ? "Save bundle" : "Saved"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function BundleGroup({
  label,
  empty,
  items,
  selected,
  onChange,
}: {
  label: string;
  empty: string;
  items: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {label} {selected.length > 0 && (
          <span className="ml-1 rounded bg-electric-500/15 px-1.5 py-0.5 text-[10px] text-electric-700">
            {selected.length}
          </span>
        )}
      </p>
      {items.length === 0 ? (
        <p className="text-[11px] italic text-slate-400">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => {
            const active = selected.includes(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => toggle(it.id)}
                className={cn(
                  "max-w-full truncate rounded-md border px-2 py-1 text-xs transition-colors",
                  active
                    ? "border-electric-500/50 bg-electric-500/15 text-electric-100"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900",
                )}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function sameSet(a: string[], b?: string[]): boolean {
  const bb = b ?? [];
  if (a.length !== bb.length) return false;
  const set = new Set(a);
  return bb.every((x) => set.has(x));
}
