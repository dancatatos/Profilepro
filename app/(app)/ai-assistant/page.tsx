"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";
import { cn, uid } from "@/lib/utils";
import type { AIChatMessage } from "@/types";

const QUICK = [
  { label: "Improve my bio", icon: "Wand2", prompt: "Help me improve my profile bio. My current bio is: " },
  { label: "CTA button ideas", icon: "MousePointerClick", prompt: "Give me 5 high-converting CTA button labels for my credibility profile." },
  { label: "Recruiting pitch", icon: "Users", prompt: "Write a warm recruiting pitch inviting people to join my team. My opportunity: " },
  { label: "Social captions", icon: "Share2", prompt: "Write 3 scroll-stopping social captions promoting my profile. My niche: " },
  { label: "Content hooks", icon: "Zap", prompt: "Give me 5 attention-grabbing content hooks for my niche: " },
  { label: "Make me convert", icon: "TrendingUp", prompt: "How can I make my credibility profile more trustworthy and convert more prospects?" },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;

    const userMsg: AIChatMessage = {
      id: uid("m"),
      role: "user",
      content,
      createdAt: Date.now(),
    };
    const assistantId = uid("m");
    const next = [...messages, userMsg];
    setMessages([
      ...next,
      { id: assistantId, role: "assistant", content: "", createdAt: Date.now() },
    ]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        }),
      });
      if (!res.ok || !res.body) throw new Error("stream failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + chunk }
              : msg,
          ),
        );
      }
    } catch {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId && !msg.content
            ? { ...msg, content: "Sorry — something went wrong. Please try again." }
            : msg,
        ),
      );
    } finally {
      setStreaming(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col">
      <PageHeader
        title="AI Assistant"
        subtitle="Your AI copywriter for credibility-building copy."
      />

      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 space-y-4 overflow-y-auto rounded-2xl"
      >
        {empty ? (
          <div className="flex flex-col items-center pt-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow-blue">
              <Sparkles className="h-7 w-7 text-white" />
            </span>
            <h2 className="mt-3 font-display text-base font-semibold text-white">
              How can I help you today?
            </h2>
            <p className="mt-1 max-w-xs text-xs text-white/45">
              Ask me anything, or start with a quick action below.
            </p>
            <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-2.5">
              {QUICK.map((q) => (
                <button
                  key={q.label}
                  onClick={() => {
                    setInput(q.prompt);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-left hover:border-electric-500/40"
                >
                  <Icon name={q.icon} className="h-4 w-4 shrink-0 text-electric-400" />
                  <span className="text-xs font-medium text-white">
                    {q.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-2.5",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role === "assistant" && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                  <LogoMark className="h-5 w-5" />
                </span>
              )}
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm",
                  m.role === "user"
                    ? "bg-brand-gradient text-white"
                    : "border border-white/[0.07] bg-white/[0.03] text-white/85",
                )}
              >
                {m.content || (
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40 [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40 [animation-delay:0.4s]" />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="mt-3 flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-ink-850 p-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask Credibly AI anything…"
          className="no-scrollbar max-h-28 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/30 outline-none"
        />
        <button
          onClick={() => send(input)}
          disabled={streaming || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
