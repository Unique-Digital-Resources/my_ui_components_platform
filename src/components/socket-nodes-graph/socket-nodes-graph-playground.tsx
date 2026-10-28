"use client";

import * as React from "react";
import { Workflow, RotateCcw, Plus, Trash2 } from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import {
  SocketNodesGraphReact,
  type SocketNode,
  type GraphConnection,
  type SocketGraphEventPayload,
} from "./socket-nodes-graph-react";
import type { SocketNodesGraph } from "@/lib/components/nodes-graph";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  showGrid: boolean;
  movable: boolean;
  connectable: boolean;
  readOnly: boolean;
}

const DEFAULTS: State = { showGrid: true, movable: true, connectable: true, readOnly: false };

const SEED_NODES: SocketNode[] = [
  {
    id: "input", x: 40, y: 80, width: 240, height: 0, title: "Input",
    data: {
      description: "Source parameters",
      rows: [
        { id: "r1", rightSocket: { id: "out", label: "Value" }, control: { type: "range", label: "Level", value: 50, min: 0, max: 100 } },
        { id: "r2", rightSocket: { id: "toggle", label: "Enable" }, control: { type: "toggle", label: "On", value: true } },
        { id: "r3", rightSocket: { id: "text", label: "Name" }, control: { type: "text", label: "Name", value: "alpha" } },
      ],
    },
  },
  {
    id: "process", x: 360, y: 60, width: 240, height: 0, title: "Process",
    data: {
      description: "Transform node",
      rows: [
        { id: "r1", leftSocket: { id: "in1", label: "In" }, rightSocket: { id: "out", label: "Out" }, control: { type: "dropdown", label: "Mode", value: "linear", options: [{ label: "Linear", value: "linear" }, { label: "Exp", value: "exp" }, { label: "Log", value: "log" }] } },
        { id: "r2", leftSocket: { id: "in2", label: "In" }, rightSocket: { id: "out2", label: "Out" }, control: { type: "checkbox", label: "Invert", value: false } },
      ],
    },
  },
  {
    id: "output", x: 680, y: 100, width: 240, height: 0, title: "Output",
    data: {
      description: "Result sink",
      rows: [
        { id: "r1", leftSocket: { id: "in", label: "Value" }, control: { type: "number", label: "Scale", value: 1, min: 0, max: 10, step: 0.1 } },
        { id: "r2", leftSocket: { id: "in2", label: "Flag" }, control: { type: "label", label: "Status", value: "OK" } },
      ],
    },
  },
];

const SEED_CONNECTIONS: GraphConnection[] = [
  { id: "c1", from: { node: "input", side: "right", socketId: "out" }, to: { node: "process", side: "left", socketId: "in1" } },
  { id: "c2", from: { node: "input", side: "right", socketId: "toggle" }, to: { node: "process", side: "left", socketId: "in2" } },
  { id: "c3", from: { node: "process", side: "right", socketId: "out" }, to: { node: "output", side: "left", socketId: "in" } },
];

