# SKILL.md — Smart Context Menu

A vanilla JavaScript context menu overlay. Renders command items from the
command registry, with smart positioning bounded by a container element.
Auto-flips when it would overflow the bounds. Keyboard navigable.
Framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  SmartContextMenu,
  type SmartContextMenuOptions,
} from "@/lib/components/smart-context-menu";

// The menu renders commands from the registry — register them first.
import { registerBuiltinCommands } from "@/lib/commands";
registerBuiltinCommands();
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const menu = new SmartContextMenu(document.getElementById("host")!, {
  bounds: document.getElementById("app-shell")!,
  commandIds: [
    "color-wheel.reset",
    "color-wheel.triangle",
    "color-wheel.square",
    "color-wheel.disk",
  ],
  title: "Color Wheel Actions",
});

// Show at client coordinates (relative to the container).
document.getElementById("host")!.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const rect = e.currentTarget.getBoundingClientRect();
  menu.show(e.clientX - rect.left, e.clientY - rect.top);
});

menu.on("select", (cmd) => {
  console.log("Selected:", cmd.id, cmd.label);
});

menu.destroy();
```

---

## Constructor

```ts
new SmartContextMenu(container: HTMLElement, options: SmartContextMenuOptions)
```

### Options

| Option        | Type       | Description                                                          |
|---------------|------------|----------------------------------------------------------------------|
| `bounds`      | `HTMLElement` | The element that bounds the menu. The menu won't overflow this.   |
| `commandIds`  | `string[]` | Command IDs to show as menu items. Looked up in the command registry. |
| `title`       | `string`   | Optional header title for the menu.                                  |

The container is forced to `position: relative` if it was `static` (so the
absolute-positioned menu resolves against it). The original value is
restored on `destroy()`.

---

## Public Methods

| Method                          | Returns | Description                                                       |
|---------------------------------|---------|-------------------------------------------------------------------|
| `show(x, y)`                    | `void`  | Show the menu at `(x, y)` relative to the container, with smart flipping. |
| `hide()`                        | `void`  | Hide the menu. Fires `hide`.                                      |
| `isVisible()`                   | `boolean` | Whether the menu is currently visible.                          |
| `setCommandIds(ids)`            | `void`  | Replace the command IDs. Re-renders if visible.                   |
| `setTitle(title)`               | `void`  | Replace the title. Re-renders if visible.                         |
| `on(event, handler)`            | `void`  | Subscribe to `select` or `hide`.                                  |
| `off(event, handler)`           | `void`  | Unsubscribe.                                                       |
| `destroy()`                     | `void`  | Tear down. Restores the container's `position`. Idempotent.       |

---

## Events

| Event    | Payload                       | When                                              |
|----------|-------------------------------|---------------------------------------------------|
| `select` | `Command` (the chosen command) | The user clicked an item or pressed Enter on it. |
| `hide`   | `void`                        | The menu was hidden (Escape, outside click, or `hide()`). |

```ts
menu.on("select", (cmd) => {
  if (cmd.id === "color-wheel.reset") picker.setColor("#4287f5");
});
menu.on("hide", () => console.log("menu closed"));
```

---

## Code Examples

### Right-click context menu

```ts
const host = document.getElementById("canvas-host")!;
const menu = new SmartContextMenu(host, {
  bounds: host,
  commandIds: ["edit.copy", "edit.paste", "edit.duplicate"],
});

host.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const rect = host.getBoundingClientRect();
  menu.show(e.clientX - rect.left, e.clientY - rect.top);
});

menu.on("select", (cmd) => {
  switch (cmd.id) {
    case "edit.copy": doCopy(); break;
    case "edit.paste": doPaste(); break;
    case "edit.duplicate": doDuplicate(); break;
  }
});
```

### Button-triggered menu (with position)

```ts
const btn = document.getElementById("menu-btn")!;
const menu = new SmartContextMenu(document.body, {
  bounds: document.body,
  commandIds: ["board.align-left", "board.align-center-h", "board.align-right"],
  title: "Align",
});

btn.addEventListener("click", () => {
  const rect = btn.getBoundingClientRect();
  menu.show(rect.left, rect.bottom + 4);
});
```

### Dynamic command list

```ts
menu.setCommandIds(["color-wheel.triangle", "color-wheel.square"]);
menu.setTitle("Shape");
```

### Keyboard navigation

| Key                | Action                                          |
|--------------------|-------------------------------------------------|
| `ArrowDown`        | Move to the next enabled item.                  |
| `ArrowUp`          | Move to the previous enabled item.              |
| `Enter` / `Space`  | Invoke the active item.                         |
| `Escape`           | Hide the menu.                                  |
| `Home` / `End`     | Jump to the first / last enabled item.          |

Disabled commands are skipped during keyboard navigation.

### React wrapper

```tsx
"use client";
import { useRef } from "react";
import { SmartContextMenu } from "@/lib/components/smart-context-menu";

export function Demo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<SmartContextMenu | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const menu = new SmartContextMenu(hostRef.current, {
      bounds: hostRef.current,
      commandIds: ["edit.copy", "edit.paste"],
    });
    menu.on("select", (cmd) => console.log(cmd.id));
    menuRef.current = menu;
    return () => menu.destroy();
  }, []);

  return (
    <div
      ref={hostRef}
      onContextMenu={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        menuRef.current?.show(e.clientX - rect.left, e.clientY - rect.top);
      }}
    />
  );
}
```

The repo ships a prebuilt wrapper at
`src/components/smart-context-menu/smart-context-menu-react.tsx`.

---

## Integration Notes

- **Plain HTML**: import the compiled `.js` file as an ES module. Register
  commands first via `registerBuiltinCommands()` from `@/lib/commands`.
- **React**: use the wrapper at
  `src/components/smart-context-menu/smart-context-menu-react.tsx`, or
  instantiate manually in a `useEffect` as shown above.
- **Container vs. bounds**: the container is where the menu DOM is appended;
  the bounds is the element the menu must stay inside. They can be the same
  element, but often the bounds is a larger shell (e.g. the app root) while
  the container is a smaller panel.
- **Overflow**: the menu is appended to the container. If the container has
  `overflow: hidden`, the menu may be clipped. Either set `overflow: visible`
  on the container or move the menu to a parent that allows overflow.
- **Command registry**: the menu renders whatever commands are in the
  registry with the given IDs. Unknown IDs are silently skipped. Disabled
  commands render as muted, non-clickable items.
- **Outside-click dismiss**: clicking outside the menu (anywhere in the
  document) hides it. The listener is active only while the menu is visible.
- **Accessibility**: the menu has `role="menu"`, items have `role="menuitem"`,
  and the active item is tracked via `aria-activedescendant`. The menu
  autofocuses its first item on show.

---

## Related Components

- [Smart Tooltip](../smart-tooltip/SKILL.md) — for hover tooltips on
  command-driven UI elements.
- [Commands](../../commands/SKILL.md) — the command registry and shortcut
  system that this menu reads from.
