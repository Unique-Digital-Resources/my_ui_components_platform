"use client";

import * as React from "react";
import {
  KanbanBoard,
  type KanbanItem,
  type KanbanColumn,
  type KanbanOptions,
  type KanbanEventPayload,
  type KanbanMode,
  type KanbanLayout,
  type KanbanCardLayout,
} from "@/lib/components/kanban";

export type {
  KanbanItem,
  KanbanColumn,
  KanbanOptions,
  KanbanEventPayload,
  KanbanMode,
  KanbanLayout,
  KanbanCardLayout,
};

export interface KanbanReactProps {
  items?: KanbanItem[];
  columns?: KanbanColumn[];
  mode?: KanbanMode;
  layout?: KanbanLayout;
  cardLayout?: KanbanCardLayout;
  dragEnabled?: boolean;
  reorderWithinColumn?: boolean;
  moveBetweenColumns?: boolean;
  showCardBorder?: boolean;
  showItemCount?: boolean;
  selectable?: boolean;
  columnWidth?: number;
  cardGap?: number;
  columnGap?: number;
  allowEmptyColumns?: boolean;
  showDropPreview?: boolean;
  /** Content template ID (see src/lib/templates/). Defaults to "kanban.standard-task". */
  templateId?: string;
  onItemSelected?: (p: KanbanEventPayload) => void;
  onSelectionChanged?: (p: KanbanEventPayload) => void;
  onItemActivated?: (p: KanbanEventPayload) => void;
  onItemCreateRequested?: (p: KanbanEventPayload) => void;
  onItemMoved?: (p: KanbanEventPayload) => void;
  onItemMoveRejected?: (p: KanbanEventPayload) => void;
  onItemReordered?: (p: KanbanEventPayload) => void;
  onItemDeleteRequested?: (p: KanbanEventPayload) => void;
  onDragStarted?: (p: KanbanEventPayload) => void;
  onDragCancelled?: (p: KanbanEventPayload) => void;
  onDropTargetChanged?: (p: KanbanEventPayload) => void;
  onColumnSelected?: (p: KanbanEventPayload) => void;
  className?: string;
  instanceRef?: React.MutableRefObject<KanbanBoard | null>;
}

