"use client";

import * as React from "react";
import {
  Calendar,
  type CalendarDate,
  type CalendarOptions,
  type CalendarEventPayload,
  type SelectionMode,
  type WeekdayFormat,
} from "@/lib/components/calendar";

export type { CalendarDate, CalendarOptions, CalendarEventPayload, SelectionMode, WeekdayFormat };

export interface CalendarReactProps {
  selectionMode?: SelectionMode;
  value?: CalendarDate | null;
  selectedDates?: CalendarDate[];
  rangeStart?: CalendarDate | null;
  rangeEnd?: CalendarDate | null;
  viewDate?: CalendarDate;
  minDate?: CalendarDate | null;
  maxDate?: CalendarDate | null;
  disabledDates?: CalendarDate[];
  weekStart?: number;
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
  onSelectionChanged?: (p: CalendarEventPayload) => void;
  onViewChanged?: (p: CalendarEventPayload) => void;
  onDateSelected?: (p: CalendarEventPayload) => void;
  onRangeChanged?: (p: CalendarEventPayload) => void;
  className?: string;
  instanceRef?: React.MutableRefObject<Calendar | null>;
}

export function CalendarReact({
  selectionMode = "single",
  value,
  selectedDates,
  rangeStart,
  rangeEnd,
  viewDate,
  minDate,
  maxDate,
  disabledDates,
  weekStart = 0,
  showOutsideDates = true,
  showToday = true,
  showWeekNumbers = false,
  showNavigation = true,
  showFooter = false,
  readOnly = false,
  disabled = false,
  allowClear = true,
  allowToday = true,
  hoverPreview = true,
  weekdayFormat = "short",
  cellSize = 36,
  onSelectionChanged,
  onViewChanged,
  onDateSelected,
  onRangeChanged,
  className,
  instanceRef,
}: CalendarReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<Calendar | null>(null);

  const selRef = React.useRef(onSelectionChanged);
  const viewRef = React.useRef(onViewChanged);
  const dateRef = React.useRef(onDateSelected);
  const rangeRef = React.useRef(onRangeChanged);
  React.useEffect(() => { selRef.current = onSelectionChanged; }, [onSelectionChanged]);
  React.useEffect(() => { viewRef.current = onViewChanged; }, [onViewChanged]);
  React.useEffect(() => { dateRef.current = onDateSelected; }, [onDateSelected]);
  React.useEffect(() => { rangeRef.current = onRangeChanged; }, [onRangeChanged]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const cal = new Calendar(containerRef.current, {
      selectionMode, value, selectedDates, rangeStart, rangeEnd, viewDate,
      minDate, maxDate, disabledDates, weekStart,
      showOutsideDates, showToday, showWeekNumbers, showNavigation, showFooter,
      readOnly, disabled, allowClear, allowToday, hoverPreview, weekdayFormat, cellSize,
    });
    ref.current = cal;
    if (instanceRef) instanceRef.current = cal;
    cal.on("selection_changed", (p) => selRef.current?.(p));
    cal.on("view_changed", (p) => viewRef.current?.(p));
    cal.on("date_selected", (p) => dateRef.current?.(p));
    cal.on("range_changed", (p) => rangeRef.current?.(p));
    return () => { cal.destroy(); ref.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);

  React.useEffect(() => { ref.current?.setProperty("selectionMode", selectionMode); }, [selectionMode]);
  React.useEffect(() => { ref.current?.setProperty("weekStart", weekStart); }, [weekStart]);
  React.useEffect(() => { ref.current?.setProperty("showOutsideDates", showOutsideDates); }, [showOutsideDates]);
  React.useEffect(() => { ref.current?.setProperty("showToday", showToday); }, [showToday]);
  React.useEffect(() => { ref.current?.setProperty("showWeekNumbers", showWeekNumbers); }, [showWeekNumbers]);
  React.useEffect(() => { ref.current?.setProperty("showNavigation", showNavigation); }, [showNavigation]);
  React.useEffect(() => { ref.current?.setProperty("showFooter", showFooter); }, [showFooter]);
  React.useEffect(() => { ref.current?.setProperty("readOnly", readOnly); }, [readOnly]);
  React.useEffect(() => { ref.current?.setProperty("disabled", disabled); }, [disabled]);
  React.useEffect(() => { ref.current?.setProperty("allowClear", allowClear); }, [allowClear]);
  React.useEffect(() => { ref.current?.setProperty("allowToday", allowToday); }, [allowToday]);
  React.useEffect(() => { ref.current?.setProperty("hoverPreview", hoverPreview); }, [hoverPreview]);
  React.useEffect(() => { ref.current?.setProperty("weekdayFormat", weekdayFormat); }, [weekdayFormat]);
  React.useEffect(() => { ref.current?.setProperty("cellSize", cellSize); }, [cellSize]);
  React.useEffect(() => { if (minDate !== undefined) ref.current?.setProperty("minDate", minDate ?? null); }, [minDate]);
  React.useEffect(() => { if (maxDate !== undefined) ref.current?.setProperty("maxDate", maxDate ?? null); }, [maxDate]);

  return <div ref={containerRef} className={className} />;
}
