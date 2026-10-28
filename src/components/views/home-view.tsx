"use client";

import * as React from "react";
import {
  ArrowRight,
  Boxes,
  Wrench,
  Layers,
  Palette,
  SlidersHorizontal,
  LayoutPanelLeft,
  Table2,
  Navigation,
  KanbanSquare,
} from "lucide-react";
import Link from "next/link";
import {
  categories,
  examples,
  componentsByCategory,
  plannedComponents,
} from "@/lib/platform/content";
import { ColorWheelPickerReact } from "@/components/color-wheel/color-wheel-picker-react";
import { CodeBlock } from "@/components/platform/code-block";

/**
 * Map from the `icon` string in content.ts (a Lucide icon name) to the
 * actual Lucide component. Categories: color → Palette, inputs →
 * SlidersHorizontal, layout → LayoutPanelLeft, data-display → Table2,
 * productivity → KanbanSquare, navigation → Navigation.
 */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette,
  SlidersHorizontal,
  LayoutPanelLeft,
  Table2,
  KanbanSquare,
  Navigation,
};

interface Benefit {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: Boxes,
    title: "Framework independent",
    description:
      "No React, Vue, or Next.js required inside the components. Each one is a single vanilla JavaScript class that mounts into any host — or no framework at all.",
  },
  {
    icon: Wrench,
    title: "Application-focused",
    description:
      "Built for creative tools, editors, inspectors, and developer utilities. The kind of controls real software needs, not marketing pages.",
  },
  {
    icon: Layers,
    title: "Composable & themeable",
    description:
      "Drop a component into any framework shell and customize every surface via CSS custom properties. Theme once, embed anywhere.",
  },
];

const HERO_CHIPS: { label: string; value: string }[] = [
  { label: "Framework", value: "Independent" },
  { label: "Interaction", value: "Functional" },
  { label: "Customization", value: "Composable" },
];

const USAGE_CODE = `import { ColorWheelPicker } from "@workshop/color-wheel";

const container = document.querySelector("#picker");
const picker = new ColorWheelPicker(container, {
  shape: "triangle",
  size: 180,
});

picker.on("change", (color) => {
  console.log(color.hex, color.rgb);
});`;

const INSTALL_CODE = "npm install @workshop/color-wheel";

/**
 * Returns a short status label for a category, e.g. "1 ready · 2 planned".
 * Honest about planned vs available components so empty categories don't
 * advertise a count they don't have.
 */
function categoryStatus(slug: string): string {
  const stable = componentsByCategory(slug).length;
  const planned = plannedComponents.filter((p) => p.category === slug).length;
  if (stable > 0 && planned > 0) return `${stable} ready · ${planned} planned`;
  if (stable > 0) return `${stable} ready`;
  if (planned > 0) return `${planned} planned`;
  return "Coming soon";
}

/**
 * The homepage main content region. The platform shell (header, optional
 * sidebar, footer) is provided by the parent — this component renders only
 * the home page body. The home route hides the left sidebar, so this view
 * gets the full content width.
 */
