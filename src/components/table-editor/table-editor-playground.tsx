"use client";

import * as React from "react";
import { Table2, RotateCcw } from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs } from "@/components/platform/agent-skill-tabs";
import { CollapsibleDescription } from "@/components/platform/collapsible-description";
import { TableEditorReact, type TableColumn, type TableRow, type TableEditorEventPayload } from "./table-editor-react";
import type { TableEditor } from "@/lib/components/table-editor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  frozenHeader: boolean;
  frozenFirstCol: boolean;
  rowNumbers: boolean;
  striped: boolean;
  editable: boolean;
  resizable: boolean;
  reorderable: boolean;
  sortable: boolean;
}

const DEFAULTS: State = {
  frozenHeader: true,
  frozenFirstCol: false,
  rowNumbers: true,
  striped: true,
  editable: true,
  resizable: true,
  reorderable: true,
  sortable: true,
};

const SEED_COLUMNS: TableColumn[] = [
  { id: "name", label: "Name", type: "text", width: 140, align: "left" },
  { id: "age", label: "Age", type: "number", width: 80, align: "right" },
  { id: "role", label: "Role", type: "select", width: 120, options: [
    { label: "Admin", value: "admin" }, { label: "Editor", value: "editor" }, { label: "Viewer", value: "viewer" },
  ]},
  { id: "active", label: "Active", type: "checkbox", width: 80, align: "center" },
  { id: "email", label: "Email", type: "text", width: 200, align: "left" },
  { id: "score", label: "Score", type: "number", width: 80, align: "right" },
];

const SEED_ROWS: TableRow[] = [
  { id: "r1", name: "Ava Kim", age: 28, role: "admin", active: true, email: "ava@workshop.dev", score: 95 },
  { id: "r2", name: "Jordan Mehta", age: 34, role: "editor", active: true, email: "jordan@workshop.dev", score: 82 },
  { id: "r3", name: "Zai Bot", age: 1, role: "viewer", active: false, email: "zai@workshop.dev", score: 100 },
  { id: "r4", name: "Lina Park", age: 45, role: "editor", active: true, email: "lina@workshop.dev", score: 78 },
  { id: "r5", name: "Marcus Cole", age: 22, role: "viewer", active: true, email: "marcus@workshop.dev", score: 65 },
  { id: "r6", name: "Priya Shah", age: 31, role: "admin", active: false, email: "priya@workshop.dev", score: 91 },
  { id: "r7", name: "Tom Wright", age: 27, role: "editor", active: true, email: "tom@workshop.dev", score: 73 },
];

export function TableEditorPlayground() {
  const meta = getComponent("table-editor")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [lastEvent, setLastEvent] = React.useState<string>("—");
  const [selectedInfo, setSelectedInfo] = React.useState<string>("—");
  const instanceRef = React.useRef<TableEditor | null>(null);

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const onCellChange = React.useCallback((p: TableEditorEventPayload) => {
    setLastEvent(`cell ${p.rowId}.${p.colId} = ${String(p.value)}`);
  }, []);

  const onSelectionChange = React.useCallback((p: TableEditorEventPayload) => {
    const cells = p.selectedCells ?? [];
    setSelectedInfo(cells.length === 1 ? `R${cells[0].row + 1}C${cells[0].col + 1}` : cells.length > 1 ? `${cells.length} cells` : "—");
  }, []);

  const onColumnReorder = React.useCallback((p: TableEditorEventPayload) => {
    setLastEvent(`moved col ${p.colId} ${p.fromIndex}→${p.toIndex}`);
    toast.success("Column moved", { description: `${p.fromIndex} → ${p.toIndex}` });
  }, []);

  const onColumnResize = React.useCallback((p: TableEditorEventPayload) => {
    setLastEvent(`resized ${p.colId} → ${p.value}px`);
  }, []);

  const onSortChange = React.useCallback((p: TableEditorEventPayload) => {
    setLastEvent(`sort ${p.col} ${p.direction ?? "cleared"}`);
  }, []);

  const reset = React.useCallback(() => {
    setState(DEFAULTS);
    setLastEvent("reset");
    instanceRef.current?.setColumns(SEED_COLUMNS);
    instanceRef.current?.setRows(SEED_ROWS);
    toast.info("Table reset");
  }, []);

  const jsCode = React.useMemo(() => `import { TableEditor } from "@workshop/table-editor";

const table = new TableEditor(container, {
  frozenHeader: ${state.frozenHeader},
  frozenFirstCol: ${state.frozenFirstCol},
  rowNumbers: ${state.rowNumbers},
  striped: ${state.striped},
  editable: ${state.editable},
  resizable: ${state.resizable},
  reorderable: ${state.reorderable},
  sortable: ${state.sortable},
  columns: [
    { id: "name", label: "Name", type: "text", width: 140 },
    { id: "age", label: "Age", type: "number", width: 80, align: "right" },
    { id: "active", label: "Active", type: "checkbox", width: 80 },
  ],
  rows: [
    { id: "r1", name: "Ava", age: 28, active: true },
    { id: "r2", name: "Jordan", age: 34, active: false },
  ],
});

table.on("cell_change", ({ rowId, colId, value }) => {
  console.log(\`Cell \${rowId}.\${colId} = \${value}\`);
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Data Display</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Table Editor</h1>
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
                <Table2 className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">{selectedInfo}</span>
              </div>
              <button type="button" onClick={reset} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-brand-lemon/40">
                <RotateCcw className="h-3 w-3" />Reset
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <TableEditorReact
                columns={SEED_COLUMNS}
                rows={SEED_ROWS}
                frozenHeader={state.frozenHeader}
                frozenFirstCol={state.frozenFirstCol}
                rowNumbers={state.rowNumbers}
                striped={state.striped}
                editable={state.editable}
                resizable={state.resizable}
                reorderable={state.reorderable}
                sortable={state.sortable}
                onCellChange={onCellChange}
                onSelectionChange={onSelectionChange}
                onColumnReorder={onColumnReorder}
                onColumnResize={onColumnResize}
                onSortChange={onSortChange}
                instanceRef={instanceRef}
                className="h-full"
              />
            </div>
            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">Output</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">last: <span className="text-brand-lemon">{lastEvent}</span></span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tip: click cells to select, drag for range, double-click to edit, click column headers to sort, drag the grip to reorder, drag the right edge to resize. <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">←↑↓→</kbd> to navigate, <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Enter</kbd> to edit, <kbd className="rounded border border-border bg-muted/40 px-1 font-mono text-[10px]">Delete</kbd> to clear.
              </p>
            </div>
          </section>

          <AgentSkillTabs agentPath="/docs/components/table-editor-AGENT.md" skillPath="/docs/components/table-editor-SKILL.md">
            <div className="flex flex-col gap-2">
              {([
                { k: "frozenHeader" as const, l: "Frozen header" },
                { k: "frozenFirstCol" as const, l: "Frozen first column" },
                { k: "rowNumbers" as const, l: "Row numbers" },
                { k: "striped" as const, l: "Striped rows" },
                { k: "editable" as const, l: "Editable cells" },
                { k: "resizable" as const, l: "Resizable columns" },
                { k: "reorderable" as const, l: "Reorderable columns" },
                { k: "sortable" as const, l: "Sortable columns" },
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
