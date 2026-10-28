"use client";

import * as React from "react";
import {
  ColorRamp,
  type RampOrientation,
  type RampStop,
  type ColorRampOptions,
} from "@/lib/components/color-ramp";

export type { RampOrientation, RampStop };

export interface ColorRampReactProps {
  stops?: { position: number; color: string }[];
  orientation?: RampOrientation;
  thickness?: number;
  length?: number;
  onInput?: (stops: RampStop[]) => void;
  onChange?: (stops: RampStop[]) => void;
  className?: string;
  instanceRef?: React.MutableRefObject<ColorRamp | null>;
}

/**
 * React wrapper around the vanilla ColorRamp. Owns the instance for the
 * lifetime of the mount; forwards prop changes to the imperative API.
 */
export function ColorRampReact({
  stops,
  orientation = "horizontal",
  thickness = 32,
  length = 280,
  onInput,
  onChange,
  className,
  instanceRef,
}: ColorRampReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<ColorRamp | null>(null);

  const onInputRef = React.useRef(onInput);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onInputRef.current = onInput; }, [onInput]);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Create once.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const ramp = new ColorRamp(containerRef.current, {
      stops,
      orientation,
      thickness,
      length,
    });
    ref.current = ramp;
    if (instanceRef) instanceRef.current = ramp;

    const inputHandler = (s: RampStop[]) => onInputRef.current?.(s);
    const changeHandler = (s: RampStop[]) => onChangeRef.current?.(s);
    ramp.on("input", inputHandler);
    ramp.on("change", changeHandler);

    // Emit initial state.
    onInputRef.current?.(ramp.getStops());

    return () => {
      ramp.off("input", inputHandler);
      ramp.off("change", changeHandler);
      ramp.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
    // Intentionally empty deps — created once on mount.
  }, []);

  // Forward prop changes.
  React.useEffect(() => { ref.current?.setOrientation(orientation); }, [orientation]);
  React.useEffect(() => { ref.current?.setThickness(thickness); }, [thickness]);
  React.useEffect(() => { ref.current?.setLength(length); }, [length]);

  return <div ref={containerRef} className={className} />;
}
