/**
 * RichTextEditor — a pluggable rich-text editor with a component registry
 * (vanilla TypeScript).
 *
 * Design principles:
 *   - Registry-based: inline and block components are registered with a
 *     syntax trigger (like markdown: # for heading, * for bold, > for quote,
 *     etc.). The host can add custom components and syntax at runtime.
 *   - Realtime mode: when enabled, syntax is rendered live as the user types
 *     (like Obsidian's live preview). When disabled, raw syntax is shown.
 *   - Toolbar: built-in formatting commands (bold, italic, headings, lists,
 *     quotes, code, links) using the shared command registry pattern.
 *   - contenteditable-based: native browser editing, no canvas.
 *
 * Architecture:
 *   - `RTEComponentRegistry`: singleton map of component name → definition.
 *     Each definition has: type (inline/block), trigger (syntax prefix),
 *     render function (text → HTML), and optional toolbar command.
 *   - `RichTextEditor` class: manages the contenteditable area, toolbar,
 *     realtime parsing, and command execution.
 */

// ---- Public types ----

export type RTEComponentType = "inline" | "block";

export interface RTEComponentDef {
  /** Unique name, e.g. "heading1", "bold", "quote", "code-block". */
  name: string;
  type: RTEComponentType;
  /** Syntax trigger. For block: line prefix (e.g. "# ", "## ", "> "). For inline: wrapper (e.g. "**", "*", "`"). */
  trigger?: string;
  /** Render function: takes the inner text, returns HTML string. */
  render: (text: string) => string;
  /** Optional toolbar label/icon for the command. */
  toolbarLabel?: string;
  /** Optional toolbar icon (inline SVG string). */
  toolbarIcon?: string;
  /** Optional keyboard shortcut (e.g. "Meta+B"). */
  shortcut?: string;
}

export interface RichTextEditorOptions {
  content?: string;
  realtime?: boolean;
  showToolbar?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  spellcheck?: boolean;
}

export interface RichTextEditorEventPayload {
  type?: string;
  content?: string;
  html?: string;
  componentName?: string;
  source?: "pointer" | "keyboard" | "programmatic";
}

export type RichTextEditorHandler = (payload: RichTextEditorEventPayload) => void;

// ---- Registry ----

class RTEComponentRegistryImpl {
  private components = new Map<string, RTEComponentDef>();

  register(def: RTEComponentDef): void {
    this.components.set(def.name, { ...def });
  }
  registerAll(defs: RTEComponentDef[]): void {
    for (const d of defs) this.register(d);
  }
  get(name: string): RTEComponentDef | undefined {
    return this.components.get(name);
  }
  has(name: string): boolean {
    return this.components.has(name);
  }
  list(): RTEComponentDef[] {
    return Array.from(this.components.values());
  }
  byType(type: RTEComponentType): RTEComponentDef[] {
    return this.list().filter(c => c.type === type);
  }
  /** Find a block component by line prefix. */
  findBlockByPrefix(line: string): RTEComponentDef | undefined {
    // Sort by trigger length descending so "### " matches before "# "
    const blocks = this.byType("block").filter(c => c.trigger).sort((a, b) => (b.trigger!.length - a.trigger!.length));
    for (const block of blocks) {
      if (line.startsWith(block.trigger!)) return block;
    }
    return undefined;
  }
  /** Find inline components that match within text. */
  findInlineInText(text: string): { component: RTEComponentDef; start: number; end: number; inner: string }[] {
    const results: { component: RTEComponentDef; start: number; end: number; inner: string }[] = [];
    const inlines = this.byType("inline").filter(c => c.trigger);
    for (const inline of inlines) {
      const trigger = inline.trigger!;
      let idx = 0;
      while (idx < text.length) {
        const start = text.indexOf(trigger, idx);
        if (start < 0) break;
        const end = text.indexOf(trigger, start + trigger.length);
        if (end < 0) break;
        const inner = text.slice(start + trigger.length, end);
        results.push({ component: inline, start, end: end + trigger.length, inner });
        idx = end + trigger.length;
      }
    }
    // Sort by start position; resolve overlaps (first match wins)
    results.sort((a, b) => a.start - b.start);
    const filtered: typeof results = [];
    let lastEnd = -1;
    for (const r of results) {
      if (r.start >= lastEnd) {
        filtered.push(r);
        lastEnd = r.end;
      }
    }
    return filtered;
  }
  unregister(name: string): boolean {
    return this.components.delete(name);
  }
  clear(): void {
    this.components.clear();
  }
}

