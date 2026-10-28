"use client";

import * as React from "react";
import {
  GalleryHorizontalEnd as NavIcon, RotateCcw, ChevronLeft, ChevronRight, Play, Pause,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  CarouselReact,
  type CarouselSlide,
  type CarouselEventPayload,
} from "./carousel-react";
import type { Carousel } from "@/lib/components/carousel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  loop: boolean;
  autoplay: boolean;
  autoplayInterval: number;
  showArrows: boolean;
  showDots: boolean;
  transition: "slide" | "fade";
}

const DEFAULTS: State = {
  loop: true,
  autoplay: false,
  autoplayInterval: 3000,
  showArrows: true,
  showDots: true,
  transition: "slide",
};

const SEED_SLIDES: CarouselSlide[] = [
  { id: "s1", title: "Welcome to Workshop", description: "A vanilla JavaScript UI component library for professional application interfaces.", color: "#2A2238" },
  { id: "s2", title: "Composable Primitives", description: "Each component is a single-file class with scoped CSS, full keyboard support, and a clean public API.", color: "#3A2C50" },
  { id: "s3", title: "Brand-Forward Theme", description: "Obsidian surfaces, deep-violet panels, and a single lemon accent — no rainbow of colors.", color: "#4A3866" },
  { id: "s4", title: "Accessible by Default", description: "ARIA roles, focus rings, reduced-motion support, and keyboard navigation everywhere.", color: "#5A447A" },
  { id: "s5", title: "Production-Ready", description: "Defensive cloning, idempotent destroy, and runtime configuration via setProperty.", color: "#6A5090" },
];

