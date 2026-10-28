"use client";

import * as React from "react";
import { Calendar as CalendarIcon, CalendarDays, CalendarRange, CalendarClock } from "lucide-react";
import { getComponent } from "@/lib/platform/content";
import { Breadcrumbs, PageOverline } from "@/components/platform/breadcrumbs";
import { CodeBlock, CopyableValue } from "@/components/platform/code-block";
import { AgentSkillTabs, CollapsibleSection } from "@/components/platform/agent-skill-tabs";
import { CustomButtonPropsEditor, type CustomButtonProps } from "@/components/platform/custom-button-props-editor";
import {
  CalendarReact,
  type CalendarDate,
  type SelectionMode,
  type WeekdayFormat,
  type CalendarEventPayload,
} from "./calendar-react";
import type { Calendar } from "@/lib/components/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface State {
  selectionMode: SelectionMode;
  weekStart: number;
  weekdayFormat: WeekdayFormat;
  showOutsideDates: boolean;
  showToday: boolean;
  showWeekNumbers: boolean;
  showNavigation: boolean;
  showFooter: boolean;
  readOnly: boolean;
  hoverPreview: boolean;
  cellSize: number;
  allowClear: boolean;
  allowToday: boolean;
}

type CellCategory = "day" | "week" | "month" | "year";

const DEFAULTS: State = {
  selectionMode: "single",
  weekStart: 0,
  weekdayFormat: "short",
  showOutsideDates: true,
  showToday: true,
  showWeekNumbers: false,
  showNavigation: true,
  showFooter: true,
  readOnly: false,
  hoverPreview: true,
  cellSize: 36,
  allowClear: true,
  allowToday: true,
};