export const rteComponentRegistry = new RTEComponentRegistryImpl();

export function defineRTEComponent(def: RTEComponentDef): void {
  rteComponentRegistry.register(def);
}
export function defineRTEComponents(defs: RTEComponentDef[]): void {
  rteComponentRegistry.registerAll(defs);
}

/** Register the built-in markdown-like components. Call once at init. */
export function registerBuiltinRTEComponents(): void {
  defineRTEComponents([
    // Block components
    { name: "heading1", type: "block", trigger: "# ", toolbarLabel: "H1", toolbarIcon: "<b>H1</b>",
      render: (text) => `<h1 class="rte-h1">${escapeHtml(text)}</h1>` },
    { name: "heading2", type: "block", trigger: "## ", toolbarLabel: "H2", toolbarIcon: "<b>H2</b>",
      render: (text) => `<h2 class="rte-h2">${escapeHtml(text)}</h2>` },
    { name: "heading3", type: "block", trigger: "### ", toolbarLabel: "H3", toolbarIcon: "<b>H3</b>",
      render: (text) => `<h3 class="rte-h3">${escapeHtml(text)}</h3>` },
    { name: "quote", type: "block", trigger: "> ", toolbarLabel: "Quote", toolbarIcon: "❝",
      render: (text) => `<blockquote class="rte-quote">${renderInline(text)}</blockquote>` },
    { name: "code-block", type: "block", trigger: "```", toolbarLabel: "Code", toolbarIcon: "{ }",
      render: (text) => `<pre class="rte-code-block"><code>${escapeHtml(text)}</code></pre>` },
    { name: "bullet", type: "block", trigger: "- ", toolbarLabel: "Bullet", toolbarIcon: "•",
      render: (text) => `<li class="rte-bullet">${renderInline(text)}</li>` },
    { name: "numbered", type: "block", trigger: "1. ", toolbarLabel: "Numbered", toolbarIcon: "1.",
      render: (text) => `<li class="rte-numbered">${renderInline(text)}</li>` },
    { name: "divider", type: "block", trigger: "---", toolbarLabel: "Divider", toolbarIcon: "—",
      render: () => `<hr class="rte-divider"/>` },
    // Inline components
    { name: "bold", type: "inline", trigger: "**", toolbarLabel: "Bold", toolbarIcon: "<b>B</b>", shortcut: "Meta+B",
      render: (text) => `<strong>${escapeHtml(text)}</strong>` },
    { name: "italic", type: "inline", trigger: "*", toolbarLabel: "Italic", toolbarIcon: "<i>I</i>", shortcut: "Meta+I",
      render: (text) => `<em>${escapeHtml(text)}</em>` },
    { name: "code", type: "inline", trigger: "`", toolbarLabel: "Code", toolbarIcon: "<code>&lt;/&gt;</code>", shortcut: "Meta+`",
      render: (text) => `<code class="rte-code-inline">${escapeHtml(text)}</code>` },
    { name: "link", type: "inline", trigger: "[", toolbarLabel: "Link", toolbarIcon: "🔗",
      render: (text) => { const m = text.match(/^(.+)\]\((.+)\)$/); if (m) return `<a href="${escapeHtml(m[2])}" class="rte-link">${escapeHtml(m[1])}</a>`; return escapeHtml(`[${text}]`); } },
  ]);
}

// ---- Helpers ----

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Render inline components within a text string. */
function renderInline(text: string): string {
  const matches = rteComponentRegistry.findInlineInText(text);
  if (matches.length === 0) return escapeHtml(text);
  let result = "";
  let lastEnd = 0;
  for (const m of matches) {
    result += escapeHtml(text.slice(lastEnd, m.start));
    result += m.component.render(m.inner);
    lastEnd = m.end;
  }
  result += escapeHtml(text.slice(lastEnd));
  return result;
}

