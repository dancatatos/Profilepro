"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  Users,
  UserRound,
  Inbox,
  CreditCard,
  RefreshCw,
  ArrowRight,
  LayoutTemplate,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/uiStore";
import {
  listAllUsers,
  countAllProfiles,
  countAllLeads,
  getFeatureFlags,
  setFeatureFlags,
} from "@/lib/firebase/firestore";
import { useFeatureFlagsStore } from "@/store/featureFlagsStore";
import { cn } from "@/lib/utils";
import type { AccountUser, FeatureFlags } from "@/types";

export default function AdminDashboardPage() {
  const { account } = useAuth();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [profileCount, setProfileCount] = useState<number | null>(null);
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);

  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [savingFlag, setSavingFlag] = useState<string | null>(null);
  const patchLocalFlags = useFeatureFlagsStore((s) => s.patchLocal);

  const loadData = useCallback(async () => {
    setFetching(true);
    try {
      const [allUsers, profiles, leads] = await Promise.all([
        listAllUsers(),
        countAllProfiles(),
        countAllLeads(),
      ]);
      setUsers(allUsers);
      setProfileCount(profiles);
      setLeadCount(leads);
    } catch (err) {
      console.error(err);
      toast.error("Could not load stats. Check Firestore rules.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "admin") {
      loadData();
      getFeatureFlags().then(setFlags);
    }
  }, [account, loadData]);

  const toggleFlag = async (key: keyof FeatureFlags, label: string) => {
    if (!flags) return;
    const next = !flags[key];
    setFlags({ ...flags, [key]: next });
    setSavingFlag(key);
    try {
      await setFeatureFlags({ [key]: next });
      patchLocalFlags({ [key]: next });
      toast.success(`${label} ${next ? "enabled" : "disabled"}.`);
    } catch {
      setFlags((f) => (f ? { ...f, [key]: !next } : f));
      toast.error("Couldn't update — check Firestore rules are published.");
    } finally {
      setSavingFlag(null);
    }
  };

  const proCount = users.filter((u) => u.plan !== "free").length;
  const freeCount = users.filter((u) => u.plan === "free").length;

  const stats = [
    {
      icon: <Users className="h-5 w-5" />,
      label: "Total users",
      value: fetching ? "…" : String(users.length),
      color: "text-electric-400",
    },
    {
      icon: <UserRound className="h-5 w-5" />,
      label: "Profiles",
      value: fetching ? "…" : profileCount !== null ? String(profileCount) : "—",
      color: "text-jade-400",
    },
    {
      icon: <Inbox className="h-5 w-5" />,
      label: "Total leads",
      value: fetching ? "…" : leadCount !== null ? String(leadCount) : "—",
      color: "text-gold-400",
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      label: "Paid users",
      value: fetching ? "…" : String(proCount),
      color: "text-blue-400",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Dashboard
          </h1>
          <p className="text-sm text-white/45">Platform overview.</p>
        </div>
        <Button
          variant="outline"
          onClick={loadData}
          loading={fetching}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className={`mb-2 ${s.color}`}>{s.icon}</div>
            <p className="font-display text-3xl font-bold text-white">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-white/45">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-sm font-semibold text-white">
            User Management
          </h3>
          <p className="mt-1 text-xs text-white/40">
            {fetching
              ? "Loading…"
              : `${users.length} total · ${freeCount} free · ${proCount} paid`}
          </p>
          <Link
            href="/admin/users"
            className="mt-4 flex items-center gap-1.5 text-xs font-medium text-electric-400 hover:text-electric-300 transition-colors"
          >
            Manage users <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-sm font-semibold text-white">
            Platform Health
          </h3>
          <p className="mt-1 text-xs text-white/40">
            All systems operational.
          </p>
          <p className="mt-4 text-xs text-white/25">
            Detailed analytics coming soon.
          </p>
        </Card>
      </div>

      {/* Feature flags */}
      <div>
        <h2 className="mb-3 font-display text-sm font-semibold text-white">
          Feature Flags
        </h2>
        <Card className="divide-y divide-white/[0.06] p-0">
          <FeatureFlagRow
            icon={<LayoutTemplate className="h-5 w-5 text-electric-400" />}
            title="Template Marketplace"
            description="Shows the standalone Template Marketplace tab in the user sidebar. Keep this OFF until the marketplace is ready to launch."
            enabled={flags?.templateMarketplace ?? false}
            loading={!flags || savingFlag === "templateMarketplace"}
            onToggle={() =>
              toggleFlag("templateMarketplace", "Template Marketplace")
            }
          />
        </Card>
      </div>
    </div>
  );
}

/* ── Feature flag toggle row ── */

function FeatureFlagRow({
  icon,
  title,
  description,
  enabled,
  loading,
  onToggle,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-4 p-5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-semibold text-white">
            {title}
          </h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              enabled
                ? "bg-jade-500/15 text-jade-300"
                : "bg-white/[0.06] text-white/40",
            )}
          >
            {enabled ? "ON" : "OFF"}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`Toggle ${title}`}
        disabled={loading}
        onClick={onToggle}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
          enabled ? "bg-jade-500" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            enabled ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