export default function HomeView() {
  const [liveHex, setLiveHex] = React.useState("#D9FF66");

  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------------------- */}
      {/* 1. Hero                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section
        className="relative overflow-hidden border-b border-border hero-glow"
        aria-label="Introduction"
      >
        <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Left: headline + supporting copy + CTAs + chips */}
            <div className="lg:col-span-7">
              <p className="eyebrow mb-5">Workshop · Vanilla JS UI</p>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                UI components for real software.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Framework-independent building blocks for creative tools,
                editors, developer utilities, and productivity applications.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/components"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-lemon px-5 text-[14px] font-semibold text-brand-black transition-colors hover:bg-brand-lemon-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Explore components
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/docs/installation"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-transparent px-5 text-[14px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Get started
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                {HERO_CHIPS.map((chip) => (
                  <div key={chip.label} className="panel px-4 py-2.5">
                    <p className="eyebrow">{chip.label}</p>
                    <p className="mt-0.5 text-[13px] font-medium text-foreground">
                      {chip.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: a workshop-style library index card that previews
                the categories — feels like an inspector panel, not a
                marketing graphic. */}
            <div className="lg:col-span-5">
              <div className="panel-raised overflow-hidden">
                <div className="flex items-center justify-between border-b border-border bg-white/[0.02] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-lemon" aria-hidden />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      workshop / library
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    v0.1.0
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {categories.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.icon] ?? Boxes;
                    return (
                      <div
                        key={cat.slug}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <Icon className="h-4 w-4 text-brand-purple-soft" />
                        <span className="text-sm font-medium text-foreground">
                          {cat.name}
                        </span>
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {categoryStatus(cat.slug)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Featured component                                            */}
      {/* ---------------------------------------------------------------- */}
      <section
        className="border-b border-border"
        aria-label="Featured component"
      >
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
          <p className="eyebrow mb-3">Featured component</p>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left: title + description + bullets + CTA */}
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Color Wheel Picker
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Color Wheel Picker — Interactive preview · Vanilla JavaScript
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                A hue wheel paired with a configurable inner selection shape —
                triangle, square, disk, or none. Pointer and keyboard driven,
                framework-agnostic, and themeable through CSS variables.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "Pointer and keyboard navigation",
                  "HSV output with HEX, RGB, and HSL conversions",
                  "Resizable, themeable, and accessible",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-[14px] text-foreground/90"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-lemon"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/components/color/color-wheel"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-lemon px-4 text-[13px] font-semibold text-brand-black transition-colors hover:bg-brand-lemon-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Open component
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right: live, interactive Color Wheel Picker inside a grid panel */}
            <div className="panel bg-grid p-8 sm:p-12">
              <div className="flex flex-col items-center justify-center gap-6">
                <ColorWheelPickerReact
                  shape="triangle"
                  size={180}
                  color="#D9FF66"
                  onInput={(c) => setLiveHex(c.hex)}
                />
                <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-1.5">
                  <span
                    className="h-3 w-3 rounded-sm border border-border"
                    style={{ backgroundColor: liveHex }}
                    aria-hidden
                  />
                  <span className="font-mono text-[12px] text-foreground">
                    {liveHex.toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    live
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 3. Explore categories                                            */}
      {/* ---------------------------------------------------------------- */}
      <section
        className="border-b border-border"
        aria-label="Explore categories"
      >
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
          <p className="eyebrow mb-3">Categories</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Explore categories
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.icon] ?? Boxes;
              return (
                <Link
                  key={cat.slug}
                  href={`/components/${cat.slug}`}
                  className="group panel p-5 text-left transition-colors hover:border-brand-lemon/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background/60 text-brand-purple-soft transition-colors group-hover:border-brand-lemon/40 group-hover:text-brand-lemon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                    {cat.description}
                  </p>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {categoryStatus(cat.slug)}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 4. Why this library                                              */}
      {/* ---------------------------------------------------------------- */}
      <section
        className="border-b border-border"
        aria-label="Why this library"
      >
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
          <p className="eyebrow mb-3">Principles</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Why this library
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="panel p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background/60 text-brand-lemon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 5. Quick start                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-border" aria-label="Quick start">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
          <p className="eyebrow mb-3">Quick start</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Get going in seconds
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            Install the package, mount the component into any container, and
            listen for color changes. No framework required.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <p className="eyebrow mb-2">1 · Install</p>
              <CodeBlock
                language="bash"
                filename="terminal"
                code={INSTALL_CODE}
              />
            </div>
            <div className="min-w-0">
              <p className="eyebrow mb-2">2 · Use</p>
              <CodeBlock
                language="javascript"
                filename="picker.js"
                code={USAGE_CODE}
              />
            </div>
          </div>
          <div className="mt-8">
            <Link
              href="/docs/installation"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-transparent px-4 text-[13px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Read the docs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 6. Featured examples                                             */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Featured examples">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
          <p className="eyebrow mb-3">Examples</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Featured examples
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {examples.map((ex) => (
              <div key={ex.slug} className="panel flex flex-col p-6">
                <span className="inline-flex w-fit items-center rounded-full border border-border bg-muted/30 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {ex.category}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                  {ex.title}
                </h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                  {ex.description}
                </p>
                <Link
                  href={`/examples/${ex.slug}`}
                  className="mt-5 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-brand-lemon transition-colors hover:text-brand-lemon-hover focus-visible:outline-none focus-visible:underline"
                >
                  Explore
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