/** Parse raw text content into rendered HTML (for realtime mode). */
function parseContent(rawText: string): string {
  const lines = rawText.split("\n");
  let html = "";
  let inCodeBlock = false;
  let codeBlockContent = "";
  let inList = false;
  let listType = "";

  for (const line of lines) {
    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        html += `<pre class="rte-code-block"><code>${escapeHtml(codeBlockContent)}</code></pre>`;
        codeBlockContent = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBlockContent += line + "\n";
      continue;
    }

    // Divider
    if (line.trim() === "---") {
      if (inList) { html += `</${listType}>`; inList = false; }
      html += `<hr class="rte-divider"/>`;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      if (inList) { html += `</${listType}>`; inList = false; }
      html += "<br>";
      continue;
    }

    // Block components
    const block = rteComponentRegistry.findBlockByPrefix(line);
    if (block) {
      if (inList && block.name !== listType) { html += `</${listType}>`; inList = false; }
      if (block.name === "bullet" || block.name === "numbered") {
        if (!inList) {
          listType = block.name === "bullet" ? "ul" : "ol";
          html += `<${listType} class="rte-list">`;
          inList = true;
        }
        const innerText = line.slice(block.trigger!.length);
        html += block.render(innerText);
      } else {
        if (inList) { html += `</${listType}>`; inList = false; }
        const innerText = line.slice(block.trigger!.length);
        html += block.render(innerText);
      }
    } else {
      if (inList) { html += `</${listType}>`; inList = false; }
      html += `<p class="rte-paragraph">${renderInline(line)}</p>`;
    }
  }
  if (inList) html += `</${listType}>`;
  if (inCodeBlock) html += `<pre class="rte-code-block"><code>${escapeHtml(codeBlockContent)}</code></pre>`;
  return html;
}

/** Extract raw text from the contenteditable (inverse of parseContent). */
function extractRaw(el: HTMLElement): string {
  // In realtime mode, the content is rendered HTML. We need to extract the
  // raw text representation. For simplicity, we store the raw text in a
  // data attribute and use the rendered HTML for display.
  // Actually, in non-realtime mode, the content IS the raw text.
  // In realtime mode, we parse from the rendered HTML back to raw.
  // For a simple implementation, we use innerText which gives us the text content.
  return el.innerText;
}

// ---- Style injection ----

