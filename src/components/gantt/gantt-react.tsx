"use client";

import * as React from "react";
import {
  GanttTimeline,
  type GanttItem,
  type GanttRow,
  type GanttOptions,
  type GanttEventPayload,
  type GanttScale,
  type GanttSelectionMode,
  type GanttAxisPosition,
  type GanttResizeEndpoint,
} from "@/lib/components/gantt";

export type {
  GanttItem,
  GanttRow,
  GanttOptions,
  GanttEventPayload,
  GanttScale,
  GanttSelectionMode,
  GanttAxisPosition,
  GanttResizeEndpoint,
};

export interface GanttReactProps {
  items?: GanttItem[];
  rows?: GanttRow[];
  viewStart?: number;
  viewEnd?: number;
  scale?: GanttScale;
  showRowHeaders?: boolean;
  rowHeaderWidth?: number;
  rowHeight?: number;
  barHeight?: number;
  barGap?: number;
  rowGap?: number;
  barMinWidth?: number;
  selectable?: boolean;
  selectionMode?: GanttSelectionMode;
  movable?: boolean;
  resizable?: boolean;
  rowMovable?: boolean;
  snapInterval?: number;
  showGrid?: boolean;
  showToday?: boolean;
  showAxis?: boolean;
  axisPosition?: GanttAxisPosition;
  readOnly?: boolean;
  disabled?: boolean;
  progressEnabled?: boolean;
  minDuration?: number;
  templateId?: string;
  onBarSelected?: (p: GanttEventPayload) => void;
  onSelectionChanged?: (p: GanttEventPayload) => void;
  onBarActivated?: (p: GanttEventPayload) => void;
  onBarMoved?: (p: GanttEventPayload) => void;
  onBarResized?: (p: GanttEventPayload) => void;
  onBarMoveRequested?: (p: GanttEventPayload) => void;
  onBarResizeRequested?: (p: GanttEventPayload) => void;
  onBarMoveRejected?: (p: GanttEventPayload) => void;
  onBarRowChanged?: (p: GanttEventPayload) => void;
  onBarDeleteRequested?: (p: GanttEventPayload) => void;
  onViewRangeChanged?: (p: GanttEventPayload) => void;
  onScaleChanged?: (p: GanttEventPayload) => void;
  onDragStarted?: (p: GanttEventPayload) => void;
  onDragCancelled?: (p: GanttEventPayload) => void;
  className?: string;
  instanceRef?: React.MutableRefObject<GanttTimeline | null>;
}

