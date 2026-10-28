# SKILL.md — Custom Button

A vanilla JavaScript button component. Configurable content (text, icon, or
both), icon positioning (left / right / top / bottom), four variants
(primary / secondary / outline / ghost), three sizes (sm / md / lg), and
disabled / fullWidth states. Built-in Lucide-style icon set plus `<img>`
support. DOM-based, framework-independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  CustomButton,
  type CustomButtonOptions,
  type CustomButtonVariant,
  type CustomButtonSize,
  type CustomButtonIconPosition,
  BUILT_IN_ICON_NAMES,
} from "@/lib/components/custom-button";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

---

## Quick Start

```ts
const btn = new CustomButton(document.getElementById("host")!, {
  text: "Save",
  icon: "save",
  iconPosition: "left",
  variant: "primary",
  size: "md",
});

btn.on("click", () => save());
btn.destroy();
```

---

## Constructor

```ts
new CustomButton(container: HTMLElement, options?: CustomButtonOptions)
```

### Options

| Option          | Type                                            | Default     | Description                                                              |
|-----------------|-------------------------------------------------|-------------|--------------------------------------------------------------------------|
| `text`          | `string`                                        | `""`        | Button label text.                                                       |
| `icon`          | `string`                                        | —           | SVG icon name (from the built-in set) or image src when `iconType="image"`. |
| `iconType`      | `"icon" \| "image"`                             | `"icon"`    | `"icon"` renders an inline SVG; `"image"` renders an `<img>`.            |
| `iconPosition`  | `"left" \| "right" \| "top" \| "bottom"`        | `"left"`    | Position of the icon relative to the text.                               |
| `variant`       | `"primary" \| "secondary" \| "outline" \| "ghost"` | `"primary"` | Visual style.                                                            |
| `size`          | `"sm" \| "md" \| "lg"`                          | `"md"`      | Button size.                                                             |
| `disabled`      | `boolean`                                       | `false`     | Disabled state.                                                          |
| `fullWidth`     | `boolean`                                       | `false`     | Stretch to fill the parent's width.                                      |

### Built-in icons

`plus`, `x`, `check`, `settings`, `search`, `home`, `star`, `heart`,
`arrow-right`, `trash`, `download`, `upload`, `mail`, `user`, `save`,
`edit`, `bell`, `refresh`.

Get the list at runtime: `import { BUILT_IN_ICON_NAMES } from "@/lib/components/custom-button"`.

Unknown icon names render as a small placeholder dot (not an empty box).

---

## Public Methods

| Method                          | Returns | Description                                              |
|---------------------------------|---------|----------------------------------------------------------|
| `setText(text)`                 | `void`  | Set the label text.                                      |
| `setIcon(icon, type?)`          | `void`  | Set the icon (and optionally the type).                  |
| `setIconPosition(pos)`          | `void`  | Set the icon position (left/right/top/bottom).           |
| `setVariant(variant)`           | `void`  | Set the visual variant.                                  |
| `setSize(size)`                 | `void`  | Set the size (sm/md/lg).                                 |
| `setDisabled(disabled)`         | `void`  | Enable/disable the button.                               |
| `setFullWidth(fullWidth)`       | `void`  | Toggle full-width mode.                                  |
| `on(event, handler)`            | `void`  | Subscribe to `click`.                                    |
| `off(event, handler)`           | `void`  | Unsubscribe.                                              |
| `destroy()`                     | `void`  | Tear down. Idempotent.                                   |

---

## Events

| Event   | Payload | When it fires                              |
|---------|---------|--------------------------------------------|
| `click` | `void`  | The button was clicked (and not disabled). |

```ts
btn.on("click", () => doSomething());
```

---

## Code Examples

### Primary button with icon

```ts
const btn = new CustomButton(container, {
  text: "Download",
  icon: "download",
  variant: "primary",
});
```

### Icon-only button (square)

```ts
const btn = new CustomButton(container, {
  icon: "settings",
  text: "",  // empty text → square icon-only button
  variant: "ghost",
  size: "sm",
});
```

### Image icon (data URI)

```ts
const btn = new CustomButton(container, {
  text: "Open",
  icon: "data:image/svg+xml;base64,...",
  iconType: "image",
  iconPosition: "left",
});
```

### Stacked (icon on top)

```ts
const btn = new CustomButton(container, {
  text: "Save",
  icon: "save",
  iconPosition: "top",
  variant: "outline",
});
```

### Disabled and full-width

```ts
const btn = new CustomButton(container, {
  text: "Submit",
  variant: "primary",
  fullWidth: true,
});

btn.setDisabled(true);  // during async operation
fetch("/api").finally(() => btn.setDisabled(false));
```

### React wrapper

```tsx
"use client";
import { CustomButtonReact } from "@/components/custom-button/custom-button-react";

export function Demo() {
  return (
    <CustomButtonReact
      text="Save"
      icon="save"
      variant="primary"
      onClick={() => save()}
    />
  );
}
```

### Programmatic updates

```ts
btn.setText("Saved!");
btn.setIcon("check");
btn.setVariant("ghost");
btn.setDisabled(false);
```

---

## Integration Notes

- **Plain HTML**: import the compiled `.js` file as an ES module.
- **React**: use the wrapper at
  `src/components/custom-button/custom-button-react.tsx`.
- **The button is a real `<button>` element**: it submits forms by default.
  Set `type="button"` via the container's `setAttribute` if you need to
  prevent form submission, or wrap in a `<form>` and handle `submit`.
- **Theming**: override the CSS custom properties on the host or via a
  custom class:
  ```css
  .my-button {
    --cb-bg: #ff6600;
    --cb-bg-hover: #e65c00;
    --cb-color: #ffffff;
    --cb-h: 44px;
    --cb-focus-ring: rgba(255, 102, 0, 0.55);
  }
  ```
- **Async operations**: there's no built-in `loading` state. Disable the
  button yourself during async work and re-enable in the `finally` block.
- **Accessibility**: the button is a real `<button>`, so it's keyboard-
  focusable and Enter/Space activate it. The icon SVGs have
  `aria-hidden="true"`; provide an accessible name via `text` or via
  `aria-label` on the container.
- **Icon-only buttons**: provide an `aria-label` on the container so screen
  readers announce the action.

---

## Related Components

- [Toggle Group](../toggle-group/SKILL.md) — a group of toggle buttons with
  selection, closable, and reorderable states. Toggle buttons mimic the
  CustomButton look but are managed as a group.