const STYLE_ID = "rich-text-editor-styles";

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.rte-root {
  --rte-bg: #151519;
  --rte-surface: #1E1E24;
  --rte-surface-2: #28282E;
  --rte-surface-3: #34343C;
  --rte-border: #3A3A42;
  --rte-text: #F4F1FF;
  --rte-muted: #888894;
  --rte-accent: #D9FF66;
  --rte-accent-dim: rgba(217,255,102,0.12);
  --rte-radius: 6px;
  font-family: inherit;
  color: var(--rte-text);
  background: var(--rte-bg);
  border: 1px solid var(--rte-border);
  border-radius: var(--rte-radius);
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
.rte-root * { box-sizing: border-box; }

.rte-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--rte-border);
  background: var(--rte-surface);
  flex-wrap: wrap;
}
.rte-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 24px;
  min-width: 24px;
  padding: 0 5px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--rte-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: color .12s, background .12s, border-color .12s;
  white-space: nowrap;
}
.rte-btn:hover { color: var(--rte-text); background: var(--rte-surface-2); }
.rte-btn:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--rte-accent) 40%, transparent); }
.rte-btn.rte-active { color: var(--rte-accent); background: var(--rte-accent-dim); border-color: var(--rte-accent); }
.rte-sep { width: 1px; height: 18px; background: var(--rte-border); margin: 0 2px; }
.rte-spacer { flex: 1 1 auto; }
.rte-mode-btn {
  font-size: 10px;
  font-family: var(--font-mono, ui-monospace, monospace);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rte-editor {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px;
  outline: none;
  font-size: 14px;
  line-height: 1.6;
  scrollbar-width: thin;
}
.rte-editor::-webkit-scrollbar { width: 8px; }
.rte-editor::-webkit-scrollbar-track { background: transparent; }
.rte-editor::-webkit-scrollbar-thumb { background: var(--rte-border); border-radius: 999px; }
.rte-editor:focus { background: var(--rte-bg); }
.rte-editor.rte-readonly { cursor: default; }
.rte-editor:empty::before {
  content: attr(data-placeholder);
  color: var(--rte-muted);
  font-style: italic;
  pointer-events: none;
}

.rte-editor h1.rte-h1 { font-size: 24px; font-weight: 700; margin: 12px 0 6px; color: var(--rte-text); }
.rte-editor h2.rte-h2 { font-size: 20px; font-weight: 700; margin: 10px 0 5px; color: var(--rte-text); }
.rte-editor h3.rte-h3 { font-size: 16px; font-weight: 600; margin: 8px 0 4px; color: var(--rte-text); }
.rte-editor p.rte-paragraph { margin: 4px 0; }
.rte-editor blockquote.rte-quote {
  border-left: 3px solid var(--rte-accent);
  padding: 4px 12px;
  margin: 6px 0;
  background: var(--rte-surface);
  border-radius: 0 4px 4px 0;
  color: var(--rte-muted);
}
.rte-editor pre.rte-code-block {
  background: var(--rte-surface-2);
  border: 1px solid var(--rte-border);
  border-radius: 4px;
  padding: 10px 12px;
  margin: 6px 0;
  overflow-x: auto;
  font-family: var(--font-jetbrains, ui-monospace, monospace);
  font-size: 12px;
  line-height: 1.5;
}
.rte-editor code.rte-code-inline {
  background: var(--rte-surface-2);
  border: 1px solid var(--rte-border);
  border-radius: 3px;
  padding: 1px 4px;
  font-family: var(--font-jetbrains, ui-monospace, monospace);
  font-size: 12px;
  color: var(--rte-accent);
}
.rte-editor ul.rte-list, .rte-editor ol.rte-list {
  margin: 4px 0;
  padding-left: 24px;
}
.rte-editor ul.rte-list { list-style: disc; }
.rte-editor ol.rte-list { list-style: decimal; }
.rte-editor li.rte-bullet, .rte-editor li.rte-numbered {
  margin: 2px 0;
}
.rte-editor hr.rte-divider {
  border: none;
  border-top: 1px solid var(--rte-border);
  margin: 12px 0;
}
.rte-editor a.rte-link {
  color: var(--rte-accent);
  text-decoration: underline;
  cursor: pointer;
}
.rte-editor strong { font-weight: 700; color: var(--rte-text); }
.rte-editor em { font-style: italic; }

.rte-statusbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  border-top: 1px solid var(--rte-border);
  background: var(--rte-surface);
  font-size: 10px;
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--rte-muted);
}
`;
  document.head.appendChild(el);
}

// ---- Icons ----

// ---- Component ----

export class RichTextEditor {
  private container: HTMLElement;
  private root!: HTMLDivElement;
  private editor!: HTMLDivElement;
  private toolbar!: HTMLDivElement;
  private statusbar!: HTMLDivElement;
  private opts: Required<RichTextEditorOptions>;
  private rawContent: string;
  private listeners = new Map<string, Set<RichTextEditorHandler>>();
  private _destroyed = false;
  private inputTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(container: HTMLElement, options: RichTextEditorOptions = {}) {
    this.container = container;
    injectStyles();
    // Ensure built-in components are registered
    if (rteComponentRegistry.list().length === 0) {
      registerBuiltinRTEComponents();
    }
    this.opts = {
      content: options.content ?? "",
      realtime: options.realtime ?? true,
      showToolbar: options.showToolbar ?? true,
      placeholder: options.placeholder ?? "Start typing... Use # for headings, **bold**, *italic*, `code`, > quote, - list",
      readOnly: options.readOnly ?? false,
      spellcheck: options.spellcheck ?? false,
    };
    this.rawContent = this.opts.content;
    this.render();
  }

  private render(): void {
    if (this._destroyed) return;
    const root = document.createElement("div");
    root.className = "rte-root";

    if (this.opts.showToolbar) {
      root.appendChild(this.renderToolbar());
    }

    const editor = document.createElement("div");
    editor.className = "rte-editor";
    editor.setAttribute("contenteditable", this.opts.readOnly ? "false" : "true");
    editor.setAttribute("spellcheck", String(this.opts.spellcheck));
    editor.setAttribute("data-placeholder", this.opts.placeholder);
    editor.style.minHeight = "200px";
    if (this.opts.readOnly) editor.classList.add("rte-readonly");

    // Input handler
    editor.addEventListener("input", () => this.onInput());
    editor.addEventListener("keydown", (e) => this.onKeyDown(e));
    // Save selection on mouseup/keyup so toolbar buttons can restore it
    editor.addEventListener("mouseup", () => this.saveSelection());
    editor.addEventListener("keyup", () => this.saveSelection());
    editor.addEventListener("focus", () => this.saveSelection());

    root.appendChild(editor);
    this.editor = editor;

    // Set content (after this.editor is assigned)
    this.updateEditorContent();

    // Status bar
    const statusbar = document.createElement("div");
    statusbar.className = "rte-statusbar";
    const modeLabel = document.createElement("span");
    modeLabel.textContent = this.opts.realtime ? "REALTIME" : "SOURCE";
    modeLabel.setAttribute("data-mode-label", "true");
    statusbar.appendChild(modeLabel);
    const wordCount = document.createElement("span");
    wordCount.textContent = `${this.getWordCount()} words`;
    wordCount.setAttribute("data-word-count", "true");
    statusbar.appendChild(wordCount);
    root.appendChild(statusbar);
    this.statusbar = statusbar;

    this.container.innerHTML = "";
    this.container.appendChild(root);
    this.root = root;
  }

  private renderToolbar(): HTMLElement {
    const tb = document.createElement("div");
    tb.className = "rte-toolbar";

    // Block formatting buttons
    const blockBtns = rteComponentRegistry.byType("block").filter(c => c.toolbarLabel);
    for (const comp of blockBtns) {
      const btn = this.toolbarBtn(comp.toolbarIcon ?? comp.toolbarLabel ?? comp.name, comp.toolbarLabel ?? comp.name, () => this.applyBlockComponent(comp.name));
      tb.appendChild(btn);
    }

    tb.appendChild(this.sep());

    // Inline formatting buttons
    const inlineBtns = rteComponentRegistry.byType("inline").filter(c => c.toolbarLabel);
    for (const comp of inlineBtns) {
      const btn = this.toolbarBtn(comp.toolbarIcon ?? comp.toolbarLabel ?? comp.name, comp.toolbarLabel ?? comp.name, () => this.applyInlineComponent(comp.name));
      tb.appendChild(btn);
    }

    tb.appendChild(this.spacer());

    // Mode toggle
    const modeBtn = document.createElement("button");
    modeBtn.type = "button";
    modeBtn.className = "rte-btn rte-mode-btn";
    modeBtn.textContent = this.opts.realtime ? "Source" : "Preview";
    modeBtn.setAttribute("title", "Toggle realtime/source mode");
    modeBtn.addEventListener("mousedown", (e) => e.preventDefault());
    modeBtn.addEventListener("click", () => this.toggleRealtime());
    modeBtn.setAttribute("data-mode-btn", "true");
    tb.appendChild(modeBtn);

    this.toolbar = tb;
    return tb;
  }

  private savedRange: Range | null = null;

  private saveSelection(): void {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && this.editor.contains(sel.anchorNode)) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    }
  }

  private toolbarBtn(icon: string, label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rte-btn";
    btn.innerHTML = icon;
    btn.setAttribute("title", label);
    btn.setAttribute("aria-label", label);
    // CRITICAL: prevent mousedown from stealing focus from the editor
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      // Save the current selection before the click
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        this.savedRange = sel.getRangeAt(0).cloneRange();
      }
    });
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // Restore the saved selection
      if (this.savedRange) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(this.savedRange);
      }
      // Focus the editor
      this.editor.focus();
      onClick();
    });
    return btn;
  }
  private sep(): HTMLElement { const s = document.createElement("div"); s.className = "rte-sep"; return s; }
  private spacer(): HTMLElement { const s = document.createElement("div"); s.className = "rte-spacer"; return s; }

  private updateEditorContent(): void {
    if (this.opts.realtime) {
      this.editor.innerHTML = parseContent(this.rawContent);
    } else {
      this.editor.textContent = this.rawContent;
    }
  }

  private onInput(): void {
    // Debounce re-parse in realtime mode
    if (this.inputTimer) clearTimeout(this.inputTimer);
    this.inputTimer = setTimeout(() => {
      if (this.opts.realtime) {
        // Extract raw text from the editor
        this.rawContent = this.editor.innerText;
        // Re-parse and re-render, preserving cursor position approximately
        const sel = window.getSelection();
        const offset = sel?.anchorOffset ?? 0;
        this.editor.innerHTML = parseContent(this.rawContent);
        // Try to restore cursor
        this.restoreCursor(offset);
      } else {
        this.rawContent = this.editor.innerText;
      }
      this.updateStatusbar();
      this.emit("change", { content: this.rawContent, html: this.opts.realtime ? this.editor.innerHTML : parseContent(this.rawContent), source: "keyboard" });
    }, 300);
  }

  private restoreCursor(offset: number): void {
    const sel = window.getSelection();
    if (!sel || !this.editor.firstChild) return;
    const range = document.createRange();
    let node: Node | null = this.editor;
    let remaining = Math.min(offset, this.editor.innerText.length);
    // Walk text nodes
    const walker = document.createTreeWalker(this.editor, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      if (textNode.textContent && remaining <= textNode.textContent.length) {
        range.setStart(textNode, remaining);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      remaining -= textNode.textContent?.length ?? 0;
    }
    // Fallback: place cursor at end
    range.selectNodeContents(this.editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Shortcuts
    const inlines = rteComponentRegistry.byType("inline").filter(c => c.shortcut);
    for (const comp of inlines) {
      if (e.key === comp.shortcut!.split("+").pop() && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.applyInlineComponent(comp.name);
        return;
      }
    }
    // Enter: in realtime mode, let the browser handle it but debounce re-parse
    // Tab: insert spaces
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "  ");
    }
  }

  // ---- Command execution ----

  /** Apply a block component at the current cursor line. */
  applyBlockComponent(name: string): void {
    if (this.opts.readOnly) return;
    const comp = rteComponentRegistry.get(name);
    if (!comp || comp.type !== "block") return;
    // Ensure the editor has focus
    this.editor.focus();
    const sel = window.getSelection();
    if ((!sel || !sel.anchorNode || !this.editor.contains(sel.anchorNode)) && this.savedRange) {
      sel?.removeAllRanges();
      sel?.addRange(this.savedRange);
    }
    if (!sel || !sel.anchorNode) return;

    // Get the current line
    const editorText = this.editor.innerText;
    const caretPos = this.getCaretPosition();
    const lines = editorText.split("\n");
    let pos = 0;
    let lineIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (pos + lines[i].length >= caretPos) { lineIdx = i; break; }
      pos += lines[i].length + 1;
    }

    // Toggle: if the line already starts with this trigger, remove it
    const line = lines[lineIdx];
    if (comp.trigger && line.startsWith(comp.trigger)) {
      lines[lineIdx] = line.slice(comp.trigger.length);
    } else if (comp.trigger) {
      // Remove other block triggers first
      const existingBlock = rteComponentRegistry.findBlockByPrefix(line);
      if (existingBlock) {
        lines[lineIdx] = line.slice(existingBlock.trigger!.length);
      }
      lines[lineIdx] = comp.trigger + lines[lineIdx];
    }

    this.rawContent = lines.join("\n");
    this.updateEditorContent();
    this.updateStatusbar();
    this.emit("command", { componentName: name, content: this.rawContent, source: "pointer" });
  }

  /** Apply an inline component to the selection. */
  applyInlineComponent(name: string): void {
    if (this.opts.readOnly) return;
    const comp = rteComponentRegistry.get(name);
    if (!comp || comp.type !== "inline" || !comp.trigger) return;
    // Get the current selection text (from saved range or live selection)
    let selectedText = "";
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && this.editor.contains(sel.anchorNode)) {
      selectedText = sel.toString();
    } else if (this.savedRange) {
      selectedText = this.savedRange.toString();
    }
    if (!selectedText) {
      // No selection — insert empty trigger pair at cursor
      // Just append the trigger to rawContent and re-render
      this.rawContent += comp.trigger + comp.trigger;
      this.updateEditorContent();
    } else {
      // Replace the selected text with trigger-wrapped version in rawContent
      // Toggle: if already wrapped, unwrap
      const wrapped = comp.trigger + selectedText + comp.trigger;
      const unwrapped = selectedText;
      if (this.rawContent.includes(wrapped)) {
        this.rawContent = this.rawContent.replace(wrapped, unwrapped);
      } else {
        this.rawContent = this.rawContent.replace(selectedText, wrapped);
      }
      this.updateEditorContent();
    }
    this.updateStatusbar();
    this.emit("command", { componentName: name, content: this.rawContent, source: "pointer" });
  }

  private getCaretPosition(): number {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(this.editor);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString().length;
  }

  private updateStatusbar(): void {
    const wc = this.statusbar.querySelector("[data-word-count]");
    if (wc) wc.textContent = `${this.getWordCount()} words`;
  }

  getWordCount(): number {
    return this.rawContent.trim().split(/\s+/).filter(s => s.length > 0).length;
  }

  // ---- Public API ----

  getContent(): string { return this.rawContent; }
  getHtml(): string { return this.opts.realtime ? this.editor.innerHTML : parseContent(this.rawContent); }

  setContent(content: string): void {
    if (this._destroyed) return;
    this.rawContent = content;
    this.updateEditorContent();
    this.updateStatusbar();
  }

  toggleRealtime(): void {
    this.opts.realtime = !this.opts.realtime;
    this.updateEditorContent();
    // Update mode label
    const modeLabel = this.statusbar.querySelector("[data-mode-label]");
    if (modeLabel) modeLabel.textContent = this.opts.realtime ? "REALTIME" : "SOURCE";
    // Update mode button
    const modeBtn = this.toolbar?.querySelector("[data-mode-btn]");
    if (modeBtn) (modeBtn as HTMLElement).textContent = this.opts.realtime ? "Source" : "Preview";
    this.emit("mode_change", { source: "programmatic" });
  }

  isRealtime(): boolean { return this.opts.realtime; }

  setProperty(name: string, value: unknown): void {
    if (this._destroyed) return;
    switch (name) {
      case "realtime": if (this.opts.realtime !== !!value) this.toggleRealtime(); break;
      case "readOnly": this.opts.readOnly = !!value; this.render(); break;
      case "spellcheck": this.opts.spellcheck = !!value; this.editor.setAttribute("spellcheck", String(this.opts.spellcheck)); break;
      case "content": this.setContent(value as string); break;
      case "placeholder": this.opts.placeholder = value as string; this.editor.setAttribute("data-placeholder", this.opts.placeholder); break;
      default: return;
    }
  }

  on(event: string, handler: RichTextEditorHandler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }
  off(event: string, handler: RichTextEditorHandler): void {
    this.listeners.get(event)?.delete(handler);
  }
  private emit(event: string, payload: RichTextEditorEventPayload): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const p = { ...payload, type: event };
    for (const h of set) { try { h(p); } catch (e) { console.error(e); } }
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this.inputTimer) clearTimeout(this.inputTimer);
    this.listeners.clear();
    this.container.innerHTML = "";
  }
}
