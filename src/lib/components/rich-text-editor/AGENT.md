# AGENT.md — Rich Text Editor

Contribution guide for `src/lib/components/rich-text-editor/`. For usage,
see [SKILL.md](./SKILL.md).

---

## Component

**RichTextEditor** — a pluggable contenteditable-based rich-text editor
with a runtime-extensible component registry. Markdown-like syntax (`#` for
H1, `**bold**`, `> quote`, `` `code` ``, `- bullet`, ```` ``` ```` code
block, `---` divider, `[label](url)` link) is parsed live in realtime mode
or shown as raw text in source mode. A built-in toolbar exposes every
registered component that has a `toolbarLabel`. Single file, no canvas, no
framework.

The defining feature is the **registry pattern**: every block and inline
element is an `RTEComponentDef` registered in a shared singleton
(`rteComponentRegistry`). Hosts can add custom components at runtime with
`defineRTEComponent()` / `defineRTEComponents()`, and they automatically
appear in the toolbar and the parser. Built-in components are registered
lazily by the constructor (or explicitly by calling
`registerBuiltinRTEComponents()`).

## File Structure

```
src/lib/components/rich-text-editor/
├── AGENT.md            <- this file
├── SKILL.md            <- usage docs
├── rich-text-editor.ts <- RichTextEditor class + registry + builtin components
└── index.ts            <- barrel: class, registry, helpers, types
```

## Architecture

### Two-layer design

1. **Registry layer** — `RTEComponentRegistryImpl` (exported as the
   singleton `rteComponentRegistry`). A `Map<string, RTEComponentDef>`
   keyed by component name. Each def carries:
   - `type: "inline" | "block"` — block components are line-prefix
     triggers; inline components are wrapper-pair triggers.
   - `trigger?: string` — for blocks, the line prefix (`"# "`, `"## "`,
     `"> "`, `"- "`, `"1. "`, `"---"`, ```` ``` ````); for inlines, the
     open/close wrapper (`"**"`, `"*"`, `` "`" ``, `"["`).
   - `render(text) => html` — the renderer. Block renderers receive the
     line's inner text (with the trigger stripped). Inline renderers
     receive the text between the two trigger wrappers.
   - `toolbarLabel?` / `toolbarIcon?` — if present, a button is added to
     the toolbar.
   - `shortcut?` — keyboard shortcut suffix (e.g. `"Meta+B"`); matched
     on keydown.

2. **Editor layer** — `RichTextEditor` class. Manages the contenteditable
   `<div>`, toolbar, and status bar. Owns the raw text (`rawContent`)
   and the rendered HTML. Re-parses `rawContent` into HTML whenever the
   editor's text changes (debounced 300ms in realtime mode).

### Rendering pipeline

