"use client";

import * as React from "react";
import { SmartContextMenu, type SmartContextMenuOptions } from "@/lib/components/smart-context-menu";

export type { SmartContextMenuOptions };

export interface SmartContextMenuReactProps {
  /** Command IDs to render as menu items. */
  commandIds: string[];
  /** Optional title shown in the menu header. */
  title?: string;
  /** Fired when the user selects a command. */
  onSelect?: (commandId: string) => void;
  /** Fired when the menu is hidden (escape, click outside, or selection). */
  onHide?: () => void;
  /** Class name applied to the container element (which is also the bounds). */
  className?: string;
  /** Children rendered inside the container (e.g. the live canvas content). */
  children?: React.ReactNode;
  /** Exposes the vanilla instance for imperative show/hide calls. */
  instanceRef?: React.MutableRefObject<SmartContextMenu | null>;
}

/**
 * React wrapper around the vanilla SmartContextMenu.
 *
 * Renders a `<div>` that serves as both the menu's container and the bounds
 * element. The parent can call `instanceRef.current.show(x, y)` to open the
 * menu at a viewport position, and the menu will auto-position to stay inside
 * this div.
 *
 * The wrapper forwards `commandIds` and `title` prop changes to the
 * imperative API. Callbacks (`onSelect`, `onHide`) are kept in refs so the
 * create-once effect can stay empty.
 */
export function SmartContextMenuReact({
  commandIds,
  title,
  onSelect,
  onHide,
  className,
  children,
  instanceRef,
}: SmartContextMenuReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<SmartContextMenu | null>(null);

  const onSelectRef = React.useRef(onSelect);
  const onHideRef = React.useRef(onHide);
  React.useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  React.useEffect(() => { onHideRef.current = onHide; }, [onHide]);

  // Capture initial props for the create-once effect.
  const initialCommandIdsRef = React.useRef<string[]>(commandIds);
  const initialTitleRef = React.useRef<string | undefined>(title);

  // Create the instance once on mount.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const options: SmartContextMenuOptions = {
      bounds: containerRef.current,
      commandIds: initialCommandIdsRef.current,
      title: initialTitleRef.current,
    };
    const inst = new SmartContextMenu(containerRef.current, options);
    ref.current = inst;
    if (instanceRef) instanceRef.current = inst;

    const selectHandler = (id: string) => onSelectRef.current?.(id);
    const hideHandler = () => onHideRef.current?.();
    inst.on("select", selectHandler);
    inst.on("hide", hideHandler);

    return () => {
      inst.off("select", selectHandler);
      inst.off("hide", hideHandler);
      inst.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
    // Intentionally empty deps — created once on mount.
  }, []);

  // Forward prop changes.
  const commandIdsKey = commandIds.join(",");
  React.useEffect(() => {
    ref.current?.setCommandIds(commandIds);
  }, [commandIdsKey]);

  React.useEffect(() => {
    ref.current?.setTitle(title);
  }, [title]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
