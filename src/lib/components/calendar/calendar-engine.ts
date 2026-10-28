/**
 * Calendar Engine — pure date arithmetic, no DOM.
 *
 * All public functions in this module are pure: they take primitive
 * CalendarDate values (or Dates) and return new values without mutation.
 * No side effects. No DOM access. No timezone interpretation. A
 * CalendarDate represents a date-only calendar day with no inherent
 * time or timezone (per spec §3.1).
 *
 * Conceptual type (spec §3):
 *   CalendarDate = { year, month, day }   // month is 1–12, day is valid for year+month
 *   DateRange    = { startDate, endDate } // inclusive on both ends
 *
 * Internally a CalendarDate is stored as a small immutable object. The
 * engine is the only place that knows about the underlying Date object
 * so the higher layers can stay timezone-agnostic.
 *
 * The Calendar class (see calendar.ts) consumes this engine to generate
 * month grids, validate selections, and compute ranges.
 */

// ----------------------------------------------------------------------------
// Core types (per spec §3)
// ----------------------------------------------------------------------------

/**
 * A date-only value: a calendar day with no time and no timezone.
 * `month` is 1–12 (January = 1). `day` is 1..daysInMonth(year, month).
 */
export interface CalendarDate {
  readonly year: number;
  readonly month: number; // 1–12
  readonly day: number; // 1–31
}

/**
 * An inclusive date range. Either end may be `null` while the user is
 * mid-selection (e.g. range start set, end pending).
 */
export interface DateRange {
  readonly startDate: CalendarDate | null;
  readonly endDate: CalendarDate | null;
}

/**
 * A calendar event displayed on the grid (spec §3.4). Identity is the
 * stable `id` field — never the array position or title.
 */
export interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly start: CalendarDate;
  readonly end: CalendarDate;
  readonly allDay?: boolean;
  readonly color?: string;
  readonly description?: string;
  readonly location?: string;
  readonly category?: string;
}

/** A weekday index, 0 = Sunday through 6 = Saturday (matches Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Weekday label formats (spec §10.3). */
export type WeekdayLabelFormat = "narrow" | "short" | "long";

/**
 * A single cell in a generated month grid. Includes everything the
 * renderer needs to draw a day cell without consulting the selection
 * state (selection state is layered on top by the Calendar class).
 */
export interface CalendarCell {
  readonly date: CalendarDate;
  /** True if this cell belongs to the previous or next month. */
  readonly isAdjacentMonth: boolean;
  /** 0–6, Sunday = 0. */
  readonly weekday: Weekday;
  /** True if Sunday or Saturday. */
  readonly isWeekend: boolean;
  /** ISO 8601 week number (Mon-first; week 1 has the year's first Thursday). */
  readonly isoWeek: number;
}

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const WEEKDAY_LABELS: Record<WeekdayLabelFormat, readonly string[]> = {
  narrow: ["S", "M", "T", "W", "T", "F", "S"],
  short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  long: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
} as const;

// ----------------------------------------------------------------------------
// Construction and conversion
// ----------------------------------------------------------------------------

/**
 * Construct a CalendarDate from raw components. Performs no validation —
 * use `isValidCalendarDate` to check. Use `tryCreateCalendarDate` to
 * construct with validation in one step.
 */
export function createCalendarDate(
  year: number,
  month: number,
  day: number,
): CalendarDate {
  return { year, month, day };
}

/**
 * Construct a CalendarDate, returning `null` if the components don't form
 * a valid date (e.g. Feb 30, month 13, day 0).
 */
export function tryCreateCalendarDate(
  year: number,
  month: number,
  day: number,
): CalendarDate | null {
  const cd: CalendarDate = { year, month, day };
  return isValidCalendarDate(cd) ? cd : null;
}

/**
 * Convert a CalendarDate to a native Date at local midnight. Use this when
 * interfacing with APIs that expect Date objects — but never use the
 * resulting Date for date arithmetic (use the CalendarDate helpers instead).
 */
