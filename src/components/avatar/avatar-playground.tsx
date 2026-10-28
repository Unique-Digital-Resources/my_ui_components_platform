"use client";

import * as React from "react";
import {
  Users as NavIcon, RotateCcw, Plus, Trash2, CircleUser,
} from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  AvatarReact,
  type AvatarItem,
  type AvatarSize,
  type AvatarShape,
} from "./avatar-react";
import type { Avatar } from "@/lib/components/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  size: AvatarSize;
  shape: AvatarShape;
  showStatus: boolean;
  max: number;
  grouping: boolean;
}

const DEFAULTS: State = {
  size: "md",
  shape: "circle",
  showStatus: true,
  max: 0,
  grouping: true,
};

const SEED_ITEMS: AvatarItem[] = [
  { id: "u1", name: "Ada Lovelace", status: "online", color: "#7C5CAB" },
  { id: "u2", name: "Alan Turing", status: "online", color: "#9C6E2F" },
  { id: "u3", name: "Grace Hopper", status: "away", color: "#5C7AAB" },
  { id: "u4", name: "Linus Torvalds", status: "busy", color: "#A85C5C" },
  { id: "u5", name: "Margaret Hamilton", status: "offline", color: "#6A8F4F" },
  { id: "u6", name: "Dennis Ritchie", status: "online", color: "#6F4F8F" },
  { id: "u7", name: "Katherine Johnson", status: "away", color: "#AB7A5C" },
  { id: "u8", name: "Tim Berners-Lee", status: "online", color: "#5CAB87" },
];

