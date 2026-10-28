/**
 * Public entry point for the Periodic Range component.
 *
 * Usage (vanilla TS):
 *   import { PeriodicRange } from "@/lib/components/periodic-range";
 *   const range = new PeriodicRange(container, { min: 0, max: 100, valueMin: 25, valueMax: 75 });
 *   range.on("change", ({ valueMin, valueMax }) => console.log(valueMin, valueMax));
 */

export { PeriodicRange } from "./periodic-range";
export type {
  PeriodicRangeOrientation,
  PeriodicRangeOptions,
  PeriodicRangeValue,
} from "./periodic-range";
