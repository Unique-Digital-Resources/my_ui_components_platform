/**
 * Shortcut utilities — match keyboard events to commands.
 *
 * Provides:
 *   - `formatShortcut(shortcut)` — human-readable string, e.g. "⇧R" or "⌘⇧R"
 *   - `eventMatchesShortcut(event, shortcut)` — check if a KeyboardEvent matches
 *   - `findCommandForEvent(event, commands?)` — find the command whose shortcut matches
 *   - `ShortcutHandler` — a class that listens for keyboard events globally
 *     and fires callbacks when registered shortcuts are pressed
 */

import type { Command, CommandShortcut } from "./registry";
import { commandRegistry } from "./registry";

/** Modifier key display symbols. */
const MODIFIER_SYMBOLS: Record<string, string> = {
  Control: "⌃",
  Shift: "⇧",
  Alt: "⌥",
  Meta: "⌘",
};

/** Normalize a key for comparison (uppercase single chars, keep named keys). */
function normalizeKey(key: string): string {
  if (key.length === 1) return key.toUpperCase();
  return key;
}

/** Format a shortcut into a human-readable string, e.g. "⇧⌘R". */
export function formatShortcut(shortcut: CommandShortcut): string {
  const parts: string[] = [];
  if (shortcut.modifiers) {
    for (const mod of shortcut.modifiers) {
      parts.push(MODIFIER_SYMBOLS[mod] ?? mod);
    }
  }
  parts.push(normalizeKey(shortcut.keys));
  return parts.join("");
}

/** Format a shortcut into kbd-style parts for rendering as <kbd> elements. */
export function shortcutParts(shortcut: CommandShortcut): string[] {
  const parts: string[] = [];
  if (shortcut.modifiers) {
    for (const mod of shortcut.modifiers) {
      parts.push(MODIFIER_SYMBOLS[mod] ?? mod);
    }
  }
  parts.push(normalizeKey(shortcut.keys));
  return parts;
}

/** Check if a KeyboardEvent matches a shortcut definition. */
export function eventMatchesShortcut(
  e: KeyboardEvent,
  shortcut: CommandShortcut,
): boolean {
  const key = normalizeKey(e.key);
  if (key !== normalizeKey(shortcut.keys)) return false;

  const mods = shortcut.modifiers ?? [];
  const requiredMod = (m: string) => mods.includes(m);

  // Check each modifier — must match exactly (all required, no extras).
  const ctrlMatch = e.ctrlKey === requiredMod("Control");
  const shiftMatch = e.shiftKey === requiredMod("Shift");
  const altMatch = e.altKey === requiredMod("Alt");
  const metaMatch = e.metaKey === requiredMod("Meta");

  return ctrlMatch && shiftMatch && altMatch && metaMatch;
}

/**
 * Find the command whose shortcut matches a keyboard event.
 * Optionally filter to a specific set of command IDs.
 */
export function findCommandForEvent(
  e: KeyboardEvent,
  commandIds?: string[],
): Command | undefined {
  const commands = commandIds
    ? commandRegistry.byIds(commandIds)
    : commandRegistry.list();
  for (const cmd of commands) {
    if (cmd.shortcut && !cmd.disabled && eventMatchesShortcut(e, cmd.shortcut)) {
      return cmd;
    }
  }
  return undefined;
}

/**
 * ShortcutHandler — attaches a global keydown listener and fires callbacks
 * when registered shortcuts are pressed. Optionally scoped to a set of
 * command IDs.
 *
 * Usage:
 *   const handler = new ShortcutHandler();
 *   handler.on("color.reset", () => picker.reset());
 *   handler.attach();  // start listening
 *   handler.detach();  // stop listening
 *   handler.destroy(); // cleanup
 */
export class ShortcutHandler {
  private callbacks = new Map<string, Set<() => void>>();
  private scopedIds: string[] | null = null;
  private attached = false;
  private readonly _onKeyDown: (e: KeyboardEvent) => void;

  constructor(scopedIds?: string[]) {
    this.scopedIds = scopedIds ?? null;
    this._onKeyDown = this.onKeyDown.bind(this);
  }

  /** Register a callback for a command ID (fired when its shortcut is pressed). */
  on(commandId: string, handler: () => void): void {
    let set = this.callbacks.get(commandId);
    if (!set) {
      set = new Set();
      this.callbacks.set(commandId, set);
    }
    set.add(handler);
  }

  /** Remove a callback. */
  off(commandId: string, handler: () => void): void {
    this.callbacks.get(commandId)?.delete(handler);
  }

  /** Start listening for keyboard events. */
  attach(): void {
    if (this.attached) return;
    window.addEventListener("keydown", this._onKeyDown);
    this.attached = true;
  }

  /** Stop listening. */
  detach(): void {
    if (!this.attached) return;
    window.removeEventListener("keydown", this._onKeyDown);
    this.attached = false;
  }

  /** Cleanup everything. */
  destroy(): void {
    this.detach();
    this.callbacks.clear();
  }

  private onKeyDown(e: KeyboardEvent): void {
    const cmd = findCommandForEvent(e, this.scopedIds ?? undefined);
    if (cmd) {
      const handlers = this.callbacks.get(cmd.id);
      if (handlers && handlers.size > 0) {
        e.preventDefault();
        for (const h of Array.from(handlers)) {
          try { h(); } catch (err) { console.error("Shortcut handler error:", err); }
        }
      }
    }
  }
}