export function calendarDateToDate(cd: CalendarDate): Date {
  return new Date(cd.year, cd.month - 1, cd.day);
}

/**
 * Convert a native Date to a CalendarDate, dropping time and timezone
 * information. The conversion uses the host's local date parts (year,
 * month, day) — not the UTC parts.
 */
export function dateToCalendarDate(d: Date): CalendarDate {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

/**
 * Today as a CalendarDate, in the host's local timezone.
 */
export function todayCalendarDate(): CalendarDate {
  return dateToCalendarDate(new Date());
}

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------

/** True if the year is a Gregorian leap year. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days in the given month (1–12). */
export function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  // Date with day=0 of next month → last day of this month.
  return new Date(year, month, 0).getDate();
}

/** True if year/month/day form a real calendar date. */
export function isValidCalendarDate(cd: CalendarDate): boolean {
  if (!Number.isInteger(cd.year) || !Number.isInteger(cd.month) || !Number.isInteger(cd.day)) {
    return false;
  }
  if (cd.month < 1 || cd.month > 12) return false;
  if (cd.day < 1 || cd.day > daysInMonth(cd.year, cd.month)) return false;
  // Reasonable bound — engines support up to ±100,000,000 days from 1970.
  if (cd.year < -100000 || cd.year > 100000) return false;
  return true;
}

// ----------------------------------------------------------------------------
// Serialization
// ----------------------------------------------------------------------------

