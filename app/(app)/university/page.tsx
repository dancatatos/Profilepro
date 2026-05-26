"use client";

/**
 * Credibly University — user-facing learning hub.
 *
 * Reads admin-curated topic cards from Firestore and renders them in a
 * responsive grid (1 col mobile / 2 col tablet / 3 col desktop), grouped
 * by category. Each card has a banner, title, description and a CTA
 * button that points to whatever URL the admin set (typically a funnel
 * inside Credibly).
 *
 * Plan gating: a topic with a non-empty `allowedPlans` array is only
 * shown to users whose plan is on the list. Empty array = visible to
 * everyone. Inactive topics are never shown.
 */

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, GraduationCap, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/common/PageHeader";
import { listUniversityTopics } from "@/lib/firebase/firestore";
import type { UniversityTopic } from "@/types";

export default function UniversityPage() {
  const { account } = useAuth();
  const [topics, setTopics] = useState<UniversityTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await listUniversityTopics();
        if (!cancelled) setTopics(all);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Filter to topics visible to this user. Admins see everything so
     they can spot-check from the user view. */
  const visible = useMemo(() => {
    const userPlan = account?.plan ?? "free";
    const isAdmin = account?.role === "admin";
    return topics.filter((t) => {
      if (!t.active && !isAdmin) return false;
      if (isAdmin) return true;
      if (!t.allowedPlans || t.allowedPlans.length === 0) return true;
      return t.allowedPlans.includes(userPlan);
    });
  }, [topics, account]);

  /* Group by category, preserving sort order within each group. */
  const grouped = useMemo(() => {
    const map = new Map<string, UniversityTopic[]>();
    for (const t of visible) {
      const key = t.category?.trim() || "General";
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    /* Return an array of [category, topics[]] tuples — Map preserves
       insertion order which matches the sortOrder query already. */
    return Array.from(map.entries());
  }, [visible]);

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading lessons…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credibly University"
        subtitle="Master the tools, frameworks and growth playbooks built into Credibly."
      />

      {visible.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
            <GraduationCap className="h-6 w-6 text-white/30" />
          </span>
          <p className="text-sm font-medium text-white">Lessons coming soon</p>
          <p className="max-w-sm text-xs text-white/45">
            Your admin is curating the training library. Check back here once
            new lessons are published.
          </p>
        </Card>
      ) : (
        grouped.map(([category, items]) => (
          <section key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-white">
                {category}
              </h2>
              <span className="text-xs text-white/35">
                {items.length} lesson{items.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <TopicCard key={t.id} topic={t} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/* ── Card ── */

function TopicCard({ topic }: { topic: UniversityTopic }) {
  const isExternal = /^https?:\/\//i.test(topic.buttonUrl);
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      {/* Banner — 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden bg-white/[0.04]">
        {topic.bannerUrl ? (
          <img
            src={topic.bannerUrl}
            alt={topic.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap className="h-10 w-10 text-white/15" />
          </div>
        )}
        {!topic.active && (
          <div className="absolute left-3 top-3">
            <Badge tone="gold">Draft</Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-semibold text-white">
          {topic.title}
        </h3>
        <p className="mt-1.5 text-sm text-white/55">{topic.description}</p>
        <div className="mt-4">
          <Button
            href={topic.buttonUrl}
            fullWidth
            variant="primary"
            rightIcon={
              isExternal ? <ExternalLink className="h-3.5 w-3.5" /> : undefined
            }
          >
            {topic.buttonText || "Start Lessons"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
