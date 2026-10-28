"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CollapsibleDescription — a long text block that truncates to `maxLength`
 * characters (at the nearest word boundary) and collapses by default.
 *
 * When the text exceeds `maxLength`, a "Show more" / "Show less" toggle is
 * rendered inline. When the text is shorter than `maxLength`, the full text
 * is shown with no toggle.
 *
 * Used for component `longDescription` fields in playground headers so the
 * page doesn't get dominated by a wall of text on first load.
 */
export function CollapsibleDescription({
  text,
  maxLength = 220,
  className,
}: {
  text: string;
  /** Max characters shown in the collapsed state. Truncates at the nearest word boundary. */
  maxLength?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);

  // If the text fits, render it plainly — no toggle, no state overhead.
  if (text.length <= maxLength) {
    return <p className={className}>{text}</p>;
  }

  // Find the last space at or before maxLength so we don't cut mid-word.
  // If the text has no spaces near the boundary (e.g. a very long URL), we
  // hard-cut at maxLength.
  let cut = text.lastIndexOf(" ", maxLength);
  if (cut <= 0 || cut < maxLength * 0.5) cut = maxLength;
  const truncated = text.slice(0, cut).trimEnd();

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p>
        {expanded ? text : truncated}
        {!expanded && (
          <span aria-hidden="true">…</span>
        )}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="inline-flex w-fit items-center gap-1 text-[12px] font-medium text-brand-lemon transition-colors hover:text-brand-lemon/80"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            Show more
          </>
        )}
      </button>
    </div>
  );
}