export function AvatarPlayground() {
  const meta = getComponent("avatar")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [items, setItems] = React.useState<AvatarItem[]>(SEED_ITEMS);
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<Avatar | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const reset = React.useCallback(() => {
    setItems(SEED_ITEMS);
    setState(DEFAULTS);
    setTimeout(() => instanceRef.current?.setItems(SEED_ITEMS), 0);
    toast.info("Avatar reset", { description: "Restored seed items and defaults." });
  }, []);

  const overflow = state.max > 0 && items.length > state.max ? items.length - state.max : 0;
  const visibleCount = state.max > 0 ? Math.min(state.max, items.length) : items.length;

  const jsCode = React.useMemo(() => `import { Avatar } from "@workshop/avatar";

const avatars = new Avatar(container, {
  size: "${state.size}",
  shape: "${state.shape}",
  showStatus: ${state.showStatus},
  max: ${state.max},
  grouping: ${state.grouping},
  items: [
    { id: "u1", name: "Ada Lovelace", status: "online", color: "#7C5CAB" },
    { id: "u2", name: "Alan Turing", status: "online", color: "#9C6E2F" },
    { id: "u3", name: "Grace Hopper", status: "away", color: "#5C7AAB" },
    { id: "u4", name: "Linus Torvalds", status: "busy", color: "#A85C5C" },
    // ...
  ],
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Data Display</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Avatar</h1>
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
                  {items.length} avatars
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
                {/* Primary group */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Primary group</span>
                    <span className="font-mono text-[10px] text-muted-foreground">size={state.size} · shape={state.shape} · max={state.max || "∞"}</span>
                  </div>
                  <div className="panel p-4">
                    <AvatarReact
                      items={items}
                      size={state.size}
                      shape={state.shape}
                      showStatus={state.showStatus}
                      max={state.max}
                      grouping={state.grouping}
                      instanceRef={instanceRef}
                    />
                  </div>
                </div>

                {/* Variant: extra-large, no status */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Hero avatars</span>
                    <span className="font-mono text-[10px] text-muted-foreground">size=xl · circle · no status</span>
                  </div>
                  <div className="panel p-4">
                    <AvatarReact
                      items={items.slice(0, 5)}
                      size="xl"
                      shape="circle"
                      showStatus={false}
                      max={0}
                      grouping={false}
                    />
                  </div>
                </div>

                {/* Variant: square, max=4 */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Square + overflow</span>
                    <span className="font-mono text-[10px] text-muted-foreground">size=md · square · max=4</span>
                  </div>
                  <div className="panel p-4">
                    <AvatarReact
                      items={items}
                      size="md"
                      shape="square"
                      showStatus={false}
                      max={4}
                      grouping
                    />
                  </div>
                </div>

                {/* Variant: rounded stacked */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">Rounded stack</span>
                    <span className="font-mono text-[10px] text-muted-foreground">size=lg · rounded · grouping</span>
                  </div>
                  <div className="panel p-4">
                    <AvatarReact
                      items={items.slice(0, 6)}
                      size="lg"
                      shape="rounded"
                      showStatus
                      max={0}
                      grouping
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  visible: <span className="text-brand-lemon">{visibleCount}</span> · overflow: <span className="text-brand-lemon">+{overflow}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyableValue label="Group" value={state.grouping ? "stacked" : "loose"} />
                <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 font-mono text-[12px]">
                  <span className="text-muted-foreground">status:</span>
                  <span className="text-brand-lemon">{state.showStatus ? "on" : "off"}</span>
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: when <code className="font-mono text-brand-lemon">max</code> is set, extra avatars collapse into a <code className="font-mono text-brand-lemon">+N</code> chip. <code className="font-mono text-brand-lemon">grouping</code> overlaps avatars with a small negative margin.
              </p>
            </div>
          </section>

          {/* Properties */}
          <AgentSkillTabs
            agentPath="/docs/components/avatar-AGENT.md"
            skillPath="/docs/components/avatar-SKILL.md"
          >
            {/* Size */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Size</label>
              <div className="grid grid-cols-5 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => update("size", s)} aria-pressed={state.size === s}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium uppercase transition-colors",
                      state.size === s ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Shape</label>
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["circle", "square", "rounded"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => update("shape", s)} aria-pressed={state.shape === s}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium capitalize transition-colors",
                      state.shape === s ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Max */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Max visible: <span className="font-mono text-brand-lemon">{state.max === 0 ? "∞ (no limit)" : state.max}</span>
              </label>
              <input type="range" min={0} max={8} step={1} value={state.max} onChange={(e) => update("max", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${state.max / 8 * 100}%, var(--muted) ${state.max / 8 * 100}%)` }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>0 (∞)</span><span>8</span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                When the group exceeds this number, extra avatars collapse into a <code className="font-mono">+N</code> chip.
              </p>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {([
                { k: "showStatus" as const, l: "Show status dot" },
                { k: "grouping" as const, l: "Grouping (stacked overlap)" },
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
                  const n = items.length + 1;
                  const palette = ["#7C5CAB", "#9C6E2F", "#5C7AAB", "#A85C5C", "#6A8F4F", "#6F4F8F", "#AB7A5C", "#5CAB87"];
                  const statuses: Array<"online" | "away" | "busy" | "offline"> = ["online", "away", "busy", "offline"];
                  const newItem: AvatarItem = {
                    id: `u${n}`,
                    name: `Member ${n}`,
                    status: statuses[n % statuses.length],
                    color: palette[n % palette.length],
                  };
                  const next = [...items, newItem];
                  setItems(next);
                  instanceRef.current?.setItems(next);
                  toast.success("Avatar added", { description: `Inserted member ${n}.` });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <Plus className="h-3 w-3 text-brand-lemon" /> Add avatar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (items.length <= 2) {
                    toast.error("Cannot remove", { description: "Keep at least 2 avatars." });
                    return;
                  }
                  const next = items.slice(0, -1);
                  setItems(next);
                  instanceRef.current?.setItems(next);
                  toast.success("Avatar removed");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-destructive/40 hover:bg-accent"
              >
                <Trash2 className="h-3 w-3 text-destructive" /> Remove last
              </button>
              <button
                type="button"
                onClick={() => update("grouping", !state.grouping)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent"
              >
                <CircleUser className="h-3 w-3 text-brand-lemon" /> Toggle layout
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
            {activeTab === "html" && <CodeBlock code={'<div id="avatars"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".av-root {\n  /* Override tokens to retheme the avatar group */\n  --av-accent: #D9FF66;\n  --av-bg: #211A30;\n  --av-border: #383343;\n  --av-text: #F4F1FF;\n  --av-muted: #B8B2CA;\n  --av-ok: #8FE3A5;\n  --av-warn: #FFD36B;\n  --av-danger: #FF858B;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class Avatar {\n  constructor(container, options)\n  setItems(items): void\n  setProperty(name, value): void\n  destroy(): void\n}\n\n// Options:\n//   items, size (xs|sm|md|lg|xl),\n//   shape (circle|square|rounded),\n//   showStatus, max (0 = no limit), grouping"} language="typescript" filename="api.ts" />}
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
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Each avatar carries a <code className="font-mono text-brand-lemon">title</code> attribute with the member&apos;s name for native tooltips.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Status colors use distinct hues (green / yellow / red) plus position — never color alone.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Image load failures fall back to initials derived from the name.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-lemon" />Overflow chips read as <code className="font-mono text-brand-lemon">+N</code> and inherit the current size + shape for visual consistency.</li>
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
