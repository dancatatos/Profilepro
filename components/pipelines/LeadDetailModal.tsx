"use client";

/**
 * Lead detail modal — opens when an admin/user taps a lead card on
 * the pipeline kanban board.
 *
 * Shows:
 *   - Contact info + source + time in stage
 *   - Move-to-stage controls
 *   - AI-generated follow-up messages (3 variants, niche-aware,
 *     Taglish toggle, one-tap copy)
 *   - Task notes editor (free-text)
 *   - Snooze button (1/3/7 days — bumps nextTaskAt forward)
 *
 * The AI message generator hits POST /api/ai/follow-up-message with
 * the lead + stage + profile context. Each tap is ~₱0.008 in Gemini
 * cost; we don't enforce a quota in Week 2 — overall margins are huge
 * even at heavy usage.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Languages,
  Mail,
  MessageSquare,
  Phone,
  Save,
  Send,
  Sparkles,
  Target,
  Undo2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  setMessageSentState,
  updateLead,
  moveLeadToStage,
} from "@/lib/firebase/firestore";
import { useTaskCountStore } from "@/store/taskCountStore";
import { useProfileStore } from "@/store/profileStore";
import { copyToClipboard, timeAgo, timeUntil } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import type { Lead, Pipeline, PipelineStage, SentMessageLog } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  pipeline: Pipeline;
  /** Notify parent that this lead's state has changed so it can refresh. */
  onUpdated: (patch: Partial<Lead>) => void;
}

