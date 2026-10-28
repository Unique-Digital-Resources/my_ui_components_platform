"use client";

import * as React from "react";
import {
  Board,
  type BoardItem,
  type BoardView,
  type BoardOptions,
  type GridMode,
  type TransformMode,
  type LatticeDisplay,
  type PivotPosition,
} from "@/lib/components/board";

export type { BoardItem, BoardView, BoardOptions, GridMode, TransformMode, LatticeDisplay, PivotPosition };

/** Event payloads emitted by the Board. */
export interface BoardSelectionEvent {
  ids: string[];
}
export type BoardChangeEvent = { type: string; [k: string]: unknown };

export interface BoardReactProps {
  /** Grid mode (initial + forwarded). */
  gridMode?: GridMode;
  /** Base grid size in board units (initial + forwarded). */
  gridSize?: number;
  /** Sub-grid divisions per cell (initial + forwarded). */
  subGridDivisions?: number;
  /** Snap to grid (initial + forwarded). */
  snapToGrid?: boolean;
  /** Snap to other items (initial + forwarded). */
  snapToItems?: boolean;
  /** Transform mode (initial + forwarded). Default "global". */
  transformMode?: TransformMode;
  /** Lattice display mode (initial + forwarded). Default "local". */
  latticeDisplay?: LatticeDisplay;
  /** Selection pivot position (initial + forwarded). Default "center". */
  selectionPivot?: PivotPosition;
  /** Background color (initial only). */
  background?: string;
  /** Class name applied to the container element. */
  className?: string;
  /** Inline style for the container (use to set a fixed height). */
  style?: React.CSSProperties;
  /** Fires when the selection changes. */
  onSelection?: (e: BoardSelectionEvent) => void;
  /** Fires when the items change (add/remove/move/align/distribute/nudge). */
  onChange?: (e: BoardChangeEvent) => void;
  /** Fires when the view (pan/zoom) changes. */
  onView?: (view: BoardView) => void;
  /** Exposes the vanilla instance for imperative calls. */
  instanceRef?: React.MutableRefObject<Board | null>;
}

/**
 * React wrapper around the vanilla Board canvas component.
 *
 * The Board renders its own <canvas> inside the container element. The
 * container MUST have a fixed height (e.g. `h-[500px]` or `flex-1` inside
 * a flex column) — without it the canvas will be 0px tall.
 *
 * Initial options are captured on mount and passed to the constructor.
 * Subsequent prop changes are forwarded to the imperative API
 * (setGridMode / setGridSize / setSubGridDivisions / setSnapToGrid /
 * setSnapToItems). Callbacks are kept in refs so the create-once effect
 * stays empty.
 */
export function BoardReact({
  gridMode = "dots",
  gridSize = 40,
  subGridDivisions = 4,
  snapToGrid = false,
  snapToItems = false,
  transformMode = "global",
  latticeDisplay = "local",
  selectionPivot = "center",
  background,
  className,
  style,
  onSelection,
  onChange,
  onView,
  instanceRef,
}: BoardReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<Board | null>(null);

  // Capture initial props for the create-once effect.
  const initialPropsRef = React.useRef({
    gridMode,
    gridSize,
    subGridDivisions,
    snapToGrid,
    snapToItems,
    transformMode,
    latticeDisplay,
    selectionPivot,
    background,
  });

  // Keep the latest callbacks in refs so the create-once effect's
  // event subscriptions always invoke the freshest handler. Updated via
  // effects (not during render) to satisfy the React Compiler's
  // "no ref writes during render" rule.
  const onSelectionRef = React.useRef(onSelection);
  const onChangeRef = React.useRef(onChange);
  const onViewRef = React.useRef(onView);
  React.useEffect(() => { onSelectionRef.current = onSelection; }, [onSelection]);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  React.useEffect(() => { onViewRef.current = onView; }, [onView]);

  // Create the instance once on mount.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const opts: BoardOptions = {
      gridMode: initialPropsRef.current.gridMode,
      gridSize: initialPropsRef.current.gridSize,
      subGridDivisions: initialPropsRef.current.subGridDivisions,
      snapToGrid: initialPropsRef.current.snapToGrid,
      snapToItems: initialPropsRef.current.snapToItems,
      transformMode: initialPropsRef.current.transformMode,
      latticeDisplay: initialPropsRef.current.latticeDisplay,
      selectionPivot: initialPropsRef.current.selectionPivot,
      background: initialPropsRef.current.background,
    };
    const inst = new Board(containerRef.current, opts);
    ref.current = inst;
    if (instanceRef) instanceRef.current = inst;

    const handleSelection = (data: unknown) => {
      const payload = data as { ids: string[] };
      onSelectionRef.current?.({ ids: payload.ids ?? [] });
    };
    const handleChange = (data: unknown) => {
      onChangeRef.current?.(data as BoardChangeEvent);
    };
    const handleView = (data: unknown) => {
      onViewRef.current?.(data as BoardView);
    };
    inst.on("selection", handleSelection);
    inst.on("change", handleChange);
    inst.on("view", handleView);

    return () => {
      inst.off("selection", handleSelection);
      inst.off("change", handleChange);
      inst.off("view", handleView);
      inst.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
    // Intentionally empty deps — created once on mount.
  }, []);

  // Forward prop changes.
  React.useEffect(() => {
    ref.current?.setGridMode(gridMode);
  }, [gridMode]);

  React.useEffect(() => {
    ref.current?.setGridSize(gridSize);
  }, [gridSize]);

  React.useEffect(() => {
    ref.current?.setSubGridDivisions(subGridDivisions);
  }, [subGridDivisions]);

  React.useEffect(() => {
    ref.current?.setSnapToGrid(snapToGrid);
  }, [snapToGrid]);

  React.useEffect(() => {
    ref.current?.setSnapToItems(snapToItems);
  }, [snapToItems]);

  React.useEffect(() => {
    ref.current?.setTransformMode(transformMode);
  }, [transformMode]);

  React.useEffect(() => {
    ref.current?.setLatticeDisplay(latticeDisplay);
  }, [latticeDisplay]);

  React.useEffect(() => {
    ref.current?.setSelectionPivot(selectionPivot);
  }, [selectionPivot]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      // The Board class adds .board-root (position: relative) on mount,
      // but setting it here too avoids a flash and documents the contract.
      data-board-container=""
    />
  );
}
