"use client";

import * as React from "react";
import { Spline, RotateCcw } from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import { ConnectionPathReact, type ConnectionDef, type PathShape, type ArrowPosition, type ConnectionPathEventPayload } from "./connection-path-react";
import type { ConnectionPath } from "@/lib/components/connection-path";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  shape: PathShape;
  arrow: ArrowPosition;
  curvature: number;
  strokeWidth: number;
  animated: boolean;
  showLabels: boolean;
}

const DEFAULTS: State = {
  shape: "bezier",
  arrow: "end",
  curvature: 0.4,
  strokeWidth: 2,
  animated: false,
  showLabels: true,
};

// Seed connections use fixed points (relative to the container)
const SEED_CONNECTIONS: ConnectionDef[] = [
  { id: "c1", from: { type: "point", x: 60, y: 80, side: "right" }, to: { type: "point", x: 300, y: 60, side: "left" }, stroke: "#D9FF66", label: "data" },
  { id: "c2", from: { type: "point", x: 60, y: 160, side: "right" }, to: { type: "point", x: 300, y: 140, side: "left" }, stroke: "#8FE3A5", label: "signal" },
  { id: "c3", from: { type: "point", x: 60, y: 240, side: "right" }, to: { type: "point", x: 500, y: 200, side: "left" }, stroke: "#7DB8E8", label: "sync" },
  { id: "c4", from: { type: "point", x: 300, y: 60, side: "right" }, to: { type: "point", x: 500, y: 120, side: "left" }, stroke: "#FFD36B" },
  { id: "c5", from: { type: "point", x: 300, y: 140, side: "right" }, to: { type: "point", x: 500, y: 280, side: "left" }, stroke: "#FF858B", label: "error" },
  { id: "c6", from: { type: "point", x: 500, y: 120, side: "bottom" }, to: { type: "point", x: 500, y: 280, side: "top" }, stroke: "#B8B2CA" },
];

