import Link from "next/link";
import { UserX } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export default function ProfileNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
        <UserX className="h-7 w-7 text-white/40" />
      </span>
      <h1 className="mt-5 font-display text-xl font-bold text-white">
        Profile not found
      </h1>
      <p className="mt-1.5 max-w-xs text-sm text-white/45">
        This Credibly profile doesn&apos;t exist or hasn&apos;t been published
        yet.
      </p>
      <div className="mt-6 flex flex-col items-center gap-4">
        <Button href="/">Create your own profile</Button>
        <Link href="/demo" className="text-sm text-electric-400">
          See an example profile
        </Link>
      </div>
      <div className="mt-12 opacity-60">
        <Logo />
      </div>
    </main>
  );
}
