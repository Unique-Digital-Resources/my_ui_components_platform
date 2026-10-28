"use client";

import * as React from "react";
import {
  Download,
  Boxes,
  Palette,
  Code,
  ArrowRight,
  BookOpen,
  Settings2,
  Radio,
  Accessibility,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { docSections } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { PageContainer } from "@/components/platform/shell";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, React.ElementType> = {
  installation: Download,
  concepts: Boxes,
  theming: Palette,
  api: Code,
};

const WHAT_YOU_FIND: { icon: React.ElementType; label: string; description: string }[] = [
  {
    icon: Layers,
    label: "Component lifecycle",
    description: "Construction, updates, event subscription, and clean teardown.",
  },
  {
    icon: Settings2,
    label: "Configuration",
    description: "Options, defaults, and runtime reconfiguration of every component.",
  },
  {
    icon: Radio,
    label: "Events",
    description: "Continuous and committed events, payload shapes, and listener management.",
  },
  {
    icon: Palette,
    label: "Theming",
    description: "Semantic design tokens and per-component CSS custom properties.",
  },
  {
    icon: Accessibility,
    label: "Accessibility",
    description: "Keyboard navigation, focus rings, and screen-reader considerations.",
  },
  {
    icon: BookOpen,
    label: "Framework interop",
    description: "Wrapping vanilla components in React, Vue, or Svelte safely.",
  },
];

export default function DocsView() {
  return (
    <PageContainer>
      <Breadcrumbs />
      <PageOverline>Documentation</PageOverline>
      <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
      <p className="mt-3 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
        Everything you need to install, configure, and integrate the components.
        Start with the installation guide, then explore core concepts, theming,
        and the full API reference.
      </p>

      {/* Getting started hero */}
      <section className="panel mt-10 overflow-hidden">
        <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[640px]">
            <span className="eyebrow mb-3 block">Start here</span>
            <h2 className="text-2xl font-semibold">Getting started</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Install the library and initialize your first component. The guide
              walks through distribution methods, the markup you need, and the
              one line of JavaScript that brings a picker to life.
            </p>
          </div>
          <Link
            href="/docs/installation"
            className={cn(
              "group inline-flex h-10 items-center gap-2 self-start rounded-md bg-brand-lemon px-5 text-sm font-semibold text-brand-black transition-colors hover:bg-brand-lemon-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            Read the guide
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* Doc section grid */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Browse the docs</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {docSections.map((section) => {
            const Icon = SECTION_ICONS[section.slug] ?? BookOpen;
            return (
              <Link
                key={section.slug}
                href={section.href}
                className={cn(
                  "panel group flex items-start gap-4 p-5 text-left transition-all",
                  "hover:border-brand-lemon/40 hover:bg-accent/30",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-brand-lemon transition-colors group-hover:border-brand-lemon/40 group-hover:bg-brand-lemon/10">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {section.title}
                    </h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-brand-lemon" />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {section.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* What you'll find here */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">What you'll find here</h2>
        <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          The documentation is organized around the things you actually need to
          know to ship a component: how it lives in your page, how to drive it,
          how it talks back, and how to keep it consistent with your product.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WHAT_YOU_FIND.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.label}
                className="flex items-start gap-3 rounded-lg border border-border bg-card/40 p-4"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-lemon" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </PageContainer>
  );
}
