"use client";

import { useEffect, useState } from "react";

interface Remaining {
  d: number;
  h: number;
  m: number;
  s: number;
  done: boolean;
}

function remainingTo(targetIso: string): Remaining {
  const target = new Date(targetIso).getTime();
  let ms = target - Date.now();
  if (Number.isNaN(target) || ms <= 0) {
    return { d: 0, h: 0, m: 0, s: 0, done: true };
  }
  const d = Math.floor(ms / 86400000);
  ms -= d * 86400000;
  const h = Math.floor(ms / 3600000);
  ms -= h * 3600000;
  const m = Math.floor(ms / 60000);
  ms -= m * 60000;
  const s = Math.floor(ms / 1000);
  return { d, h, m, s, done: false };
}

/** Live, ticking countdown — computed only on the client to avoid an
    SSR/client time mismatch. */
export function CountdownTimer({
  targetIso,
  expiredText,
}: {
  targetIso: string;
  expiredText: string;
}) {
  const [t, setT] = useState<Remaining | null>(null);

  useEffect(() => {
    setT(remainingTo(targetIso));
    const id = setInterval(() => setT(remainingTo(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!t) {
    return <div className="h-[3.75rem]" aria-hidden />;
  }

  if (t.done) {
    return (
      <p
        className="text-center text-sm font-semibold"
        style={{ color: "var(--tp-accent)" }}
      >
        {expiredText}
      </p>
    );
  }

  const cells: { value: number; label: string }[] = [
    { value: t.d, label: "Days" },
    { value: t.h, label: "Hrs" },
    { value: t.m, label: "Min" },
    { value: t.s, label: "Sec" },
  ];

  return (
    <div className="flex justify-center gap-2">
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex min-w-[3.5rem] flex-col items-center rounded-xl px-2 py-2.5"
          style={{
            background: "var(--tp-card)",
            border: "1px solid var(--tp-border)",
          }}
        >
          <span
            className="font-display text-xl font-bold tabular-nums"
            style={{ color: "var(--tp-text)" }}
          >
            {String(c.value).padStart(2, "0")}
          </span>
          <span
            className="text-[10px] uppercase tracking-wide"
            style={{ color: "var(--tp-text3)" }}
          >
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
