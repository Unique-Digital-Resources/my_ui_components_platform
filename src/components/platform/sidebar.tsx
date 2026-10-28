"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Palette,
  SlidersHorizontal,
  LayoutPanelLeft,
  Table2,
  Navigation,
  BookOpen,
  Boxes,
  Sparkles,
  ScrollText,
  GitBranch,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { categories, components, plannedComponents } from "@/lib/platform/content";
import { cn } from "@/lib/utils";

interface NavEntry {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
  /** Returns true if this entry should be highlighted as the current page. */
  isActive: (pathname: string) => boolean;
  indent?: boolean;
  planned?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  entries: NavEntry[];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  color: Palette,
  inputs: SlidersHorizontal,
  layout: LayoutPanelLeft,
  "data-display": Table2,
  productivity: Boxes,
  navigation: Navigation,
};

export function Sidebar() {
  const pathname = usePathname() ?? "/";

  // Build groups dynamically from content
  const libraryGroups: NavGroup[] = categories.map((cat) => {
    const Icon = CATEGORY_ICONS[cat.slug] ?? Boxes;
    const realComps: NavEntry[] = components
      .filter((c) => c.category === cat.slug)
      .map((c) => ({
        label: c.name,
        href: `/components/${cat.slug}/${c.slug}`,
        isActive: (p) => p === `/components/${cat.slug}/${c.slug}`,
        indent: true,
      }));
    const planned: NavEntry[] = plannedComponents
      .filter((p) => p.category === cat.slug)
      .map((p) => ({
        label: p.name,
        href: `/components/${cat.slug}`,
        isActive: () => false,
        indent: true,
        planned: true,
        badge: "Planned",
      }));
    return {
      id: `cat-${cat.slug}`,
      label: cat.name,
      icon: Icon,
      defaultOpen: cat.slug === "color",
      entries: [
        {
          label: "Overview",
          href: `/components/${cat.slug}`,
          isActive: (p) => p === `/components/${cat.slug}`,
          indent: true,
        },
        ...realComps,
        ...planned,
      ],
    };
  });

  const docsGroup: NavGroup = {
    id: "docs",
    label: "Documentation",
    icon: BookOpen,
    defaultOpen: true,
    entries: [
      {
        label: "Overview",
        href: "/docs",
        isActive: (p) => p === "/docs",
        indent: true,
      },
      {
        label: "Installation",
        href: "/docs/installation",
        isActive: (p) => p === "/docs/installation",
        indent: true,
      },
      {
        label: "Core concepts",
        href: "/docs/concepts",
        isActive: (p) => p === "/docs/concepts",
        indent: true,
      },
      {
        label: "Theming",
        href: "/docs/theming",
        isActive: (p) => p === "/docs/theming",
        indent: true,
      },
      {
        label: "API reference",
        href: "/docs/api",
        isActive: (p) => p === "/docs/api",
        indent: true,
      },
    ],
  };

  // Top-level Theme Editor group (not under Documentation — it's a main tool)
  const themeEditorGroup: NavGroup = {
    id: "theme-editor",
    label: "Theme Editor",
    icon: Palette,
    defaultOpen: false,
    entries: [
      {
        label: "Token Editor",
        href: "/theme-editor",
        icon: Palette,
        isActive: (p) => p === "/theme-editor",
        indent: true,
      },
    ],
  };

  const projectGroup: NavGroup = {
    id: "project",
    label: "Project",
    icon: Sparkles,
    defaultOpen: false,
    entries: [
      {
        label: "Examples",
        href: "/examples",
        icon: Sparkles,
        isActive: (p) => p === "/examples" || p.startsWith("/examples/"),
        indent: true,
      },
      {
        label: "Resources",
        href: "/resources",
        icon: Boxes,
        isActive: (p) => p === "/resources",
        indent: true,
      },
      {
        label: "Changelog",
        href: "/changelog",
        icon: ScrollText,
        isActive: (p) => p === "/changelog",
        indent: true,
      },
      {
        label: "Contributing",
        href: "/contributing",
        icon: GitBranch,
        isActive: (p) => p === "/contributing",
        indent: true,
      },
    ],
  };

  // Determine which groups should be open by default based on active route
  const allGroups = [docsGroup, themeEditorGroup, ...libraryGroups, projectGroup];

  return (
    <nav
      aria-label="Library navigation"
      className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4 text-sm"
    >
      <div className="px-2 pb-2">
        <span className="eyebrow">Library</span>
      </div>
      {allGroups.map((group) => (
        <SidebarGroup key={group.id} group={group} pathname={pathname} />
      ))}
      <div className="mt-auto px-3 py-4">
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <p className="text-[11px] font-mono text-muted-foreground mb-1">
            STATUS
          </p>
          <p className="text-xs text-foreground/80 leading-relaxed">
            1 stable component · 3 planned
          </p>
        </div>
      </div>
    </nav>
  );
}

function SidebarGroup({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  // Auto-open if any entry is active
  const hasActive = group.entries.some((e) => e.isActive(pathname));
  const [open, setOpen] = React.useState(group.defaultOpen ?? false);

  React.useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  const Icon = group.icon;

  return (
    <div className="px-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-foreground/90 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5 pb-2">
          {group.entries.map((entry) => {
            const active = entry.isActive(pathname);
            const EntryIcon = entry.icon;
            return (
              <li key={entry.label}>
                <Link
                  href={entry.href}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    entry.indent && "ml-3",
                    active
                      ? "bg-brand-purple-strong text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                    entry.planned && "opacity-60"
                  )}
                >
                  {EntryIcon ? (
                    <EntryIcon className="h-3.5 w-3.5" />
                  ) : (
                    <span
                      className={cn(
                        "h-1 w-1 rounded-full",
                        active ? "bg-brand-lemon" : "bg-muted-foreground/40"
                      )}
                    />
                  )}
                  <span className="flex-1 text-left truncate">{entry.label}</span>
                  {entry.badge && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                      {entry.badge}
                    </span>
                  )}
                  {active && !entry.badge && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
