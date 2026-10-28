"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  filename?: string;
  /** When provided, overrides the displayed code (useful for live-updating snippets) */
  showLineNumbers?: boolean;
}

/**
 * A lightweight code block with copy-to-clipboard.
 * Uses a <pre><code> structure with mono font and a dark surface.
 * No syntax highlighting library — keeps the bundle small and the
 * component honest (the code is the source of truth).
 */
export function CodeBlock({
  code,
  language,
  className,
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [code]);

  const lines = code.split("\n");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-[#0B0B10] text-[13px] min-w-0",
        className
      )}
    >
      {(filename || language) && (
        <div className="flex items-center justify-between border-b border-border/60 bg-white/[0.02] px-3 py-1.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/70" />
            </div>
            {filename && (
              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                {filename}
              </span>
            )}
          </div>
          {language && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {language}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <pre className="overflow-x-auto p-4 leading-relaxed">
          <code className="font-mono text-[#D8D4E8]">
            {showLineNumbers ? (
              lines.map((line, i) => (
                <div key={i} className="table-row">
                  <span className="table-cell pr-4 select-none text-right text-muted-foreground/40">
                    {i + 1}
                  </span>
                  <span className="table-cell whitespace-pre">{line || " "}</span>
                </div>
              ))
            ) : (
              code
            )}
          </code>
        </pre>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className={cn(
            "absolute right-2 top-2 inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background/80 px-2 text-[11px] font-medium text-muted-foreground opacity-0 backdrop-blur transition-all hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100",
            copied && "opacity-100 text-brand-lemon border-brand-lemon/40"
          )}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Inline copyable value chip — used in output panels. The whole chip is
 * clickable; on click it copies the value and briefly shows an overlay
 * with a checkmark and "Copied" on a green background (no persistent
 * copy icon).
 */
export function CopyableValue({
  label,
  value,
  className,
}: {
  label?: string;
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback(async () => {
    // Always show the "Copied" feedback, even if the clipboard API fails
    // (e.g. in non-secure contexts or headless browsers).
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Legacy fallback.
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch { /* ignore */ }
        document.body.removeChild(ta);
      }
    } catch {
      // ignore — still show the feedback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ? `Copy ${label} value` : "Copy value"}
      className={cn(
        "relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px] transition-colors hover:border-brand-lemon/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {label && (
        <span className="shrink-0 text-muted-foreground/70">{label}:</span>
      )}
      <span className="truncate text-foreground">{value}</span>
      {/* Copied overlay — slides up from the bottom with a green background */}
      <span
        aria-hidden={!copied}
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center gap-1 bg-emerald-600 text-[11px] font-semibold text-white transition-all duration-200",
          copied
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        )}
      >
        <Check className="h-3 w-3" />
        Copied
      </span>
    </button>
  );
}
