/**
 * Public entry point for the Color Wheel Picker component.
 *
 * Usage (vanilla TS):
 *   import { ColorWheelPicker } from "@/lib/components/color-wheel";
 *   const picker = new ColorWheelPicker(container, { shape: "triangle" });
 *   picker.on("change", (color) => console.log(color.hex));
 *
 * A React wrapper will be provided separately (Task 4).
 */

export { ColorWheelPicker } from "./color-wheel-picker";
export type { Shape, ColorPickerOptions } from "./color-wheel-picker";

export type {
  RGB,
  HSV,
  HSL,
  ColorOutput,
  ColorInput,
} from "./color-utils";

export {
  clamp,
  clampHue,
  hsvToRgb,
  rgbToHsv,
  rgbToHex,
  hexToRgb,
  hsvToHsl,
  hslToHsv,
  parseColor,
  formatHex,
  toColorOutput,
} from "./color-utils";
