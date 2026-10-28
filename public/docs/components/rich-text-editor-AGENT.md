# AGENT.md — Rich Text Editor

A pluggable rich-text editor with a component registry (markdown-like syntax), realtime editing mode (Obsidian-style live preview), and toolbar commands.

## Architecture
- `rich-text-editor.ts` — `RichTextEditor` class + `RTEComponentRegistry` singleton.
- **Registry**: `RTEComponentDef` has name, type (inline/block), trigger (syntax prefix/wrapper), render function, toolbar label/icon, shortcut. Built-in components: heading1-3, quote, code-block, bullet, numbered, divider, bold, italic, code, link.
- **Realtime mode**: content is parsed and rendered live as the user types (debounced 300ms). Cursor position is preserved across re-renders.
- **Source mode**: raw syntax is shown as plain text.
- **Toolbar**: buttons for each registered component with a toolbarLabel. Source/Preview toggle button.
- **Parsing**: `parseContent(rawText)` splits by lines, matches block prefixes, handles code blocks (```), lists, and inline formatting within blocks.
- **Inline rendering**: `renderInline(text)` finds inline triggers (**bold**, *italic*, `code`) and wraps them.
- **Custom components**: `defineRTEComponent(def)` or `rteComponentRegistry.register(def)` at runtime.
- Scoped CSS (.rte- prefix).