function todayDate(): CalendarDate {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function fmtDate(d: CalendarDate | null): string {
  if (!d) return "—";
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function CalendarPlayground() {
  const meta = getComponent("calendar")!;
  const [state, setState] = React.useState<State>(DEFAULTS);
  const [sel, setSel] = React.useState<CalendarDate | null>(null);
  const [range, setRange] = React.useState<{ start: CalendarDate | null; end: CalendarDate | null }>({ start: null, end: null });
  const [multi, setMulti] = React.useState<CalendarDate[]>([]);
  const [view, setView] = React.useState<CalendarDate>(todayDate());
  const [activeTab, setActiveTab] = React.useState<"javascript" | "html" | "css" | "api">("javascript");
  const instanceRef = React.useRef<Calendar | null>(null);

  // CustomButton cell props — host-specific defaults (shared by all cell categories)
  const cellDefaults: CustomButtonProps = {
    text: "", icon: "", iconType: "icon", iconPosition: "left",
    variant: "cell",
    size: "sm", disabled: false, fullWidth: false,
    width: 36, height: 36,
  };

  // Per-category override reasons (props controlled by the parent calendar).
  // variant is NOT locked — the user can switch style variants (primary/secondary/outline/ghost).
  const dayOverrides: Record<string, string> = {
    text: "set by day number",
    width: "set by cellSize",
    height: "set by cellSize",
    disabled: "set by date rules",
    fullWidth: "always false for cells",
  };
  const weekOverrides: Record<string, string> = {
    text: "set by week number",
    width: "set by cellSize",
    height: "set by cellSize",
    fullWidth: "always false for cells",
  };
  const monthOverrides: Record<string, string> = {
    text: "set by calendar",
    disabled: "title is static",
    fullWidth: "always false for cells",
  };
  const yearOverrides: Record<string, string> = {
    text: "set by calendar",
    disabled: "title is static",
    fullWidth: "always false for cells",
  };
  const categoryOverrides: Record<CellCategory, Record<string, string>> = {
    day: dayOverrides, week: weekOverrides, month: monthOverrides, year: yearOverrides,
  };

  // One target selector + props map per category
  const [cellTargets, setCellTargets] = React.useState<Record<CellCategory, string>>({
    day: "all", week: "all", month: "all", year: "all",
  });
  const [cellPropsMaps, setCellPropsMaps] = React.useState<Record<CellCategory, Record<string, CustomButtonProps>>>({
    day: { all: { ...cellDefaults } },
    week: { all: { ...cellDefaults } },
    month: { all: { ...cellDefaults } },
    year: { all: { ...cellDefaults } },
  });
  // Which category is currently shown in the single "CustomButton (cells)" section
  const [activeCategory, setActiveCategory] = React.useState<CellCategory>("day");

  const onCellPropsChange = React.useCallback((category: CellCategory, target: string, props: CustomButtonProps) => {
    const prevProps = cellPropsMaps[category][target] ?? cellDefaults;
    // When size changes, clear width/height so the size token controls dimensions
    const finalProps = props.size !== prevProps.size
      ? { ...props, width: 0, height: 0 }
      : props;

    setCellPropsMaps((prev) => ({
      ...prev,
      [category]: { ...prev[category], [target]: finalProps },
    }));

    const inst = instanceRef.current;
    if (!inst) return;
    const targetKey = target === "all" ? null : target;
    const overrides = categoryOverrides[category];
    // Only apply props that actually changed — avoids re-setting width/height
    // after the size handler cleared them.
    (Object.keys(finalProps) as (keyof CustomButtonProps)[]).forEach((key) => {
      if (finalProps[key] === prevProps[key]) return;
      if (overrides[key as string]) return;
      (inst as any).setCellProp(category, key, finalProps[key], targetKey);
    });
  }, [categoryOverrides, cellPropsMaps, cellDefaults]);

  // Dropdown options per category
  const dayOptions = React.useMemo(() => {
    const opts = [{ value: "all", label: "All Day Cells" }];
    const year = view.year, month = view.month;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dk = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      opts.push({ value: dk, label: `${month}/${day}` });
    }
    return opts;
  }, [view]);

  const weekOptions = React.useMemo(() => {
    const opts = [{ value: "all", label: "All Week Cells" }];
    for (let w = 1; w <= 6; w++) opts.push({ value: String(w), label: `Week ${w}` });
    return opts;
  }, []);

  const monthOptions = [{ value: "all", label: "Month Title" }];
  const yearOptions = [{ value: "all", label: "Year Title" }];

  const update = React.useCallback(<K extends keyof State>(k: K, v: State[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const onSelectionChanged = React.useCallback((p: CalendarEventPayload) => {
    if (instanceRef.current) {
      setSel(instanceRef.current.getValue());
      setRange(instanceRef.current.getRange());
      setMulti(instanceRef.current.getSelectedDates());
    }
  }, []);

  const onViewChanged = React.useCallback((p: CalendarEventPayload) => {
    if (instanceRef.current) setView(instanceRef.current.getViewDate());
  }, []);

  const jsCode = React.useMemo(() => `import { Calendar } from "@workshop/calendar";

const cal = new Calendar(container, {
  selectionMode: "${state.selectionMode}",
  weekStart: ${state.weekStart},
  weekdayFormat: "${state.weekdayFormat}",
  showOutsideDates: ${state.showOutsideDates},
  showToday: ${state.showToday},
  showWeekNumbers: ${state.showWeekNumbers},
  showNavigation: ${state.showNavigation},
  showFooter: ${state.showFooter},
  cellSize: ${state.cellSize},
});

cal.on("selection_changed", ({ selection }) => {
  console.log("selection:", selection);
});

cal.on("view_changed", ({ viewDate }) => {
  console.log("view:", viewDate);
});`, [state]);

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6 pb-8 lg:px-10">
          <Breadcrumbs />
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PageOverline>Components / Inputs</PageOverline>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Calendar</h1>
              <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">{meta.longDescription}</p>
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
                <CalendarIcon className="h-4 w-4 text-brand-lemon" />
                <span className="eyebrow">Live canvas</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {MONTH_NAMES_SHORT[view.month - 1]} {view.year}
              </span>
            </div>
            <div className="flex flex-1 min-h-0 items-start justify-center overflow-auto bg-grid p-6">
              <CalendarReact
                selectionMode={state.selectionMode}
                weekStart={state.weekStart}
                weekdayFormat={state.weekdayFormat}
                showOutsideDates={state.showOutsideDates}
                showToday={state.showToday}
                showWeekNumbers={state.showWeekNumbers}
                showNavigation={state.showNavigation}
                showFooter={state.showFooter}
                readOnly={state.readOnly}
                hoverPreview={state.hoverPreview}
                cellSize={state.cellSize}
                allowClear={state.allowClear}
                allowToday={state.allowToday}
                onSelectionChanged={onSelectionChanged}
                onViewChanged={onViewChanged}
                instanceRef={instanceRef}
              />
            </div>
            {/* Output */}
            <div className="shrink-0 border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow">Selection</span>
                <span className="font-mono text-[11px] text-muted-foreground">{state.selectionMode}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.selectionMode === "single" && (
                  <CopyableValue label="Date" value={fmtDate(sel)} />
                )}
                {state.selectionMode === "range" && (
                  <>
                    <CopyableValue label="Start" value={fmtDate(range.start)} />
                    <CopyableValue label="End" value={fmtDate(range.end)} />
                  </>
                )}
                {state.selectionMode === "multiple" && (
                  <CopyableValue label="Dates" value={multi.length ? multi.map(fmtDate).join(", ") : "—"} />
                )}
                {state.selectionMode === "none" && <span className="text-[12px] text-muted-foreground">No selection mode</span>}
              </div>
            </div>
          </section>

          {/* Properties */}
          <AgentSkillTabs
            agentPath="/docs/components/calendar-AGENT.md"
            skillPath="/docs/components/calendar-SKILL.md"
          >
            {/* Selection */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Selection mode</label>
              <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["none", "single", "multiple", "range"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => update("selectionMode", m)} aria-pressed={state.selectionMode === m}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium transition-colors",
                      state.selectionMode === m ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {m === "none" ? "None" : m === "single" ? "Single" : m === "multiple" ? "Multi" : "Range"}
                  </button>
                ))}
              </div>
            </div>

            {/* Display */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Weekday format</label>
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {(["narrow", "short", "long"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => update("weekdayFormat", f)} aria-pressed={state.weekdayFormat === f}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium transition-colors",
                      state.weekdayFormat === f ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Week starts on</label>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/20 p-1">
                {[{ v: 0, l: "Sunday" }, { v: 1, l: "Monday" }].map((w) => (
                  <button key={w.v} type="button" onClick={() => update("weekStart", w.v)} aria-pressed={state.weekStart === w.v}
                    className={cn("rounded px-2 py-2 text-[11px] font-medium transition-colors",
                      state.weekStart === w.v ? "bg-brand-purple-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                    {w.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">Cell size: {state.cellSize}px</label>
              <input type="range" min={24} max={60} value={state.cellSize} onChange={(e) => update("cellSize", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                style={{ background: `linear-gradient(to right, var(--brand-lemon) ${(state.cellSize - 24) / 36 * 100}%, var(--muted) ${(state.cellSize - 24) / 36 * 100}%)` }} />
            </div>

            {/* Toggles */}
            {([
              { k: "showOutsideDates" as const, l: "Show outside dates" },
              { k: "showToday" as const, l: "Show today" },
              { k: "showWeekNumbers" as const, l: "Show week numbers" },
              { k: "showNavigation" as const, l: "Show navigation" },
              { k: "showFooter" as const, l: "Show footer" },
              { k: "readOnly" as const, l: "Read-only" },
              { k: "hoverPreview" as const, l: "Hover preview" },
              { k: "allowClear" as const, l: "Allow clear" },
              { k: "allowToday" as const, l: "Allow today" },
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

              {/* Reused component: CustomButton (cells) — one section with a
                  category dropdown group (day/week/month/year) at the top,
                  followed by the instance dropdown for the selected category. */}
              <CollapsibleSection title="CustomButton (cells)" icon={CalendarIcon}>
                {/* Category dropdown group */}
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-1.5">
                  <span className="text-[11px] text-foreground">View:</span>
                  <div className="grid grid-cols-4 gap-1 flex-1 rounded-md border border-border bg-muted/20 p-0.5">
                    {([
                      { cat: "day" as const, label: "Day", icon: CalendarIcon },
                      { cat: "week" as const, label: "Week", icon: CalendarDays },
                      { cat: "month" as const, label: "Month", icon: CalendarRange },
                      { cat: "year" as const, label: "Year", icon: CalendarClock },
                    ]).map(({ cat, label, icon: Icon }) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        aria-pressed={activeCategory === cat}
                        className={cn(
                          "flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors",
                          activeCategory === cat
                            ? "bg-brand-purple-strong text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent",
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instance selector — options depend on the active category */}
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-1.5">
                  <span className="text-[11px] text-foreground">Instance:</span>
                  <select
                    value={cellTargets[activeCategory]}
                    onChange={(e) => setCellTargets((prev) => ({ ...prev, [activeCategory]: e.target.value }))}
                    className="h-6 flex-1 rounded border border-border bg-muted/30 px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40"
                  >
                    {(activeCategory === "day" ? dayOptions
                      : activeCategory === "week" ? weekOptions
                      : activeCategory === "month" ? monthOptions
                      : yearOptions
                    ).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Props editor for the selected category + instance */}
                {(() => {
                  const cat = activeCategory;
                  const target = cellTargets[cat];
                  const propsMap = cellPropsMaps[cat];
                  const overrides = categoryOverrides[cat];
                  const allOpts = cat === "day" ? dayOptions : cat === "week" ? weekOptions : cat === "month" ? monthOptions : yearOptions;
                  const selectedLabel = allOpts.find((o) => o.value === target)?.label ?? target;
                  return (
                    <CustomButtonPropsEditor instances={[
                      {
                        name: selectedLabel,
                        defaults: cellDefaults,
                        current: propsMap[target] ?? { ...cellDefaults },
                        onChange: (props) => onCellPropsChange(cat, target, props),
                        overriddenProps: overrides,
                      },
                    ]} />
                  );
                })()}
              </CollapsibleSection>
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
            {activeTab === "html" && <CodeBlock code={'<div id="calendar"></div>\n<script type="module" src="init.js"></script>'} language="html" filename="index.html" />}
            {activeTab === "css" && <CodeBlock code={".cal { font-family: inherit; }\n.cal-cell { cursor: pointer; }"} language="css" filename="styles.css" />}
            {activeTab === "api" && <CodeBlock code={"class Calendar {\n  constructor(container, options)\n  selectDate(date)\n  setSelection(selection)\n  clearSelection()\n  navigate(direction)\n  navigateTo(date)\n  focusDate(date)\n  getValue()\n  getRange()\n  getSelectedDates()\n  setProperty(name, value)\n  on(event, handler)\n  off(event, handler)\n  destroy()\n}"} language="typescript" filename="api.ts" />}
          </div>
        </section>
      </div>
    </div>
  );
}

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
