"use client";

import * as React from "react";
import { Share2, RotateCcw, Plus, Trash2 } from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  NodesGraphReact,
  type GraphNode,
  type GraphConnection,
  type GraphEventPayload,
} from "./nodes-graph-react";
import type { NodesGraph } from "@/lib/components/nodes-graph";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  showGrid: boolean;
  movable: boolean;
  connectable: boolean;
  readOnly: boolean;
}

const DEFAULTS: State = {
  showGrid: true,
  movable: true,
  connectable: true,
  readOnly: false,
};

const SEED_NODES: GraphNode[] = [
  { id: "n1", x: 80, y: 120, width: 180, height: 80, title: "Central Idea", data: { description: "The root concept" }, color: "#3D2E5C" },
  { id: "n2", x: 360, y: 60, width: 160, height: 70, title: "Branch A", data: { description: "First branch" } },
  { id: "n3", x: 360, y: 180, width: 160, height: 70, title: "Branch B", data: { description: "Second branch" } },
  { id: "n4", x: 620, y: 30, width: 140, height: 60, title: "Leaf A1", data: { description: "Detail" } },
  { id: "n5", x: 620, y: 120, width: 140, height: 60, title: "Leaf A2", data: { description: "Detail" } },
  { id: "n6", x: 620, y: 210, width: 140, height: 60, title: "Leaf B1", data: { description: "Detail" } },
];

const SEED_CONNECTIONS: GraphConnection[] = [
  { id: "c1", from: { node: "n1", side: "right" }, to: { node: "n2", side: "left" } },
  { id: "c2", from: { node: "n1", side: "right" }, to: { node: "n3", side: "left" } },
  { id: "c3", from: { node: "n2", side: "right" }, to: { node: "n4", side: "left" } },
  { id: "c4", from: { node: "n2", side: "right" }, to: { node: "n5", side: "left" } },
  { id: "c5", from: { node: "n3", side: "right" }, to: { node: "n6", side: "left" } },
];