export function KanbanReact({
  items,
  columns,
  mode,
  layout,
  cardLayout,
  dragEnabled,
  reorderWithinColumn,
  moveBetweenColumns,
  showCardBorder,
  showItemCount,
  selectable,
  columnWidth,
  cardGap,
  columnGap,
  allowEmptyColumns,
  showDropPreview,
  templateId,
  onItemSelected,
  onSelectionChanged,
  onItemActivated,
  onItemCreateRequested,
  onItemMoved,
  onItemMoveRejected,
  onItemReordered,
  onItemDeleteRequested,
  onDragStarted,
  onDragCancelled,
  onDropTargetChanged,
  onColumnSelected,
  className,
  instanceRef,
}: KanbanReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<KanbanBoard | null>(null);

  // Keep callback refs stable so we don't re-attach listeners on every render.
  const cbRef = React.useRef({
    onItemSelected,
    onSelectionChanged,
    onItemActivated,
    onItemCreateRequested,
    onItemMoved,
    onItemMoveRejected,
    onItemReordered,
    onItemDeleteRequested,
    onDragStarted,
    onDragCancelled,
    onDropTargetChanged,
    onColumnSelected,
  });
  React.useEffect(() => {
    cbRef.current = {
      onItemSelected,
      onSelectionChanged,
      onItemActivated,
      onItemCreateRequested,
      onItemMoved,
      onItemMoveRejected,
      onItemReordered,
      onItemDeleteRequested,
      onDragStarted,
      onDragCancelled,
      onDropTargetChanged,
      onColumnSelected,
    };
  });

  // Initial items/columns captured so the create-once effect doesn't depend on them.
  const initialItemsRef = React.useRef(items);
  const initialColumnsRef = React.useRef(columns);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const opts: KanbanOptions = {
      items: initialItemsRef.current ?? [],
      columns: initialColumnsRef.current ?? [],
      mode,
      layout,
      cardLayout,
      dragEnabled,
      reorderWithinColumn,
      moveBetweenColumns,
      showCardBorder,
      showItemCount,
      selectable,
      columnWidth,
      cardGap,
      columnGap,
      allowEmptyColumns,
      showDropPreview,
      templateId,
    };
    const board = new KanbanBoard(containerRef.current, opts);
    ref.current = board;
    if (instanceRef) instanceRef.current = board;

    board.on("item_selected", (p) => cbRef.current.onItemSelected?.(p));
    board.on("selection_changed", (p) => cbRef.current.onSelectionChanged?.(p));
    board.on("item_activated", (p) => cbRef.current.onItemActivated?.(p));
    board.on("item_create_requested", (p) => cbRef.current.onItemCreateRequested?.(p));
    board.on("item_moved", (p) => cbRef.current.onItemMoved?.(p));
    board.on("item_move_rejected", (p) => cbRef.current.onItemMoveRejected?.(p));
    board.on("item_reordered", (p) => cbRef.current.onItemReordered?.(p));
    board.on("item_delete_requested", (p) => cbRef.current.onItemDeleteRequested?.(p));
    board.on("drag_started", (p) => cbRef.current.onDragStarted?.(p));
    board.on("drag_cancelled", (p) => cbRef.current.onDragCancelled?.(p));
    board.on("drop_target_changed", (p) => cbRef.current.onDropTargetChanged?.(p));
    board.on("column_selected", (p) => cbRef.current.onColumnSelected?.(p));

    return () => {
      board.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
  }, []);

  // Forward prop changes via setProperty. Each effect compares to undefined so
  // that omitted props don't stomp the board's internal default.
  React.useEffect(() => { if (mode !== undefined) ref.current?.setProperty("mode", mode); }, [mode]);
  React.useEffect(() => { if (layout !== undefined) ref.current?.setProperty("layout", layout); }, [layout]);
  React.useEffect(() => { if (cardLayout !== undefined) ref.current?.setProperty("cardLayout", cardLayout); }, [cardLayout]);
  React.useEffect(() => { if (dragEnabled !== undefined) ref.current?.setProperty("dragEnabled", dragEnabled); }, [dragEnabled]);
  React.useEffect(() => { if (reorderWithinColumn !== undefined) ref.current?.setProperty("reorderWithinColumn", reorderWithinColumn); }, [reorderWithinColumn]);
  React.useEffect(() => { if (moveBetweenColumns !== undefined) ref.current?.setProperty("moveBetweenColumns", moveBetweenColumns); }, [moveBetweenColumns]);
  React.useEffect(() => { if (showCardBorder !== undefined) ref.current?.setProperty("showCardBorder", showCardBorder); }, [showCardBorder]);
  React.useEffect(() => { if (showItemCount !== undefined) ref.current?.setProperty("showItemCount", showItemCount); }, [showItemCount]);
  React.useEffect(() => { if (selectable !== undefined) ref.current?.setProperty("selectable", selectable); }, [selectable]);
  React.useEffect(() => { if (columnWidth !== undefined) ref.current?.setProperty("columnWidth", columnWidth); }, [columnWidth]);
  React.useEffect(() => { if (cardGap !== undefined) ref.current?.setProperty("cardGap", cardGap); }, [cardGap]);
  React.useEffect(() => { if (columnGap !== undefined) ref.current?.setProperty("columnGap", columnGap); }, [columnGap]);
  React.useEffect(() => { if (allowEmptyColumns !== undefined) ref.current?.setProperty("allowEmptyColumns", allowEmptyColumns); }, [allowEmptyColumns]);
  React.useEffect(() => { if (showDropPreview !== undefined) ref.current?.setProperty("showDropPreview", showDropPreview); }, [showDropPreview]);
  React.useEffect(() => { if (templateId !== undefined) ref.current?.setProperty("templateId", templateId); }, [templateId]);

  // items / columns: replace when the array reference changes (controlled by parent)
  React.useEffect(() => {
    if (items !== undefined) ref.current?.setItems(items);
  }, [items]);
  React.useEffect(() => {
    if (columns !== undefined) ref.current?.setColumns(columns);
  }, [columns]);

  return <div ref={containerRef} className={className} />;
}
