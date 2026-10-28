"use client";

import * as React from "react";
import {
  SmartTooltip,
  type SmartTooltipOptions,
  type SmartTooltipPosition,
} from "@/lib/components/smart-tooltip";

export type { SmartTooltipOptions, SmartTooltipPosition };

export interface SmartTooltipReactProps {
  /** Command ID to display. */
  commandId: string;
  /** Position relative to the target. Default "top". */
  position?: SmartTooltipPosition;
  /** Class name applied to the container element (which is also the bounds). */
  className?: string;
  /** Children rendered inside the container (e.g. the live canvas content). */
  children?: React.ReactNode;
  /** Exposes the vanilla instance for imperative attachTo/show/hide calls. */
  instanceRef?: React.MutableRefObject<SmartTooltip | null>;
}

/**
 * React wrapper around the vanilla SmartTooltip.
 *
 * Renders a `<div>` that serves as both the tooltip's container and the
 * bounds element. The parent calls `instanceRef.current.attachTo(target)`
 * to bind the tooltip to a specific child element (e.g. via a ref callback
 * or an effect that queries DOM nodes).
 *
 * The wrapper forwards `commandId` and `position` prop changes to the
 * imperative API.
 */
export function SmartTooltipReact({
  commandId,
  position = "top",
  className,
  children,
  instanceRef,
}: SmartTooltipReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<SmartTooltip | null>(null);

  // Capture initial props for the create-once effect.
  const initialCommandIdRef = React.useRef(commandId);
  const initialPositionRef = React.useRef<SmartTooltipPosition>(position);

  // Create the instance once on mount.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const options: SmartTooltipOptions = {
      bounds: containerRef.current,
      commandId: initialCommandIdRef.current,
      position: initialPositionRef.current,
    };
    const inst = new SmartTooltip(containerRef.current, options);
    ref.current = inst;
    if (instanceRef) instanceRef.current = inst;
    return () => {
      inst.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
    // Intentionally empty deps — created once on mount.
  }, []);

  // Forward prop changes.
  React.useEffect(() => {
    ref.current?.setCommandId(commandId);
  }, [commandId]);

  React.useEffect(() => {
    ref.current?.setPosition(position);
  }, [position]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
