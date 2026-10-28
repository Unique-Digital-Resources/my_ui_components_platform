/**
 * Public entry point for the Color Range component.
 *
 * Usage (vanilla TS):
 *   import { ColorRange } from "@/lib/components/color-range";
 *   const range = new ColorRange(container, { mode: "hue", value: 210 });
 *   range.on("change", ({ value }) => console.log(value));
 */

export { ColorRange } from "./color-range";
export type {
  ColorRangeMode,
  ColorRangeOrientation,
  ColorRangeOptions,
  ColorRangeValueOutput,
  ColorRangeResultColor,
} from "./color-range";
