"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Gauge, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileStore } from "@/store/profileStore";
import { getAnalyticsSummary } from "@/lib/firebase/firestore";
import { formatCompact, formatPercent } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/common/StatCard";
import { ScoreRing } from "@/components/common/ScoreRing";
import { toast } from "@/store/uiStore";
import type { AnalyticsSummary, ProfileAudit } from "@/types";

const DEMO: AnalyticsSummary = {
  views: 1240,
  ctaClicks: 312,
  socialClicks: 188,
  leads: 47,
  shares: 63,
  conversionRate: 47 / 1240,
};

const SEVERITY: Record<string, "danger" | "gold" | "neutral"> = {
  high: "danger",
  medium: "gold",
  low: "neutral",
};

export default function AnalyticsPage() {
  const { account } = useAuth();
  const profile = useProfileStore((s) => s.profile);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [audit, setAudit] = useState<ProfileAudit | null>(null);
  const [auditing, setAuditing] = useState(false);

  useEffect(() => {
    if (!account) return;
    if (account.uid === "demo") {
      setSummary(DEMO);
      return;
    }
    getAnalyticsSummary(account.uid).then(setSummary).catch(() => null);
  }, [account]);

  const s = summary ?? {
    views: 0, ctaClicks: 0, socialClicks: 0, leads: 0, shares: 0,
    conversionRate: 0,
  };

  const runAudit = async () => {
    if (!profile) return;
    setAuditing(true);
    try {
      const res = await fetch("/api/ai/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAudit(json.data as ProfileAudit);
      toast.success(
        json.usedAI ? "AI audit complete" : "Audit complete (heuristic mode)",
      );
    } catch {
      toast.error("Audit failed — please try again.");
    } finally {
      setAuditing(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        subtitle="See how your profile is performing."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon="Eye" label="Profile views" value={formatCompact(s.views)} accent="blue" />
        <StatCard icon="MousePointerClick" label="CTA clicks" value={formatCompact(s.ctaClicks)} accent="jade" />
        <StatCard icon="Share2" label="Social clicks" value={formatCompact(s.socialClicks)} accent="white" />
        <StatCard icon="Inbox" label="Leads" value={formatCompact(s.leads)} accent="gold" />
        <StatCard icon="Send" label="Shares" value={formatCompact(s.shares)} accent="blue" />
        <StatCard icon="TrendingUp" label="Conversion" value={formatPercent(s.conversionRate)} accent="jade" />
      </div>

      {/* AI Audit */}
      <Card className="p-5">
        <CardHeader
          title="AI Profile Audit"
          subtitle="Get scored on credibility, conversion & branding"
          action={
            <Button
              size="sm"
              onClick={runAudit}
              loading={auditing}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              {audit ? "Re-run" : "Run audit"}
            </Button>
          }
        />

        {!audit ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-white/10 py-8 text-center">
            <Gauge className="h-8 w-8 text-white/30" />
            <p className="mt-2 text-sm text-white/55">
              Run an AI audit to score your profile and get improvement tips.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap justify-around gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <ScoreRing value={audit.scores.overall} accent="blue" label="overall" />
              <ScoreRing value={audit.scores.credibility} size={72} accent="jade" label="credibility" />
              <ScoreRing value={audit.scores.conversion} size={72} accent="gold" label="conversion" />
              <ScoreRing value={audit.scores.branding} size={72} accent="white" label="branding" />
              <ScoreRing value={audit.scores.clarity} size={72} accent="blue" label="clarity" />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-white/55">
                Suggestions
              </p>
              <div className="space-y-2">
                {audit.suggestions.map((sug, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {sug.area}
                        </span>
                        <Badge tone={SEVERITY[sug.severity] || "neutral"}>
                          {sug.severity}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-white/55">
                        {sug.suggestion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {audit.headlineIdeas.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-white/55">
                  Stronger headline ideas
                </p>
                <div className="space-y-1.5">
                  {audit.headlineIdeas.map((h, i) => (
                    <p
                      key={i}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-white/70"
                    >
                      {h}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
