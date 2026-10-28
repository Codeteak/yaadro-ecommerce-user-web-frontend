"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PlaygroundSourceFile } from "@/lib/playground/load-sources";
import type { PlaygroundUsage } from "@/lib/playground/usage";

type Tab = "usage" | "source";

/**
 * Usage snippet + full component source under each playground demo,
 * with Copy for handoff into another project.
 */
export function PlaygroundCodePanel({
  usage,
  sources = [],
  className,
}: {
  usage: PlaygroundUsage;
  sources?: PlaygroundSourceFile[];
  className?: string;
}) {
  const hasSource = sources.length > 0;
  const [tab, setTab] = useState<Tab>(hasSource ? "source" : "usage");
  const [fileIndex, setFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = sources[Math.min(fileIndex, Math.max(sources.length - 1, 0))];

  const display = useMemo(() => {
    if (tab === "usage") return usage.code;
    return activeFile?.content ?? "";
  }, [tab, usage.code, activeFile?.content]);

  const onCopy = async () => {
    if (!display) return;
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard may be blocked
    }
  };

  return (
    <section
      className={cn(
        "mt-8 overflow-hidden rounded-2xl bg-[#0f1712] ring-1 ring-black/10",
        className,
      )}
      aria-label="Component code"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div
          className="flex items-center gap-1 rounded-full bg-white/5 p-0.5"
          role="tablist"
          aria-label="Code view"
        >
          {hasSource ? (
            <TabButton
              active={tab === "source"}
              onClick={() => setTab("source")}
            >
              Source
            </TabButton>
          ) : null}
          <TabButton active={tab === "usage"} onClick={() => setTab("usage")}>
            Usage
          </TabButton>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-track" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy
            </>
          )}
        </button>
      </div>

      {tab === "source" && sources.length > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-3 py-2 [scrollbar-width:none] sm:px-4">
          {sources.map((file, i) => {
            const name = file.path.split("/").pop() ?? file.path;
            const selected = i === fileIndex;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => setFileIndex(i)}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full px-2.5 py-1 font-mono text-[11px] transition",
                  selected
                    ? "bg-track text-black"
                    : "bg-white/5 text-white/70 hover:bg-white/10",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      ) : null}

      {tab === "source" && activeFile ? (
        <p className="border-b border-white/5 px-4 py-2 font-mono text-[10px] text-white/40">
          {activeFile.path}
        </p>
      ) : null}

      <pre className="max-h-[28rem] overflow-auto px-4 py-4 text-[12px] leading-5 text-[#d7e8d7] [scrollbar-width:thin]">
        <code>{display}</code>
      </pre>

      {usage.files && usage.files.length > 0 ? (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-[10px] font-bold tracking-[0.14em] text-white/45 uppercase">
            Related files
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {usage.files.map((file) => (
              <li
                key={file}
                className="font-mono text-[11px] leading-5 text-white/65"
              >
                {file}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] uppercase transition",
        active
          ? "bg-white/15 text-white"
          : "text-white/50 hover:text-white/80",
      )}
    >
      {children}
    </button>
  );
}
