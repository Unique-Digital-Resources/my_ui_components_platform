"use client";

import * as React from "react";

/**
 * Workshop brand mark — a geometric "modular grid" symbol.
 * Two offset rounded squares connected by a node, evoking
 * composition + reusable blocks + connections.
 */
export function BrandMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="14"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        className="text-brand-lemon"
      />
      <rect
        x="9"
        y="9"
        width="14"
        height="14"
        rx="3"
        fill="currentColor"
        className="text-brand-purple-strong"
        stroke="currentColor"
        strokeWidth="2"
        style={{ stroke: "var(--brand-purple-soft)" }}
      />
      <rect
        x="15"
        y="15"
        width="14"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        className="text-brand-lemon"
      />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" className="text-brand-lemon" />
    </svg>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <BrandMark size={26} />
      <span className="font-semibold tracking-tight text-[15px] text-foreground">
        Workshop
      </span>
      <span className="hidden sm:inline text-[11px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
        v0.1
      </span>
    </span>
  );
}
