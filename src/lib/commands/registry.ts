/**
 * Command — a registry-based command system.
 *
 * Commands are NOT components. They are declarative actions with IDs, labels,
 * keyboard shortcuts, and optional icon/category. Specific components register
 * the commands they support; the SmartContextMenu and SmartTooltip render
 * command items with their shortcuts.
 *
 * Usage:
 *   import { commandRegistry, defineCommand } from "@/lib/commands";
 *
 *   defineCommand({
 *     id: "color.reset",
 *     label: "Reset Color",
 *     shortcut: { keys: "R", modifiers: ["Shift"] },
 *     icon: "rotate-ccw",
 *     category: "Color",
 *   });
 *
 *   const cmd = commandRegistry.get("color.reset");
 *   const all = commandRegistry.list();
 *   const colorCmds = commandRegistry.byCategory("Color");
 */

export interface CommandShortcut {
  /** Main key, e.g. "R", "Enter", "Escape", "1". */
  keys: string;
  /** Modifier keys required: "Control", "Shift", "Alt", "Meta". */
  modifiers?: string[];
}

export interface Command {
  /** Unique ID, e.g. "color.reset" or "shape.triangle". */
  id: string;
  /** Display label, e.g. "Reset Color". */
  label: string;
  /** Keyboard shortcut. */
  shortcut?: CommandShortcut;
  /** Icon name (Lucide-style) for display. */
  icon?: string;
  /** Category for grouping, e.g. "Color", "Shape", "Edit". */
  category?: string;
  /** Optional description/tooltip text. */
  description?: string;
  /** Whether the command is currently disabled. */
  disabled?: boolean;
}

/**
 * The command registry — a singleton map of command ID → Command.
 * Components register commands they support; the menu/tooltip query the
 * registry to render items.
 */
class CommandRegistry {
  private commands = new Map<string, Command>();

  /** Register or update a command. */
  register(cmd: Command): void {
    this.commands.set(cmd.id, { ...cmd });
  }

  /** Register multiple commands at once. */
  registerAll(cmds: Command[]): void {
    for (const cmd of cmds) this.register(cmd);
  }

  /** Get a command by ID. */
  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  /** Check if a command exists. */
  has(id: string): boolean {
    return this.commands.has(id);
  }

  /** List all commands. */
  list(): Command[] {
    return Array.from(this.commands.values());
  }

  /** List commands by category. */
  byCategory(category: string): Command[] {
    return this.list().filter((c) => c.category === category);
  }

  /** List commands by a set of IDs (preserves the order of the input array). */
  byIds(ids: string[]): Command[] {
    return ids
      .map((id) => this.commands.get(id))
      .filter((c): c is Command => c !== undefined);
  }

  /** Remove a command by ID. */
  unregister(id: string): boolean {
    return this.commands.delete(id);
  }

  /** Clear all commands. */
  clear(): void {
    this.commands.clear();
  }
}

/** The singleton command registry instance. */
export const commandRegistry = new CommandRegistry();

/** Convenience function to define and register a single command. */
export function defineCommand(cmd: Command): Command {
  commandRegistry.register(cmd);
  return cmd;
}

/** Convenience function to define and register multiple commands. */
export function defineCommands(cmds: Command[]): void {
  commandRegistry.registerAll(cmds);
}
