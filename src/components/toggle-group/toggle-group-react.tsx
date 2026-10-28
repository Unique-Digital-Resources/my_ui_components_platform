"use client";

import * as React from "react";
import {
  ToggleGroup,
  type ToggleGroupOrientation,
  type ToggleGroupVariant,
  type ToggleGroupSize,
  type ToggleButtonItem,
  type ToggleGroupOptions,
} from "@/lib/components/toggle-group";

export type {
  ToggleGroupOrientation,
  ToggleGroupVariant,
  ToggleGroupSize,
  ToggleButtonItem,
};

export interface ToggleGroupChangePayload {
  items: ToggleButtonItem[];
  selected: string[];
}

export interface ToggleGroupSelectPayload {
  selected: string[];
  item: ToggleButtonItem;
}

export interface ToggleGroupReorderPayload {
  items: ToggleButtonItem[];
}

export interface ToggleGroupClosePayload {
  id: string;
  items: ToggleButtonItem[];
}

export interface ToggleGroupReactProps {
  items?: ToggleButtonItem[];
  multiselect?: boolean;
  closable?: boolean;
  reorderable?: boolean;
  orientation?: ToggleGroupOrientation;
  variant?: ToggleGroupVariant;
  size?: ToggleGroupSize;
  onChange?: (data: ToggleGroupChangePayload) => void;
  onSelect?: (data: ToggleGroupSelectPayload) => void;
  onReorder?: (data: ToggleGroupReorderPayload) => void;
  onClose?: (data: ToggleGroupClosePayload) => void;
  className?: string;
  instanceRef?: React.MutableRefObject<ToggleGroup | null>;
}

/**
 * React wrapper around the vanilla ToggleGroup. Owns the instance for the
 * lifetime of the mount; forwards prop changes to the imperative API.
 *
 * Items are owned by the vanilla instance; this wrapper forwards user-driven
 * changes (select / close / reorder) up via the onChange callback. To update
 * items from outside (e.g. from a property inspector), call setItems() on the
 * instance via the instanceRef.
 */
export function ToggleGroupReact({
  items,
  multiselect = false,
  closable = false,
  reorderable = false,
  orientation = "horizontal",
  variant = "outline",
  size = "md",
  onChange,
  onSelect,
  onReorder,
  onClose,
  className,
  instanceRef,
}: ToggleGroupReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<ToggleGroup | null>(null);

  // Keep the latest callbacks in refs so the create-once effect can stay empty.
  const onChangeRef = React.useRef(onChange);
  const onSelectRef = React.useRef(onSelect);
  const onReorderRef = React.useRef(onReorder);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  React.useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  React.useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Initial items snapshot — captured once at mount.
  const initialItemsRef = React.useRef<ToggleButtonItem[] | undefined>(items);

  // Create the instance once on mount.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const opts: ToggleGroupOptions = {
      multiselect,
      closable,
      reorderable,
      orientation,
      variant,
      size,
    };
    if (initialItemsRef.current && initialItemsRef.current.length > 0) {
      opts.items = initialItemsRef.current;
    }
    const group = new ToggleGroup(containerRef.current, opts);
    ref.current = group;
    if (instanceRef) instanceRef.current = group;

    const changeHandler = (data: ToggleGroupChangePayload) => onChangeRef.current?.(data);
    const selectHandler = (data: ToggleGroupSelectPayload) => onSelectRef.current?.(data);
    const reorderHandler = (data: ToggleGroupReorderPayload) => onReorderRef.current?.(data);
    const closeHandler = (data: ToggleGroupClosePayload) => onCloseRef.current?.(data);
    group.on("change", changeHandler);
    group.on("select", selectHandler);
    group.on("reorder", reorderHandler);
    group.on("close", closeHandler);

    // Emit initial state so the parent can sync.
    onChangeRef.current?.({ items: group.getItems(), selected: group.getSelected() });

    return () => {
      group.off("change", changeHandler);
      group.off("select", selectHandler);
      group.off("reorder", reorderHandler);
      group.off("close", closeHandler);
      group.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
    // Intentionally empty deps — created once on mount.
  }, []);

  // Forward prop changes (non-items).
  React.useEffect(() => { ref.current?.setMultiselect(multiselect); }, [multiselect]);
  React.useEffect(() => { ref.current?.setClosable(closable); }, [closable]);
  React.useEffect(() => { ref.current?.setReorderable(reorderable); }, [reorderable]);
  React.useEffect(() => { ref.current?.setOrientation(orientation); }, [orientation]);
  React.useEffect(() => { ref.current?.setVariant(variant); }, [variant]);
  React.useEffect(() => { ref.current?.setSize(size); }, [size]);

  // Forward items prop changes — but only when the caller explicitly swaps the
  // array reference (e.g. when they reset to defaults). This avoids loops with
  // the change-driven state in the playground (which mirrors the instance).
  const itemsKey = items ? JSON.stringify(items) : "";
  React.useEffect(() => {
    if (!ref.current) return;
    if (!items) return;
    // Compare with the instance's current items to avoid redundant setItems.
    const current = ref.current.getItems();
    const currentKey = JSON.stringify(current);
    if (currentKey !== itemsKey) {
      ref.current.setItems(items);
    }
  }, [itemsKey, items]);

  return <div ref={containerRef} className={className} />;
}
