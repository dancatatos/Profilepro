"use client";

/**
 * Training editor — placeholder for Session 2.
 *
 * Session 1 ships this page so the create flow can navigate
 * somewhere real, and the user can see the auto-generated
 * share + activation codes. The full editor (lessons, learners,
 * clones, paid mode wiring) lands in Session 2.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteTraining,
  getTraining,
  regenerateTrainingCode,
  updateTraining,
} from "@/lib/firebase/firestore";
import { toast } from "@/store/uiStore";
import type { Training } from "@/types";

export default function TrainingEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { account, loading: authLoading } = useAuth();

  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const t = await getTraining(params.id);
      if (cancelled) return;
      setTraining(t);
      if (t) {
        setTitle(t.title);
        setDescription(t.description ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (authLoading || loading) {
    return <FullScreenLoader label="Loading training…" />;
  }

  if (!training) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Training not found"
          subtitle="It may have been deleted or you don't have access."
        />
        <Button href="/trainings" variant="outline">
          ← Back to trainings
        </Button>
      </div>
    );
  }

  /* Owner guard — Firestore rules already block writes, but a friendly
     redirect prevents a confused-state UI on the wrong account. */
  if (account && training.ownerId !== account.uid) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Not your training"
          subtitle="You can only edit trainings you own."
        />
        <Button href="/trainings" variant="outline">
          ← Back to trainings
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTraining(training.id, { title, description });
      setTraining((prev) => (prev ? { ...prev, title, description } : prev));
      toast.success("Saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async (which: "share" | "activation") => {
    try {
      const next = await regenerateTrainingCode(training.id, which);
      setTraining((prev) =>
        prev
          ? {
              ...prev,
              ...(which === "share" ? { shareCode: next } : { activationCode: next }),
            }
          : prev,
      );
      toast.success(
        `New ${which === "share" ? "share" : "activation"} code generated.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't regenerate.");
    }
  };

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success(`${label} copied.`),
      () => toast.error("Couldn't copy — copy it manually."),
    );
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTraining(training.id);
      toast.success("Training deleted.");
      router.push("/trainings");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button
          href="/trainings"
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Back
        </Button>
        <Badge tone={training.status === "published" ? "blue" : "neutral"}>
          {training.status === "published" ? "Published" : "Draft"}
        </Badge>
      </div>

      <PageHeader
        title={training.title}
        subtitle="Edit the details below. Lessons + distribution settings ship in the next update."
      />

      {/* ── Details ── */}
      <Card className="space-y-3 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
          Details
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/55">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
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
            placeholder="What will learners get from this training?"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/55">
            URL
          </label>
          <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/55">
            /{account?.username || "yourname"}/t/{training.slug}
          </p>
        </div>
        <Button onClick={handleSave} loading={saving} disabled={saving}>
          Save changes
        </Button>
      </Card>

      {/* ── Codes ── */}
      <Card className="space-y-4 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
          Codes
        </p>

        <div>
          <p className="mb-1 text-sm font-medium text-white">
            🔑 Activation code
          </p>
          <p className="mb-2 text-xs text-white/45">
            Give this to your downline. They use it to unlock the training;
            their progress reports to you.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm text-electric-300">
              {training.activationCode}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                copyCode(training.activationCode, "Activation code")
              }
              leftIcon={<Copy className="h-3.5 w-3.5" />}
            >
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRegenerate("activation")}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              New
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-white">🔁 Share code</p>
          <p className="mb-2 text-xs text-white/45">
            Give this to other LEADERS in your line. They use it to clone
            this training into their own account so they can track THEIR
            own downline. Requires their plan to have a free training slot.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm text-white/80">
              {training.shareCode}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyCode(training.shareCode, "Share code")}
              leftIcon={<Copy className="h-3.5 w-3.5" />}
            >
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRegenerate("share")}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              New
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Coming next ── */}
      <Card className="p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
          Coming next
        </p>
        <ul className="mt-2 space-y-1 text-xs text-white/55">
          <li>· Lesson editor + video player (next update)</li>
          <li>· Distribution tab (public / team / paid modes)</li>
          <li>· Learners tab (who unlocked + progress)</li>
          <li>· Clones tab (other leaders using your training)</li>
          <li>· Paid-mode receipt approval → auto-grant access</li>
        </ul>
      </Card>

      {/* ── Danger zone ── */}
      <Card className="space-y-2 border-red-500/15 bg-red-500/[0.02] p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-red-300/80">
          Danger zone
        </p>
        <p className="text-xs text-white/55">
          Deleting removes this training and revokes every learner&apos;s
          access. Cannot be undone.
        </p>
        <Button
          variant="outline"
          onClick={() => setConfirmDelete(true)}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          className="!border-red-500/30 !text-red-300 hover:!bg-red-500/10"
        >
          Delete training
        </Button>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        loading={deleting}
        onCancel={() => !deleting && setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this training?"
        confirmLabel="Delete training"
        body={
          <p>
            <span className="font-medium text-white">{training.title}</span>{" "}
            and every learner&apos;s access record will be permanently
            removed. This can&apos;t be undone.
          </p>
        }
      />
    </div>
  );
}
