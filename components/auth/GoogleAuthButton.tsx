"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/Button";
import { mapAuthError, signInWithGoogle } from "@/lib/firebase/auth";
import { toast } from "@/store/uiStore";

export function GoogleAuthButton({
  label,
  onBeforeSignIn,
}: {
  label: string;
  /**
   * Optional gate fired right before the Google popup opens. Return
   * false to abort (e.g. when the signup consent checkbox isn't
   * ticked). Use this to also stash any side-effects (consent record,
   * referral code, etc.) into sessionStorage so ensureAccount can
   * pick them up after auth completes.
   */
  onBeforeSignIn?: () => boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onClick = async () => {
    /* Gate first — caller can block the popup AND stash state at the
       same time, e.g. consent record on the signup page. */
    if (onBeforeSignIn && !onBeforeSignIn()) return;
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success("Welcome to Credibly!");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      fullWidth
      loading={loading}
      onClick={onClick}
      leftIcon={<FcGoogle className="h-5 w-5" />}
    >
      {label}
    </Button>
  );
}
