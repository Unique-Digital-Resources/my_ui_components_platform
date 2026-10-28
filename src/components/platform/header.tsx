"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, Github } from "lucide-react";
import { useNavigation } from "@/store/navigation";
import { BrandLockup } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  matches: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Components",
    href: "/components",
    matches: (p) => p === "/components" || p.startsWith("/components/"),
  },
  {
    label: "Documentation",
    href: "/docs",
    matches: (p) => p === "/docs" || p.startsWith("/docs/"),
  },
  {
    label: "Examples",
    href: "/examples",
    matches: (p) => p === "/examples" || p.startsWith("/examples/"),
  },
  {
    label: "Resources",
    href: "/resources",
    matches: (p) =>
      p === "/resources" || p === "/changelog" || p === "/contributing",
  },
];

export function Header() {
  const setSearchOpen = useNavigation((s) => s.setSearchOpen);
  const setMobileNavOpen = useNavigation((s) => s.setMobileNavOpen);
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Link
          href="/"
          className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Workshop home"
        >
          <BrandLockup />
        </Link>

        <nav className="ml-6 hidden md:flex items-center gap-1" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = item.matches(pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "relative h-8 rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-brand-lemon" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden sm:inline-flex h-9 items-center gap-2 rounded-md border border-border bg-transparent pl-3 pr-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <kbd className="ml-4 inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4" />
          </button>

          <ThemeToggle />

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Github className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
