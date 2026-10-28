"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbsFromPath } from "@/lib/platform/breadcrumbs";
import { cn } from "@/lib/utils";

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const crumbs = breadcrumbsFromPath(pathname);

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-1 text-[12px]">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              )}
              {last ? (
                <span className="font-mono text-muted-foreground" aria-current="page">
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
                >
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The small overline label seen above page titles, e.g. "COMPONENTS / COLOR".
 */
export function PageOverline({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow mb-3">{children}</p>;
}
