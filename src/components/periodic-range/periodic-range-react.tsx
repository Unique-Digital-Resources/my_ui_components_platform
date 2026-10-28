"use client";

import * as React from "react";
import {
  PeriodicRange,
  type PeriodicRangeOrientation,
  type PeriodicRangeOptions,
  type PeriodicRangeValue,
} from "@/lib/components/periodic-range";

export type { PeriodicRangeOrientation, PeriodicRangeValue };

export interface PeriodicRangeReactProps {
  min?: number;
  max?: number;
  valueMin?: number;
  valueMax?: number;
  step?: number;
  showMarkers?: boolean;
  markerStep?: number;
  orientation?: PeriodicRangeOrientation;
  thickness?: number;
  length?: number;
  onInput?: (v: PeriodicRangeValue) => void;
  onChange?: (v: PeriodicRangeValue) => void;
  className?: string;
  /** Imperative access to the underlying vanilla instance. */
  instanceRef?: React.MutableRefObject<PeriodicRange | null>;
}

/**
 * React wrapper around the vanilla PeriodicRange. Owns the instance for the
 * lifetime of the mount; forwards prop changes to the imperative API.
 */
export function PeriodicRangeReact({
  min,
  max,
  valueMin,
  valueMax,
  step,
  showMarkers,
  markerStep,
  orientation = "horizontal",
  thickness = 8,
  length = 280,
  onInput,
  onChange,
  className,
  instanceRef,
}: PeriodicRangeReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<PeriodicRange | null>(null);

  // Keep latest callbacks without re-creating the instance.
  const onInputRef = React.useRef(onInput);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onInputRef.current = onInput;
  }, [onInput]);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create once on mount.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const opts: PeriodicRangeOptions = {
      orientation,
      thickness,
      length,
    };
    if (typeof min === "number") opts.min = min;
    if (typeof max === "number") opts.max = max;
    if (typeof valueMin === "number") opts.valueMin = valueMin;
    if (typeof valueMax === "number") opts.valueMax = valueMax;
    if (typeof step === "number") opts.step = step;
    if (typeof showMarkers === "boolean") opts.showMarkers = showMarkers;
    if (typeof markerStep === "number") opts.markerStep = markerStep;

    const range = new PeriodicRange(containerRef.current, opts);
    ref.current = range;
    if (instanceRef) instanceRef.current = range;

    const inputHandler = (v: PeriodicRangeValue) => onInputRef.current?.(v);
    const changeHandler = (v: PeriodicRangeValue) => onChangeRef.current?.(v);
    range.on("input", inputHandler);
    range.on("change", changeHandler);

    // Emit initial state so consumers can render synchronously.
    onInputRef.current?.({ valueMin: range.getValueMin(), valueMax: range.getValueMax() });

    return () => {
      range.off("input", inputHandler);
      range.off("change", changeHandler);
      range.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
    // Intentionally empty deps — created once on mount.
  }, []);

  // Forward prop changes via the imperative API.
  React.useEffect(() => {
    if (typeof min === "number" && typeof max === "number") {
      ref.current?.setRange(min, max);
    }
  }, [min, max]);
  React.useEffect(() => {
    if (typeof valueMin === "number") ref.current?.setValueMin(valueMin);
  }, [valueMin]);
  React.useEffect(() => {
    if (typeof valueMax === "number") ref.current?.setValueMax(valueMax);
  }, [valueMax]);
  React.useEffect(() => {
    if (typeof step === "number") ref.current?.setStep(step);
  }, [step]);
  React.useEffect(() => {
    if (typeof showMarkers === "boolean") ref.current?.setShowMarkers(showMarkers);
  }, [showMarkers]);
  React.useEffect(() => {
    if (typeof markerStep === "number") ref.current?.setMarkerStep(markerStep);
  }, [markerStep]);
  React.useEffect(() => {
    ref.current?.setOrientation(orientation);
  }, [orientation]);
  React.useEffect(() => {
    ref.current?.setThickness(thickness);
  }, [thickness]);
  React.useEffect(() => {
    ref.current?.setLength(length);
  }, [length]);

  return <div ref={containerRef} className={className} />;
}
