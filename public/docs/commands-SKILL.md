# SKILL.md — Commands

A vanilla JavaScript command registry and keyboard shortcut system. Commands
are declarative actions (ID, label, shortcut, icon, category). They are NOT
components. Specific components register the commands they support;
`SmartContextMenu` and `SmartTooltip` render command items with their
shortcuts. A `ShortcutHandler` dispatches keyboard shortcuts to callbacks.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  commandRegistry,
  defineCommand,
  defineCommands,
  registerBuiltinCommands,
  formatShortcut,
  shortcutParts,
  eventMatchesShortcut,
  findCommandForEvent,
  ShortcutHandler,
  type Command,
  type CommandShortcut,
} from "@/lib/commands";
```

No CSS import required — this is a pure TypeScript module with no DOM
styles of its own.

---

## Quick Start

```ts
import { registerBuiltinCommands, commandRegistry, ShortcutHandler } from "@/lib/commands";

// 1. Register the built-in commands (once per app init).
registerBuiltinCommands();

// 2. Look up a command (e.g. to render its label/shortcut somewhere).
const cmd = commandRegistry.get("color-wheel.reset");
console.log(cmd?.label);              // "Reset to Defaults"
console.log(cmd?.shortcut);           // { keys: "R", modifiers: ["Shift"] }
console.log(formatShortcut(cmd!.shortcut!));  // "⇧R"

// 3. Wire keyboard shortcuts to callbacks.
const handler = new ShortcutHandler(["color-wheel.reset"]);
handler.on("color-wheel.reset", () => picker.setColor("#4287f5"));
handler.attach();
// In cleanup: handler.destroy();
```

---

## Command Registry API

### `commandRegistry` (singleton)

| Method                              | Returns           | Description                                            |
|-------------------------------------|-------------------|--------------------------------------------------------|
| `register(cmd)`                    | `void`            | Register or update a command.                          |
| `registerAll(cmds)`                | `void`            | Register multiple commands.                            |
| `get(id)`                          | `Command \| undefined` | Look up a command by ID.                          |
| `has(id)`                          | `boolean`         | Check if a command exists.                             |
| `list()`                           | `Command[]`       | All commands.                                          |
| `byCategory(category)`             | `Command[]`       | Commands in a category.                                |
| `byIds(ids)`                       | `Command[]`       | Commands matching a set of IDs (preserves input order). |
| `unregister(id)`                   | `boolean`         | Remove a command.                                       |
| `clear()`                          | `void`            | Remove all commands.                                    |

### Convenience functions

| Function              | Returns      | Description                              |
|-----------------------|--------------|------------------------------------------|
| `defineCommand(cmd)`  | `Command`    | Register a single command. Returns it.   |
| `defineCommands(cmds)`| `void`       | Register multiple commands.              |
| `registerBuiltinCommands()` | `void` | Register the platform's built-in commands (call once at app init). |

### Command shape

```ts
interface Command {
  id: string;             // "color-wheel.reset" | "board.align-left" | ...
  label: string;          // "Reset Color" | "Align Left" | ...
  shortcut?: CommandShortcut;
  icon?: string;          // Lucide-style icon name
  category?: string;      // "Color Wheel" | "Board" | "Edit" | ...
  description?: string;
  disabled?: boolean;
}

interface CommandShortcut {
  keys: string;           // "R" | "Enter" | "Escape" | "1"
  modifiers?: string[];   // "Control" | "Shift" | "Alt" | "Meta"
}
```

---

## Shortcut Utilities

| Function                              | Returns        | Description                                                       |
|---------------------------------------|----------------|-------------------------------------------------------------------|
| `formatShortcut(shortcut)`            | `string`       | Human-readable: `"⇧R"`, `"⌘K"`, `"⇧⌘L"`.                          |
| `shortcutParts(shortcut)`             | `string[]`     | Parts for `<kbd>` rendering: `["⇧", "R"]`.                        |
| `eventMatchesShortcut(event, shortcut)` | `boolean`    | Does this `KeyboardEvent` match this shortcut?                    |
| `findCommandForEvent(event, commandIds?)` | `Command \| undefined` | Find the matching command in the registry (or a subset). |

### Modifier symbols

| Modifier   | Symbol |
|------------|--------|
| `Control`  | `⌃`    |
| `Shift`    | `⇧`    |
| `Alt`      | `⌥`    |
| `Meta`     | `⌘`    |

### Key normalization

Single-character keys are uppercased before comparison (`"r"` → `"R"`).
Named keys (`Enter`, `Escape`, `Delete`, `Home`, `End`, arrow keys) are
kept as-is.

Modifier matching is **exact**: a shortcut with `modifiers: ["Shift"]`
matches only `Shift+R`, not `Ctrl+Shift+R` or plain `R`.

---

## ShortcutHandler

A class that attaches a global `keydown` listener and fires callbacks when
registered shortcuts are pressed.

```ts
class ShortcutHandler {
  constructor(scopedIds?: string[]);  // optional subset of command IDs
  on(commandId: string, handler: () => void): void;
  off(commandId: string, handler: () => void): void;
  attach(): void;   // start listening
  detach(): void;   // stop listening
  destroy(): void;  // detach + clear callbacks
}
```

When a key is pressed:
1. `findCommandForEvent(event, scopedIds)` finds the matching command.
2. If found, `event.preventDefault()` is called.
3. All registered callbacks for that command ID are invoked (in insertion
   order). Errors in individual callbacks are caught and logged so one bad
   handler can't crash the others.

---

## Code Examples

### Register a custom command at runtime

```ts
import { defineCommand } from "@/lib/commands";

