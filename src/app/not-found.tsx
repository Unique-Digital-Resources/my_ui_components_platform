"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";

/**
 * 404 page. Rendered by Next.js whenever no route matches.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        This page doesn&apos;t exist.
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page may have moved, or the URL may be incorrect.
      </p>
      <div className="mt-6 flex gap-2">
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md bg-brand-lemon px-4 text-[13px] font-medium text-[#17151D] transition-colors hover:bg-brand-lemon-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
