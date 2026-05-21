"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/Button";
import { mapAuthError, signInWithGoogle } from "@/lib/firebase/auth";
import { toast } from "@/store/uiStore";

export function GoogleAuthButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onClick = async () => {
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
