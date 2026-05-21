"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, KeyRound, Sparkles, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateUserDoc, getPlansConfig } from "@/lib/firebase/firestore";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { toast } from "@/store/uiStore";
import { PLANS } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import type { Plan, PlanId } from "@/types";

const GUMROAD_URL = "https://danzbiz.gumroad.com/l/profileproplan";

export default function BillingPage() {
  const { account } = useAuth();
  const setAccount = useAuthStore((s) => s.setAccount);
  const currentPlan = (account?.plan || "free") as PlanId;

  const [licenseKey, setLicenseKey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [activated, setActivated] = useState(false);
  const [plans, setPlans] = useState<Plan[]>(PLANS);

  useEffect(() => {
    getPlansConfig()
      .then((p) => {
        if (p) setPlans(p);
      })
      .catch(() => null);
  }, []);

  const activateLicense = async () => {
    if (!licenseKey.trim()) {
      toast.error("Please enter your license key.");
      return;
    }
    if (!account) return;

    setVerifying(true);
    try {
      const res = await fetch("/api/gumroad/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });
      const data = await res.json() as {
        plan?: PlanId;
        email?: string;
        licenseKey?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        toast.error(data.error || "Invalid license key.");
        return;
      }

      /* Update Firestore + local store */
      await updateUserDoc(account.uid, {
        plan: data.plan!,
        licenseKey: data.licenseKey,
        licenseEmail: data.email,
      });
      setAccount({ ...account, plan: data.plan! });
      setActivated(true);
      toast.success(`🎉 ${data.plan!.toUpperCase()} plan activated!`);
      setLicenseKey("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Plans"
        subtitle="Upgrade to unlock the full platform experience."
      />

      {/* Current plan banner */}
      <Card className="flex items-center gap-3 p-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-jade-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            You are on the{" "}
            <span className="capitalize text-jade-300">{currentPlan}</span> plan
          </p>
          <p className="text-xs text-white/40">
            {currentPlan === "free"
              ? "Upgrade to unlock AI generation, analytics and more."
              : "Thank you for supporting ProfilePro! 🙌"}
          </p>
        </div>
        {currentPlan !== "free" && (
          <Badge tone="jade">{currentPlan.toUpperCase()}</Badge>
        )}
      </Card>

      {/* Plan cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
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
                <span className="text-sm font-normal text-white/40">/mo</span>
              </p>

              {isCurrent ? (
                <Button fullWidth className="mt-4" variant="outline" disabled>
                  Current plan
                </Button>
              ) : plan.id === "free" ? (
                <Button fullWidth className="mt-4" variant="outline" disabled>
                  Free forever
                </Button>
              ) : (
                <Button
                  href={GUMROAD_URL}
                  fullWidth
                  className="mt-4"
                  variant={plan.highlighted ? "primary" : "outline"}
                  rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
                >
                  Buy on Gumroad
                </Button>
              )}

              <ul className="mt-5 space-y-2">
                {plan.features.map((f, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      f.included ? "text-white/70" : "text-white/35",
                    )}
                  >
                    {f.included ? (
                      <Check className="h-4 w-4 shrink-0 text-jade-400" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-white/20" />
                    )}
                    {f.label}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {/* License key activation */}
      {currentPlan === "free" && !activated && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-4 w-4 text-electric-400" />
            <h3 className="font-display text-sm font-semibold text-white">
              Already purchased? Activate your license
            </h3>
          </div>
          <p className="mb-4 text-xs text-white/45">
            After buying on Gumroad you&apos;ll receive a license key by email.
            Paste it below to instantly upgrade your account.
          </p>
          <div className="flex gap-3">
            <Input
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="font-mono uppercase"
              onKeyDown={(e) => e.key === "Enter" && activateLicense()}
            />
            <Button
              onClick={activateLicense}
              loading={verifying}
              disabled={verifying || !licenseKey.trim()}
              className="shrink-0"
            >
              Activate
            </Button>
          </div>
        </Card>
      )}

      {activated && (
        <Card className="flex items-center gap-3 p-4 border border-jade-500/30">
          <Sparkles className="h-5 w-5 text-jade-400" />
          <p className="text-sm text-jade-300 font-medium">
            License activated! Refresh the page to see your new features.
          </p>
        </Card>
      )}

      <Card className="p-4">
        <p className="text-xs text-white/35">
          Payments are securely processed by Gumroad. License keys are
          single-use and tied to your account. Contact support if you have
          any issues activating.
        </p>
      </Card>
    </div>
  );
}
