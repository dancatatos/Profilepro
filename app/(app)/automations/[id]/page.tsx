"use client";

/**
 * /automations/{id} — sequential automation editor (Phase 1).
 *
 * Email and Wait steps in a simple top-to-bottom list — leads flow
 * through on the lead-captured trigger. Branching conditions, task
 * steps and stage moves arrive with the visual builder in a later
 * phase; the data model already supports them.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  Mail,
  MousePointerClick,
  Plus,
  Save,
  Send,
  Eye,
  Timer,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FullScreenLoader } from "@/components/ui/Spinner";
import {
  deleteAutomation,
  getAutomation,
  getAutomationStats,
  listPipelinesForUser,
  upsertAutomation,
} from "@/lib/firebase/firestore";
import { cn, uid } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type {
  Automation,
  AutomationNode,
  AutomationScheduleNode,
  AutomationWaitNode,
  AutomationWaitUntilNode,
  Pipeline,
} from "@/types";

/** Epoch ms ⇄ <input type="datetime-local"> value (browser-local). */
function toLocalInput(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): number {
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : 0;
}

const FIELD =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/15";

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`,
}));

export default function AutomationEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { account, loading: authLoading } = useAuth();

  const [automation, setAutomation] = useState<Automation | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stats, setStats] = useState<{
    sends: number;
    opens: number;
    clicks: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!params.id || !account) return;
    setLoading(true);
    const [a, ps] = await Promise.all([
      getAutomation(params.id),
      listPipelinesForUser(account.uid).catch(() => [] as Pipeline[]),
    ]);
    setAutomation(a);
    setPipelines(ps);
    setLoading(false);
    if (a) {
      getAutomationStats(a.id, account.uid)
        .then(setStats)
        .catch(() => null);
    }
  }, [params.id, account]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) {
    return <FullScreenLoader label="Loading automation…" />;
  }
  if (!automation || (account && automation.ownerId !== account.uid)) {
    return (
      <div className="space-y-5">
        <PageHeader title="Automation not found" />
        <Button href="/automations" variant="outline">
          ← Back
        </Button>
      </div>
    );
  }

  const patch = (p: Partial<Automation>) =>
    setAutomation((prev) => (prev ? { ...prev, ...p } : prev));

  const patchNode = (id: string, p: Partial<AutomationNode>) =>
    patch({
      nodes: automation.nodes.map((n) =>
        n.id === id ? ({ ...n, ...p } as AutomationNode) : n,
      ),
    });

  const moveNode = (idx: number, dir: -1 | 1) => {
    const next = [...automation.nodes];
    const tgt = idx + dir;
    if (tgt < 0 || tgt >= next.length) return;
    [next[idx], next[tgt]] = [next[tgt], next[idx]];
    patch({ nodes: next });
  };

  const removeNode = (id: string) =>
    patch({ nodes: automation.nodes.filter((n) => n.id !== id) });

  const addEmail = () =>
    patch({
      nodes: [
        ...automation.nodes,
        {
          id: uid("n"),
          type: "email",
          subject: "",
          body: "",
        },
      ],
    });

  const addWait = () =>
    patch({
      nodes: [
        ...automation.nodes,
        { id: uid("n"), type: "wait", amount: 1, unit: "days" },
      ],
    });

  const addWaitUntil = () =>
    patch({
      nodes: [
        ...automation.nodes,
        { id: uid("n"), type: "wait_until", amount: 1, unit: "hours" },
      ],
    });

  const addSchedule = () =>
    patch({
      nodes: [
        ...automation.nodes,
        {
          id: uid("n"),
          type: "schedule",
          /* Default: tomorrow 9 AM local — a sane editable starting point. */
          at: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            d.setHours(9, 0, 0, 0);
            return d.getTime();
          })(),
          ifPast: "continue",
        },
      ],
    });

  const isApptTrigger = automation.trigger === "appointment_booked";

  const save = async () => {
    if (!automation.name.trim()) {
      toast.error("Give the automation a name.");
      return;
    }
    if (automation.nodes.length === 0) {
      toast.error("Add at least one email step.");
      return;
    }
    const emptyEmail = automation.nodes.find(
      (n) => n.type === "email" && (!n.subject.trim() || !n.body.trim()),
    );
    if (emptyEmail && automation.status === "published") {
      toast.error("Every email step needs a subject and a body.");
      return;
    }
    if (
      automation.status === "published" &&
      automation.trigger === "stage_entered" &&
      (!automation.triggerPipelineId || !automation.triggerStageId)
    ) {
      toast.error("Pick the pipeline and stage that trigger this automation.");
      return;
    }
    setSaving(true);
    try {
      await upsertAutomation({
        ...automation,
        name: automation.name.trim(),
        updatedAt: Date.now(),
      });
      toast.success(
        automation.status === "published"
          ? "Saved — new leads will enroll automatically."
          : "Saved as draft.",
      );
    } catch {
      toast.error("Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAutomation(automation.id);
      toast.success("Automation deleted.");
      router.push("/automations");
    } catch {
      toast.error("Delete failed.");
    }
  };

  const pipelineFilterValue = automation.pipelineIds?.[0] ?? "";

  return (
    <div className="space-y-5">
      <Button
        href="/automations"
        variant="outline"
        size="sm"
        leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
      >
        Back to automations
      </Button>

      <PageHeader
        title={automation.name || "Untitled automation"}
        subtitle="Triggered when a new lead is captured on your profile or funnels."
        action={
          <Button
            onClick={save}
            loading={saving}
            disabled={saving}
            size="sm"
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            Save
          </Button>
        }
      />

      {/* Stats strip — only interesting once something has sent. */}
      {stats && stats.sends > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={Send} label="Sent" value={stats.sends} />
          <StatTile icon={Eye} label="Opened" value={stats.opens} />
          <StatTile
            icon={MousePointerClick}
            label="Clicked"
            value={stats.clicks}
          />
        </div>
      )}

      {/* ── Basics ── */}
      <Card className="space-y-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Name
          </label>
          <input
            value={automation.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g. Welcome new leads"
            className={FIELD}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Trigger
            </label>
            <Select
              value={automation.trigger}
              onChange={(v) =>
                patch({ trigger: v as Automation["trigger"] })
              }
              options={[
                { value: "lead_captured", label: "New lead captured" },
                {
                  value: "appointment_booked",
                  label: "Appointment booked",
                },
                {
                  value: "stage_entered",
                  label: "Lead enters a pipeline stage",
                },
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Status
            </label>
            <Select
              value={automation.status}
              onChange={(v) =>
                patch({ status: v as Automation["status"] })
              }
              options={[
                { value: "draft", label: "Draft — not running" },
                { value: "published", label: "Published — live" },
                { value: "paused", label: "Paused — holds everyone" },
              ]}
            />
          </div>
        </div>

        {automation.trigger === "lead_captured" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Which leads enroll
            </label>
            <Select
              value={pipelineFilterValue}
              onChange={(v) =>
                patch({ pipelineIds: v ? [v] : [] })
              }
              options={[
                { value: "", label: "Every new lead" },
                ...pipelines.map((p) => ({
                  value: p.id,
                  label: `Only leads in: ${p.name}`,
                })),
              ]}
            />
          </div>
        )}

        {automation.trigger === "stage_entered" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Pipeline
              </label>
              <Select
                value={automation.triggerPipelineId ?? ""}
                onChange={(v) =>
                  /* Switching pipelines resets the stage — the old
                     stage id belongs to the previous pipeline. */
                  patch({
                    triggerPipelineId: v || undefined,
                    triggerStageId: undefined,
                  })
                }
                options={[
                  { value: "", label: "— Pick a pipeline —" },
                  ...pipelines.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                When a lead enters stage
              </label>
              <Select
                value={automation.triggerStageId ?? ""}
                onChange={(v) =>
                  patch({ triggerStageId: v || undefined })
                }
                options={[
                  { value: "", label: "— Pick a stage —" },
                  ...(
                    pipelines.find(
                      (p) => p.id === automation.triggerPipelineId,
                    )?.stages ?? []
                  )
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </div>
            <p className="text-[11px] text-slate-500 sm:col-span-2">
              Fires the first time a lead lands in this stage — Kanban
              drag, manual add, bulk add, or a new lead auto-routed
              there. A lead only ever enrolls once per automation, so
              moving them out and back doesn&apos;t re-send.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Send window — from
            </label>
            <Select
              value={String(automation.settings.windowStart)}
              onChange={(v) =>
                patch({
                  settings: {
                    ...automation.settings,
                    windowStart: Number(v),
                  },
                })
              }
              options={HOURS}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Until
            </label>
            <Select
              value={String(automation.settings.windowEnd)}
              onChange={(v) =>
                patch({
                  settings: { ...automation.settings, windowEnd: Number(v) },
                })
              }
              options={HOURS}
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          {isApptTrigger
            ? "Appointment reminders ignore the send window — a “starts in 1 hour” email must go out on time, whatever the hour."
            : "Emails due outside the window wait until it opens (Philippine time) — nobody gets a 3 AM welcome email."}
        </p>

        {/* ── Sender ── */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Send emails as
            </label>
            <input
              value={automation.settings.senderName ?? ""}
              onChange={(e) =>
                patch({
                  settings: {
                    ...automation.settings,
                    senderName: e.target.value,
                  },
                })
              }
              placeholder="Default: your name via Credibly"
              className={FIELD}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              From address
            </label>
            <div className="flex items-stretch">
              <input
                value={automation.settings.senderLocal ?? ""}
                onChange={(e) =>
                  patch({
                    settings: {
                      ...automation.settings,
                      senderLocal: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9._-]/g, ""),
                    },
                  })
                }
                placeholder="noreply"
                className={cn(FIELD, "rounded-r-none")}
              />
              <span className="flex items-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 px-3 text-sm text-slate-500">
                @crediblyai.com
              </span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          The name and address leads see in their inbox, e.g. SideBiz Pro
          Team &lt;sidebiz@crediblyai.com&gt;. Leave blank to send as your
          name via Credibly from noreply@. Any address name works
          instantly (the @crediblyai.com part is fixed since it&apos;s the
          verified sending domain). Replies always go to your own inbox.
        </p>
      </Card>

      {/* ── Steps ── */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Steps — run top to bottom
        </p>

        {automation.nodes.map((node, idx) => (
          <Card key={node.id} className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  node.type === "email"
                    ? "bg-electric-500/10 text-electric-600"
                    : node.type === "schedule"
                      ? "bg-jade-500/10 text-jade-600"
                      : "bg-amber-500/10 text-amber-700",
                )}
              >
                {node.type === "email" ? (
                  <Mail className="h-4 w-4" />
                ) : node.type === "schedule" ? (
                  <CalendarClock className="h-4 w-4" />
                ) : (
                  <Timer className="h-4 w-4" />
                )}
              </span>
              <p className="flex-1 text-sm font-semibold text-slate-900">
                {idx + 1} ·{" "}
                {node.type === "email"
                  ? "Send email"
                  : node.type === "schedule"
                    ? "Wait until a specific date & time"
                    : node.type === "wait_until"
                      ? "Before the appointment"
                      : "Wait"}
              </p>
              <button
                type="button"
                onClick={() => moveNode(idx, -1)}
                disabled={idx === 0}
                aria-label="Move up"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveNode(idx, 1)}
                disabled={idx === automation.nodes.length - 1}
                aria-label="Move down"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removeNode(node.id)}
                aria-label="Remove step"
                className="rounded p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {node.type === "email" ? (
              <div className="space-y-2">
                <input
                  value={node.subject}
                  onChange={(e) =>
                    patchNode(node.id, { subject: e.target.value })
                  }
                  placeholder="Subject — e.g. Great to meet you, {name}!"
                  className={FIELD}
                />
                <textarea
                  value={node.body}
                  onChange={(e) =>
                    patchNode(node.id, { body: e.target.value })
                  }
                  rows={6}
                  placeholder={
                    "Hi {name},\n\nThanks for reaching out…\n\n[Tap here for the offer](https://your-link.com)"
                  }
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/15"
                />
                <p className="text-[10px] text-slate-500">
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-electric-700">
                    {"{name}"}
                  </code>{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-electric-700">
                    {"{fullname}"}
                  </code>{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-electric-700">
                    {"{email}"}
                  </code>{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-electric-700">
                    {"{phone}"}
                  </code>
                  {isApptTrigger && (
                    <>
                      {" "}
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-electric-700">
                        {"{date}"}
                      </code>{" "}
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-electric-700">
                        {"{time}"}
                      </code>
                    </>
                  )}{" "}
                  auto-fill ·{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-electric-700">
                    [text](https://link)
                  </code>{" "}
                  becomes a real clickable link in the email.
                </p>
              </div>
            ) : node.type === "schedule" ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    value={toLocalInput((node as AutomationScheduleNode).at)}
                    onChange={(e) =>
                      patchNode(node.id, {
                        at: fromLocalInput(e.target.value),
                      })
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-electric-500"
                  />
                  <span className="text-xs text-slate-500">
                    hold here, then continue at this exact moment
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={
                      (node as AutomationScheduleNode).ifPast ?? "continue"
                    }
                    onChange={(v) =>
                      patchNode(node.id, {
                        ifPast: v as AutomationScheduleNode["ifPast"],
                      })
                    }
                    options={[
                      {
                        value: "continue",
                        label: "If the date already passed: continue anyway",
                      },
                      {
                        value: "skip",
                        label:
                          "If more than 1 hour late: stop the flow",
                      },
                    ]}
                    className="w-full sm:w-96"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Sends at this exact time even outside the send window —
                  the date you pick is the schedule. &ldquo;Stop the
                  flow&rdquo; has a 1-hour allowance: up to an hour late
                  still sends (the engine checks every ~10 minutes, so a
                  few minutes&rsquo; delay is normal); beyond that the
                  moment is treated as missed. Suits launch-day
                  campaigns. &ldquo;Continue anyway&rdquo; suits evergreen
                  content.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={(node as AutomationWaitNode).amount}
                  onChange={(e) =>
                    patchNode(node.id, {
                      amount: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-center text-sm text-slate-900 outline-none focus:border-electric-500"
                />
                <Select
                  value={(node as AutomationWaitNode).unit}
                  onChange={(v) =>
                    patchNode(node.id, {
                      unit: v as AutomationWaitUntilNode["unit"],
                    })
                  }
                  options={[
                    { value: "minutes", label: "minutes" },
                    { value: "hours", label: "hours" },
                    { value: "days", label: "days" },
                  ]}
                  className="w-36"
                />
                <span className="text-xs text-slate-500">
                  {node.type === "wait_until"
                    ? "before the appointment starts, send the next step"
                    : "before the next step"}
                </span>
              </div>
            )}
          </Card>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addEmail}
            leftIcon={<Mail className="h-3.5 w-3.5" />}
          >
            Add email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addWait}
            leftIcon={<Timer className="h-3.5 w-3.5" />}
          >
            Add wait
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addSchedule}
            leftIcon={<CalendarClock className="h-3.5 w-3.5" />}
          >
            Add date &amp; time
          </Button>
          {isApptTrigger && (
            <Button
              variant="outline"
              size="sm"
              onClick={addWaitUntil}
              leftIcon={<Timer className="h-3.5 w-3.5" />}
            >
              Add &ldquo;before appointment&rdquo;
            </Button>
          )}
        </div>
        {isApptTrigger && (
          <p className="text-[11px] text-slate-500">
            Typical reminder flow: Email (confirmation, sends right after
            booking) → <strong>Before appointment: 1 hour</strong> → Email
            (&ldquo;starts in 1 hour&rdquo;). Reminders auto-cancel when
            the appointment is deleted.
          </p>
        )}
      </div>

      {/* ── Danger zone ── */}
      <Card className="space-y-2 border-red-500/15 bg-red-500/[0.02] p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-red-600/80">
          Danger zone
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmDelete(true)}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          className="!border-red-500/30 !text-red-600 hover:!bg-red-500/10"
        >
          Delete automation
        </Button>
        <p className="text-[11px] text-slate-500">
          Deleting stops all future sends. Leads already mid-sequence are
          canceled on the next run.
        </p>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this automation?"
        confirmLabel="Delete"
        body={
          <p>
            <strong>{automation.name}</strong> will stop sending and be
            permanently removed. This can&apos;t be undone.
          </p>
        }
      />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Send;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-electric-600" />
      <p className="mt-1 font-display text-xl font-bold text-slate-900">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
    </Card>
  );
}
