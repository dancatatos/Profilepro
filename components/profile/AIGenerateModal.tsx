"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Languages, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ONBOARDING_QUESTIONS, AI_COPY_MODES } from "@/lib/constants";
import { useProfileStore } from "@/store/profileStore";
import { applyGeneratedContent } from "@/lib/ai/generators";
import { toast } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import type {
  AICopyMode,
  AILanguage,
  AIOnboardingAnswers,
  GeneratedProfileContent,
} from "@/types";

const TOTAL = ONBOARDING_QUESTIONS.length + 1; // + style step

export function AIGenerateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [tone, setTone] = useState<AICopyMode>("professional");
  const [language, setLanguage] = useState<AILanguage>("english");
  const [generating, setGenerating] = useState(false);
  /* Once generation succeeds we don't apply the content immediately —
     we hold it here and let the user pick their preferred headline +
     bio variant first. `null` = no variants pending. */
  const [pendingContent, setPendingContent] =
    useState<GeneratedProfileContent | null>(null);
  const [pickedHeadline, setPickedHeadline] = useState<string>("");
  const [pickedBio, setPickedBio] = useState<string>("");
  /* Feedback state for regenerate-with-feedback. The field tag tells
     us which area to regenerate; busy flag disables the button while
     the round-trip is in flight. */
  const [headlineFeedback, setHeadlineFeedback] = useState("");
  const [bioFeedback, setBioFeedback] = useState("");
  const [regenBusy, setRegenBusy] = useState<"headline" | "bio" | null>(null);

  const isStyleStep = step === ONBOARDING_QUESTIONS.length;
  const question = ONBOARDING_QUESTIONS[step];

  const reset = () => {
    setStep(0);
    setAnswers({});
    setGenerating(false);
    setPendingContent(null);
    setPickedHeadline("");
    setPickedBio("");
    setHeadlineFeedback("");
    setBioFeedback("");
    setRegenBusy(null);
  };

  const regenerate = async (field: "headline" | "bio") => {
    if (!profile || !pendingContent) return;
    const feedback = (field === "headline" ? headlineFeedback : bioFeedback).trim();
    if (!feedback) {
      toast.error("Tell the AI what to change first.");
      return;
    }
    const current = field === "headline" ? pickedHeadline : pickedBio;
    setRegenBusy(field);
    try {
      const res = await fetch("/api/ai/regenerate-variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          current,
          feedback,
          mode: tone,
          language,
          uid: profile.ownerId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Regeneration failed");
      const next = (json.variant as string) || "";
      if (!next) throw new Error("Empty response");
      /* Append the new variant to the list AND select it, so the
         user keeps their previous options visible if they want to
         compare or roll back. */
      setPendingContent((prev) => {
        if (!prev) return prev;
        if (field === "headline") {
          return {
            ...prev,
            headlineVariants: [...(prev.headlineVariants ?? []), next],
          };
        }
        return {
          ...prev,
          bioVariants: [...(prev.bioVariants ?? []), next],
        };
      });
      if (field === "headline") {
        setPickedHeadline(next);
        setHeadlineFeedback("");
      } else {
        setPickedBio(next);
        setBioFeedback("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regeneration failed.");
    } finally {
      setRegenBusy(null);
    }
  };

  const close = () => {
    if (generating) return;
    onClose();
    setTimeout(reset, 250);
  };

  const applyPicked = () => {
    if (!profile || !pendingContent) return;
    const finalContent: GeneratedProfileContent = {
      ...pendingContent,
      headline: pickedHeadline || pendingContent.headline,
      bio: pickedBio || pendingContent.bio,
    };
    setProfile(applyGeneratedContent(profile, finalContent));
    toast.success("Your profile is ready — preview it on the right.");
    close();
  };

  const generate = async () => {
    if (!profile) return;
    setGenerating(true);
    const payload: AIOnboardingAnswers = {
      niche: answers.niche || "",
      company: answers.company || "",
      offer: answers.offer || "",
      targetMarket: answers.targetMarket || "",
      mission: answers.mission || "",
      resultYouHelpAchieve: answers.resultYouHelpAchieve || "",
      brandingStyle: answers.brandingStyle || "",
      tone,
      language,
    };
    try {
      const res = await fetch("/api/ai/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload, uid: profile.ownerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      const content = json.data as GeneratedProfileContent;
      const headlineVariants = content.headlineVariants ?? [content.headline];
      const bioVariants = content.bioVariants ?? [content.bio];
      const hasChoice = headlineVariants.length > 1 || bioVariants.length > 1;
      if (hasChoice) {
        /* Hand off to the picker step — apply happens on confirm. */
        setPendingContent(content);
        setPickedHeadline(headlineVariants[0] || content.headline);
        setPickedBio(bioVariants[0] || content.bio);
        setGenerating(false);
        return;
      }
      /* No variants returned (older flow or single-option mock) — apply directly. */
      setProfile(applyGeneratedContent(profile, content));
      toast.success(
        json.usedAI
          ? "Your profile was generated by AI!"
          : "Generated with starter copy — add a Gemini key for full AI.",
      );
      close();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "AI generation failed.",
      );
      setGenerating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="AI Profile Generator"
      description="Answer a few questions — AI writes your whole profile."
    >
      {/* Progress */}
      <div className="mb-4 flex gap-1">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= step ? "bg-electric-500" : "bg-slate-200",
            )}
          />
        ))}
      </div>

      {generating ? (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-brand-gradient shadow-glow-blue">
            <Sparkles className="h-7 w-7 text-slate-900" />
          </span>
          <p className="mt-4 font-display text-sm font-semibold text-slate-900">
            Writing your profile…
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Generating headline, bio, CTAs and credibility copy.
          </p>
        </div>
      ) : pendingContent ? (
        <div className="space-y-5 pb-2">
          <div>
            <p className="font-display text-sm font-semibold text-slate-900">
              Pick your headline
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              The AI wrote a few angles — choose the one that sounds most like you.
            </p>
            <div className="mt-2.5 space-y-1.5">
              {(pendingContent.headlineVariants ?? [pendingContent.headline]).map(
                (v, i) => (
                  <VariantOption
                    key={`h-${i}`}
                    text={v}
                    selected={pickedHeadline === v}
                    onSelect={() => setPickedHeadline(v)}
                  />
                ),
              )}
            </div>
            <FeedbackRow
              value={headlineFeedback}
              onChange={setHeadlineFeedback}
              onSubmit={() => regenerate("headline")}
              busy={regenBusy === "headline"}
              placeholder="Not quite right? e.g. shorter, more recruiting-focused…"
            />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-slate-900">
              Pick your bio
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              You can always edit it after — this is just the starting point.
            </p>
            <div className="mt-2.5 space-y-1.5">
              {(pendingContent.bioVariants ?? [pendingContent.bio]).map((v, i) => (
                <VariantOption
                  key={`b-${i}`}
                  text={v}
                  selected={pickedBio === v}
                  onSelect={() => setPickedBio(v)}
                />
              ))}
            </div>
            <FeedbackRow
              value={bioFeedback}
              onChange={setBioFeedback}
              onSubmit={() => regenerate("bio")}
              busy={regenBusy === "bio"}
              placeholder="Want a different angle? e.g. add my mission, more story-led…"
            />
          </div>
        </div>
      ) : isStyleStep ? (
        <div className="space-y-4 pb-2">
          <Select
            label="Copy tone"
            value={tone}
            onChange={(v) => setTone(v as AICopyMode)}
            options={AI_COPY_MODES.map((m) => ({
              value: m.id,
              label: m.label,
            }))}
          />
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">
              Language
            </p>
            <div className="flex gap-2">
              {(["english", "taglish"] as AILanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium capitalize",
                    language === lang
                      ? "border-electric-500 bg-electric-500/15 text-electric-700"
                      : "border-slate-200 text-slate-500",
                  )}
                >
                  <Languages className="h-4 w-4" />
                  {lang}
                </button>
              ))}
            </div>
            {language === "taglish" && (
              <p className="mt-1.5 text-xs text-slate-400">
                Natural Filipino-English mix — perfect for PH prospects.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="pb-2">
          <p className="font-display text-base font-semibold text-slate-900">
            {question.question}
          </p>
          <textarea
            autoFocus
            value={answers[question.key] || ""}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, [question.key]: e.target.value }))
            }
            placeholder={question.placeholder}
            rows={3}
            className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-electric-500/60"
          />
        </div>
      )}

      {!generating && (
        <div className="mt-4 flex gap-2">
          {pendingContent ? (
            <Button
              fullWidth
              onClick={applyPicked}
              leftIcon={<Check className="h-4 w-4" />}
            >
              Use these
            </Button>
          ) : (
            <>
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep((s) => s - 1)}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back
                </Button>
              )}
              {isStyleStep ? (
                <Button
                  fullWidth
                  onClick={generate}
                  leftIcon={<Sparkles className="h-4 w-4" />}
                >
                  Generate my profile
                </Button>
              ) : (
                <Button
                  fullWidth
                  onClick={() => setStep((s) => s + 1)}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {step === ONBOARDING_QUESTIONS.length - 1 ? "Almost done" : "Next"}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

function FeedbackRow({
  value,
  onChange,
  onSubmit,
  busy,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  placeholder: string;
}) {
  return (
    <div className="mt-2.5 flex gap-1.5">
      <input
        type="text"
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !busy && value.trim()) onSubmit();
        }}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-300 outline-none focus:border-electric-500/60"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || !value.trim()}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
          busy || !value.trim()
            ? "border-slate-200 text-slate-300"
            : "border-electric-500/40 bg-electric-500/10 text-electric-700 hover:bg-electric-500/20",
        )}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Wand2 className="h-3.5 w-3.5" />
        )}
        Regenerate
      </button>
    </div>
  );
}

function VariantOption({
  text,
  selected,
  onSelect,
}: {
  text: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl border p-3 text-left text-sm transition-colors",
        selected
          ? "border-electric-500/70 bg-electric-500/10 text-slate-900"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-electric-400 bg-electric-500" : "border-white/25",
        )}
      >
        {selected && <Check className="h-2.5 w-2.5 text-slate-900" />}
      </span>
      <span className="flex-1 leading-snug">{text}</span>
    </button>
  );
}