defineCommand({
  id: "app.export",
  label: "Export",
  shortcut: { keys: "E", modifiers: ["Shift", "Meta"] },
  icon: "download",
  category: "App",
  description: "Export the current document",
});
```

### Render a command's shortcut in your UI

```ts
import { commandRegistry, shortcutParts } from "@/lib/commands";

const cmd = commandRegistry.get("board.align-left");
if (cmd?.shortcut) {
  const parts = shortcutParts(cmd.shortcut);  // ["⇧", "⌘", "L"]
  for (const p of parts) {
    const kbd = document.createElement("kbd");
    kbd.textContent = p;
    toolbar.appendChild(kbd);
  }
}
```

### Wire shortcuts to component actions

```ts
import { ShortcutHandler } from "@/lib/commands";

const handler = new ShortcutHandler([
  "color-wheel.reset",
  "color-wheel.triangle",
  "color-wheel.square",
  "color-wheel.disk",
  "color-wheel.none",
]);

handler.on("color-wheel.reset", () => picker.setColor("#4287f5"));
handler.on("color-wheel.triangle", () => picker.setShape("triangle"));
handler.on("color-wheel.square", () => picker.setShape("square"));
handler.on("color-wheel.disk", () => picker.setShape("disk"));
handler.on("color-wheel.none", () => picker.setShape("none"));

handler.attach();
// In React useEffect cleanup: handler.destroy();
```

### Scope shortcuts to a specific component

When multiple components with overlapping shortcuts are on the same page,
scope the handler:

```ts
// Only fire board shortcuts when the board is the active component.
const boardHandler = new ShortcutHandler([
  "board.align-left", "board.align-right", "board.distribute-h",
  "board.fit-all", "board.delete-selected",
]);
boardHandler.attach();
```

### Use commands in a SmartContextMenu

```ts
import { SmartContextMenu } from "@/lib/components/smart-context-menu";

const menu = new SmartContextMenu(host, {
  bounds: host,
  commandIds: ["board.align-left", "board.align-right", "board.distribute-h"],
});
// The menu looks up each command in the registry and renders label + icon + shortcut.
```

### Find the command for an arbitrary key event

```ts
import { findCommandForEvent } from "@/lib/commands";

document.addEventListener("keydown", (e) => {
  const cmd = findCommandForEvent(e);
  if (cmd) {
    console.log("Pressed:", cmd.id, cmd.label);
  }
});
```

---

## Built-in Command Categories

| Category       | Example IDs                                          |
|----------------|------------------------------------------------------|
| Global         | `global.search` (⌘K), `global.escape` (Esc)          |
| Color Wheel    | `color-wheel.reset` (⇧R), `color-wheel.triangle` (1) |
| Color Range    | `color-range.hue` (1), `color-range.alpha` (4)       |
| Color Circle   | `color-circle.triad` (1), `color-circle.custom` (5)  |
| Edit           | `edit.copy` (⌘C), `edit.paste` (⌘V)                  |
| Board          | `board.align-left` (⇧⌘L), `board.fit-all` (⌘0)      |

The full list is in `src/lib/commands/index.ts` under
`registerBuiltinCommands()`.

---

## Integration Notes

- **Call `registerBuiltinCommands()` once at app init**. Calling it multiple
  times is safe (later registrations overwrite earlier ones) but wasteful.
- **Commands are global**: the registry is a singleton. Commands registered
  by one component are visible to all other components. Scope via
  `ShortcutHandler`'s `scopedIds` if you need to limit which commands fire.
- **Digit-key collisions**: the digit shortcuts (`1`-`5`) are reused across
  Color Wheel, Color Range, and Color Circle. This works because only one
  playground is visible at a time. If you mount two simultaneously, scope
  their handlers.
- **Modifier matching is exact**: a shortcut with `modifiers: ["Shift"]`
  does NOT match `Ctrl+Shift+R`. Define a separate command with
  `modifiers: ["Control", "Shift"]` if you need both.
- **Disabled commands**: setting `disabled: true` on a command makes
  `findCommandForEvent` skip it (so the shortcut won't fire) and makes
  `SmartContextMenu` render it as muted and non-clickable. The command
  remains in the registry.
- **Accessibility**: the `<kbd>` badges rendered by `SmartContextMenu` and
  `SmartTooltip` use semantic `<kbd>` elements. Screen readers may or may
  not announce them depending on the AT — always provide a textual label
  via the command's `label` field.
- **No SSR concerns**: the registry is a plain `Map`; it's safe to call
  `registerBuiltinCommands()` on the server (it just populates the map).
  `ShortcutHandler.attach()` adds a `window` listener, so call it only on
  the client.

---

## Related Modules

- [Smart Context Menu](../components/smart-context-menu/SKILL.md) — renders
  commands as menu items.
- [Smart Tooltip](../components/smart-tooltip/SKILL.md) — renders a
  command's label/description/shortcut on hover.