export function CarouselPlayground() {
  const meta = getComponent("carousel")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [slides, setSlides] = React.useState<CarouselSlide[]>(SEED_SLIDES);
  const [current, setCurrent] = React.useState<number>(0);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<Carousel | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const onChange = React.useCallback((p: CarouselEventPayload) => {
    setCurrent(p.index ?? 0);
    setLastEvent(`→ slide ${p.index} · ${p.source ?? "—"}`);
  }, []);

  const reset = React.useCallback(() => {
    setSlides(SEED_SLIDES);
    setCurrent(0);
    setLastEvent("reset");
    setState(DEFAULTS);
    setTimeout(() => {
      instanceRef.current?.setSlides(SEED_SLIDES);
      instanceRef.current?.goTo(0, "programmatic");
    }, 0);
    toast.info("Carousel reset", { description: "Restored seed slides and defaults." });
  }, []);

  const jsCode = React.useMemo(() => `import { Carousel } from "@workshop/carousel";

const carousel = new Carousel(container, {
  loop: ${state.loop},
  autoplay: ${state.autoplay},
  autoplayInterval: ${state.autoplayInterval},
  showArrows: ${state.showArrows},
  showDots: ${state.showDots},
  transition: "${state.transition}",
  slides: [
    { id: "s1", title: "Welcome to Workshop", description: "...", color: "#2A2238" },
    { id: "s2", title: "Composable Primitives", description: "...", color: "#3A2C50" },
    { id: "s3", title: "Brand-Forward Theme", description: "...", color: "#4A3866" },
    { id: "s4", title: "Accessible by Default", description: "...", color: "#5A447A" },
    { id: "s5", title: "Production-Ready", description: "...", color: "#6A5090" },
  ],
});

carousel.on("change", ({ index, previousIndex, source }) => {
  console.log(\`Slide \${previousIndex} → \${index} (\${source})\`);
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Layout</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Carousel</h1>
              <CollapsibleDescription
                text={meta.longDescription}
                maxLength={220}
                className="mt-2 max-w-2xl text-[15px] text-muted-foreground"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {meta.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">{t}</span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-lemon/30 bg-brand-lemon/10 px-2.5 py-1 text-[11px] font-mono text-brand-lemon">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-lemon" />{meta.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* Live canvas */}
          <section aria-label="Live preview" className="panel relative flex h-[600px] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <NavIcon className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
                <span className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {slides.length} slides
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-brand-lemon/40"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto bg-grid p-6">
              <div className="flex flex-col gap-6">
                {/* Primary carousel */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Primary carousel</span>
                    <span className="font-mono text-[10px] text-muted-foreground">transition={state.transition} · loop={String(state.loop)} · autoplay={String(state.autoplay)}</span>
                  </div>
                  <div className="panel p-4">
                    <CarouselReact
                      slides={slides}
                      current={current}
                      loop={state.loop}
                      autoplay={state.autoplay}
                      autoplayInterval={state.autoplayInterval}
                      showArrows={state.showArrows}
                      showDots={state.showDots}
                      transition={state.transition}
                      onChange={onChange}
                      instanceRef={instanceRef}
                    />
                  </div>
                </div>

                {/* Variant: fade */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Fade variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">transition=fade · no arrows</span>
                  </div>
                  <div className="panel p-4">
                    <CarouselReact
                      slides={slides}
                      loop
                      showArrows={false}
                      showDots
                      transition="fade"
                      autoplayInterval={2500}
                    />
                  </div>
                </div>

                {/* Variant: minimal */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Minimal variant</span>
                    <span className="font-mono text-[10px] text-muted-foreground">no arrows · no dots · slide</span>
                  </div>
                  <div className="panel p-4">
                    <CarouselReact
                      slides={slides.slice(0, 3)}
                      loop={false}
                      showArrows={false}
                      showDots={false}
                      transition="slide"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  last: <span className="text-brand-lemon">{lastEvent}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyableValue label="Slide" value={`${current + 1} / ${slides.length}`} />
                {slides[current] && (
                  <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]">
                    <span className="text-muted-foreground">title:</span>
                    <span className="text-brand-lemon">{slides[current].title}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => instanceRef.current?.prev("pointer")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground transition-colors hover:border-brand-lemon/40 hover:text-foreground"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => instanceRef.current?.next("pointer")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground transition-colors hover:border-brand-lemon/40 hover:text-foreground"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">←</kbd>/<kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">→</kbd> roves slides, click arrows or dots to jump. With autoplay on, slides advance every <code className="font-mono text-brand-lemon">{state.autoplayInterval}ms</code>.
              </p>
            </div>
          </section>

          {/* Properties */}
          <AgentSkillTabs
            agentPath="/docs/components/carousel-AGENT.md"
            skillPath="/docs/components/carousel-SKILL.md"
          >
            {/* Transition */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Transition</label>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["slide", "fade"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => update("transition", s)} aria-pressed={state.transition === s}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.transition === s ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Autoplay interval */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Autoplay interval: <span className="font-mono text-brand-lemon">{state.autoplayInterval}ms</span>
              </label>
              <input type="range" min={1000} max={8000} step={500} value={state.autoplayInterval} onChange={(e) => update("autoplayInterval", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.autoplayInterval - 1000) / 7000 * 100}%, var(--muted) ${(state.autoplayInterval - 1000) / 7000 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>1.0s</span><span>8.0s</span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                Time between automatic slide advances when autoplay is on.
              </p>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "loop" as const, l: "Loop (wrap around)" },
                { k: "autoplay" as const, l: "Autoplay" },
                { k: "showArrows" as const, l: "Show arrows" },
                { k: "showDots" as const, l: "Show dots" },
              ]).map(({ k, l }) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
                  <span className="text-[12px] text-foreground">{l}</span>
                  <button type="button" role="switch" aria-checked={state[k]} onClick={() => update(k, !state[k])}
                    className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      state[k] ? "bg-brand-lemon" : "bg-muted-foreground/30")}>
                    <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform",
                      state[k] ? "translate-x-4" : "translate-x-0.5")} />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  if (state.autoplay) {
                    instanceRef.current?.stopAutoplay();
                    update("autoplay", false);
                    toast.info("Autoplay stopped");
                  } else {
                    instanceRef.current?.startAutoplay();
                    update("autoplay", true);
                    toast.success("Autoplay started", { description: `Advancing every ${state.autoplayInterval}ms.` });
                  }
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                {state.autoplay ? <Pause className="h-3 w-3 text-brand-lemon" /> : <Play className="h-3 w-3 text-brand-lemon" />}
                {state.autoplay ? "Stop" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => instanceRef.current?.prev("pointer")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <button
                type="button"
                onClick={() => instanceRef.current?.next("pointer")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <ChevronRight className="h-3 w-3" /> Next
              </button>
              <button
                type="button"
                onClick={() => instanceRef.current?.goTo(0, "programmatic")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                First
              </button>
            </div>
          </AgentSkillTabs>
        </div>

        {/* Code panel */}
        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-2">
            <div className="flex">
              {([["javascript","JavaScript"],["html","HTML"],["css","CSS"],["api","API"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setActiveTab(k)}
                  className={cn("relative h-9 px-3 text-[12px] font-medium transition-colors",
                    activeTab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {l}
                  {activeTab === k && <span className="absolute inset-x-2 -bottom-px h-px bg-brand-lemon" />}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {activeTab === "javascript" && <CodeBlock code={jsCode} language="javascript" filename="init.js" />}
            {activeTab === "html" && <CodeBlock code={'<div id="carousel"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".crl-root {\n  /* Override tokens to retheme the carousel */\n  --crl-accent: #D9FF66;\n  --crl-bg: #211A30;\n  --crl-surface: #2A2238;\n  --crl-border: #383343;\n  --crl-text: #F4F1FF;\n  --crl-muted: #B8B2CA;\n}\n\n/* Taller viewport for hero carousels */\n.crl-viewport {\n  height: 320px;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class Carousel {\n  constructor(container, options)\n  next(source?): void\n  prev(source?): void\n  goTo(index, source?): void\n  startAutoplay(): void\n  stopAutoplay(): void\n  getCurrent(): number\n  setSlides(slides): void\n  setProperty(name, value): void\n  on(event, handler): void\n  off(event, handler): void\n  destroy(): void\n}\n\n// Events:\n//   change\n\n// Options:\n//   slides, current, loop, autoplay, autoplayInterval,\n//   showArrows, showDots, transition (slide|fade)"} language="typescript" filename="api.ts" />}
          </div>
        </section>

        {/* Documentation */}
        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
          <div className="flex flex-col gap-6">
            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Overview</h2>
              <p className="mt-2 text-[14px] text-muted-foreground">{meta.description}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-brand-lemon">When to use</h3>
                  <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                    {meta.whenToUse.map((u) => <li key={u} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />{u}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Not for</h3>
                  <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                    {meta.whenNotToUse.map((u) => <li key={u} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />{u}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Properties</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 font-mono font-medium">Property</th>
                      <th className="py-2 pr-4 font-mono font-medium">Type</th>
                      <th className="py-2 pr-4 font-mono font-medium">Default</th>
                      <th className="py-2 font-mono font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.properties.map((p) => (
                      <tr key={p.name} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-4 font-mono text-brand-lemon">{p.name}</td>
                        <td className="py-2 pr-4 font-mono text-foreground">{p.type}</td>
                        <td className="py-2 pr-4 font-mono text-muted-foreground">{p.default}</td>
                        <td className="py-2 text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="panel p-6">
                <h2 className="text-lg font-semibold text-foreground">Methods</h2>
                <ul className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                  {meta.methods.map((m) => (
                    <li key={m.signature} className="rounded-md border border-border bg-muted/20 p-3">
                      <code className="font-mono text-[12px] text-brand-lemon">{m.signature}</code>
                      <p className="mt-1 text-[12px] text-muted-foreground">{m.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel p-6">
                <h2 className="text-lg font-semibold text-foreground">Events</h2>
                <ul className="mt-3 space-y-2">
                  {meta.events.map((e) => (
                    <li key={e.name} className="rounded-md border border-border bg-muted/20 p-3">
                      <code className="font-mono text-[12px] text-brand-lemon">{e.name}</code>
                      <p className="mt-1 text-[12px] text-muted-foreground">{e.description}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">payload: {e.payload}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Accessibility</h2>
              <ul className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />The root is focusable (<code className="font-mono text-brand-lemon">tabindex=&quot;0&quot;</code>) with a visible lemon focus ring.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" /><kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">←</kbd>/<kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">→</kbd> roves between slides.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Arrow buttons have <code className="font-mono text-brand-lemon">aria-label</code> (Previous / Next).</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Dots are labeled <code className="font-mono text-brand-lemon">Go to slide N</code> for screen readers.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Transitions respect <code className="font-mono text-brand-lemon">prefers-reduced-motion</code>.</li>
              </ul>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-6 panel p-4">
              <h3 className="eyebrow mb-3">On this page</h3>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Overview</a></li>
                <li><a href="#" className="hover:text-foreground">Properties</a></li>
                <li><a href="#" className="hover:text-foreground">Methods</a></li>
                <li><a href="#" className="hover:text-foreground">Events</a></li>
                <li><a href="#" className="hover:text-foreground">Accessibility</a></li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
