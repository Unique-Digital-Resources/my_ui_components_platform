"use client";

import * as React from "react";
import {
  ColorRange,
  type ColorRangeMode,
  type ColorRangeOrientation,
  type ColorRangeOptions,
  type ColorRangeValueOutput,
} from "@/lib/components/color-range";

export type { ColorRangeMode, ColorRangeOrientation, ColorRangeValueOutput };

export interface ColorRangeReactProps {
  mode?: ColorRangeMode;
  value?: number;
  color?: string;
  orientation?: ColorRangeOrientation;
  thickness?: number;
  length?: number;
  onInput?: (v: ColorRangeValueOutput) => void;
  onChange?: (v: ColorRangeValueOutput) => void;
  className?: string;
  instanceRef?: React.MutableRefObject<ColorRange | null>;
}

/**
 * React wrapper around the vanilla ColorRange. Owns the instance for the
 * lifetime of the mount; forwards prop changes to the imperative API.
 */
export function ColorRangeReact({
  mode = "hue",
  value,
  color,
  orientation = "horizontal",
  thickness = 16,
  length = 260,
  onInput,
  onChange,
  className,
  instanceRef,
}: ColorRangeReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<ColorRange | null>(null);

  const onInputRef = React.useRef(onInput);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onInputRef.current = onInput; }, [onInput]);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Create once.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const range = new ColorRange(containerRef.current, {
      mode,
      value,
      color,
      orientation,
      thickness,
      length,
    });
    ref.current = range;
    if (instanceRef) instanceRef.current = range;

    const inputHandler = (v: ColorRangeValueOutput) => onInputRef.current?.(v);
    const changeHandler = (v: ColorRangeValueOutput) => onChangeRef.current?.(v);
    range.on("input", inputHandler);
    range.on("change", changeHandler);

    return () => {
      range.off("input", inputHandler);
      range.off("change", changeHandler);
      range.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
    // Intentionally empty deps — created once on mount.
  }, []);

  // Forward prop changes.
  React.useEffect(() => { ref.current?.setMode(mode); }, [mode]);
  React.useEffect(() => { if (typeof value === "number") ref.current?.setValue(value); }, [value]);
  React.useEffect(() => { if (typeof color === "string") ref.current?.setColor(color); }, [color]);
  React.useEffect(() => { ref.current?.setOrientation(orientation); }, [orientation]);
  React.useEffect(() => { ref.current?.setThickness(thickness); }, [thickness]);
  React.useEffect(() => { ref.current?.setLength(length); }, [length]);

  return <div ref={containerRef} className={className} />;
}