export function LeadDetailModal({
  open,
  onClose,
  lead,
  pipeline,
  onUpdated,
}: Props) {
  const profile = useProfileStore((s) => s.profile);

  const [variants, setVariants] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [language, setLanguage] = useState<"english" | "taglish">("english");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [taskNotes, setTaskNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  /** "templates" tab = pre-written stage messages; "ai" tab = AI generator. */
  const [msgTab, setMsgTab] = useState<"templates" | "ai">("templates");
  /**
   * Local copy of the lead's sent-message log. Kept in component state
   * (rather than reading lead.sentMessages directly each render) so
   * optimistic updates on toggle feel instant — the parent gets
   * notified via onUpdated for persistence.
   */
  const [sentMessages, setSentMessages] = useState<SentMessageLog[]>([]);
  /** Which (stageId, messageId) is mid-toggle — used to disable the button. */
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  /* Re-seed local UI whenever a new lead is opened. */
  useEffect(() => {
    if (!open || !lead) return;
    setVariants([]);
    setCopiedIdx(null);
    setTaskNotes(lead.taskNotes ?? "");
    setNotesDirty(false);
    setSentMessages(lead.sentMessages ?? []);
    /* Default to pre-written templates when the stage has them in EITHER
       language — AI tab otherwise so the button is immediately visible. */
    const currentStage = pipeline.stages.find((s) => s.id === lead.stageId);
    const hasAnyTemplate =
      (currentStage?.followUpMessages?.length ?? 0) > 0 ||
      (currentStage?.followUpMessagesTaglish?.length ?? 0) > 0;
    setMsgTab(hasAnyTemplate ? "templates" : "ai");
  }, [open, lead, pipeline.stages]);

  /* Quick lookup: composite key "{stageId}:{messageId}" → log entry.
     Avoids O(n*m) array scans when rendering large message lists. */
  const sentLookup = useMemo(() => {
    const map = new Map<string, SentMessageLog>();
    for (const m of sentMessages) {
      map.set(`${m.stageId}:${m.messageId}`, m);
    }
    return map;
  }, [sentMessages]);

  /* Hooks must run in the same order every render — pull task-count
     refresh BEFORE the lead-null early return so React's hook
     accounting stays stable when the modal closes (lead === null). */
  const refreshTaskCount = useTaskCountStore((s) => s.refresh);

  if (!lead) return null;

  const stage =
    pipeline.stages.find((s) => s.id === lead.stageId) ??
    pipeline.stages[0];
  const sortedStages = [...pipeline.stages].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  /* ── AI message generation ── */

  const generate = async () => {
    setGenerating(true);
    setVariants([]);
    setCopiedIdx(null);
    try {
      const res = await fetch("/api/ai/follow-up-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: lead.name,
          stageName: stage.name,
          stageContext: stage.aiContext,
          niche: profile?.header.headline ?? "",
          offer: profile?.header.bio ?? "",
          language,
          tone: "friendly",
          uid: lead.ownerId,
        }),
      });
      const data = (await res.json()) as {
        variants?: string[];
        error?: string;
      };
      if (!res.ok || !data.variants) {
        toast.error(data.error || "AI generation failed.");
        return;
      }
      setVariants(data.variants);
    } catch {
      toast.error("Couldn't reach AI service.");
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Replace common {placeholders} with the lead's actual data so the
   * copied message is already personalised — no manual find/replace.
   * Unmatched placeholders are left as-is so the user can spot any they
   * forgot to swap (e.g. {video_link} stays visible to remind them).
   */
  const personalize = (text: string): string => {
    const firstName = lead.name.split(/\s+/)[0] || lead.name;
    return text
      .replace(/\{name\}/gi, firstName)
      .replace(/\{fullname\}/gi, lead.name)
      .replace(/\{email\}/gi, lead.email ?? "")
      .replace(/\{phone\}/gi, lead.phone ?? "");
  };

  const copyVariant = async (text: string, idx: number) => {
    if (await copyToClipboard(personalize(text))) {
      setCopiedIdx(idx);
      toast.success("Message copied — paste it in Messenger/Viber.");
      setTimeout(() => setCopiedIdx(null), 2000);
    } else {
      toast.error("Couldn't copy — long-press to copy manually.");
    }
  };

  /**
   * Toggle the "sent" flag on a pre-written template message for this
   * lead. The Templates tab renders a green "Sent X ago" badge whenever
   * the log has an entry; tapping the badge unmarks; tapping "Mark sent"
   * marks. Persists optimistically — UI updates instantly, Firestore
   * write happens in the background.
   */
  const toggleSent = async (
    stageIdForLog: string,
    messageId: string,
    nextSent: boolean,
  ) => {
    const key = `${stageIdForLog}:${messageId}`;
    setTogglingKey(key);
    /* Optimistic: update local state right away. If the write fails
       we'll restore on catch. */
    const prevLog = sentMessages;
    const optimistic: SentMessageLog[] = nextSent
      ? [
          ...prevLog.filter(
            (m) => !(m.stageId === stageIdForLog && m.messageId === messageId),
          ),
          {
            stageId: stageIdForLog,
            messageId,
            language,
            sentAt: Date.now(),
          },
        ]
      : prevLog.filter(
          (m) => !(m.stageId === stageIdForLog && m.messageId === messageId),
        );
    setSentMessages(optimistic);
    try {
      const persisted = await setMessageSentState(
        lead.id,
        stageIdForLog,
        messageId,
        language,
        nextSent,
      );
      /* Trust the server's response in case our optimistic value
         drifted (e.g. another device wrote concurrently). */
      setSentMessages(persisted);
      onUpdated({ sentMessages: persisted });
    } catch {
      /* Revert + tell the user. */
      setSentMessages(prevLog);
      toast.error("Couldn't update sent status.");
    } finally {
      setTogglingKey(null);
    }
  };

  /* ── Stage move ── */

  const moveTo = async (targetStageId: string) => {
    const target = sortedStages.find((s) => s.id === targetStageId);
    if (!target) return;
    try {
      await moveLeadToStage(
        lead.id,
        pipeline.id,
        targetStageId,
        target.daysBeforeNextTask,
      );
      onUpdated({
        stageId: targetStageId,
        stageEnteredAt: Date.now(),
        nextTaskAt: target.daysBeforeNextTask
          ? Date.now() + target.daysBeforeNextTask * 24 * 60 * 60 * 1000
          : undefined,
      });
      /* Move resets nextTaskAt → badge could go up OR down. Refresh. */
      refreshTaskCount(lead.ownerId);
      toast.success(`Moved to ${target.name}.`);
    } catch {
      toast.error("Couldn't move lead.");
    }
  };

  /* ── Task notes ── */

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateLead(lead.id, { taskNotes: taskNotes.trim() || undefined });
      onUpdated({ taskNotes: taskNotes.trim() || undefined });
      setNotesDirty(false);
      toast.success("Notes saved.");
    } catch {
      toast.error("Couldn't save notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  /* ── Snooze (bump nextTaskAt forward) ── */

  const snooze = async (days: number) => {
    const next = Date.now() + days * 24 * 60 * 60 * 1000;
    try {
      await updateLead(lead.id, { nextTaskAt: next });
      onUpdated({ nextTaskAt: next });
      /* Snooze pushes this lead out of the "urgent" window — badge
         decrements. Refresh so the dashboard reflects it instantly. */
      refreshTaskCount(lead.ownerId);
      toast.success(`Snoozed ${days} day${days === 1 ? "" : "s"}.`);
    } catch {
      toast.error("Couldn't snooze.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead.name}
      description={
        stage ? `In stage: ${stage.name}` : "No stage assigned"
      }
      size="lg"
    >
      <div className="space-y-5 pb-3">
        {/* Contact + meta */}
        <Card className="space-y-1.5 p-3">
          {lead.email && (
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Mail className="h-3.5 w-3.5 text-white/40" />
              {lead.email}
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Phone className="h-3.5 w-3.5 text-white/40" />
              {lead.phone}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge tone="blue">{stage?.name ?? "No stage"}</Badge>
            <span className="text-[10px] text-white/35">
              In stage {timeAgo(lead.stageEnteredAt ?? lead.createdAt)}
            </span>
            {lead.nextTaskAt && (
              <span className="text-[10px] text-white/35">
                · Next task {timeUntil(lead.nextTaskAt)}
              </span>
            )}
          </div>
        </Card>

        {/* Move-to-stage row */}
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
            Move to stage
          </p>
          <div className="-mx-1 flex flex-wrap gap-1 px-1">
            {sortedStages.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => moveTo(s.id)}
                disabled={s.id === lead.stageId}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  s.id === lead.stageId
                    ? "border-electric-500/50 bg-electric-500/15 text-electric-300"
                    : "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08]",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Follow-up messages — tabbed: pre-written templates | AI writer.
            Language toggle is HOISTED to this card's header so it controls
            both tabs at once — pick EN/TL once, applies everywhere. */}
        <Card className="space-y-3 p-4">
          {/* Header row 1 — title + EN/TL language toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">
              Follow-up Messages
            </p>
            <div className="flex items-center gap-1.5">
              <Languages className="h-3 w-3 text-white/40" />
              <div className="flex rounded-md bg-white/[0.04] p-0.5">
                {(["english", "taglish"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguage(l)}
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-medium capitalize transition-colors",
                      language === l
                        ? "bg-electric-500/20 text-electric-300"
                        : "text-white/45 hover:text-white/70",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Header row 2 — Templates / AI Write tab toggle */}
          <div className="flex w-full rounded-lg bg-white/[0.04] p-0.5">
            <button
              type="button"
              onClick={() => setMsgTab("templates")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors",
                msgTab === "templates"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70",
              )}
            >
              <MessageSquare className="h-3 w-3" />
              Templates
              {(() => {
                const active =
                  language === "taglish"
                    ? stage.followUpMessagesTaglish
                    : stage.followUpMessages;
                return (active?.length ?? 0) > 0 ? (
                  <span className="rounded-full bg-electric-500/20 px-1.5 text-electric-300">
                    {active!.length}
                  </span>
                ) : null;
              })()}
            </button>
            <button
              type="button"
              onClick={() => setMsgTab("ai")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors",
                msgTab === "ai"
                  ? "bg-electric-500/20 text-electric-300"
                  : "text-white/40 hover:text-white/70",
              )}
            >
              <Sparkles className="h-3 w-3" />
              AI Write
            </button>
          </div>

          {/* Goal / target banner — shown on both tabs when set */}
          {stage.followUpGoal && (
            <div className="flex items-start gap-2 rounded-lg bg-jade-500/10 px-3 py-2">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jade-300" />
              <p className="text-xs text-jade-200">
                <span className="font-semibold">Goal:</span>{" "}
                {stage.followUpGoal}
              </p>
            </div>
          )}

          {/* ── Templates tab ── */}
          {msgTab === "templates" &&
            (() => {
              /* Pick the array for the currently selected language.
                 If it's empty but the OTHER language has templates,
                 the empty state offers a one-tap switch. */
              const activeMessages =
                language === "taglish"
                  ? stage.followUpMessagesTaglish
                  : stage.followUpMessages;
              const otherMessages =
                language === "taglish"
                  ? stage.followUpMessages
                  : stage.followUpMessagesTaglish;
              const otherLangLabel =
                language === "taglish" ? "English" : "Taglish";

              if ((activeMessages?.length ?? 0) > 0) {
                /* Find the index of the first unsent message in the
                   current language. That's what the user should send
                   next — surfaced with a subtle "Next →" chip so they
                   never have to remember "wait, did I send Day 3?". */
                const nextUpIdx = activeMessages!.findIndex(
                  (m) => !sentLookup.has(`${stage.id}:${m.id}`),
                );
                return (
                  <div className="space-y-2">
                    {activeMessages!.map((msg, idx) => {
                      /* Sent-log lookup. The log keys on (stageId, messageId)
                         so we use the CURRENT stage id — re-arranging stages
                         later wouldn't break the link since both ids are
                         carried in the log entry. */
                      const logKey = `${stage.id}:${msg.id}`;
                      const sentEntry = sentLookup.get(logKey);
                      const isSent = !!sentEntry;
                      const isToggling = togglingKey === logKey;
                      const isNextUp = idx === nextUpIdx && !isSent;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "rounded-xl border p-3 transition-colors",
                            isSent
                              ? "border-jade-500/25 bg-jade-500/[0.04]"
                              : isNextUp
                                ? "border-electric-500/40 bg-electric-500/[0.05] ring-1 ring-electric-500/30"
                                : "border-white/[0.07] bg-ink-950/40",
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                                {msg.label}
                              </p>
                              {/* "Next →" hint on the first unsent message
                                  so the user knows which one to send today. */}
                              {isNextUp && (
                                <span className="rounded-full bg-electric-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-electric-200">
                                  Next →
                                </span>
                              )}
                            </div>
                            {/* Sent badge — tap to unmark. Carries the
                                timestamp so the user knows exactly how
                                fresh the touchpoint is. */}
                            {isSent && (
                              <button
                                type="button"
                                onClick={() =>
                                  !isToggling &&
                                  toggleSent(stage.id, msg.id, false)
                                }
                                disabled={isToggling}
                                aria-label="Unmark sent"
                                className="flex items-center gap-1 rounded-full bg-jade-500/15 px-2 py-0.5 text-[10px] font-semibold text-jade-300 hover:bg-jade-500/25 disabled:opacity-50"
                                title="Tap to unmark"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Sent {timeAgo(sentEntry.sentAt)}
                              </button>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                            {personalize(msg.body)}
                          </p>
                          <div className="mt-2.5 flex flex-wrap justify-end gap-1.5">
                            {/* "Mark sent" / "Unmark" action — explicit so
                                the user controls when the log is written.
                                Copy stays a separate concern; tapping
                                Copy doesn't auto-mark to avoid false
                                positives from re-reads. */}
                            {isSent ? (
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<Undo2 className="h-3.5 w-3.5" />}
                                onClick={() =>
                                  toggleSent(stage.id, msg.id, false)
                                }
                                loading={isToggling}
                                disabled={isToggling}
                              >
                                Unmark
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                }
                                onClick={() =>
                                  toggleSent(stage.id, msg.id, true)
                                }
                                loading={isToggling}
                                disabled={isToggling}
                              >
                                Mark sent
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={copiedIdx === idx ? "outline" : "primary"}
                              leftIcon={
                                copiedIdx === idx ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )
                              }
                              onClick={() => copyVariant(msg.body, idx)}
                            >
                              {copiedIdx === idx ? "Copied" : "Copy"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              return (
                <div className="rounded-xl border border-dashed border-white/10 py-6 text-center">
                  <MessageSquare className="mx-auto mb-2 h-6 w-6 text-white/20" />
                  <p className="text-sm font-medium text-white/40">
                    No {language === "taglish" ? "Taglish" : "English"}{" "}
                    templates for this stage
                  </p>
                  {(otherMessages?.length ?? 0) > 0 ? (
                    <>
                      <p className="mt-1 text-xs text-white/25">
                        {otherMessages!.length} {otherLangLabel} template
                        {otherMessages!.length === 1 ? "" : "s"} available.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setLanguage(
                            language === "taglish" ? "english" : "taglish",
                          )
                        }
                        className="mt-3 text-[11px] text-electric-400 hover:text-electric-300"
                      >
                        Switch to {otherLangLabel} →
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-white/25">
                        Open the Stage Editor and add pre-written messages for{" "}
                        <span className="italic">{stage.name}</span>.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMsgTab("ai")}
                        className="mt-3 text-[11px] text-electric-400 hover:text-electric-300"
                      >
                        Use AI writer instead →
                      </button>
                    </>
                  )}
                </div>
              );
            })()}

          {/* ── AI Write tab ── */}
          {msgTab === "ai" && (
            <div className="space-y-3">
              <p className="text-xs text-white/55">
                3 personalised message variants in{" "}
                <span className="font-semibold capitalize text-white/75">
                  {language}
                </span>{" "}
                — based on the current stage and your profile. Tap to copy.
              </p>
              <Button
                size="sm"
                onClick={generate}
                loading={generating}
                disabled={generating}
                leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              >
                {variants.length > 0 ? "Regenerate" : "Generate messages"}
              </Button>
              {variants.length > 0 && (
                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/[0.07] bg-ink-950/40 p-3"
                    >
                      <p className="whitespace-pre-wrap text-sm text-white/80">
                        {v}
                      </p>
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant={copiedIdx === i ? "outline" : "primary"}
                          leftIcon={
                            copiedIdx === i ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )
                          }
                          onClick={() => copyVariant(v, i)}
                        >
                          {copiedIdx === i ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Task notes */}
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
            Task notes
          </p>
          <textarea
            rows={3}
            value={taskNotes}
            onChange={(e) => {
              setTaskNotes(e.target.value);
              setNotesDirty(true);
            }}
            placeholder="Private notes about this lead — what to say next, objections to address, etc."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40"
          />
          {notesDirty && (
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={saveNotes}
                loading={savingNotes}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Save notes
              </Button>
            </div>
          )}
        </div>

        {/* Snooze row */}
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
            Snooze follow-up
          </p>
          <div className="flex flex-wrap gap-2">
            {[1, 3, 7].map((d) => (
              <Button
                key={d}
                size="sm"
                variant="outline"
                leftIcon={<Clock className="h-3.5 w-3.5" />}
                onClick={() => snooze(d)}
              >
                {d} day{d === 1 ? "" : "s"}
              </Button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-white/35">
            Pushes the next-task reminder forward without moving the lead
            between stages.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-t border-white/[0.06] p-4 pb-safe">
        <Button variant="outline" fullWidth onClick={onClose}>
          Close
        </Button>
        {lead.email && (
          <Button
            fullWidth
            href={`mailto:${lead.email}`}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Email
          </Button>
        )}
      </div>
    </Modal>
  );
}

/* Re-export the stage type so callers can use it inline. */
export type { PipelineStage };
