"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { updateUserDoc } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { logout } from "@/lib/firebase/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { APP } from "@/lib/constants";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "@/store/uiStore";

export default function SettingsPage() {
  const router = useRouter();
  const { account } = useAuth();
  const setAccount = useAuthStore((s) => s.setAccount);
  const [name, setName] = useState(account?.displayName || "");
  const [saving, setSaving] = useState(false);

  if (!account) return null;
  const profileUrl = `${APP.url}/${account.username || "demo"}`;

  const saveName = async () => {
    if (name.trim().length < 2) {
      toast.error("Enter a valid name.");
      return;
    }
    setSaving(true);
    try {
      await updateUserDoc(account.uid, { displayName: name.trim() });
      setAccount({ ...account, displayName: name.trim() });
      toast.success("Profile updated");
    } catch {
      toast.error("Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await logout();
    toast.info("Signed out.");
    router.replace("/login");
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Manage your account & profile." />

      <Card className="p-5">
        <CardHeader title="Account" subtitle="Your personal details" />
        <div className="mt-4 space-y-3">
          <Input
            label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input label="Email" value={account.email} disabled />
          <Button size="sm" loading={saving} onClick={saveName}>
            Save changes
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Your profile" subtitle="Public URL & editing" />
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3">
            <span className="flex-1 truncate text-sm text-white/65">
              {profileUrl}
            </span>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Copy className="h-3.5 w-3.5" />}
              onClick={async () => {
                if (await copyToClipboard(profileUrl))
                  toast.success("Link copied");
              }}
            >
              Copy
            </Button>
          </div>
          <div className="flex gap-2">
            <Button href="/profile" size="sm" variant="outline">
              Edit profile
            </Button>
            <Button
              href={`/${account.username || "demo"}`}
              size="sm"
              variant="outline"
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              View live
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Subscription" subtitle="Your current plan" />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge tone={account.plan === "free" ? "neutral" : "blue"}>
              {account.plan.toUpperCase()}
            </Badge>
            <span className="text-sm text-white/55">
              {account.plan === "free"
                ? "Free plan"
                : `${account.plan} plan active`}
            </span>
          </div>
          <Button href="/billing" size="sm" variant="outline">
            Manage
          </Button>
        </div>
      </Card>

      {!isFirebaseConfigured && (
        <Card className="border border-gold-400/20 bg-gold-400/[0.04] p-4">
          <p className="text-sm font-medium text-gold-200">Demo mode</p>
          <p className="mt-0.5 text-xs text-white/55">
            Connect your Firebase project in <code>.env.local</code> to enable
            real accounts, saving and authentication.
          </p>
        </Card>
      )}

      <Button
        variant="outline"
        fullWidth
        onClick={signOut}
        leftIcon={<LogOut className="h-4 w-4" />}
        className="border-red-500/20 text-red-300"
      >
        Sign out
      </Button>
    </div>
  );
}
