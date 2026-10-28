# SKILL.md — Smart Tooltip

A vanilla JavaScript tooltip overlay. Renders a command's label, description,
and keyboard shortcut, with smart positioning bounded by a container
element. Attaches to a target element and appears on hover/focus.
Auto-flips when it would overflow the bounds. Framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  SmartTooltip,
  type SmartTooltipOptions,
  type SmartTooltipPosition,
} from "@/lib/components/smart-tooltip";

// The tooltip renders a command from the registry — register them first.
import { registerBuiltinCommands } from "@/lib/commands";
registerBuiltinCommands();
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const tooltip = new SmartTooltip(document.getElementById("host")!, {
  bounds: document.getElementById("app-shell")!,
  commandId: "color-wheel.reset",
  position: "top",
});

// Attach to a target element — tooltip appears on hover/focus.
tooltip.attachTo(document.getElementById("reset-btn")!);

// later
tooltip.detach();
tooltip.destroy();
```

---

## Constructor

```ts
new SmartTooltip(container: HTMLElement, options: SmartTooltipOptions)
```

### Options

| Option       | Type                                    | Default | Description                                                       |
|--------------|-----------------------------------------|---------|-------------------------------------------------------------------|
| `bounds`     | `HTMLElement`                           | —       | The element that bounds the tooltip. Required.                    |
| `commandId`  | `string`                                | —       | Command ID to display. Looked up in the command registry. Required. |
| `position`   | `"top" \| "bottom" \| "left" \| "right"`| `"top"` | Position relative to the target. Auto-flips on overflow.          |

The container is forced to `position: relative` if it was `static` (so the
absolute-positioned tooltip resolves against it). The original value is
restored on `destroy()`.

---

## Public Methods

| Method                          | Returns | Description                                                       |
|---------------------------------|---------|-------------------------------------------------------------------|
| `attachTo(target)`              | `void`  | Attach the tooltip to a target element. Adds hover/focus listeners. |
| `detach()`                      | `void`  | Detach from the current target. Hides the tooltip if visible.    |
| `show()`                        | `void`  | Show the tooltip (called automatically on hover/focus).          |
| `hide()`                        | `void`  | Hide the tooltip (called automatically on mouseleave/blur).      |
| `setCommandId(id)`              | `void`  | Change the displayed command. Re-renders + re-positions if visible. |
| `setPosition(pos)`              | `void`  | Change the position. Re-positions if visible.                     |
| `on(event, handler)`            | `void`  | Subscribe to `show` or `hide`.                                    |
| `off(event, handler)`           | `void`  | Unsubscribe.                                                       |
| `destroy()`                     | `void`  | Tear down. Detaches, removes DOM, restores container `position`. Idempotent. |

---

## Events

| Event   | Payload | When                                            |
|---------|---------|-------------------------------------------------|
| `show`  | `void`  | The tooltip was shown (hover or focus).         |
| `hide`  | `void`  | The tooltip was hidden (mouseleave, blur, or `hide()`). |

```ts
tooltip.on("show", () => console.log("tooltip visible"));
tooltip.on("hide", () => console.log("tooltip hidden"));
```

---

## Code Examples

### Tooltip on a button

```ts
const tooltip = new SmartTooltip(host, {
  bounds: appShell,
  commandId: "color-wheel.reset",
  position: "top",
});
tooltip.attachTo(document.getElementById("reset-btn")!);
```

### Tooltip on multiple targets (re-attach)

```ts
const tooltip = new SmartTooltip(host, {
  bounds: appShell,
  commandId: "color-wheel.triangle",
});

// Attach to one target at a time. Attaching to a new target detaches the old.
tooltip.attachTo(btn1);
// later
tooltip.attachTo(btn2);
```

### Changing the command dynamically

```ts
tooltip.setCommandId("color-wheel.square");
tooltip.setPosition("right");
```

### React wrapper

```tsx
"use client";
import { useRef, useEffect } from "react";
import { SmartTooltip } from "@/lib/components/smart-tooltip";

export function Demo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<SmartTooltip | null>(null);

  useEffect(() => {
    if (!hostRef.current || !btnRef.current) return;
    const tooltip = new SmartTooltip(hostRef.current, {
      bounds: hostRef.current,
      commandId: "edit.copy",
      position: "top",
    });
    tooltip.attachTo(btnRef.current);
    tooltipRef.current = tooltip;
    return () => tooltip.destroy();
  }, []);

  return (
    <div ref={hostRef}>
      <button ref={btnRef}>Copy</button>
    </div>
  );
}
```

The repo ships a prebuilt wrapper at
`src/components/smart-tooltip/smart-tooltip-react.tsx`.

### Position behavior

| `position` | Default placement        | Flips to  | If still overflowing            |
|------------|--------------------------|-----------|---------------------------------|
| `top`      | Above the target         | `bottom`  | Clamped to bounds top edge.     |
| `bottom`   | Below the target         | `top`     | Clamped to bounds bottom edge.  |
| `left`     | Left of the target       | `right`   | Clamped to bounds left edge.    |
| `right`    | Right of the target      | `left`    | Clamped to bounds right edge.   |

For `top`/`bottom`, the tooltip is horizontally centered on the target and
clamped to the bounds' horizontal edges. For `left`/`right`, it's vertically
centered and clamped to the bounds' vertical edges.

---

## Integration Notes

- **Plain HTML**: import the compiled `.js` file as an ES module. Register
  commands first via `registerBuiltinCommands()` from `@/lib/commands`.
- **React**: use the wrapper at
  `src/components/smart-tooltip/smart-tooltip-react.tsx`, or instantiate
  manually in a `useEffect` as shown above.
- **Container vs. bounds**: the container is where the tooltip DOM is
  appended; the bounds is the element it must stay inside. They can be the
  same element.
- **One target per tooltip**: `attachTo` detaches the previous target
  before attaching the new one. For multiple targets, create multiple
  `SmartTooltip` instances (they share the registry, so this is cheap).
- **Hover + focus**: the tooltip shows on both `mouseenter` and `focus`,
  so it works for keyboard users navigating with Tab.
- **Overflow**: same caveat as SmartContextMenu — if the container has
  `overflow: hidden`, the tooltip may be clipped.
- **Accessibility**: the tooltip has `role="tooltip"` and `aria-hidden`
  toggling. The target should have `aria-describedby` pointing to the
  tooltip's ID for full AT support — currently the tooltip doesn't set an
  ID, so the host must add `aria-label` to the target as a fallback.

---

## Related Components

- [Smart Context Menu](../smart-context-menu/SKILL.md) — for click/context
  menus driven by the same command registry.
- [Commands](../../commands/SKILL.md) — the command registry and shortcut
  system that this tooltip reads from.
