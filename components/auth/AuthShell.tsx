import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck, Sparkles, TrendingUp } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const HIGHLIGHTS = [
  { icon: Sparkles, text: "AI writes your headline, bio & CTAs" },
  { icon: BadgeCheck, text: "Look credible & close more prospects" },
  { icon: TrendingUp, text: "Track visits, clicks & leads" },
];

/** Premium split-screen auth layout — brand panel + form. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink-950 lg:flex-row">
      <div className="glow-blob -left-20 -top-24 h-72 w-72 bg-electric-600/40" />
      <div className="glow-blob -bottom-24 right-0 h-72 w-72 bg-jade-600/25" />

      {/* Brand panel — desktop only */}
      <aside className="relative hidden w-1/2 flex-col justify-between border-r border-white/[0.06] p-12 lg:flex">
        <Link href="/">
          <Logo />
        </Link>
        <div>
          <h2 className="font-display text-3xl font-bold leading-tight text-white">
            Your AI-powered
            <br />
            <span className="text-gradient">credibility profile.</span>
          </h2>
          <p className="mt-3 max-w-sm text-sm text-white/50">
            The modern profile platform built for network marketers,
            recruiters, coaches and online sellers.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]">
                  <h.icon className="h-5 w-5 text-electric-400" />
                </span>
                <span className="text-sm text-white/70">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} Credibly. Built for trust.
        </p>
      </aside>

      {/* Form panel */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </Link>
          <h1 className="font-display text-2xl font-bold text-white">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-white/50">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer && (
            <div className="mt-6 text-center text-sm text-white/50">
              {footer}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
