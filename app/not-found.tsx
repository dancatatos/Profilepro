import { Compass } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
        <Compass className="h-7 w-7 text-white/40" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold text-white">
        404 — Page not found
      </h1>
      <p className="mt-1.5 max-w-xs text-sm text-white/45">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-6">
        <Button href="/">Back to home</Button>
      </div>
      <div className="mt-12 opacity-60">
        <Logo />
      </div>
    </main>
  );
}
