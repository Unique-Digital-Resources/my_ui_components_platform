"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useNavigation } from "@/store/navigation";
import { Sidebar } from "./sidebar";
import { BrandLockup } from "./brand";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const { mobileNavOpen, setMobileNavOpen } = useNavigation();
  const pathname = usePathname() ?? "/";

  // Close on Escape
  React.useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen, setMobileNavOpen]);

  // Auto-close the drawer when the route changes.
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  if (!mobileNavOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={() => setMobileNavOpen(false)}
      />
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-[300px] max-w-[85vw] border-r border-border bg-background shadow-2xl",
          "animate-in slide-in-from-left duration-200"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <BrandLockup />
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[calc(100%-3.5rem)]">
          {/* The Sidebar uses Link components; clicking any link performs a
              client-side navigation. The drawer auto-closes on route change
              via the effect above. */}
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
