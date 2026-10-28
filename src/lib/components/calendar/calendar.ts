/**
 * Calendar — a reusable date-selection and navigation component (vanilla TS).
 *
 * Spec: §14 Minimum viable specification + extensions for range/multiple.
 *
 * Modes: month view with prev/next navigation.
 * Selection: none, single, multiple, range (with hover preview).
 * Separate value (selection) vs view_date (displayed period).
 * Configurable: locale, week_start, min/max date, disabled dates, outside dates,
 *   today indicator, week numbers, navigation, footer, read-only, disabled.
 * Events: selection_changed, view_changed, date_selected, range_changed.
 * Keyboard: Arrows, Home/End, PageUp/Down, Shift+PageUp/Down, Enter/Space, Escape.
 */

import { CustomButton } from "@/lib/components/custom-button";

export type SelectionMode = "none" | "single" | "multiple" | "range";
export type WeekStart = number; // 0=Sunday … 6=Saturday
export type WeekdayFormat = "narrow" | "short" | "long";

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export interface CalendarOptions {
  selectionMode?: SelectionMode;
  value?: CalendarDate | null;
  selectedDates?: CalendarDate[];
  rangeStart?: CalendarDate | null;
  rangeEnd?: CalendarDate | null;
  viewDate?: CalendarDate;
  minDate?: CalendarDate | null;
  maxDate?: CalendarDate | null;
  disabledDates?: CalendarDate[];
  weekStart?: WeekStart;
  locale?: string;
  showOutsideDates?: boolean;
  showToday?: boolean;
  showWeekNumbers?: boolean;
  showNavigation?: boolean;
  showFooter?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  allowToday?: boolean;
  hoverPreview?: boolean;
  weekdayFormat?: WeekdayFormat;
  cellSize?: number;
}

export interface CalendarEventPayload {
  date?: CalendarDate | null;
  previousValue?: any;
  selection?: any;
  previousSelection?: any;
  selectionMode?: SelectionMode;
  startDate?: CalendarDate | null;
  endDate?: CalendarDate | null;
  complete?: boolean;
  viewDate?: CalendarDate;
  reason?: string;
  source?: "pointer" | "keyboard" | "programmatic";
}

type Handler = (payload: CalendarEventPayload) => void;

// ---- Date helpers (pure, no Date object to avoid TZ issues) ----

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

function dayOfWeek(y: number, m: number, d: number): number {
  // 0=Sunday … 6=Saturday (Zeller-ish via Date, but we normalize to local)
  const dt = new Date(y, m - 1, d);
  return dt.getDay();
}