export function SocketNodesGraphPlayground() {
  const meta = getComponent("socket-nodes-graph")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [nodes, setNodes] = React.useState<SocketNode[]>(SEED_NODES);
  const [connections, setConnections] = React.useState<GraphConnection[]>(SEED_CONNECTIONS);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<SocketNodesGraph | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const onControlChanged = React.useCallback((p: SocketGraphEventPayload) => {
    setLastEvent(`control ${p.controlId} = ${String(p.controlValue)}`);
  }, []);

  const onNodeSelected = React.useCallback((p: SocketGraphEventPayload) => {
    setSelectedId(p.nodeId ?? null);
  }, []);

  const onNodeMoved = React.useCallback((p: SocketGraphEventPayload) => {
    setLastEvent(`moved ${p.nodeId}`);
    if (instanceRef.current) setNodes(instanceRef.current.getNodes() as unknown as SocketNode[]);
  }, []);

  const onConnectionAdded = React.useCallback((p: SocketGraphEventPayload) => {
    setLastEvent(`connected ${p.from?.node}:${p.from?.socketId} → ${p.to?.node}:${p.to?.socketId}`);
    if (instanceRef.current) setConnections(instanceRef.current.getConnections());
    toast.success("Connection added");
  }, []);

  const reset = React.useCallback(() => {
    setNodes(SEED_NODES);
    setConnections(SEED_CONNECTIONS);
    setSelectedId(null);
    setLastEvent("reset");
    setTimeout(() => {
      instanceRef.current?.setNodes(SEED_NODES);
      instanceRef.current?.setConnections(SEED_CONNECTIONS);
    }, 0);
    toast.info("Graph reset");
  }, []);

  const jsCode = React.useMemo(() => `import { SocketNodesGraph } from "@workshop/nodes-graph";

const graph = new SocketNodesGraph(container, {
  nodes: [
    {
      id: "input", x: 40, y: 80, width: 240, title: "Input",
      data: {
        rows: [
          { id: "r1", rightSocket: { id: "out", label: "Value" },
            control: { type: "range", label: "Level", value: 50, min: 0, max: 100 } },
        ],
      },
    },
    {
      id: "output", x: 360, y: 80, width: 240, title: "Output",
      data: {
        rows: [
          { id: "r1", leftSocket: { id: "in", label: "In" },
            control: { type: "label", value: "—" } },
        ],
      },
    },
  ],
  connections: [
    { id: "c1", from: { node: "input", side: "right", socketId: "out" },
                   to: { node: "output", side: "left", socketId: "in" } },
  ],
});

graph.on("control_changed", ({ controlId, controlValue }) => {
  console.log(\`\${controlId} = \${controlValue}\`);
});`, []);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Layout</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Socket Nodes Graph</h1>
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
                <Workflow className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">{nodes.length} nodes · {connections.length} conns</span>
              </div>
              <button type="button" onClick={reset} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-brand-lemon/40">
                <RotateCcw className="h-3 w-3" />Reset
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <SocketNodesGraphReact
                nodes={nodes}
                connections={connections}
                showGrid={state.showGrid}
                movable={state.movable}
                connectable={state.connectable}
                readOnly={state.readOnly}
                onControlChanged={onControlChanged}
                onNodeSelected={onNodeSelected}
                onNodeMoved={onNodeMoved}
                onConnectionAdded={onConnectionAdded}
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
                Tip: drag from a socket (left/right dot) to another socket on a different node to connect. Drag node body to move. Scroll to zoom.
              </p>
            </div>
          </section>

          <AgentSkillTabs agentPath="/docs/components/socket-nodes-graph-AGENT.md" skillPath="/docs/components/socket-nodes-graph-SKILL.md">
            <div className="flex flex-col gap-2">
              {([
                { k: "showGrid" as const, l: "Show grid" },
                { k: "movable" as const, l: "Movable nodes" },
                { k: "connectable" as const, l: "Socket connect" },
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
                const id = instanceRef.current?.addSocketNode({
                  title: "New Node", x: 300, y: 200, width: 240,
                  data: { rows: [{ id: "r1", leftSocket: { id: "in", label: "In" }, rightSocket: { id: "out", label: "Out" }, control: { type: "label", value: "—" } }] },
                });
                if (instanceRef.current) setNodes(instanceRef.current.getNodes() as unknown as SocketNode[]);
                toast.success("Node added", { description: id });
              }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand-lemon/40 hover:bg-accent">
                <Plus className="h-3 w-3 text-brand-lemon" />Add node
              </button>
              <button type="button" onClick={() => {
                if (!selectedId) { toast.error("No selection"); return; }
                instanceRef.current?.removeNode(selectedId);
                if (instanceRef.current) setNodes(instanceRef.current.getNodes() as unknown as SocketNode[]);
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
            {activeTab === "css" && <CodeBlock code={".ng-sock { /* socket dot */ }\n.ng-socket-row { /* row layout */ }"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class SocketNodesGraph extends NodesGraph {\n  constructor(container, options)\n  // inherits: setNodes, addNode, removeNode, addConnection,\n  //   removeConnection, selectNode, fitToView, etc.\n  // adds:\n  //   control_changed event with { nodeId, controlId, controlValue }\n}\n\n// SocketNode = GraphNode & { data: { rows: SocketRow[] } }\n// SocketRow = { id, leftSocket?, rightSocket?, control? }\n// ControlDef = { type, value, label?, options?, min?, max?, step? }\n//   type: 'label'|'checkbox'|'toggle'|'dropdown'|'range'|'text'|'number'"} language="typescript" filename="api.ts" />}
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
              <h2 className="text-lg font-semibold text-foreground">Socket node layout</h2>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Each socket node has vertical rows. Each row has at most one left socket, a control component, and one right socket.
                Connections are horizontal (left/right only) and go socket-to-socket.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead><tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-4 font-mono font-medium">Control type</th><th className="py-2 font-mono font-medium">Purpose</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ["label", "Static text — display only"],
                      ["checkbox", "Boolean toggle (checked/unchecked)"],
                      ["toggle", "Switch-style boolean"],
                      ["dropdown", "Select from options"],
                      ["range", "Numeric slider with min/max/step"],
                      ["text", "Free-form text input"],
                      ["number", "Numeric input with min/max/step"],
                    ].map(([t, d]) => (
                      <tr key={t} className="border-b border-border/60">
                        <td className="py-2 pr-4 font-mono text-brand-lemon">{t}</td><td className="py-2 text-muted-foreground">{d}</td>
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
                <li><a href="#" className="hover:text-foreground">Socket layout</a></li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