export function ConnectionPathPlayground() {
  const meta = getComponent("connection-path")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const instanceRef = React.useRef<ConnectionPath | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  // Build connections from state
  const connections = React.useMemo(() => {
    return SEED_CONNECTIONS.map(c => ({
      ...c,
      shape: state.shape,
      arrow: state.arrow,
      curvature: state.curvature,
      strokeWidth: state.strokeWidth,
      animated: state.animated,
      label: state.showLabels ? c.label : undefined,
    }));
  }, [state]);

  const onPathClick = React.useCallback((p: ConnectionPathEventPayload) => {
    setSelectedId(p.connectionId ?? null);
    setLastEvent(`clicked ${p.connectionId}`);
    toast.info("Path clicked", { description: p.connectionId });
  }, []);

  const onPathHover = React.useCallback((p: ConnectionPathEventPayload) => {
    setLastEvent(`hover ${p.connectionId}`);
  }, []);

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    setLastEvent("reset");
    setSelectedId(null);
    toast.info("Connections reset");
  }, []);

  const jsCode = React.useMemo(() => `import { ConnectionPath } from "@workshop/connection-path";

const overlay = new ConnectionPath(container, {
  shape: "${state.shape}",
  arrow: "${state.arrow}",
  curvature: ${state.curvature},
  strokeWidth: ${state.strokeWidth},
  interactive: true,
  connections: [
    {
      id: "c1",
      from: { type: "point", x: 60, y: 80, side: "right" },
      to: { type: "point", x: 300, y: 60, side: "left" },
      stroke: "#D9FF66",
      label: "data",
      animated: ${state.animated},
    },
    // Or track DOM elements:
    // from: { type: "element", element: "#node-a", side: "right" },
    // to: { type: "element", element: "#node-b", side: "left" },
  ],
});

overlay.on("path_click", ({ connectionId }) => {
  console.log("Clicked:", connectionId);
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Layout</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Connection Path</h1>
              <CollapsibleDescription text={meta.longDescription} maxLength={220} className="mt-2 max-w-2xl text-[15px] text-muted-foreground" />
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <section aria-label="Live preview" className="panel relative flex h-[600px] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Spline className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">{connections.length} paths · {state.shape}</span>
              </div>
              <button type="button" onClick={reset} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-brand-lemon/40">
                <RotateCcw className="h-3 w-3" />Reset
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-grid relative">
              {/* Node placeholders to show what connections look like */}
              <div className="absolute left-[20px] top-[60px] w-[40px] h-[40px] rounded-md border border-brand-lemon/30 bg-brand-lemon/10 flex items-center justify-center text-[10px] font-mono text-brand-lemon">A</div>
              <div className="absolute left-[20px] top-[140px] w-[40px] h-[40px] rounded-md border border-border bg-muted/30 flex items-center justify-center text-[10px] font-mono text-muted-foreground">B</div>
              <div className="absolute left-[20px] top-[220px] w-[40px] h-[40px] rounded-md border border-border bg-muted/30 flex items-center justify-center text-[10px] font-mono text-muted-foreground">C</div>
              <div className="absolute left-[260px] top-[40px] w-[40px] h-[40px] rounded-md border border-brand-lemon/30 bg-brand-lemon/10 flex items-center justify-center text-[10px] font-mono text-brand-lemon">D</div>
              <div className="absolute left-[260px] top-[120px] w-[40px] h-[40px] rounded-md border border-border bg-muted/30 flex items-center justify-center text-[10px] font-mono text-muted-foreground">E</div>
              <div className="absolute left-[460px] top-[100px] w-[40px] h-[40px] rounded-md border border-brand-lemon/30 bg-brand-lemon/10 flex items-center justify-center text-[10px] font-mono text-brand-lemon">F</div>
              <div className="absolute left-[460px] top-[260px] w-[40px] h-[40px] rounded-md border border-border bg-muted/30 flex items-center justify-center text-[10px] font-mono text-muted-foreground">G</div>
              {/* Connection overlay */}
              <ConnectionPathReact
                connections={connections}
                shape={state.shape}
                arrow={state.arrow}
                curvature={state.curvature}
                strokeWidth={state.strokeWidth}
                interactive
                onPathClick={onPathClick}
                onPathHover={onPathHover}
                instanceRef={instanceRef}
                className="absolute inset-0"
              />
            </div>
            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">last: <span className="text-brand-lemon">{lastEvent}</span></span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyableValue label="Selected" value={selectedId ?? "—"} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: click a path to select it. Hover to highlight. Change the path shape, arrows, and curvature in the Properties panel.
              </p>
            </div>
          </section>

          <AgentSkillTabs agentPath="/docs/components/connection-path-AGENT.md" skillPath="/docs/components/connection-path-SKILL.md">
            {/* Shape */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Path shape</label>
              <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["bezier", "step", "straight", "rounded"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => update("shape", s)} aria-pressed={state.shape === s}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.shape === s ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {/* Arrow */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Arrow</label>
              <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["none", "start", "end", "both"] as const).map((a) => (
                  <button key={a} type="button" onClick={() => update("arrow", a)} aria-pressed={state.arrow === a}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.arrow === a ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            {/* Curvature */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Curvature: <span className="font-mono text-brand-lemon">{state.curvature.toFixed(1)}</span></label>
              <input type="range" min={0} max={1} step={0.1} value={state.curvature} onChange={(e) => update("curvature", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${state.curvature * 100}%, var(--muted) ${state.curvature * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground"><span>0 (straight)</span><span>1 (curved)</span></div>
            </div>
            {/* Stroke width */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Stroke width: <span className="font-mono text-brand-lemon">{state.strokeWidth}px</span></label>
              <input type="range" min={1} max={6} step={0.5} value={state.strokeWidth} onChange={(e) => update("strokeWidth", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.strokeWidth - 1) / 5 * 100}%, var(--muted) ${(state.strokeWidth - 1) / 5 * 100}%)` }} />
            </div>
            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "animated" as const, l: "Animated dash flow" },
                { k: "showLabels" as const, l: "Show labels" },
              ]).map(({ k, l }) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
                  <span className="text-[12px] text-foreground">{l}</span>
                  <button type="button" role="switch" aria-checked={state[k]} onClick={() => update(k, !state[k])}
                    className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", state[k] ? "bg-brand-lemon" : "bg-muted-foreground/30")}>
                    <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform", state[k] ? "translate-x-4" : "translate-x-0.5")} />
                  </button>
                </div>
              ))}
            </div>
          </AgentSkillTabs>
        </div>

        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-2">
            <div className="flex">
              {([["javascript","JavaScript"],["html","HTML"],["css","CSS"],["api","API"]] as const).map(([k, l]) => (
                <button key={k} type="button"
                  className={cn("relative h-9 px-3 text-[12px] font-medium transition-colors text-muted-foreground hover:text-foreground")}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <CodeBlock code={jsCode} language="javascript" filename="init.js" />
          </div>
        </section>

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
                  <thead><tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-4 font-mono font-medium">Property</th><th className="py-2 pr-4 font-mono font-medium">Type</th><th className="py-2 pr-4 font-mono font-medium">Default</th><th className="py-2 font-mono font-medium">Description</th>
                  </tr></thead>
                  <tbody>
                    {meta.properties.map((p) => (
                      <tr key={p.name} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-4 font-mono text-brand-lemon">{p.name}</td><td className="py-2 pr-4 font-mono text-foreground">{p.type}</td><td className="py-2 pr-4 font-mono text-muted-foreground">{p.default}</td><td className="py-2 text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-6 panel p-4">
              <h3 className="eyebrow mb-3">On this page</h3>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Overview</a></li>
                <li><a href="#" className="hover:text-foreground">Properties</a></li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
