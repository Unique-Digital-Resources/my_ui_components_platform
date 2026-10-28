# SKILL.md — Rich Text Editor

A vanilla JavaScript contenteditable-based rich-text editor with a
runtime-extensible component registry. Markdown-like syntax (`#` headings,
`**bold**`, `*italic*`, `` `code` ``, `> quote`, `- bullet`, `1. numbered`,
```` ``` ```` code block, `---` divider, `[label](url)` link) is parsed
live in realtime mode or shown raw in source mode. A built-in toolbar
exposes every registered component that has a `toolbarLabel`. Hosts can
register custom block and inline components at runtime. Framework-
independent.

For internals / contribution, see [AGENT.md](./AGENT.md).

---

## Installation

```ts
import {
  RichTextEditor,
  rteComponentRegistry,
  defineRTEComponent,
  defineRTEComponents,
  registerBuiltinRTEComponents,
  type RTEComponentType,
  type RTEComponentDef,
  type RichTextEditorOptions,
  type RichTextEditorEventPayload,
  type RichTextEditorHandler,
} from "@/lib/components/rich-text-editor";
```

No CSS import required — the component injects a scoped `<style>` once per
document.

The constructor auto-registers built-in components on first use, so you
usually do not need to call `registerBuiltinRTEComponents()` yourself.
Call it explicitly if you clear the registry and want to restore the
defaults.

---

## Quick Start

```ts
const editor = new RichTextEditor(document.getElementById("host")!, {
  content: "# Hello\nThis is **bold** and *italic*.",
  realtime: true,
  placeholder: "Start typing...",
});

editor.on("change", ({ content, html }) => {
  console.log("raw:", content);
  console.log("html:", html);
});

editor.on("command", ({ componentName }) => {
  console.log("applied:", componentName);
});

// later
editor.destroy();
```

---

## Constructor

```ts
new RichTextEditor(container: HTMLElement, options?: RichTextEditorOptions)
```

### Options

| Option        | Type      | Default                                                                                            | Description                                                       |
|---------------|-----------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| `content`     | `string`  | `""`                                                                                               | Initial raw content (markdown-style source).                      |
| `realtime`    | `boolean` | `true`                                                                                             | Live-render syntax as the user types. `false` shows raw source.   |
| `showToolbar` | `boolean` | `true`                                                                                             | Show the formatting toolbar.                                      |
| `placeholder` | `string`  | `"Start typing... Use # for headings, **bold**, *italic*, \`code\`, > quote, - list"`              | Placeholder text shown when the editor is empty.                  |
| `readOnly`    | `boolean` | `false`                                                                                            | Disable editing and toolbar commands.                             |
| `spellcheck`  | `boolean` | `false`                                                                                            | Set the `spellcheck` attribute on the contenteditable div.        |

---

## Methods

### Content

| Method                | Returns  | Description                                                       |
|-----------------------|----------|-------------------------------------------------------------------|
| `getContent()`        | `string` | The raw markdown-style source text.                              |
| `getHtml()`           | `string` | The rendered HTML. In realtime mode, the current `innerHTML`; in source mode, the parsed HTML of the raw content. |
| `setContent(content)` | `void`   | Replace the raw content and re-render. Does not emit `change`.   |
| `getWordCount()`      | `number` | Word count of the raw content (split on whitespace).             |

### Mode

| Method              | Returns   | Description                                                       |
|---------------------|-----------|-------------------------------------------------------------------|
| `toggleRealtime()`  | `void`    | Switch between realtime and source mode. Emits `mode_change`.    |
| `isRealtime()`      | `boolean` | Whether realtime mode is currently active.                       |

### Commands

| Method                       | Returns | Description                                                       |
|------------------------------|---------|-------------------------------------------------------------------|
| `applyBlockComponent(name)`  | `void`  | Apply (or toggle off) a block component at the cursor's current line. Emits `command`. |
| `applyInlineComponent(name)` | `void`  | Wrap (or unwrap) the current selection with an inline component's trigger. Emits `command`. No-ops if there is no selection and no trigger pair can be inserted. |

Both methods no-op when `readOnly` is true.

### Runtime configuration

| Method                       | Returns | Description                                                       |
|------------------------------|---------|-------------------------------------------------------------------|
| `setProperty(name, value)`   | `void`  | Update one option at runtime. Supported `name`s: `"realtime"`, `"readOnly"`, `"spellcheck"`, `"content"`, `"placeholder"`. |
| `on(event, handler)`         | `void`  | Subscribe to `change`, `command`, or `mode_change`.              |
| `off(event, handler)`        | `void`  | Unsubscribe.                                                      |
| `destroy()`                  | `void`  | Tear down. Idempotent. Clears the debounce timer, listeners, and DOM. |

---

## Events

| Event          | Payload                                                              | When                                                       |
|----------------|----------------------------------------------------------------------|------------------------------------------------------------|
| `change`       | `{ content, html, source: "keyboard" }`                              | After the 300ms input debounce fires (realtime re-parse).  |
| `command`      | `{ componentName, content, source: "pointer" }`                      | A toolbar button or keyboard shortcut applied a component. |
| `mode_change`  | `{ source: "programmatic" }`                                         | `toggleRealtime()` was called (button or `setProperty`).   |

All payloads also include `type` set to the event name.

```ts
editor.on("change", ({ content, html }) => persist(content, html));
editor.on("command", ({ componentName }) => analytics.track(componentName));
editor.on("mode_change", () => updateModeIndicator());
```

---

## CSS Custom Properties

All declared on `.rte-root` and cascade to children. Override on the host
element or any ancestor to retheme.

| Variable           | Default                    | Description                                                        |
|--------------------|----------------------------|--------------------------------------------------------------------|
| `--rte-bg`         | `#151519`                  | Editor background.                                                 |
| `--rte-surface`    | `#1E1E24`                  | Toolbar and status bar background.                                 |
| `--rte-surface-2`  | `#28282E`                  | Button hover, code block background, inline code background.       |
| `--rte-surface-3`  | `#34343C`                  | Higher surface (reserved).                                         |
| `--rte-border`     | `#3A3A42`                  | Root / toolbar / status bar / code block borders.                  |
| `--rte-text`       | `#F4F1FF`                  | Primary text color.                                                |
| `--rte-muted`      | `#888894`                  | Toolbar button text, status bar text, quote text.                  |
| `--rte-accent`     | `#D9FF66`                  | Lemon Signal — active button, quote border, inline code, links.    |
| `--rte-accent-dim` | `rgba(217,255,102,0.12)`   | Active button background.                                          |
| `--rte-radius`     | `6px`                      | Root border radius.                                                |

The component also reads `--font-mono` and `--font-jetbrains` for code
rendering (falls back to `ui-monospace, monospace`).

---

## Built-in Components

Registered automatically by `registerBuiltinRTEComponents()` (the
constructor calls this lazily if the registry is empty).

### Block components

| Name         | Trigger  | Toolbar | Render output                                                    |
|--------------|----------|---------|------------------------------------------------------------------|
| `heading1`   | `# `     | `H1`    | `<h1 class="rte-h1">{text}</h1>`                                 |
| `heading2`   | `## `    | `H2`    | `<h2 class="rte-h2">{text}</h2>`                                 |
| `heading3`   | `### `   | `H3`    | `<h3 class="rte-h3">{text}</h3>`                                 |
| `quote`      | `> `     | `Quote` | `<blockquote class="rte-quote">{inline-rendered}</blockquote>`   |
| `code-block` | ` ``` `  | `Code`  | `<pre class="rte-code-block"><code>{escaped}</code></pre>`        |
| `bullet`     | `- `     | `Bullet`| `<li class="rte-bullet">{inline-rendered}</li>` (in `<ul>`)       |
| `numbered`   | `1. `    | `Numbered`| `<li class="rte-numbered">{inline-rendered}</li>` (in `<ol>`)   |
| `divider`    | `---`    | `Divider`| `<hr class="rte-divider"/>`                                      |

### Inline components

| Name     | Trigger | Toolbar | Shortcut     | Render output                                                       |
|----------|---------|---------|--------------|---------------------------------------------------------------------|
| `bold`   | `**`    | `B`     | `Meta+B`     | `<strong>{escaped}</strong>`                                        |
| `italic` | `*`     | `I`     | `Meta+I`     | `<em>{escaped}</em>`                                                |
| `code`   | `` ` `` | `</>`   | `` Meta+` `` | `<code class="rte-code-inline">{escaped}</code>`                    |
| `link`   | `[`     | `Link`  | (none)       | `<a href="{url}" class="rte-link">{label}</a>` (parses `[label](url)`) |

### Registry API

```ts
import {
  rteComponentRegistry,
  defineRTEComponent,
  defineRTEComponents,
  registerBuiltinRTEComponents,
} from "@/lib/components/rich-text-editor";

// Register a single custom component
defineRTEComponent({
  name: "callout",
  type: "block",
  trigger: "! ",
  toolbarLabel: "Callout",
  toolbarIcon: "!",
  render: (text) => `<div class="rte-callout">${text}</div>`,
});

// Register several at once
defineRTEComponents([
  { name: "highlight", type: "inline", trigger: "==", toolbarLabel: "Highlight",
    render: (t) => `<mark>${t}</mark>` },
  { name: "strikethrough", type: "inline", trigger: "~~", toolbarLabel: "Strike",
    render: (t) => `<del>${t}</del>` },
]);

// Registry queries (low-level)
rteComponentRegistry.has("bold");           // true
rteComponentRegistry.get("bold");           // RTEComponentDef | undefined
rteComponentRegistry.list();                // RTEComponentDef[]
rteComponentRegistry.byType("block");       // block defs only
rteComponentRegistry.unregister("callout"); // boolean
rteComponentRegistry.clear();               // void — wipes everything

// Restore built-ins after a clear
registerBuiltinRTEComponents();
```

The `RTEComponentDef` shape:

```ts
interface RTEComponentDef {
  name: string;            // unique key
  type: "inline" | "block";
  trigger?: string;        // line prefix (block) or wrapper pair (inline)
  render: (text: string) => string;   // text -> HTML
  toolbarLabel?: string;   // if set, a toolbar button is added
  toolbarIcon?: string;    // inline SVG/HTML for the button (defaults to label)
  shortcut?: string;       // e.g. "Meta+B" — last segment is the key
}
```

---

## Examples

### Minimal editor with live preview

```ts
const editor = new RichTextEditor(host, {
  realtime: true,
  placeholder: "Type here. Try # for a heading.",
});
editor.on("change", ({ content }) => save(content));
```

### Source-only editor (raw markdown)

```ts
const editor = new RichTextEditor(host, {
  content: initialMarkdown,
  realtime: false,
  showToolbar: true,
});
editor.on("change", ({ content }) => save(content));
```

### Read-only rendered view

```ts
const view = new RichTextEditor(host, {
  content: savedMarkdown,
  realtime: true,
  readOnly: true,
  showToolbar: false,
});
```

### Toggle realtime mode at runtime

```ts
editor.toggleRealtime();
// or
editor.setProperty("realtime", false);
```

### Apply formatting programmatically

```ts
editor.setContent("# Notes\n\nThis is a paragraph.\n");
editor.applyBlockComponent("quote");        // wraps the cursor's line in "> "
editor.applyInlineComponent("bold");        // wraps the selection in "**"
editor.applyInlineComponent("code");        // wraps the selection in "`"
```

### Register a custom block component

```ts
defineRTEComponent({
  name: "callout",
  type: "block",
  trigger: "! ",
  toolbarLabel: "Callout",
  toolbarIcon: "!",
  render: (text) => `<div class="rte-callout">${text}</div>`,
});
const editor = new RichTextEditor(host, {});
// The Callout button appears in the toolbar automatically on next render.
// Trigger by typing "! " at the start of a line, or click the toolbar button.
```

### Register a custom inline component with a shortcut

```ts
defineRTEComponent({
  name: "highlight",
  type: "inline",
  trigger: "==",
  toolbarLabel: "Highlight",
  toolbarIcon: "<b>H</b>",
  shortcut: "Meta+H",
  render: (t) => `<mark>${t}</mark>`,
});
```

### Get content for persistence

```ts
editor.on("change", () => {
  localStorage.setItem("doc", editor.getContent());
  localStorage.setItem("doc-html", editor.getHtml());
});
```

### Retheme via CSS variables

```css
.my-editor-host {
  --rte-accent: #FF6B9D;            /* pink accent instead of lemon */
  --rte-surface: #1A1A24;
  --rte-border: #2E2E36;
}
```

```ts
const editor = new RichTextEditor(hostEl, {});
// hostEl has class "my-editor-host"
```

---

## Integration Notes

**When to use:** Editing markdown-style document content with live
preview, custom block/inline syntax, and a configurable toolbar. Good for
notes apps, comment boxes, lightweight CMS editors, and anywhere a
contenteditable textarea with structured syntax is needed.

**When not to use:** When you need a WYSIWYG editor with image upload,
tables (use [Table Editor](../table-editor/SKILL.md) instead),
collaborative editing, or perfect cursor fidelity under heavy realtime
re-parsing. The cursor restoration is approximate (see AGENT.md Known
Issues).

**When not to use:** When you need bullet-proof undo/redo. The editor
relies on the browser's `contenteditable` undo, which is unreliable after
programmatic `innerHTML` replacement. For applications where undo is
critical, wrap the editor with your own command stack.

**Alternatives:**
- For tabular data editing, see [Table Editor](../table-editor/SKILL.md).
- For a presentational feed of dated entries, see [Timeline](../timeline/SKILL.md).
- For a long scrollable document container, see
  [Scroll Layout](../scroll-layout/SKILL.md).

**Realtime mode caveats:** The 300ms debounce means there is a brief
window between keystroke and re-parse where the editor shows the user's
raw input. Cursor position is restored approximately by walking text
nodes; complex edits that cross block boundaries may cause the cursor to
jump to the end. If your users hit this often, switch to source mode
(`realtime: false`) where the editor shows raw markdown directly.

**Registry is a process-wide singleton.** All `RichTextEditor` instances
on the same page share `rteComponentRegistry`. Registering a custom
component makes it available to every editor instance. Use `unregister()`
or `clear()` if you need to scope components.

**`defineRTEComponent` vs `rteComponentRegistry.register`:** The
function form is the public API; the registry method is the low-level
path. They are equivalent — `defineRTEComponent(def)` just calls
`rteComponentRegistry.register(def)`.

**Accessibility:** The editor is a `contenteditable` div with
`spellcheck` and `data-placeholder` attributes. The toolbar buttons are
real `<button>`s with `aria-label`. The component does not apply a label
to the editor itself; wrap it with a `<label>` or set `aria-label`
yourself.

**Retheming:** All colors come from `--rte-*` CSS variables. Override on
the host element or any ancestor. The lemon accent (`#D9FF66`) is the
default for active states, quote borders, inline code, and links.
