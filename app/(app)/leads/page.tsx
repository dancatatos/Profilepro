"use client";

import { useEffect, useState } from "react";
import { Download, Mail, Phone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listLeads } from "@/lib/firebase/firestore";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Lead } from "@/types";

const DEMO_LEADS: Lead[] = [
  { id: "l1", profileId: "demo", ownerId: "demo", name: "Maria Santos", email: "maria.santos@example.com", phone: "+63 917 000 1234", source: "leadCapture", createdAt: Date.now() - 2 * 3600_000 },
  { id: "l2", profileId: "demo", ownerId: "demo", name: "Rico Dela Cruz", email: "rico.dc@example.com", source: "leadCapture", createdAt: Date.now() - 26 * 3600_000 },
  { id: "l3", profileId: "demo", ownerId: "demo", name: "Anna Reyes", phone: "+63 922 555 8899", source: "leadCapture", createdAt: Date.now() - 3 * 86400_000 },
];

export default function LeadsPage() {
  const { account } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!account) return;
    if (account.uid === "demo") {
      setLeads(DEMO_LEADS);
      setLoaded(true);
      return;
    }
    listLeads(account.uid)
      .then(setLeads)
      .catch(() => null)
      .finally(() => setLoaded(true));
  }, [account]);

  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "Phone", "Source", "Date"],
      ...leads.map((l) => [
        l.name,
        l.email || "",
        l.phone || "",
        l.source,
        new Date(l.createdAt).toISOString(),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "credibly-leads.csv";
    link.click();
    toast.success("Leads exported");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} prospect${leads.length === 1 ? "" : "s"} captured`}
        action={
          leads.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={exportCsv}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export CSV
            </Button>
          )
        }
      />

      {loaded && leads.length === 0 ? (
        <EmptyState
          icon="Inbox"
          title="No leads yet"
          description="When prospects submit your lead capture form, they'll appear here."
        />
      ) : (
        <div className="space-y-2.5">
          {leads.map((lead) => (
            <Card key={lead.id} className="flex items-center gap-3 p-3.5">
              <Avatar name={lead.name} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {lead.name}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/45">
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {lead.email}
                    </span>
                  )}
                  {lead.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <Badge tone="blue">{lead.source}</Badge>
                <p className="mt-1 text-[10px] text-white/35">
                  {timeAgo(lead.createdAt)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
