"use client";

import * as React from "react";
import {
  ColorWheelPicker,
  type Shape,
  type ColorOutput,
  type ColorPickerOptions,
} from "@/lib/components/color-wheel";

export type { Shape, ColorOutput };

export interface ColorWheelPickerReactProps
  extends Omit<
    ColorPickerOptions,
    | "shape"
    | "size"
    | "wheelThickness"
    | "wheelSpacing"
    | "hue"
    | "color"
    | "rotateShape"
  > {
  shape?: Shape;
  size?: number;
  wheelThickness?: number;
  wheelSpacing?: number;
  hue?: number;
  color?: string;
  rotateShape?: boolean;
  onInput?: (color: ColorOutput) => void;
  onChange?: (color: ColorOutput) => void;
  className?: string;
}

/**
 * React wrapper around the vanilla ColorWheelPicker.
 *
 * The wrapper owns the component instance for the lifetime of the mounted
 * node. It forwards prop changes to the imperative API and forwards events
 * to the provided callbacks. It does not re-create the component on every
 * prop change — it calls setShape/setSize/setColor as needed.
 */
export function ColorWheelPickerReact({
  shape = "triangle",
  size = 180,
  wheelThickness = 24,
  wheelSpacing = 8,
  hue,
  color,
  rotateShape = false,
  onInput,
  onChange,
  className,
}: ColorWheelPickerReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pickerRef = React.useRef<ColorWheelPicker | null>(null);

  // Keep the latest callbacks in refs so we don't re-create the picker
  // when only the callbacks change.
  const onInputRef = React.useRef(onInput);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onInputRef.current = onInput;
  }, [onInput]);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create the picker once.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const picker = new ColorWheelPicker(containerRef.current, {
      shape,
      size,
      wheelThickness,
      wheelSpacing,
      hue,
      color,
      rotateShape,
    });
    pickerRef.current = picker;

    const inputHandler = (c: ColorOutput) => onInputRef.current?.(c);
    const changeHandler = (c: ColorOutput) => onChangeRef.current?.(c);
    picker.on("input", inputHandler);
    picker.on("change", changeHandler);

    return () => {
      picker.off("input", inputHandler);
      picker.off("change", changeHandler);
      picker.destroy();
      pickerRef.current = null;
    };
    // Intentionally empty deps — the picker is created once on mount.
  }, []);

  // Forward prop changes to the imperative API.
  React.useEffect(() => {
    pickerRef.current?.setShape(shape);
  }, [shape]);

  React.useEffect(() => {
    pickerRef.current?.setSize(size);
  }, [size]);

  React.useEffect(() => {
    pickerRef.current?.setWheelThickness(wheelThickness);
  }, [wheelThickness]);

  React.useEffect(() => {
    pickerRef.current?.setWheelSpacing(wheelSpacing);
  }, [wheelSpacing]);

  React.useEffect(() => {
    pickerRef.current?.setRotateShape(rotateShape);
  }, [rotateShape]);

  React.useEffect(() => {
    if (typeof hue === "number") pickerRef.current?.setHue(hue);
  }, [hue]);

  React.useEffect(() => {
    if (typeof color === "string") pickerRef.current?.setColor(color);
  }, [color]);

  return (
    <div
      ref={containerRef}
      className={className}
      // The picker injects its own canvas; this div is just a mount point.
    />
  );
}