function dateKey(d: CalendarDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

function sameDate(a: CalendarDate | null, b: CalendarDate | null): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function compareDate(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function isBetween(d: CalendarDate, start: CalendarDate, end: CalendarDate): boolean {
  return compareDate(d, start) >= 0 && compareDate(d, end) <= 0;
}

function addMonths(d: CalendarDate, n: number): CalendarDate {
  const totalMonths = (d.year * 12 + (d.month - 1)) + n;
  const y = Math.floor(totalMonths / 12);
  const m = (totalMonths % 12) + 1;
  const maxDay = daysInMonth(y, m);
  return { year: y, month: m, day: Math.min(d.day, maxDay) };
}

function addDays(d: CalendarDate, n: number): CalendarDate {
  let { year, month, day } = d;
  day += n;
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month++;
    if (month > 12) { month = 1; year++; }
  }
  while (day < 1) {
    month--;
    if (month < 1) { month = 12; year--; }
    day += daysInMonth(year, month);
  }
  return { year, month, day };
}

function today(): CalendarDate {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

// ISO week number
function weekNumber(d: CalendarDate): number {
  const dt = new Date(d.year, d.month - 1, d.day);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
  const week1 = new Date(dt.getFullYear(), 0, 4);
  return 1 + Math.round(((dt.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

const WEEKDAY_NAMES: Record<WeekdayFormat, string[]> = {
  narrow: ["S", "M", "T", "W", "T", "F", "S"],
  short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ---- Grid generation ----

interface GridCell {
  date: CalendarDate;
  isOutside: boolean;
  isToday: boolean;
  isSelected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  isDisabled: boolean;
  isFocused: boolean;
  isPreviewed: boolean;
  weekNumber?: number;
}

function buildGrid(
  viewDate: CalendarDate,
  weekStart: WeekStart,
  showOutside: boolean,
  selectionMode: SelectionMode,
  value: CalendarDate | null,
  selectedDates: CalendarDate[],
  rangeStart: CalendarDate | null,
  rangeEnd: CalendarDate | null,
  minDate: CalendarDate | null,
  maxDate: CalendarDate | null,
  disabledDates: Set<string>,
  focusedDate: CalendarDate | null,
  previewEnd: CalendarDate | null,
  showWeekNumbers: boolean,
): GridCell[][] {
  const rows: GridCell[][] = [];
  const firstOfMonth = { year: viewDate.year, month: viewDate.month, day: 1 };
  const firstDayOfWeek = dayOfWeek(firstOfMonth.year, firstOfMonth.month, firstOfMonth.day);
  const offset = (firstDayOfWeek - weekStart + 7) % 7;
  const gridStart = addDays(firstOfMonth, -offset);
  const todayDate = today();

  for (let week = 0; week < 6; week++) {
    const row: GridCell[] = [];
    for (let col = 0; col < 7; col++) {
      const date = addDays(gridStart, week * 7 + col);
      const isOutside = date.month !== viewDate.month || date.year !== viewDate.year;
      if (isOutside && !showOutside) {
        row.push({
          date, isOutside: true, isToday: false, isSelected: false,
          isRangeStart: false, isRangeEnd: false, isInRange: false,
          isDisabled: true, isFocused: false, isPreviewed: false,
        });
        continue;
      }
      const dk = dateKey(date);
      const isSelected =
        (selectionMode === "single" && sameDate(date, value)) ||
        (selectionMode === "multiple" && selectedDates.some((s) => sameDate(s, date)));
      const isRangeStart = sameDate(date, rangeStart);
      const isRangeEnd = sameDate(date, rangeEnd);
      const isInRange =
        selectionMode === "range" && rangeStart && rangeEnd &&
        isBetween(date, rangeStart, rangeEnd) && !isRangeStart && !isRangeEnd;
      const isPreviewed =
        selectionMode === "range" && rangeStart && !rangeEnd && previewEnd &&
        ((compareDate(previewEnd, rangeStart) >= 0 && isBetween(date, rangeStart, previewEnd) && !isRangeStart) ||
         (compareDate(previewEnd, rangeStart) < 0 && isBetween(date, previewEnd, rangeStart) && !sameDate(date, rangeStart)));
      const isDisabled =
        (minDate && compareDate(date, minDate) < 0) ||
        (maxDate && compareDate(date, maxDate) > 0) ||
        disabledDates.has(dk);
      row.push({
        date, isOutside, isToday: sameDate(date, todayDate),
        isSelected, isRangeStart, isRangeEnd, isInRange,
        isDisabled, isFocused: sameDate(date, focusedDate),
        isPreviewed, weekNumber: showWeekNumbers && col === 0 ? weekNumber(date) : undefined,
      });
    }
    rows.push(row);
  }
  return rows;
}

// ---- Component ----

const STYLE_ID = "calendar-styles";

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.cal { font-family: inherit; --cal-accent: #D9FF66; --cal-bg: #211A30; --cal-border: #383343; --cal-text: #F4F1FF; --cal-muted: #B8B2CA; }
.cal * { box-sizing: border-box; }
.cal-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 4px; }
.cal-nav-btn { background: none; border: 1px solid var(--cal-border); color: var(--cal-text); border-radius: 6px; cursor: pointer; padding: 4px 8px; font-size: 12px; }
.cal-nav-btn:hover { background: rgba(255,255,255,0.06); }
.cal-nav-btn:disabled { opacity: 0.3; cursor: default; }
.cal-title { font-size: 14px; font-weight: 600; color: var(--cal-text); display: inline-flex; align-items: center; gap: 4px; }
.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; padding: 0 4px; }
.cal-weekday { text-align: center; font-size: 11px; color: var(--cal-muted); padding: 4px 0; text-transform: uppercase; letter-spacing: 0.05em; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; padding: 0 4px 4px; }
.cal-cell { display: flex; align-items: center; justify-content: center; border: none; background: none; cursor: pointer; font-size: 13px; color: var(--cal-text); border-radius: 6px; transition: background 0.1s; position: relative; }
.cal-cell:hover:not(.cal-disabled) { background: rgba(255,255,255,0.08); }
.cal-cell.cal-outside { color: var(--cal-muted); opacity: 0.4; }
.cal-cell.cal-today { font-weight: 700; border: 1px solid var(--cal-accent); }
.cal-cell.cal-selected { background: var(--cal-accent); color: #17151D; font-weight: 600; }
.cal-cell.cal-range-start, .cal-cell.cal-range-end { background: var(--cal-accent); color: #17151D; font-weight: 600; }
.cal-cell.cal-in-range { background: rgba(217,255,102,0.15); }
.cal-cell.cal-preview { background: rgba(217,255,102,0.08); }
.cal-cell.cal-disabled { color: var(--cal-muted); opacity: 0.3; cursor: default; }
.cal-cell.cal-focused { box-shadow: 0 0 0 2px rgba(217,255,102,0.4); }
.cal-footer { display: flex; justify-content: space-between; padding: 8px 4px; border-top: 1px solid var(--cal-border); margin-top: 4px; }
.cal-foot-btn { background: none; border: 1px solid var(--cal-border); color: var(--cal-text); border-radius: 6px; cursor: pointer; padding: 4px 12px; font-size: 12px; }
.cal-foot-btn:hover { background: rgba(255,255,255,0.06); }
`;
  document.head.appendChild(el);
}

export class Calendar {
  private container: HTMLElement;
  private root: HTMLDivElement;
  private opts: Required<CalendarOptions>;
  private listeners = new Map<string, Set<Handler>>();
  private focusedDate: CalendarDate | null = null;
  private previewEnd: CalendarDate | null = null;
  private _destroyed = false;
  /** CustomButton instances for each day cell, tracked for per-instance prop updates. */
  private dayCellButtons: { button: CustomButton; dateKey: string }[] = [];
  /** CustomButton instances for each week-number cell (when showWeekNumbers is on). */
  private weekCellButtons: { button: CustomButton; weekKey: string }[] = [];
  /** Single CustomButton for the month title in the header. */
  private monthCellButton: CustomButton | null = null;
  /** Single CustomButton for the year title in the header. */
  private yearCellButton: CustomButton | null = null;
  /**
   * Persisted cell-prop overrides so they survive re-renders (month navigation).
   * Structure: { category: { "all" | targetKey: { prop: value } } }
   */
  private cellOverrides: Record<string, Record<string, Record<string, unknown>>> = {
    day: {}, week: {}, month: {}, year: {},
  };

  constructor(container: HTMLElement, options: CalendarOptions = {}) {
    this.container = container;
    this.opts = {
      selectionMode: options.selectionMode ?? "single",
      value: options.value ?? null,
      selectedDates: options.selectedDates ?? [],
      rangeStart: options.rangeStart ?? null,
      rangeEnd: options.rangeEnd ?? null,
      viewDate: options.viewDate ?? today(),
      minDate: options.minDate ?? null,
      maxDate: options.maxDate ?? null,
      disabledDates: options.disabledDates ?? [],
      weekStart: options.weekStart ?? 0,
      locale: options.locale ?? "en-US",
      showOutsideDates: options.showOutsideDates ?? true,
      showToday: options.showToday ?? true,
      showWeekNumbers: options.showWeekNumbers ?? false,
      showNavigation: options.showNavigation ?? true,
      showFooter: options.showFooter ?? false,
      readOnly: options.readOnly ?? false,
      disabled: options.disabled ?? false,
      allowClear: options.allowClear ?? true,
      allowToday: options.allowToday ?? true,
      hoverPreview: options.hoverPreview ?? true,
      weekdayFormat: options.weekdayFormat ?? "short",
      cellSize: options.cellSize ?? 36,
    };
    injectStyles();
    this.root = document.createElement("div");
    this.root.className = "cal";
    this.root.setAttribute("role", "grid");
    this.root.setAttribute("aria-label", "Calendar");
    this.root.tabIndex = 0;
    this.container.appendChild(this.root);
    this.focusedDate = this.opts.value ?? today();
    this.render();
    this.attachListeners();
  }

  // ---- Public API (commands per spec §9) ----

  setProperty<K extends keyof CalendarOptions>(name: K, value: CalendarOptions[K]): void {
    (this.opts as any)[name] = value;
    this.render();
  }

  navigate(direction: "prev" | "next"): void {
    this.opts.viewDate = addMonths(this.opts.viewDate, direction === "next" ? 1 : -1);
    this.render();
    this.emit("view_changed", { viewDate: this.opts.viewDate, reason: "navigate" });
  }

  navigateTo(date: CalendarDate): void {
    this.opts.viewDate = { ...date };
    this.render();
    this.emit("view_changed", { viewDate: this.opts.viewDate, reason: "navigate_to" });
  }

  selectDate(date: CalendarDate, source: "pointer" | "keyboard" | "programmatic" = "programmatic"): void {
    if (this.opts.readOnly || this.opts.disabled) return;
    if (this.isDisabled(date)) {
      this.emit("validation_failed", { date, reason: "disabled" });
      return;
    }
    const prev = this.getSnapshot();
    switch (this.opts.selectionMode) {
      case "none": break;
      case "single":
        this.opts.value = sameDate(date, this.opts.value) && this.opts.allowClear ? null : date;
        this.focusedDate = date;
        break;
      case "multiple": {
        const idx = this.opts.selectedDates.findIndex((d) => sameDate(d, date));
        if (idx >= 0) this.opts.selectedDates.splice(idx, 1);
        else this.opts.selectedDates.push(date);
        this.focusedDate = date;
        break;
      }
      case "range":
        if (!this.opts.rangeStart || (this.opts.rangeStart && this.opts.rangeEnd)) {
          this.opts.rangeStart = date;
          this.opts.rangeEnd = null;
          this.previewEnd = null;
          this.emit("range_changed", { startDate: date, endDate: null, complete: false });
        } else {
          if (compareDate(date, this.opts.rangeStart) < 0) {
            this.opts.rangeEnd = this.opts.rangeStart;
            this.opts.rangeStart = date;
          } else {
            this.opts.rangeEnd = date;
          }
          this.previewEnd = null;
          this.emit("range_changed", { startDate: this.opts.rangeStart, endDate: this.opts.rangeEnd, complete: true });
        }
        this.focusedDate = date;
        break;
    }
    this.render();
    this.emit("date_selected", { date, previousValue: prev, source });
    this.emit("selection_changed", { selection: this.getSnapshot(), previousSelection: prev, selectionMode: this.opts.selectionMode });
  }

  setSelection(selection: CalendarDate | CalendarDate[] | { start: CalendarDate; end: CalendarDate } | null): void {
    if (this.opts.readOnly || this.opts.disabled) return;
    if (selection === null) { this.clearSelection(); return; }
    if (this.opts.selectionMode === "single" && !Array.isArray(selection) && !(selection as any).start) {
      this.opts.value = selection as CalendarDate;
    } else if (this.opts.selectionMode === "multiple" && Array.isArray(selection)) {
      this.opts.selectedDates = [...selection];
    } else if (this.opts.selectionMode === "range" && (selection as any).start) {
      this.opts.rangeStart = (selection as any).start;
      this.opts.rangeEnd = (selection as any).end;
    }
    this.render();
    this.emit("selection_changed", { selection: this.getSnapshot(), selectionMode: this.opts.selectionMode });
  }

  clearSelection(): void {
    if (!this.opts.allowClear) return;
    const prev = this.getSnapshot();
    this.opts.value = null;
    this.opts.selectedDates = [];
    this.opts.rangeStart = null;
    this.opts.rangeEnd = null;
    this.previewEnd = null;
    this.render();
    this.emit("selection_changed", { selection: null, previousSelection: prev, selectionMode: this.opts.selectionMode });
  }

  focusDate(date: CalendarDate): void {
    this.focusedDate = date;
    if (date.month !== this.opts.viewDate.month || date.year !== this.opts.viewDate.year) {
      this.opts.viewDate = { year: date.year, month: date.month, day: 1 };
    }
    this.render();
    this.emit("focused_date_changed", { date, previousDate: null });
  }

  getValue(): CalendarDate | null { return this.opts.value; }
  getSelectedDates(): CalendarDate[] { return [...this.opts.selectedDates]; }
  getRange(): { start: CalendarDate | null; end: CalendarDate | null } {
    return { start: this.opts.rangeStart, end: this.opts.rangeEnd };
  }
  getViewDate(): CalendarDate { return { ...this.opts.viewDate }; }

  on(event: string, handler: Handler): void {
    let set = this.listeners.get(event);
    if (!set) { set = new Set(); this.listeners.set(event, set); }
    set.add(handler);
  }
  off(event: string, handler: Handler): void { this.listeners.get(event)?.delete(handler); }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.listeners.clear();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  // ---- Internal ----

  private isDisabled(date: CalendarDate): boolean {
    const dk = dateKey(date);
    return (
      (this.opts.minDate && compareDate(date, this.opts.minDate) < 0) ||
      (this.opts.maxDate && compareDate(date, this.opts.maxDate) > 0) ||
      this.opts.disabledDates.some((d) => dateKey(d) === dk)
    );
  }

  private getSnapshot(): any {
    switch (this.opts.selectionMode) {
      case "single": return this.opts.value;
      case "multiple": return [...this.opts.selectedDates];
      case "range": return { start: this.opts.rangeStart, end: this.opts.rangeEnd };
      default: return null;
    }
  }

  private emit(event: string, payload: CalendarEventPayload): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const h of Array.from(set)) { try { h(payload); } catch (e) { console.error(e); } }
  }

  private attachListeners(): void {
    this.root.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.opts.disabled) return;
    if (!this.focusedDate) this.focusedDate = today();
    let handled = true;
    switch (e.key) {
      case "ArrowLeft": this.focusedDate = addDays(this.focusedDate, -1); break;
      case "ArrowRight": this.focusedDate = addDays(this.focusedDate, 1); break;
      case "ArrowUp": this.focusedDate = addDays(this.focusedDate, -7); break;
      case "ArrowDown": this.focusedDate = addDays(this.focusedDate, 7); break;
      case "Home": {
        const dow = dayOfWeek(this.focusedDate.year, this.focusedDate.month, this.focusedDate.day);
        const offset = (dow - this.opts.weekStart + 7) % 7;
        this.focusedDate = addDays(this.focusedDate, -offset); break;
      }
      case "End": {
        const dow = dayOfWeek(this.focusedDate.year, this.focusedDate.month, this.focusedDate.day);
        const offset = (this.opts.weekStart + 6 - dow + 7) % 7;
        this.focusedDate = addDays(this.focusedDate, offset); break;
      }
      case "PageUp": this.focusedDate = addMonths(this.focusedDate, e.shiftKey ? -12 : -1); break;
      case "PageDown": this.focusedDate = addMonths(this.focusedDate, e.shiftKey ? 12 : 1); break;
      case "Enter":
      case " ":
        this.selectDate(this.focusedDate, "keyboard");
        handled = true;
        break;
      case "Escape":
        if (this.opts.selectionMode === "range" && this.opts.rangeStart && !this.opts.rangeEnd) {
          this.opts.rangeStart = null;
          this.previewEnd = null;
          this.render();
        }
        break;
      default: handled = false;
    }
    if (handled) {
      e.preventDefault();
      if (this.focusedDate.month !== this.opts.viewDate.month || this.focusedDate.year !== this.opts.viewDate.year) {
        this.opts.viewDate = { year: this.focusedDate.year, month: this.focusedDate.month, day: 1 };
        this.emit("view_changed", { viewDate: this.opts.viewDate, reason: "keyboard" });
      }
      this.render();
      this.emit("focused_date_changed", { date: this.focusedDate });
    }
  }

  private render(): void {
    if (this._destroyed) return;
    const disabledSet = new Set(this.opts.disabledDates.map(dateKey));
    const grid = buildGrid(
      this.opts.viewDate, this.opts.weekStart, this.opts.showOutsideDates,
      this.opts.selectionMode, this.opts.value, this.opts.selectedDates,
      this.opts.rangeStart, this.opts.rangeEnd, this.opts.minDate, this.opts.maxDate,
      disabledSet, this.focusedDate, this.previewEnd, this.opts.showWeekNumbers,
    );
    const wkNames = WEEKDAY_NAMES[this.opts.weekdayFormat];
    const wkHeaders: string[] = [];
    for (let i = 0; i < 7; i++) wkHeaders.push(wkNames[(this.opts.weekStart + i) % 7]);
    const monthName = MONTH_NAMES[this.opts.viewDate.month - 1];
    const sz = this.opts.cellSize;

    let html = "";

    // Header
    if (this.opts.showNavigation) {
      html += `<div class="cal-header">`;
      html += `<button class="cal-nav-btn" data-act="prev" aria-label="Previous month">‹</button>`;
      html += `<span class="cal-title">`;
      html += `<span class="cal-month-cell" data-month="${this.opts.viewDate.month}">${monthName}</span>`;
      html += `<span class="cal-year-cell" data-year="${this.opts.viewDate.year}">${this.opts.viewDate.year}</span>`;
      html += `</span>`;
      html += `<button class="cal-nav-btn" data-act="next" aria-label="Next month">›</button>`;
      html += `</div>`;
    }

    // Weekday header
    html += `<div class="cal-weekdays">`;
    if (this.opts.showWeekNumbers) html += `<div class="cal-weekday"></div>`;
    for (const w of wkHeaders) html += `<div class="cal-weekday">${w}</div>`;
    html += `</div>`;

    // Grid
    html += `<div class="cal-grid">`;
    for (const row of grid) {
      if (this.opts.showWeekNumbers && row[0].weekNumber !== undefined) {
        const wk = row[0].weekNumber;
        html += `<div class="cal-week-cell" data-week="${wk}" style="display:flex;align-items:center;justify-content:center;">${wk}</div>`;
      }
      for (const cell of row) {
        const classes = ["cal-cell"];
        if (cell.isOutside) classes.push("cal-outside");
        if (cell.isToday && this.opts.showToday) classes.push("cal-today");
        if (cell.isSelected) classes.push("cal-selected");
        if (cell.isRangeStart) classes.push("cal-range-start");
        if (cell.isRangeEnd) classes.push("cal-range-end");
        if (cell.isInRange) classes.push("cal-in-range");
        if (cell.isPreviewed) classes.push("cal-preview");
        if (cell.isDisabled) classes.push("cal-disabled");
        if (cell.isFocused) classes.push("cal-focused");
        const dk = dateKey(cell.date);
        const label = `${cell.date.month}/${cell.date.day}/${cell.date.year}`;
        html += `<button class="${classes.join(" ")}" data-date="${dk}" data-o="${cell.isOutside?1:0}" aria-label="${label}" style="width:${sz}px;height:${sz}px;"${cell.isDisabled ? " disabled" : ""}>${cell.date.day}</button>`;
      }
    }
    html += `</div>`;

    // Footer
    if (this.opts.showFooter) {
      html += `<div class="cal-footer">`;
      if (this.opts.allowToday) html += `<button class="cal-foot-btn" data-act="today">Today</button>`;
      if (this.opts.allowClear) html += `<button class="cal-foot-btn" data-act="clear">Clear</button>`;
      html += `</div>`;
    }

    this.root.innerHTML = html;

    // Day cells are always rendered as CustomButton instances
    this.applyCustomButtonCells();

    // Wire up events
    this.root.querySelectorAll("[data-act]").forEach((el) => {
      const act = (el as HTMLElement).dataset.act;
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (act === "prev") this.navigate("prev");
        else if (act === "next") this.navigate("next");
        else if (act === "today") {
          const t = today();
          this.navigateTo(t);
          this.focusedDate = t;
          this.render();
          this.emit("today_requested", { today: t, previousViewDate: this.opts.viewDate });
        }
        else if (act === "clear") {
          this.clearSelection();
          this.emit("clear_requested", {});
        }
      });
    });

    this.root.querySelectorAll("[data-date]").forEach((el) => {
      const dk = (el as HTMLElement).dataset.date!;
      const [y, m, d] = dk.split("-").map(Number);
      const date: CalendarDate = { year: y, month: m, day: d };
      const isOutside = (el as HTMLElement).dataset.o === "1";

      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.opts.readOnly || this.opts.disabled) return;
        if (isOutside) {
          this.navigateTo({ year: date.year, month: date.month, day: 1 });
        }
        this.selectDate(date, "pointer");
      });

      if (this.opts.hoverPreview && this.opts.selectionMode === "range" && this.opts.rangeStart && !this.opts.rangeEnd) {
        el.addEventListener("mouseenter", () => {
          this.previewEnd = date;
          this.render();
        });
      }
    });
  }

  /**
   * Replace each cell-type element with a CustomButton instance (variant="cell").
   * Four categories are tracked separately so the playground can target each:
   *   - .cal-cell       → dayCellButtons   (key = "YYYY-MM-DD")
   *   - .cal-week-cell  → weekCellButtons  (key = week number)
   *   - .cal-month-cell → monthCellButton  (single)
   *   - .cal-year-cell  → yearCellButton   (single)
   */
  private applyCustomButtonCells(): void {
    this.dayCellButtons = [];
    this.weekCellButtons = [];
    this.monthCellButton = null;
    this.yearCellButton = null;
    const sz = this.opts.cellSize;

    // ---- Day cells ----
    const dayCells = this.root.querySelectorAll(".cal-cell");
    dayCells.forEach((cellEl) => {
      const el = cellEl as HTMLElement;
      const text = el.textContent || "";
      const classes = el.className.split(" ").filter(c => c !== "cal-cell");
      const isDisabled = el.hasAttribute("disabled");
      const isSelected = classes.includes("cal-selected") || classes.includes("cal-range-start") || classes.includes("cal-range-end");

      const wrapper = document.createElement("div");
      wrapper.style.display = "inline-flex";
      el.parentNode?.insertBefore(wrapper, el);

      const btn = new CustomButton(wrapper, {
        text,
        variant: "cell",
        size: "sm",
        width: sz,
        height: sz,
        disabled: isDisabled,
        active: isSelected,
      });

      const dk = el.getAttribute("data-date");
      const o = el.getAttribute("data-o");
      if (dk) btn.getElement().setAttribute("data-date", dk);
      if (o) btn.getElement().setAttribute("data-o", o);
      btn.getElement().setAttribute("aria-label", el.getAttribute("aria-label") || "");

      for (const cls of classes) {
        if (cls.startsWith("cal-")) btn.getElement().classList.add(cls);
      }

      if (dk) this.dayCellButtons.push({ button: btn, dateKey: dk });
      el.remove();
    });

    // ---- Week-number cells ----
    const weekCells = this.root.querySelectorAll(".cal-week-cell");
    weekCells.forEach((cellEl) => {
      const el = cellEl as HTMLElement;
      const text = el.textContent || "";
      const wk = el.getAttribute("data-week") || text;

      const wrapper = document.createElement("div");
      wrapper.style.display = "inline-flex";
      el.parentNode?.insertBefore(wrapper, el);

      const btn = new CustomButton(wrapper, {
        text,
        variant: "cell",
        size: "sm",
        width: sz,
        height: sz,
      });

      btn.getElement().setAttribute("data-week", wk);
      btn.getElement().style.opacity = "0.6";
      btn.getElement().style.cursor = "default";

      this.weekCellButtons.push({ button: btn, weekKey: wk });
      el.remove();
    });

    // ---- Month title cell ----
    const monthEl = this.root.querySelector(".cal-month-cell") as HTMLElement | null;
    if (monthEl) {
      const text = monthEl.textContent || "";
      const wrapper = document.createElement("div");
      wrapper.style.display = "inline-flex";
      monthEl.parentNode?.insertBefore(wrapper, monthEl);

      this.monthCellButton = new CustomButton(wrapper, {
        text,
        variant: "cell",
        size: "sm",
        disabled: true,
      });
      this.monthCellButton.getElement().style.cursor = "default";
      monthEl.remove();
    }

    // ---- Year title cell ----
    const yearEl = this.root.querySelector(".cal-year-cell") as HTMLElement | null;
    if (yearEl) {
      const text = yearEl.textContent || "";
      const wrapper = document.createElement("div");
      wrapper.style.display = "inline-flex";
      wrapper.style.marginLeft = "4px";
      yearEl.parentNode?.insertBefore(wrapper, yearEl);

      this.yearCellButton = new CustomButton(wrapper, {
        text,
        variant: "cell",
        size: "sm",
        disabled: true,
      });
      this.yearCellButton.getElement().style.cursor = "default";
      yearEl.remove();
    }

    // Re-apply any persisted cell prop overrides (e.g. size variant changes
    // that should survive month navigation).
    this.reapplyCellOverrides();
  }

  /**
   * Update a specific cell category's CustomButton properties at runtime.
   * @param category  "day" | "week" | "month" | "year"
   * @param prop      property name (text, icon, iconType, iconPosition, size, disabled, fullWidth, width, height, variant)
   * @param value     new value
   * @param targetKey for "day": dateKey "YYYY-MM-DD" or null (all); for "week": week number or null (all); ignored for month/year
   */
  setCellProp(
    category: "day" | "week" | "month" | "year",
    prop: string,
    value: unknown,
    targetKey: string | null = null,
  ): void {
    // Persist the override so it survives re-renders (month navigation).
    const key = targetKey ?? "__all__";
    if (!this.cellOverrides[category][key]) this.cellOverrides[category][key] = {};
    this.cellOverrides[category][key][prop] = value;

    this.applyCellProp(category, prop, value, targetKey);
  }

  /** Apply a single prop to matching cell buttons (no persistence). */
  private applyCellProp(
    category: "day" | "week" | "month" | "year",
    prop: string,
    value: unknown,
    targetKey: string | null = null,
  ): void {
    const apply = (btn: CustomButton) => {
      switch (prop) {
        case "variant": btn.setVariant(value as any); break;
        case "text": btn.setText(value as string); break;
        case "icon": btn.setIcon(value as string); break;
        case "iconType": btn.setIconType(value as any); break;
        case "iconPosition": btn.setIconPosition(value as any); break;
        case "size":
          btn.setSize(value as any);
          btn.setWidth(0);
          btn.setHeight(0);
          break;
        case "disabled": btn.setDisabled(!!value); break;
        case "fullWidth": btn.setFullWidth(!!value); break;
        case "width": btn.setWidth(Number(value)); break;
        case "height": btn.setHeight(Number(value)); break;
      }
    };

    if (category === "day") {
      for (const entry of this.dayCellButtons) {
        if (targetKey !== null && entry.dateKey !== targetKey) continue;
        apply(entry.button);
      }
    } else if (category === "week") {
      for (const entry of this.weekCellButtons) {
        if (targetKey !== null && entry.weekKey !== targetKey) continue;
        apply(entry.button);
      }
    } else if (category === "month") {
      if (this.monthCellButton) apply(this.monthCellButton);
    } else if (category === "year") {
      if (this.yearCellButton) apply(this.yearCellButton);
    }
  }

  /** Re-apply all persisted cell overrides (called after each render). */
  private reapplyCellOverrides(): void {
    for (const category of ["day", "week", "month", "year"] as const) {
      const cat = this.cellOverrides[category];
      for (const key of Object.keys(cat)) {
        const targetKey = key === "__all__" ? null : key;
        const props = cat[key];
        for (const prop of Object.keys(props)) {
          this.applyCellProp(category, prop, props[prop], targetKey);
        }
      }
    }
  }
}
