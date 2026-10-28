# SKILL.md — Rich Text Editor

A pluggable rich-text editor with a component registry, realtime editing, and toolbar commands.

## Quick Start
```ts
import { RichTextEditor, registerBuiltinRTEComponents, defineRTEComponent } from "@/lib/components/rich-text-editor";
registerBuiltinRTEComponents();
const editor = new RichTextEditor(container, { content: "# Hello", realtime: true });
editor.on("change", ({ content, html }) => console.log(content, html));
```

## Custom components
```ts
defineRTEComponent({
  name: "callout", type: "block", trigger: "!! ",
  render: (text) => `<div class="callout">${text}</div>`,
  toolbarLabel: "Callout", toolbarIcon: "❗",
});
```

## Built-in syntax
# H1 · ## H2 · ### H3 · > quote · ``` code block ``` · - bullet · 1. numbered · --- divider · **bold** · *italic* · `code` · [text](url) link