`parseContent(rawText)` is the core parser. It walks the text line by
line, tracking state for code blocks (toggle on ```` ``` ```` lines) and
lists (`ul` / `ol`). For each line:

1. If inside a code block, accumulate content until the closing ```` ``` ````.
2. If the line trims to `"---"`, close any open list and emit `<hr>`.
3. If the line is empty, close any open list and emit `<br>`.
4. Otherwise, ask the registry `findBlockByPrefix(line)`. If a block
   matches, strip the trigger and call its `render(inner)`. Bullet and
   numbered blocks are wrapped in `<ul>` / `<ol>` (auto-opened/closed).
5. If no block matches, emit `<p class="rte-paragraph">${renderInline(line)}</p>`.

`renderInline(text)` finds all inline-component matches in the text via
`rteComponentRegistry.findInlineInText(text)`. Overlapping matches are
resolved by start position (first match wins). Non-matched text is
`escapeHtml()`-ed.

### Trigger matching

`findBlockByPrefix(line)` sorts registered block components by trigger
length descending so `"### "` matches before `"# "`. The first prefix
that the line starts with wins.

`findInlineInText(text)` finds each inline component's trigger as an
open/close pair. Pairs must be balanced (an opening trigger must be
followed by another of the same trigger). The `link` component is
special: its renderer parses `[label](url)` syntax from the inner text.

### Realtime vs source mode

- **Realtime (default)** — `editor.innerHTML = parseContent(rawContent)`.
  The user types into rendered HTML; on input (debounced 300ms), the
  editor's `innerText` is read back as raw text, re-parsed, and the
  HTML is replaced. Cursor position is restored approximately by walking
  text nodes with a `TreeWalker` to find the offset. This is a simple
  approach — it works for linear typing but can lose cursor fidelity
  for complex edits (see Known Issues).
- **Source** — `editor.textContent = rawContent`. The user sees and
  edits the raw markdown-style text directly. No live rendering.

The mode toggle button (right side of the toolbar) switches between
modes. The status bar label (`REALTIME` / `SOURCE`) and the toggle
button text (`Source` / `Preview`) update accordingly.

### Selection restoration

Toolbar buttons must not steal focus from the editor. Each button uses
`mousedown` `preventDefault()` and saves the current selection
(`Range.cloneRange()`) into `savedRange`. On `click`, the saved range
is restored before the command runs. `saveSelection()` is also called
on `mouseup`, `keyup`, and `focus` on the editor so the saved range is
always recent.

### Block command application

`applyBlockComponent(name)`:

1. Find the cursor's current line via `getCaretPosition()` and a
   character-offset walk through lines.
2. If the line already starts with this component's trigger, strip it
   (toggle off).
3. Otherwise, strip any other block trigger on the line first, then
   prepend this component's trigger.
4. Rebuild `rawContent` from the modified lines, re-render, and emit
   `command`.

### Inline command application

`applyInlineComponent(name)`:

1. Get the selected text (from live selection or `savedRange`).
2. If no selection, append an empty `trigger + trigger` pair to
   `rawContent`.
3. If selection exists:
   - If `trigger + selectedText + trigger` is already present in
     `rawContent`, replace it with bare `selectedText` (toggle off).
   - Otherwise replace `selectedText` with the wrapped form.
4. Re-render and emit `command`.

This is a string-replace approach — it works for the common case but
see Known Issues for the failure modes.

### Public API surface

```ts
// Registry singleton and helpers
export const rteComponentRegistry: RTEComponentRegistryImpl;
export function defineRTEComponent(def: RTEComponentDef): void;
export function defineRTEComponents(defs: RTEComponentDef[]): void;
export function registerBuiltinRTEComponents(): void;

// Editor class
class RichTextEditor {
  constructor(container: HTMLElement, options?: RichTextEditorOptions);

  getContent(): string;
  getHtml(): string;
  setContent(content: string): void;
  getWordCount(): number;
  toggleRealtime(): void;
  isRealtime(): boolean;

  applyBlockComponent(name: string): void;
  applyInlineComponent(name: string): void;

  setProperty(name: string, value: unknown): void;
  on(event: string, handler: RichTextEditorHandler): void;
  off(event: string, handler: RichTextEditorHandler): void;
  destroy(): void;
}

interface RTEComponentDef {
  name: string;
  type: RTEComponentType;            // "inline" | "block"
  trigger?: string;
  render: (text: string) => string;
  toolbarLabel?: string;
  toolbarIcon?: string;
  shortcut?: string;
}

interface RichTextEditorOptions {
  content?: string;
  realtime?: boolean;
  showToolbar?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  spellcheck?: boolean;
}

interface RichTextEditorEventPayload {
  type?: string;
  content?: string;
  html?: string;
  componentName?: string;
  source?: "pointer" | "keyboard" | "programmatic";
}

type RTEComponentType = "inline" | "block";
type RichTextEditorHandler = (payload: RichTextEditorEventPayload) => void;
```

### Built-in components

`registerBuiltinRTEComponents()` registers the following. Triggers and
renderers are taken verbatim from the source.

**Block components:**

| Name         | Trigger | Toolbar | Render output                                                    |
|--------------|---------|---------|------------------------------------------------------------------|
| `heading1`   | `# `    | `H1`    | `<h1 class="rte-h1">{text}</h1>`                                 |
| `heading2`   | `## `   | `H2`    | `<h2 class="rte-h2">{text}</h2>`                                 |
| `heading3`   | `### `  | `H3`    | `<h3 class="rte-h3">{text}</h3>`                                 |
| `quote`      | `> `    | `Quote` | `<blockquote class="rte-quote">{inline-rendered}</blockquote>`   |
| `code-block` | ` ``` ` | `Code`  | `<pre class="rte-code-block"><code>{escaped}</code></pre>`        |
| `bullet`     | `- `    | `Bullet`| `<li class="rte-bullet">{inline-rendered}</li>` (in `<ul>`)       |
| `numbered`   | `1. `   | `Numbered`| `<li class="rte-numbered">{inline-rendered}</li>` (in `<ol>`)   |
| `divider`    | `---`   | `Divider`| `<hr class="rte-divider"/>`                                      |

**Inline components:**

| Name    | Trigger | Toolbar | Shortcut  | Render output                                                       |
|---------|---------|---------|-----------|---------------------------------------------------------------------|
| `bold`  | `**`    | `B`     | `Meta+B`  | `<strong>{escaped}</strong>`                                        |
| `italic`| `*`     | `I`     | `Meta+I`  | `<em>{escaped}</em>`                                                |
| `code`  | `` ` `` | `</>`   | `` Meta+` ``| `<code class="rte-code-inline">{escaped}</code>`                  |
| `link`  | `[`     | `Link`  | (none)    | parses `[label](url)`, emits `<a href="{url}" class="rte-link">{label}</a>`; if no match, emits the escaped raw text |

Note: the `link` trigger is `"["` but the renderer expects the full
`[label](url)` form inside the closing `]`... actually the inline match
logic uses `[` as both open and close wrapper, so the inner text is
everything between two `[` characters. The renderer's regex
`/^(.+)\]\((.+)\)$/` then expects `label](url` shape — see Known Issues.

### Internal state

- `container: HTMLElement` — host element; innerHTML replaced on render.
- `root: HTMLDivElement` — `.rte-root` (toolbar + editor + statusbar).
- `editor: HTMLDivElement` — the `contenteditable` div.
- `toolbar: HTMLDivElement` — the `.rte-toolbar` div (only if `showToolbar`).
- `statusbar: HTMLDivElement` — the `.rte-statusbar` div with mode label + word count.
- `opts: Required<RichTextEditorOptions>` — resolved options with defaults:
  `content: ""`, `realtime: true`, `showToolbar: true`,
  `placeholder: "Start typing... Use # for headings, **bold**, *italic*, `code`, > quote, - list"`,
  `readOnly: false`, `spellcheck: false`.
- `rawContent: string` — the source text (markdown-style). This is the
  source of truth; rendered HTML is derived from it.
- `savedRange: Range | null` — the last saved selection, used by toolbar
  buttons to restore the editor selection before applying a command.
- `inputTimer: ReturnType<typeof setTimeout> | null` — the 300ms
  debounce timer for realtime re-parsing.
- `listeners: Map<string, Set<RichTextEditorHandler>>` — event subscriptions.
- `_destroyed: boolean` — idempotency guard for `destroy()`.

### Events

Emitted via the `Map<string, Set<Handler>>` pattern with try/catch
wrapping per handler (errors are logged with `console.error` and do not
break other handlers).

| Event         | Payload                                                                | When                                                       |
|---------------|------------------------------------------------------------------------|------------------------------------------------------------|
| `change`      | `{ content, html, source: "keyboard" }`                                | After the 300ms input debounce fires (realtime re-parse).  |
| `command`     | `{ componentName, content, source: "pointer" }`                        | A toolbar button or shortcut applied a block/inline component. |
| `mode_change` | `{ source: "programmatic" }`                                           | `toggleRealtime()` was called (button or `setProperty("realtime")`). |

All payloads also include `type` set to the event name.

### CSS custom properties

All declared on `.rte-root` in `injectStyles()`:

| Variable           | Default                    | Purpose                                                        |
|--------------------|----------------------------|----------------------------------------------------------------|
| `--rte-bg`         | `#151519`                  | Editor background.                                             |
| `--rte-surface`    | `#1E1E24`                  | Toolbar and status bar background.                             |
| `--rte-surface-2`  | `#28282E`                  | Button hover, code block background, inline code background.   |
| `--rte-surface-3`  | `#34343C`                  | (Reserved for higher surfaces; not heavily used.)              |
| `--rte-border`     | `#3A3A42`                  | Borders around the root, toolbar, status bar, code blocks.     |
| `--rte-text`       | `#F4F1FF`                  | Primary text color.                                            |
| `--rte-muted`      | `#888894`                  | Toolbar button text, status bar text, quote text.              |
| `--rte-accent`     | `#D9FF66`                  | Lemon Signal — active button, quote border, inline code text, link color. |
| `--rte-accent-dim` | `rgba(217,255,102,0.12)`   | Active button background.                                      |
| `--rte-radius`     | `6px`                      | Root border radius.                                            |

The component also reads external `--font-mono` and `--font-jetbrains`
variables for code rendering (fall back to `ui-monospace, monospace`).

## Coding Conventions

- TypeScript strict, named exports (class + registry + helpers + types).
- `injectStyles()` is idempotent — guarded by
  `document.getElementById(STYLE_ID)`. No-op if the `<style>` already
  exists. Also no-ops on non-DOM environments for SSR safety.
- `destroy()` is idempotent — guarded by a `_destroyed` flag; clears the
  input debounce timer, clears all event listeners, and empties the
  container's innerHTML.
- Events are dispatched through `Map<string, Set<Handler>>` with
  try/catch wrapping per handler (errors are logged via
  `console.error` and do not stop other handlers).
- Registry is a singleton module-level instance; `defineRTEComponent` and
  `defineRTEComponents` are thin wrappers over `rteComponentRegistry.register`.
- The constructor auto-registers built-in components on first use if the
  registry is empty (so a fresh `new RichTextEditor(container)` works
  without an explicit `registerBuiltinRTEComponents()` call). Hosts that
  want to skip built-ins should call `rteComponentRegistry.clear()`
  after construction.
- No React/framework imports in this folder.
- No emojis.

## Known Issues

- **Cursor restoration in realtime mode is approximate.** `restoreCursor(offset)`
  walks text nodes with a `TreeWalker` and places the cursor at the
  matching offset. After a re-parse, the offset is based on `innerText`
  length, which may not align with the new DOM structure if the user's
  edit crossed a block boundary (e.g. just typed `# ` to start a
  heading). For complex edits the cursor can jump to the end. A more
  robust approach would track the cursor in raw-text space and remap.
- **`extractRaw` uses `innerText`.** The function is declared but the
  actual `onInput` handler reads `this.editor.innerText` directly. This
  works in realtime mode (where the editor shows rendered HTML) because
  `innerText` returns the visible text without HTML tags, but it loses
  information about which block/inline components were active — the raw
  markdown syntax is reconstructed only from what `innerText` returns.
  For example, a bold `**text**` rendered as `<strong>text</strong>`
  becomes plain `text` in `innerText`, so on the next re-parse the bold
  is lost. The 300ms debounce hides this for typical typing, but pasting
  rich content or large edits can lose formatting.
- **`applyInlineComponent` uses `String.replace` on `rawContent`.** It
  replaces the first occurrence of the selected text with the wrapped
  version. If the same text appears multiple times in `rawContent`, the
  wrong occurrence may be wrapped. It also does not respect the actual
  selection position — only the string content of the selection.
- **`link` inline component is fragile.** Its trigger is `"["`, which
  the inline matcher treats as an open/close pair, so the inner text is
  everything between two `[` characters. The renderer's regex
  `/^(.+)\]\((.+)\)$/` expects the inner text to be of the form
  `label](url` — but the inline matcher already stripped the trailing
  `[`. This works only when the user writes `[label](url)` with the
  closing bracket on its own; nested or malformed links render as
  escaped raw text.
- **No undo/redo.** Browser-level `contenteditable` undo is unreliable
  after programmatic `innerHTML` replacement; the editor does not
  maintain its own undo stack.
- **No image component.** Images are not in the built-in registry. A
  custom `inline` or `block` component with a `data:` URI or `<img>` tag
  in its render function would work, but the trigger matching would need
  a non-text wrapper.
- **Toolbar rebuilds on every render.** `renderToolbar()` iterates the
  registry; if the registry is mutated after construction, the new
  components do not appear until `render()` is called again (e.g. via
  `setProperty("readOnly", ...)` which triggers a re-render).
- **`setProperty("realtime", false)` calls `toggleRealtime()` which
  emits `mode_change` with `source: "programmatic"`.** This is correct
  but worth noting: toggling realtime programmatically still emits the
  event.

## Debugging Tips

- If the toolbar buttons do nothing, check `opts.readOnly` — all
  `applyBlockComponent` / `applyInlineComponent` calls no-op when
  read-only.
- If realtime re-parsing feels laggy, the 300ms debounce in `onInput()`
  is the dial. Lowering it makes the editor feel more responsive but
  re-parses more often (and may fight the user's typing).
- To inspect what the editor thinks the raw content is, call
  `getContent()` from the console. To see the rendered HTML, call
  `getHtml()`. The two diverge only briefly during the debounce window.
- To add a custom component at runtime without rebuilding the editor:
  ```ts
  defineRTEComponent({
    name: "callout",
    type: "block",
    trigger: "! ",
    toolbarLabel: "Callout",
    toolbarIcon: "!",
    render: (text) => `<div class="rte-callout">${text}</div>`,
  });
  editor.setProperty("readOnly", editor.isRealtime()); // hack to force re-render
  ```
  (There is no public `rerender()` method; toggling a benign property
  that calls `render()` is the current workaround.)
- If the cursor jumps to the end after every keystroke, the realtime
  re-parse is failing to restore position. Check whether your edit
  crossed a block boundary (e.g. just typed `# ` to convert a paragraph
  to a heading). Switching to source mode (`toggleRealtime()`) avoids
  the issue entirely.
- The `command` event's `source` is always `"pointer"` even when the
  command was triggered by a keyboard shortcut (e.g. Meta+B). This is
  because the shortcut handler calls `applyInlineComponent` which always
  emits `source: "pointer"`.
