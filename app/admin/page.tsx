"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserRound,
  Inbox,
  CreditCard,
  RefreshCw,
  ArrowRight,
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
} from "@/lib/firebase/firestore";
import type { AccountUser } from "@/types";

export default function AdminDashboardPage() {
  const { account } = useAuth();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [profileCount, setProfileCount] = useState<number | null>(null);
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);

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
    if (account?.role === "admin") loadData();
  }, [account, loadData]);

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
    </div>
  );
}
