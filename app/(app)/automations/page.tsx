"use client";

/**
 * /automations — list the user's email automations.
 *
 * Phase 1 of the automation system (adapted from the Legends System
 * engine): sequential Email + Wait flows triggered by lead capture.
 * Create seeds a sensible welcome-email draft and jumps straight into
 * the editor.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Plus, Timer, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { listAutomations, upsertAutomation } from "@/lib/firebase/firestore";
import { uid } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Automation } from "@/types";

const STATUS_TONE: Record<
  Automation["status"],
  "jade" | "neutral" | "gold"
> = {
  published: "jade",
  draft: "neutral",
  paused: "gold",
};

export default function AutomationsPage() {
  const router = useRouter();
  const { account, loading: authLoading } = useAuth();
  const [automations, setAutomations] = useState<Automation[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!account || account.uid === "demo") {
      setAutomations([]);
      return;
    }
    const list = await listAutomations(account.uid).catch(() => []);
    setAutomations(list);
  }, [account]);

  useEffect(() => {
    load();
  }, [load]);

  const createAutomation = async () => {
    if (!account) return;
    setCreating(true);
    try {
      const now = Date.now();
      const automation: Automation = {
        id: uid("auto"),
        ownerId: account.uid,
        name: "Welcome new leads",
        status: "draft",
        trigger: "lead_captured",
        nodes: [
          {
            id: uid("n"),
            type: "email",
            subject: "Great to meet you, {name}!",
            body:
              "Hi {name},\n\nThanks for reaching out — I got your details and I'll personally message you soon.\n\nIn the meantime, here's something to check out:\n\n[Tap here to learn more](https://)\n\nTalk soon!",
          },
        ],
        settings: {
          windowStart: 8,
          windowEnd: 20,
          timezone: "Asia/Manila",
        },
        createdAt: now,
        updatedAt: now,
      };
      await upsertAutomation(automation);
      router.push(`/automations/${automation.id}`);
    } catch {
      toast.error("Couldn't create the automation.");
      setCreating(false);
    }
  };

  if (authLoading || automations === null) {
    return <FullScreenLoader label="Loading automations…" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Automations"
        subtitle="Emails that send themselves when a lead comes in — welcome messages, offers, nurture sequences."
        action={
          <Button
            onClick={createAutomation}
            loading={creating}
            disabled={creating}
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            New automation
          </Button>
        }
      />

      {automations.length === 0 ? (
        <EmptyState
          icon="Zap"
          title="No automations yet"
          description="Create your first one — a welcome email that greets every new lead within minutes, sent from your name, with replies landing in your inbox."
          action={
            <Button
              onClick={createAutomation}
              loading={creating}
              disabled={creating}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Create welcome email
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {automations.map((a) => {
            const emails = a.nodes.filter((n) => n.type === "email").length;
            const waits = a.nodes.filter((n) => n.type === "wait").length;
            return (
              <Card
                key={a.id}
                onClick={() => router.push(`/automations/${a.id}`)}
                className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:border-electric-500/30"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-500/10 text-electric-600">
                  <Zap className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {a.name}
                    </p>
                    <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {emails} email{emails === 1 ? "" : "s"}
                    </span>
                    {waits > 0 && (
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {waits} wait{waits === 1 ? "" : "s"}
                      </span>
                    )}
                    <span>
                      {a.enrollCount ?? 0} lead
                      {(a.enrollCount ?? 0) === 1 ? "" : "s"} enrolled
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
