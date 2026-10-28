/**
 * Commands module — registry + shortcuts utilities.
 *
 * Commands are declarative actions (ID, label, shortcut, icon, category).
 * They are NOT components. Specific components register the commands they
 * support; the SmartContextMenu and SmartTooltip render command items.
 */

export {
  commandRegistry,
  defineCommand,
  defineCommands,
} from "./registry";
export type { Command, CommandShortcut } from "./registry";

import { defineCommands } from "./registry";

export {
  formatShortcut,
  shortcutParts,
  eventMatchesShortcut,
  findCommandForEvent,
  ShortcutHandler,
} from "./shortcuts";

/**
 * Register the built-in commands for the Workshop platform.
 * Called once on app init. Individual component playgrounds can register
 * additional component-specific commands.
 */
export function registerBuiltinCommands(): void {
  defineCommands([
    // Global
    { id: "global.search", label: "Search", shortcut: { keys: "K", modifiers: ["Meta"] }, icon: "search", category: "Global", description: "Open the search palette" },
    { id: "global.escape", label: "Close / Cancel", shortcut: { keys: "Escape" }, icon: "x", category: "Global", description: "Close the current overlay" },

    // Color Wheel
    { id: "color-wheel.reset", label: "Reset to Defaults", shortcut: { keys: "R", modifiers: ["Shift"] }, icon: "rotate-ccw", category: "Color Wheel" },
    { id: "color-wheel.triangle", label: "Triangle Shape", shortcut: { keys: "1" }, icon: "triangle", category: "Color Wheel" },
    { id: "color-wheel.square", label: "Square Shape", shortcut: { keys: "2" }, icon: "square", category: "Color Wheel" },
    { id: "color-wheel.disk", label: "Disk Shape", shortcut: { keys: "3" }, icon: "circle", category: "Color Wheel" },
    { id: "color-wheel.none", label: "No Inner Shape", shortcut: { keys: "4" }, icon: "circle-slash", category: "Color Wheel" },
    { id: "color-wheel.toggle-rotate", label: "Toggle Rotate Shape", shortcut: { keys: "T" }, icon: "refresh-cw", category: "Color Wheel" },

    // Color Range
    { id: "color-range.hue", label: "Hue Mode", shortcut: { keys: "1" }, icon: "droplet", category: "Color Range" },
    { id: "color-range.lightness", label: "Lightness Mode", shortcut: { keys: "2" }, icon: "sun", category: "Color Range" },
    { id: "color-range.contrast", label: "Contrast Mode", shortcut: { keys: "3" }, icon: "contrast", category: "Color Range" },
    { id: "color-range.alpha", label: "Alpha Mode", shortcut: { keys: "4" }, icon: "blend", category: "Color Range" },

    // Color Circle
    { id: "color-circle.triad", label: "Triad Harmony", shortcut: { keys: "1" }, icon: "triangle", category: "Color Circle" },
    { id: "color-circle.complementary", label: "Complementary Harmony", shortcut: { keys: "2" }, icon: "divide", category: "Color Circle" },
    { id: "color-circle.analogous", label: "Analogous Harmony", shortcut: { keys: "3" }, icon: "shuffle", category: "Color Circle" },
    { id: "color-circle.square", label: "Square Harmony", shortcut: { keys: "4" }, icon: "square", category: "Color Circle" },
    { id: "color-circle.custom", label: "Custom Harmony", shortcut: { keys: "5" }, icon: "brush", category: "Color Circle" },

    // Edit
    { id: "edit.copy", label: "Copy", shortcut: { keys: "C", modifiers: ["Meta"] }, icon: "copy", category: "Edit" },
    { id: "edit.paste", label: "Paste", shortcut: { keys: "V", modifiers: ["Meta"] }, icon: "clipboard", category: "Edit" },
    { id: "edit.duplicate", label: "Duplicate", shortcut: { keys: "D", modifiers: ["Meta"] }, icon: "copy", category: "Edit" },

    // Board — Alignment
    { id: "board.align-left", label: "Align Left", shortcut: { keys: "L", modifiers: ["Shift", "Meta"] }, icon: "align-start-vertical", category: "Board" },
    { id: "board.align-center-h", label: "Align Center (Horizontal)", shortcut: { keys: "E", modifiers: ["Shift", "Meta"] }, icon: "align-center-horizontal", category: "Board" },
    { id: "board.align-right", label: "Align Right", shortcut: { keys: "R", modifiers: ["Shift", "Meta"] }, icon: "align-end-vertical", category: "Board" },
    { id: "board.align-top", label: "Align Top", shortcut: { keys: "T", modifiers: ["Shift", "Meta"] }, icon: "align-start-horizontal", category: "Board" },
    { id: "board.align-center-v", label: "Align Middle (Vertical)", shortcut: { keys: "M", modifiers: ["Shift", "Meta"] }, icon: "align-center-vertical", category: "Board" },
    { id: "board.align-bottom", label: "Align Bottom", shortcut: { keys: "B", modifiers: ["Shift", "Meta"] }, icon: "align-end-horizontal", category: "Board" },

    // Board — Distribution
    { id: "board.distribute-h", label: "Distribute Horizontally", shortcut: { keys: "H", modifiers: ["Shift", "Meta"] }, icon: "align-horizontal-distribute-center", category: "Board" },
    { id: "board.distribute-v", label: "Distribute Vertically", shortcut: { keys: "J", modifiers: ["Shift", "Meta"] }, icon: "align-vertical-distribute-center", category: "Board" },

    // Board — Fit
    { id: "board.fit-all", label: "Zoom to Fit All", shortcut: { keys: "0", modifiers: ["Meta"] }, icon: "maximize", category: "Board" },
    { id: "board.fit-selection", label: "Zoom to Fit Selection", shortcut: { keys: "0", modifiers: ["Shift", "Meta"] }, icon: "scan", category: "Board" },

    // Board — Shapes
    { id: "board.add-circle", label: "Add Circle", shortcut: { keys: "1" }, icon: "circle", category: "Board" },
    { id: "board.add-rect", label: "Add Rectangle", shortcut: { keys: "2" }, icon: "square", category: "Board" },
    { id: "board.add-triangle", label: "Add Triangle", shortcut: { keys: "3" }, icon: "triangle", category: "Board" },
    { id: "board.delete-selected", label: "Delete Selected", shortcut: { keys: "Delete" }, icon: "trash", category: "Board" },
  ]);
}