export function GanttReact({
  items,
  rows,
  viewStart,
  viewEnd,
  scale,
  showRowHeaders,
  rowHeaderWidth,
  rowHeight,
  barHeight,
  barGap,
  rowGap,
  barMinWidth,
  selectable,
  selectionMode,
  movable,
  resizable,
  rowMovable,
  snapInterval,
  showGrid,
  showToday,
  showAxis,
  axisPosition,
  readOnly,
  disabled,
  progressEnabled,
  minDuration,
  templateId,
  onBarSelected,
  onSelectionChanged,
  onBarActivated,
  onBarMoved,
  onBarResized,
  onBarMoveRequested,
  onBarResizeRequested,
  onBarMoveRejected,
  onBarRowChanged,
  onBarDeleteRequested,
  onViewRangeChanged,
  onScaleChanged,
  onDragStarted,
  onDragCancelled,
  className,
  instanceRef,
}: GanttReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<GanttTimeline | null>(null);

  // Keep callback refs stable so we don't re-attach listeners on every render.
  const cbRef = React.useRef({
    onBarSelected,
    onSelectionChanged,
    onBarActivated,
    onBarMoved,
    onBarResized,
    onBarMoveRequested,
    onBarResizeRequested,
    onBarMoveRejected,
    onBarRowChanged,
    onBarDeleteRequested,
    onViewRangeChanged,
    onScaleChanged,
    onDragStarted,
    onDragCancelled,
  });
  React.useEffect(() => {
    cbRef.current = {
      onBarSelected,
      onSelectionChanged,
      onBarActivated,
      onBarMoved,
      onBarResized,
      onBarMoveRequested,
      onBarResizeRequested,
      onBarMoveRejected,
      onBarRowChanged,
      onBarDeleteRequested,
      onViewRangeChanged,
      onScaleChanged,
      onDragStarted,
      onDragCancelled,
    };
  });

  // Initial items/columns captured so the create-once effect doesn't depend on them.
  const initialItemsRef = React.useRef(items);
  const initialRowsRef = React.useRef(rows);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const opts: GanttOptions = {
      items: initialItemsRef.current ?? [],
      rows: initialRowsRef.current ?? [],
      viewStart,
      viewEnd,
      scale,
      showRowHeaders,
      rowHeaderWidth,
      rowHeight,
      barHeight,
      barGap,
      rowGap,
      barMinWidth,
      selectable,
      selectionMode,
      movable,
      resizable,
      rowMovable,
      snapInterval,
      showGrid,
      showToday,
      showAxis,
      axisPosition,
      readOnly,
      disabled,
      progressEnabled,
      minDuration,
      templateId,
    };
    const timeline = new GanttTimeline(containerRef.current, opts);
    ref.current = timeline;
    if (instanceRef) instanceRef.current = timeline;

    timeline.on("bar_selected", (p) => cbRef.current.onBarSelected?.(p));
    timeline.on("selection_changed", (p) => cbRef.current.onSelectionChanged?.(p));
    timeline.on("bar_activated", (p) => cbRef.current.onBarActivated?.(p));
    timeline.on("bar_moved", (p) => cbRef.current.onBarMoved?.(p));
    timeline.on("bar_resized", (p) => cbRef.current.onBarResized?.(p));
    timeline.on("bar_move_requested", (p) => cbRef.current.onBarMoveRequested?.(p));
    timeline.on("bar_resize_requested", (p) => cbRef.current.onBarResizeRequested?.(p));
    timeline.on("bar_move_rejected", (p) => cbRef.current.onBarMoveRejected?.(p));
    timeline.on("bar_row_changed", (p) => cbRef.current.onBarRowChanged?.(p));
    timeline.on("bar_delete_requested", (p) => cbRef.current.onBarDeleteRequested?.(p));
    timeline.on("view_range_changed", (p) => cbRef.current.onViewRangeChanged?.(p));
    timeline.on("scale_changed", (p) => cbRef.current.onScaleChanged?.(p));
    timeline.on("drag_started", (p) => cbRef.current.onDragStarted?.(p));
    timeline.on("drag_cancelled", (p) => cbRef.current.onDragCancelled?.(p));

    // Resize observer to re-layout bars when the container resizes.
    const resizeObserver = new ResizeObserver(() => {
      // The timeline's render() handles internal width; trigger a re-position.
      if (ref.current) {
        (ref.current as unknown as { updateGridWidth?: () => void }).updateGridWidth?.();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      timeline.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
  }, []);

  // Forward prop changes via setProperty.
  React.useEffect(() => { if (viewStart !== undefined) ref.current?.setProperty("viewStart", viewStart); }, [viewStart]);
  React.useEffect(() => { if (viewEnd !== undefined) ref.current?.setProperty("viewEnd", viewEnd); }, [viewEnd]);
  React.useEffect(() => { if (scale !== undefined) ref.current?.setProperty("scale", scale); }, [scale]);
  React.useEffect(() => { if (showRowHeaders !== undefined) ref.current?.setProperty("showRowHeaders", showRowHeaders); }, [showRowHeaders]);
  React.useEffect(() => { if (rowHeaderWidth !== undefined) ref.current?.setProperty("rowHeaderWidth", rowHeaderWidth); }, [rowHeaderWidth]);
  React.useEffect(() => { if (rowHeight !== undefined) ref.current?.setProperty("rowHeight", rowHeight); }, [rowHeight]);
  React.useEffect(() => { if (barHeight !== undefined) ref.current?.setProperty("barHeight", barHeight); }, [barHeight]);
  React.useEffect(() => { if (barMinWidth !== undefined) ref.current?.setProperty("barMinWidth", barMinWidth); }, [barMinWidth]);
  React.useEffect(() => { if (selectable !== undefined) ref.current?.setProperty("selectable", selectable); }, [selectable]);
  React.useEffect(() => { if (movable !== undefined) ref.current?.setProperty("movable", movable); }, [movable]);
  React.useEffect(() => { if (resizable !== undefined) ref.current?.setProperty("resizable", resizable); }, [resizable]);
  React.useEffect(() => { if (rowMovable !== undefined) ref.current?.setProperty("rowMovable", rowMovable); }, [rowMovable]);
  React.useEffect(() => { if (snapInterval !== undefined) ref.current?.setProperty("snapInterval", snapInterval); }, [snapInterval]);
  React.useEffect(() => { if (showGrid !== undefined) ref.current?.setProperty("showGrid", showGrid); }, [showGrid]);
  React.useEffect(() => { if (showToday !== undefined) ref.current?.setProperty("showToday", showToday); }, [showToday]);
  React.useEffect(() => { if (showAxis !== undefined) ref.current?.setProperty("showAxis", showAxis); }, [showAxis]);
  React.useEffect(() => { if (readOnly !== undefined) ref.current?.setProperty("readOnly", readOnly); }, [readOnly]);
  React.useEffect(() => { if (disabled !== undefined) ref.current?.setProperty("disabled", disabled); }, [disabled]);
  React.useEffect(() => { if (progressEnabled !== undefined) ref.current?.setProperty("progressEnabled", progressEnabled); }, [progressEnabled]);
  React.useEffect(() => { if (minDuration !== undefined) ref.current?.setProperty("minDuration", minDuration); }, [minDuration]);
  React.useEffect(() => { if (templateId !== undefined) ref.current?.setProperty("templateId", templateId); }, [templateId]);

  // items / rows: replace when the array reference changes
  React.useEffect(() => {
    if (items !== undefined) ref.current?.setItems(items);
  }, [items]);
  React.useEffect(() => {
    if (rows !== undefined) ref.current?.setRows(rows);
  }, [rows]);

  return <div ref={containerRef} className={className} />;
}
