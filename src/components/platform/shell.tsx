"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Footer } from "./footer";
import { MobileNav } from "./mobile-nav";
import { SearchPalette } from "./search-palette";
import { cn } from "@/lib/utils";

/**
 * The global application shell. Wraps every route. The left sidebar is hidden
 * on the home page (per Ui.md: full-width content) and shown on every interior
 * page.
 */
export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";

  // The sidebar is hidden on the home page (per Ui.md: full-width content).
  // It appears on components, docs, examples, and other interior pages.
  const showSidebar = pathname !== "/";

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1">
        {showSidebar && (
          <aside className="hidden lg:block w-[260px] shrink-0 border-r border-border bg-sidebar/50">
            <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
              <Sidebar />
            </div>
          </aside>
        )}
        <main className={cn("flex-1 min-w-0 flex flex-col")}>
          <div className="flex-1">{children}</div>
        </main>
      </div>
      <Footer />
      <MobileNav />
      <SearchPalette />
    </div>
  );
}

/**
 * A content container with consistent max-width and padding for
 * documentation-style pages.
 */
export function PageContainer({
  children,
  className,
  width = "default",
}: {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "wide" | "full";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 py-8 lg:px-10 lg:py-12",
        width === "default" && "max-w-[1100px]",
        width === "wide" && "max-w-[1400px]",
        width === "full" && "max-w-none",
        className
      )}
    >
      {children}
    </div>
  );
}
