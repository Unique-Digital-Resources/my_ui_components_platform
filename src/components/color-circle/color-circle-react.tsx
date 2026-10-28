"use client";

import * as React from "react";
import {
  ColorCircle,
  type HarmonyRule,
  type GridMode,
  type ColorCircleOptions,
  type ColorCircleOutput,
} from "@/lib/components/color-circle";

export type { HarmonyRule, GridMode, ColorCircleOutput };

export interface ColorCircleReactProps {
  harmony?: HarmonyRule;
  baseHue?: number;
  size?: number;
  snapping?: boolean;
  gridMode?: GridMode;
  gridDivisions?: number;
  showHarmonyLinks?: boolean;
  onInput?: (out: ColorCircleOutput) => void;
  onChange?: (out: ColorCircleOutput) => void;
  className?: string;
  /** Ref to the imperative ColorCircle instance (for addColor/removeColor/setBaseIndex). */
  instanceRef?: React.MutableRefObject<ColorCircle | null>;
}

/**
 * React wrapper around the vanilla ColorCircle. Owns the instance for the
 * lifetime of the mount; forwards prop changes to the imperative API.
 * Exposes the instance via instanceRef for imperative calls (addColor, etc.).
 */
export function ColorCircleReact({
  harmony = "triad",
  baseHue = 210,
  size = 240,
  snapping = false,
  gridMode = "dots",
  gridDivisions = 12,
  showHarmonyLinks = true,
  onInput,
  onChange,
  className,
  instanceRef,
}: ColorCircleReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<ColorCircle | null>(null);

  const onInputRef = React.useRef(onInput);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onInputRef.current = onInput; }, [onInput]);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Create once.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const circle = new ColorCircle(containerRef.current, {
      harmony,
      baseHue,
      size,
      snapping,
      gridMode,
      gridDivisions,
      showHarmonyLinks,
    });
    ref.current = circle;
    if (instanceRef) instanceRef.current = circle;

    const inputHandler = (o: ColorCircleOutput) => onInputRef.current?.(o);
    const changeHandler = (o: ColorCircleOutput) => onChangeRef.current?.(o);
    circle.on("input", inputHandler);
    circle.on("change", changeHandler);

    // Emit the initial state so the playground shows the palette on mount.
    const initialOut = circle.getOutput();
    onInputRef.current?.(initialOut);

    return () => {
      circle.off("input", inputHandler);
      circle.off("change", changeHandler);
      circle.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
    // Intentionally empty deps — created once on mount.
  }, []);

  // Forward prop changes.
  React.useEffect(() => { ref.current?.setHarmony(harmony); }, [harmony]);
  React.useEffect(() => { ref.current?.setSnapping(snapping); }, [snapping]);
  React.useEffect(() => { ref.current?.setGridMode(gridMode); }, [gridMode]);
  React.useEffect(() => { ref.current?.setGridDivisions(gridDivisions); }, [gridDivisions]);
  React.useEffect(() => { ref.current?.setShowHarmonyLinks(showHarmonyLinks); }, [showHarmonyLinks]);
  React.useEffect(() => { ref.current?.setSize(size); }, [size]);

  return <div ref={containerRef} className={className} />;
}