export function NodesGraphPlayground() {
  const meta = getComponent("nodes-graph")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [nodes, setNodes] = React.useState<GraphNode[]>(SEED_NODES);
  const [connections, setConnections] = React.useState<GraphConnection[]>(SEED_CONNECTIONS);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<NodesGraph | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const onNodeSelected = React.useCallback((p: GraphEventPayload) => {
    setSelectedId(p.nodeId ?? null);
  }, []);

  const onNodeMoved = React.useCallback((p: GraphEventPayload) => {
    setLastEvent(`moved ${p.nodeId}`);
    if (instanceRef.current) setNodes(instanceRef.current.getNodes());
  }, []);

  const onConnectionAdded = React.useCallback((p: GraphEventPayload) => {
    setLastEvent(`connected ${p.from?.node} → ${p.to?.node}`);
    if (instanceRef.current) setConnections(instanceRef.current.getConnections());
    toast.success("Connection added", { description: `${p.from?.node} → ${p.to?.node}` });
  }, []);

  const onConnectionRejected = React.useCallback((p: GraphEventPayload) => {
    setLastEvent(`rejected (${p.reason})`);
    toast.error("Connection rejected", { description: p.reason });
  }, []);

  const onNodeRemoved = React.useCallback((p: GraphEventPayload) => {
    setLastEvent(`removed ${p.nodeId}`);
    if (instanceRef.current) {
      setNodes(instanceRef.current.getNodes());
      setConnections(instanceRef.current.getConnections());
    }
  }, []);

  const reset = React.useCallback(() => {
    setNodes(SEED_NODES);
    setConnections(SEED_CONNECTIONS);
    setSelectedId(null);
    setLastEvent("reset");
    setTimeout(() => {
      instanceRef.current?.setNodes(SEED_NODES);
      instanceRef.current?.setConnections(SEED_CONNECTIONS);
      instanceRef.current?.clearSelection();
    }, 0);
    toast.info("Graph reset");
  }, []);

  const jsCode = React.useMemo(() => `import { NodesGraph } from "@workshop/nodes-graph";

const graph = new NodesGraph(container, {
  showGrid: ${state.showGrid},
  movable: ${state.movable},
  connectable: ${state.connectable},
  readOnly: ${state.readOnly},
  nodes: [
    { id: "n1", x: 80, y: 120, width: 180, height: 80, title: "Central Idea" },
    { id: "n2", x: 360, y: 60, width: 160, height: 70, title: "Branch A" },
  ],
  connections: [
    { id: "c1", from: { node: "n1", side: "right" }, to: { node: "n2", side: "left" } },
  ],
});

graph.on("node_moved", ({ nodeId }) => {
  console.log("Moved:", nodeId);
});
graph.on("connection_added", ({ from, to }) => {
  console.log(\`Connected \${from.node} → \${to.node}\`);
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Layout</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Nodes Graph</h1>
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
                <Share2 className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">{nodes.length} nodes · {connections.length} conns</span>
              </div>
              <button type="button" onClick={reset} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-brand-lemon/40">
                <RotateCcw className="h-3 w-3" />Reset
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <NodesGraphReact
                nodes={nodes}
                connections={connections}
                showGrid={state.showGrid}
                movable={state.movable}
                connectable={state.connectable}
                readOnly={state.readOnly}
                onNodeSelected={onNodeSelected}
                onNodeMoved={onNodeMoved}
                onNodeRemoved={onNodeRemoved}
                onConnectionAdded={onConnectionAdded}
                onConnectionRejected={onConnectionRejected}
                instanceRef={instanceRef}
                className="h-full"
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
                Tip: drag nodes to move, drag from edge handles to connect, scroll to zoom, drag empty canvas to pan, <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Delete</kbd> to remove.
              </p>
            </div>
          </section>

          <AgentSkillTabs agentPath="/docs/components/nodes-graph-AGENT.md" skillPath="/docs/components/nodes-graph-SKILL.md">
            <div className="flex flex-col gap-2">
              {([
                { k: "showGrid" as const, l: "Show grid" },
                { k: "movable" as const, l: "Movable nodes" },
                { k: "connectable" as const, l: "Drag to connect" },
                { k: "readOnly" as const, l: "Read-only" },
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
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button type="button" onClick={() => {
                const id = instanceRef.current?.addNode({ title: `Node ${nodes.length + 1}`, x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 });
                if (instanceRef.current) setNodes(instanceRef.current.getNodes());
                toast.success("Node added", { description: id });
              }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                <Plus className="h-3 w-3 text-brand-lemon" />Add node
              </button>
              <button type="button" onClick={() => {
                if (!selectedId) { toast.error("No selection"); return; }
                instanceRef.current?.removeNode(selectedId);
              }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-destructive/40 hover:bg-accent">
                <Trash2 className="h-3 w-3 text-destructive" />Remove selected
              </button>
              <button type="button" onClick={() => instanceRef.current?.fitToView()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                Fit to view
              </button>
            </div>
          </AgentSkillTabs>
        </div>

        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-2">
            <div className="flex">
              {([["javascript","JavaScript"],["html","HTML"],["css","CSS"],["api","API"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setActiveTab(k)}
                  className={cn("relative h-9 px-3 text-[12px] font-medium transition-colors", activeTab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {l}{activeTab === k && <span className="absolute inset-x-2 -bottom-px h-px bg-brand-lemon" />}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {activeTab === "javascript" && <CodeBlock code={jsCode} language="javascript" filename="init.js" />}
            {activeTab === "html" && <CodeBlock code={'<div id="graph" style="height:600px"></div>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".ng-graph {\n  --ng-accent: #D9FF66;\n  --ng-surface: #211A30;\n  --ng-border: #383343;\n}"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class NodesGraph {\n  constructor(container, options)\n  setNodes(nodes) / setConnections(conns)\n  addNode(partial?): string\n  removeNode(id)\n  addConnection(from, to, label?): string\n  removeConnection(id)\n  selectNode(id) / selectConnection(id)\n  clearSelection()\n  setZoom(z) / zoomBy(factor) / fitToView()\n  setProperty(name, value)\n  on(event, handler) / off(event, handler)\n  destroy()\n}\n\n// Events:\n//   node_selected, node_added, node_removed, node_moved,\n//   connection_selected, connection_added, connection_removed,\n//   connection_rejected, zoom_changed"} language="typescript" filename="api.ts" />}
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