/** Format a CalendarDate as `YYYY-MM-DD` (zero-padded). */
export function formatCalendarDateISO(cd: CalendarDate | null): string {
  if (!cd) return "";
  const y = cd.year >= 0 ? String(cd.year).padStart(4, "0") : `-${String(-cd.year).padStart(4, "0")}`;
  const m = String(cd.month).padStart(2, "0");
  const d = String(cd.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a `YYYY-MM-DD` string into a CalendarDate, or null on invalid input. */
export function parseCalendarDateISO(s: string): CalendarDate | null {
  if (!s) return null;
  const m = /^(-?\d{1,6})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return tryCreateCalendarDate(year, month, day);
}

/** Human-readable form like "January 5, 2024" (used for aria-labels). */
export function formatCalendarDateLong(cd: CalendarDate): string {
  return `${MONTH_NAMES[cd.month - 1]} ${cd.day}, ${cd.year}`;
}

// ----------------------------------------------------------------------------
// Comparison
// ----------------------------------------------------------------------------

/**
 * Compare two calendar dates. Returns 0 if same day, -1 if a < b, 1 if a > b.
 * Treats null as smaller than any non-null date.
 */
export function compareCalendarDate(
  a: CalendarDate | null,
  b: CalendarDate | null,
): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

/** True if both dates refer to the same calendar day. */
export function isSameDay(
  a: CalendarDate | null,
  b: CalendarDate | null,
): boolean {
  return compareCalendarDate(a, b) === 0;
}

/** True if `target` is strictly between `start` and `end` (exclusive). */
export function isStrictlyBetween(
  target: CalendarDate,
  start: CalendarDate | null,
  end: CalendarDate | null,
): boolean {
  if (!start || !end) return false;
  const lo = compareCalendarDate(start, end) <= 0 ? start : end;
  const hi = compareCalendarDate(start, end) <= 0 ? end : start;
  return compareCalendarDate(target, lo) > 0 && compareCalendarDate(target, hi) < 0;
}

/** True if `target` is between `start` and `end` inclusive. */
export function isInRange(
  target: CalendarDate,
  range: DateRange,
): boolean {
  const { startDate, endDate } = normalizeRange(range);
  if (!startDate || !endDate) return false;
  return (
    compareCalendarDate(target, startDate) >= 0 &&
    compareCalendarDate(target, endDate) <= 0
  );
}

// ----------------------------------------------------------------------------
// Arithmetic
// ----------------------------------------------------------------------------

/** Add `n` days (may be negative) to a CalendarDate. Month and year roll over. */
export function addDays(cd: CalendarDate, n: number): CalendarDate {
  if (n === 0) return cd;
  const d = calendarDateToDate(cd);
  d.setDate(d.getDate() + n);
  return dateToCalendarDate(d);
}

/**
 * Add `n` months to a CalendarDate. If the resulting month has fewer days,
 * the day is clamped to the last day of the target month (e.g. Jan 31 + 1
 * month = Feb 28/29). This is the standard "preserve-day-with-clamp"
 * convention (spec §13).
 */
export function addMonths(cd: CalendarDate, n: number): CalendarDate {
  if (n === 0) return cd;
  const targetMonthIndex = cd.month - 1 + n;
  const targetYear = cd.year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12 + 1;
  const maxDay = daysInMonth(targetYear, targetMonth);
  const day = Math.min(cd.day, maxDay);
  return { year: targetYear, month: targetMonth, day };
}

/**
 * Add `n` years. Handles Feb 29 → Feb 28 in non-leap target years.
 */
export function addYears(cd: CalendarDate, n: number): CalendarDate {
  if (n === 0) return cd;
  const year = cd.year + n;
  const maxDay = daysInMonth(year, cd.month);
  const day = Math.min(cd.day, maxDay);
  return { year, month: cd.month, day };
}

/** The weekday (0=Sun..6=Sat) of the given CalendarDate. */
export function getWeekday(cd: CalendarDate): Weekday {
  return calendarDateToDate(cd).getDay() as Weekday;
}

/** True if Saturday or Sunday. */
export function isWeekend(cd: CalendarDate): boolean {
  const w = getWeekday(cd);
  return w === 0 || w === 6;
}

// ----------------------------------------------------------------------------
// Ranges
// ----------------------------------------------------------------------------

/**
 * Return a copy of the range with start ≤ end (swapping if reversed).
 * If either end is null, returns the range unchanged.
 */
export function normalizeRange(range: DateRange): DateRange {
  const { startDate, endDate } = range;
  if (!startDate || !endDate) return { startDate, endDate };
  if (compareCalendarDate(startDate, endDate) <= 0) {
    return { startDate, endDate };
  }
  return { startDate: endDate, endDate: startDate };
}

/** Inclusive day count between two dates. Returns 0 if either is null. */
export function rangeLength(range: DateRange): number {
  const n = normalizeRange(range);
  if (!n.startDate || !n.endDate) return 0;
  const a = calendarDateToDate(n.startDate);
  const b = calendarDateToDate(n.endDate);
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

/** Empty range (both ends null). */
export const EMPTY_RANGE: DateRange = { startDate: null, endDate: null };

/** True if both ends are null. */
export function isEmptyRange(range: DateRange): boolean {
  return !range.startDate && !range.endDate;
}

/** True if exactly one end is set (a pending range). */
export function isPendingRange(range: DateRange): boolean {
  return (!!range.startDate && !range.endDate) || (!range.startDate && !!range.endDate);
}

/** True if both ends are set (a complete range). */
export function isCompleteRange(range: DateRange): boolean {
  return !!range.startDate && !!range.endDate;
}

// ----------------------------------------------------------------------------
// Week math
// ----------------------------------------------------------------------------

/**
 * The first day (inclusive) of the week containing `cd`, given the
 * configured `weekStartsOn` (0 = Sunday, 1 = Monday, 6 = Saturday).
 */
export function startOfWeek(cd: CalendarDate, weekStartsOn: Weekday): CalendarDate {
  const w = getWeekday(cd);
  const offset = (w - weekStartsOn + 7) % 7;
  return offset === 0 ? cd : addDays(cd, -offset);
}

/** The last day (inclusive) of the week containing `cd`. */
export function endOfWeek(cd: CalendarDate, weekStartsOn: Weekday): CalendarDate {
  const start = startOfWeek(cd, weekStartsOn);
  return addDays(start, 6);
}

/**
 * ISO 8601 week number (Mon = first day; week 1 contains the year's first
 * Thursday). Matches the week numbering used by most desktop calendar apps.
 */
export function isoWeekNumber(cd: CalendarDate): number {
  const d = new Date(Date.UTC(cd.year, cd.month - 1, cd.day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ----------------------------------------------------------------------------
// Grid generation
// ----------------------------------------------------------------------------

/**
 * Build the 6-row × 7-column month grid for the given year+month, anchored
 * on `weekStartsOn`. Always returns 42 cells so the grid height is stable
 * across months (spec §4.2). The first cell is the Sunday (or Monday/Sat)
 * on or before the 1st of the month.
 *
 * Cells belonging to the previous or next month are flagged with
 * `isAdjacentMonth = true`.
 */
export function generateMonthGrid(
  year: number,
  month: number, // 1–12
  weekStartsOn: Weekday,
): CalendarCell[] {
  const firstOfMonth: CalendarDate = { year, month, day: 1 };
  const offset = (getWeekday(firstOfMonth) - weekStartsOn + 7) % 7;
  const startDate = addDays(firstOfMonth, -offset);

  const cells: CalendarCell[] = [];
  let cursor = startDate;
  for (let i = 0; i < 42; i++) {
    const weekday = getWeekday(cursor);
    cells.push({
      date: cursor,
      isAdjacentMonth: cursor.month !== month,
      weekday,
      isWeekend: weekday === 0 || weekday === 6,
      isoWeek: isoWeekNumber(cursor),
    });
    cursor = addDays(cursor, 1);
  }
  return cells;
}

/**
 * Returns the weekday labels for a header row, in display order, given the
 * `weekStartsOn` and the desired label format.
 */
export function weekdayLabels(
  format: WeekdayLabelFormat,
  weekStartsOn: Weekday,
): string[] {
  const base = WEEKDAY_LABELS[format];
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const idx = (weekStartsOn + i) % 7;
    out.push(base[idx]);
  }
  return out;
}

/**
 * Returns the weekday indices (0–6) in display order, given `weekStartsOn`.
 */
export function weekdayOrder(weekStartsOn: Weekday): Weekday[] {
  const out: Weekday[] = [];
  for (let i = 0; i < 7; i++) {
    out.push(((weekStartsOn + i) % 7) as Weekday);
  }
  return out;
}

// ----------------------------------------------------------------------------
// Constraints / validation helpers
// ----------------------------------------------------------------------------

/** True if `cd` is on or after `min` (inclusive). `min = null` means no bound. */
export function isAtOrAfter(cd: CalendarDate, min: CalendarDate | null): boolean {
  if (!min) return true;
  return compareCalendarDate(cd, min) >= 0;
}

/** True if `cd` is on or before `max` (inclusive). `max = null` means no bound. */
export function isAtOrBefore(cd: CalendarDate, max: CalendarDate | null): boolean {
  if (!max) return true;
  return compareCalendarDate(cd, max) <= 0;
}

/**
 * Reason codes for selection rejection (spec §13, §7.2 `selection_rejected`).
 * Stable string identifiers — keep them free of spaces and punctuation.
 */
export type SelectionRejectReason =
  | "date_disabled" // explicit disabledDates entry
  | "weekday_disabled" // disabledDaysOfWeek match
  | "out_of_range" // outside [minDate, maxDate]
  | "range_too_short" // range shorter than minRangeLength
  | "range_too_long" // range longer than maxRangeLength
  | "range_reversed" // reversed ranges not allowed and start > end
  | "selection_empty" // cannot deselect a required selection
  | "max_selection_count" // multiple-mode cap reached
  | "min_selection_count" // multiple-mode floor not yet met on deselect
  | "read_only" // component is read-only
  | "disabled"; // component is disabled
