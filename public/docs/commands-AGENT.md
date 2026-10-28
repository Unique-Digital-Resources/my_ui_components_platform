# AGENT.md — Commands

Contribution guide for `src/lib/commands/`. For usage, see
[SKILL.md](./SKILL.md).

---

## Module

**Commands** — a registry-based command system. Commands are declarative
actions with IDs, labels, keyboard shortcuts, optional icons, and
categories. They are NOT components. Specific components register the
commands they support; the `SmartContextMenu` and `SmartTooltip` render
command items with their shortcuts.

## File Structure

```
src/lib/commands/
├── AGENT.md            ← this file
├── SKILL.md            ← usage docs
├── registry.ts         ← CommandRegistry class, Command/CommandShortcut types
├── shortcuts.ts        ← formatShortcut, eventMatchesShortcut, ShortcutHandler
└── index.ts            ← barrel + registerBuiltinCommands()
```

## Architecture

### Registry (`registry.ts`)

`CommandRegistry` is a singleton class. The module exports a single
instance `commandRegistry`. Internally a `Map<string, Command>`.

`Command` shape:

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

Public methods: `register`, `registerAll`, `get`, `has`, `list`,
`byCategory`, `byIds`, `unregister`, `clear`.

Convenience functions: `defineCommand(cmd)` and `defineCommands(cmds[])`
register and return.

### Shortcuts (`shortcuts.ts`)

- `formatShortcut(shortcut)` — human-readable string with modifier symbols
  (`⌃` Control, `⇧` Shift, `⌥` Alt, `⌘` Meta). Example: `{ keys: "R",
  modifiers: ["Shift"] }` → `"⇧R"`.
- `shortcutParts(shortcut)` — array of parts for rendering as `<kbd>`
  elements. Same symbols, returned as `["⇧", "R"]`.
- `eventMatchesShortcut(event, shortcut)` — checks if a `KeyboardEvent`
  matches a shortcut. Modifier matching is exact (all required, no extras).
  Single-char keys are uppercased before comparison.
- `findCommandForEvent(event, commandIds?)` — searches the registry (or a
  subset) for the first command whose shortcut matches. Skips disabled
  commands.
- `ShortcutHandler` — a class that attaches a global `keydown` listener and
  fires callbacks when registered shortcuts are pressed. Optional
  `scopedIds` constrains the search to a subset of command IDs (useful when
  multiple components on the same page register overlapping shortcuts).

### Built-in commands (`index.ts`)

`registerBuiltinCommands()` is called once on app init (in
`src/app/layout.tsx`). It registers commands grouped by category:

- **Global**: `global.search` (⌘K), `global.escape` (Esc).
- **Color Wheel**: `color-wheel.reset` (⇧R), `color-wheel.triangle` (1),
  `color-wheel.square` (2), `color-wheel.disk` (3), `color-wheel.none` (4),
  `color-wheel.toggle-rotate` (T).
- **Color Range**: `color-range.hue` (1), `color-range.lightness` (2),
  `color-range.contrast` (3), `color-range.alpha` (4).
- **Color Circle**: `color-circle.triad` (1), `color-circle.complementary`
  (2), `color-circle.analogous` (3), `color-circle.square` (4),
  `color-circle.custom` (5).
- **Edit**: `edit.copy` (⌘C), `edit.paste` (⌘V), `edit.duplicate` (⌘D).
- **Board — Alignment**: `board.align-left` (⇧⌘L), `board.align-center-h`
  (⇧⌘E), `board.align-right` (⇧⌘R), `board.align-top` (⇧⌘T),
  `board.align-center-v` (⇧⌘M), `board.align-bottom` (⇧⌘B).
- **Board — Distribution**: `board.distribute-h` (⇧⌘H),
  `board.distribute-v` (⇧⌘J).
- **Board — Fit**: `board.fit-all` (⌘0), `board.fit-selection` (⇧⌘0).
- **Board — Shapes**: `board.add-circle` (1), `board.add-rect` (2),
  `board.add-triangle` (3), `board.delete-selected` (Delete).

Note: the digit shortcuts (`1`-`5`) collide across categories
(`color-wheel.triangle` is `1`, `color-range.hue` is `1`, etc.). This is
intentional — only one component's playground is visible at a time, so the
`ShortcutHandler` is scoped to that component's command IDs.

## How to Extend / Modify

### Add a new command (for a new component)

1. Add an entry to the `defineCommands([...])` array in
   `src/lib/commands/index.ts`:
   ```ts
   { id: "my-component.action", label: "Action", shortcut: { keys: "A",
   modifiers: ["Shift"] }, icon: "star", category: "My Component" }
   ```
2. In the component's React wrapper or playground, instantiate a
   `ShortcutHandler` scoped to the component's command IDs:
   ```ts
   const handler = new ShortcutHandler([
     "my-component.action",
     // ...
   ]);
   handler.on("my-component.action", () => doAction());
   handler.attach();
   // In cleanup: handler.destroy();
   ```
3. To surface the command in a context menu or tooltip, pass the command ID
   to `SmartContextMenu` or `SmartTooltip`.

### Add a command at runtime (no source change)

```ts
import { defineCommand } from "@/lib/commands";

defineCommand({
  id: "app.custom-action",
  label: "Custom Action",
  shortcut: { keys: "K", modifiers: ["Shift", "Meta"] },
  icon: "star",
  category: "Custom",
});
```

The command is immediately available to `commandRegistry.get()`,
`SmartContextMenu`, `SmartTooltip`, and `ShortcutHandler`.

### Add a new modifier symbol

Edit `MODIFIER_SYMBOLS` in `shortcuts.ts`. The four standard modifiers
(Control, Shift, Alt, Meta) are already mapped.

### Change the key normalization

`normalizeKey(key)` uppercases single-char keys and leaves named keys
(`Enter`, `Escape`, `Delete`) as-is. If you need case-insensitive matching
for named keys, extend this function.

## Known Issues & TODOs

- **Digit-key collisions across categories**: the digit shortcuts (`1`-`5`)
  are reused across Color Wheel, Color Range, and Color Circle. This works
  only because the `ShortcutHandler` is scoped per playground. If two
  playgrounds were mounted simultaneously, both would fire. A more robust
  solution would scope shortcuts to the focused component.
- **No keyboard layout awareness**: shortcuts are defined in physical key
  terms (e.g. `keys: "R"` matches the key that produces "R" on the current
  layout). On a Dvorak keyboard, the physical "R" key produces a different
  character. The component doesn't currently account for this.
- **No chord shortcuts** (e.g. `g d` for "go to dashboard"). Only single-key
  + modifier shortcuts are supported.
- **`ShortcutHandler` listens at `window`**: there's no per-element scope.
  If you need shortcuts to fire only when a specific element is focused,
  attach the listener to that element instead (or check `document.activeElement`
  in your handler).
- **`disabled` commands are skipped by `findCommandForEvent`** but are still
  rendered by `SmartContextMenu` (as muted, non-clickable items). This is
  intentional — the menu shows what's possible, the user sees it's
  unavailable.
- The `registerBuiltinCommands()` is called once at app init and never
  unregistered. If the same commands are registered twice (e.g. in tests
  or hot-reload), the second registration silently overwrites the first.
  This is fine for production but can mask bugs in development.

## Files This Module Touches

- Consumed by: `SmartContextMenu`, `SmartTooltip` (both in
  `src/lib/components/`).
- Init: `registerBuiltinCommands()` is called in `src/app/layout.tsx` (or
  should be — verify the call site).
- The `ShortcutHandler` is used by individual component playgrounds to wire
  keyboard shortcuts to imperative API calls.
