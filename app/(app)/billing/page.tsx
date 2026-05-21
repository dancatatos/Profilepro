"use client";

import { Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PLANS } from "@/lib/constants";
import { toast } from "@/store/uiStore";

export default function BillingPage() {
  const { account } = useAuth();
  const currentPlan = account?.plan || "free";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing & Plans"
        subtitle="Upgrade to unlock the full Credibly experience."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <Card
              key={plan.id}
              className={
                plan.highlighted
                  ? "border border-electric-500/40 p-5"
                  : "p-5"
              }
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  {plan.name}
                </h3>
                {isCurrent && <Badge tone="jade">Current</Badge>}
                {!isCurrent && plan.highlighted && (
                  <Badge tone="blue">Popular</Badge>
                )}
              </div>
              <p className="text-xs text-white/45">{plan.tagline}</p>
              <p className="mt-3 font-display text-3xl font-bold text-white">
                ${plan.priceMonthly}
                <span className="text-sm font-normal text-white/40">
                  /month
                </span>
              </p>
              <Button
                fullWidth
                className="mt-4"
                variant={isCurrent ? "outline" : plan.highlighted ? "primary" : "outline"}
                disabled={isCurrent}
                onClick={() =>
                  toast.info(
                    "Payments are not wired up yet — connect Stripe to go live.",
                  )
                }
              >
                {isCurrent ? "Current plan" : `Upgrade to ${plan.name}`}
              </Button>
              <ul className="mt-5 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f.label}
                    className={`flex items-center gap-2 text-sm ${
                      f.included ? "text-white/70" : "text-white/30"
                    }`}
                  >
                    <Check
                      className={`h-4 w-4 shrink-0 ${
                        f.included ? "text-jade-400" : "text-white/15"
                      }`}
                    />
                    {f.label}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <p className="text-xs text-white/45">
          Credibly is architecture-ready for Stripe subscriptions. Wire your
          Stripe keys + a checkout Cloud Function to start charging.
        </p>
      </Card>
    </div>
  );
}
