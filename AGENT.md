# AGENT.md — Workshop Component Library

This file is the contribution router for the Workshop component-library platform.
It is intended for AI agents and human contributors who need to **modify, extend,
or debug** the codebase. For usage documentation (how to *use* a component), see
[SKILL.md](./SKILL.md) instead.

---

## 1. Project Overview

Workshop is a **vanilla JavaScript UI component library** — every component is a
plain TypeScript class that owns its DOM, renders to `<canvas>` or builds DOM
directly, and exposes a small imperative public API (`constructor`,
`setColor(...)`, `on(event, handler)`, `destroy()`). Components have **zero
dependencies** on React, Next.js, or any other framework.

The platform around them is a **Next.js 16** application that acts as a
documentation / showcase site. It is dark-themed, client-side routed via a
Zustand store (only the `/` route is user-visible — every "page" is a view
component switched on `route.name`), and provides:

- A global shell (header, sidebar, footer, search palette, mobile nav).
- A directory of components grouped by category.
- A per-component playground: live preview ↔ property inspector ↔ generated
  code (JS/HTML/CSS/API tabs).
- Documentation pages, examples, changelog, and contributing views.

Components are split across three layers:

| Layer           | Path                                  | Purpose                                                        |
|-----------------|---------------------------------------|----------------------------------------------------------------|
| Vanilla core    | `src/lib/components/<name>/`          | The framework-independent TypeScript class + barrel `index.ts` |
| React wrapper   | `src/components/<name>/<name>-react.tsx` | Thin React wrapper that owns the instance and forwards props  |
| Playground      | `src/components/<name>/<name>-playground.tsx` | The component-detail view (preview + inspector + code panel)  |

Cross-cutting modules:

| Module     | Path                          | Purpose                                                       |
|------------|-------------------------------|---------------------------------------------------------------|
| Commands   | `src/lib/commands/`           | Declarative command registry + keyboard shortcut utilities    |
| Platform   | `src/lib/platform/`           | Single source of truth for component/category/docs metadata   |
| Navigation | `src/store/navigation.ts`     | Zustand client-side routing store                             |
| Utils      | `src/lib/utils.ts`            | `cn()` class-name helper                                      |
| DB         | `src/lib/db.ts`, `prisma/`    | Prisma client (unused by components; available for future use)|

---

## 2. Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript 5 — non-negotiable.
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York style) + Lucide icons.
- **State (client)**: Zustand for navigation/UI, TanStack Query not used (no
  server state at present).
- **Database**: Prisma (SQLite client). Schema in `prisma/schema.prisma`,
  client in `src/lib/db.ts`.
- **Fonts**: Inter (sans) + JetBrains Mono (mono), configured in
  `src/app/layout.tsx` via `next/font`.
- **Theme**: `next-themes`, dark by default.
- **Linting/build**: ESLint (Next.js + TypeScript rules); run `bun run lint`.

Vanilla components must NOT import React, Next.js, or any of the platform's
client-side stores. They live under `src/lib/components/` and are pure DOM +
TypeScript.

---

## 3. Architecture

```
src/
  app/
    layout.tsx            Root layout: fonts, ThemeProvider, Toaster
    page.tsx              Single route — switches on navigation.route.name
    globals.css           Design tokens, scoped utilities
  components/
    ui/                   shadcn/ui components (do not edit)
    platform/             Shell chrome (header, sidebar, footer, ...)
    views/                Top-level view components (home, docs, etc.)
    <name>/               Per-component: wrapper + playground
  lib/
    components/<name>/    Vanilla TS component + index.ts barrel
    commands/             Command registry + shortcuts
    platform/             content.ts metadata
    utils.ts              cn()
    db.ts                 Prisma client
  store/
    navigation.ts         Zustand routing store
prisma/
  schema.prisma
```

### 3.1 Component lifecycle (vanilla)

Each component follows the same pattern:

1. **Constructor** receives `(container: HTMLElement, options?: T)`.
2. Resolves options against `DEFAULTS`.
3. Calls `injectStyles()` — a scoped `<style id="<component>-styles">` is
   appended to `document.head` once per document.
4. Creates its DOM (a `<canvas>` for canvas-based components, a `<div>` /
   `<button>` tree for DOM-based ones) and appends it to `container`.
5. Binds pointer / keyboard / wheel / resize listeners (bound references are
   stored on the instance so `removeEventListener` works in `destroy()`).
6. Performs the first render.
7. Optionally starts a `ResizeObserver` to handle DPR / size changes.

`destroy()` must be **idempotent**: remove all listeners, release pointer
capture, disconnect observers, clear the listener map, remove DOM, and clear
caches. A `_destroyed` flag guards re-entrant calls.

### 3.2 Rendering (canvas components)

- Canvas is sized in CSS pixels and scaled by `window.devicePixelRatio` for
  crispness: `canvas.width = totalW * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.
- Heavy renders (hue wheel, color triangles, gradient tracks) are cached on an
  offscreen `<canvas>` keyed by a string built from the inputs that affect the
  pixels (e.g. `track-${mode}-${orientation}-${tLen}-${tThick}-${dpr}-${color}`).
  Drag interactions only redraw the cheap markers/thumbs on top.
- `scheduleRender()` batches paints via `requestAnimationFrame` and is a no-op
  when `_destroyed` is set.

### 3.3 Pointer interaction

All canvas components use `PointerEvent` (mouse + touch + pen unified) and call
`setPointerCapture(pointerId)` on `pointerdown` so drags continue outside the
element. The interaction state machine lives on `this.pointerState` (a tagged
union — see each component's AGENT.md for its specific shape).

### 3.4 Event emitter

Each component owns a tiny `Map<string, Set<Handler>>` emitter:

- `on(event, handler)` adds to the set.
- `off(event, handler)` removes from the set.
- `emit(event, payload)` clones the set to an array (so handlers that
  unsubscribe during dispatch don't skip siblings) and wraps each call in
  `try/catch` so one bad handler can't crash the others.
- `destroy()` calls `listeners.clear()`.

Standard events: `input` (continuous — fires on every move), `change`
(committed — fires on `pointerup`/`pointercancel` or on programmatic setters).

### 3.5 React wrapper pattern

`<name>-react.tsx` is a `"use client"` component that:

1. `useRef` for the container div and the vanilla instance.
2. Mounts the instance **once** in a `useEffect(() => { ... return () => instance.destroy() }, [])`
   (with `eslint-disable-next-line react-hooks/exhaustive-deps` because the
   effect intentionally only runs once).
3. A separate `useEffect` per prop forwards the value to the imperative API
   when it changes (e.g. `useEffect(() => instance.setColor(color), [color])`).
4. Forwards `input`/`change` events to props callbacks via `instance.on(...)` /
   `instance.off(...)` in the mount effect.

**Never re-create the instance on every render** — the vanilla component owns
its DOM and state. See `src/lib/platform/` AGENT.md and the docs-concepts view
for more.

### 3.6 Playground pattern

`<name>-playground.tsx` is the component-detail view. It composes:

- A live preview (the React wrapper).
- A property inspector (controlled inputs bound to local React state, mirrored
  into the wrapper via props).
- An output bar showing the current color / value / selection, with copy
  buttons.
- A code panel with four tabs (JavaScript / HTML / CSS / API) whose contents
  are derived from the playground state with `useMemo`.

Navigation into a playground happens through the `component` route
(`{ name: "component", category, slug }`); `page.tsx` maps the slug to the
right view component.

### 3.7 Client-side routing

`src/store/navigation.ts` holds a `route` discriminated union
(`home | components | category | component | docs | docs-* | examples | example |
resources | changelog | contributing`). `page.tsx` reads `route` from the store
and renders the matching view from `src/components/views/` (or the per-component
playground for `component`). There is no Next.js router navigation — the back
button does not move between views (by design).

---

## 4. Design System

- **Obsidian** `#101014` — primary background.
- **Deep Violet** `#211A30` — secondary surface / panels.
- **Lemon Signal** `#D9FF66` — accent / interactive highlight.
- **Soft Lavender** — secondary accent (used sparingly, e.g. event badges).
- Dark theme by default. Light theme is supported via `next-themes`.
- **Forbidden colors**: indigo / blue unless explicitly requested by a task.
- Fonts: Inter (UI), JetBrains Mono (code, mono labels).
- Tokens are CSS custom properties defined in `src/app/globals.css`
  (`--surface`, `--text-primary`, `--border`, `--brand-lemon`, etc.).
- Each vanilla component injects its own scoped `<style>` with `--<component>-*`
  custom properties; host apps can override them.

---

## 5. Contribution Guidelines

### 5.1 Adding a new component

1. **Create the vanilla class** at `src/lib/components/<name>/<name>.ts`:
   - Export the class, the options interface, and any necessary types.
   - Follow the constructor / `destroy()` / EventEmitter pattern documented
     above. Use `injectStyles()` with a unique `STYLE_ID`.
   - Do NOT import React or any platform module.
2. **Create the barrel** at `src/lib/components/<name>/index.ts` re-exporting
   the public API.
3. **Create the React wrapper** at `src/components/<name>/<name>-react.tsx`.
4. **Create the playground** at `src/components/<name>/<name>-playground.tsx`.
5. **Register metadata** in `src/lib/platform/content.ts`:
   - Add a `ComponentMeta` entry to `components` (slug, name, category,
     description, properties, methods, events, defaults, tags, whenToUse /
     whenNotToUse).
   - If the category is new, add a `CategoryMeta` entry to `categories`.
6. **Register commands** (optional) in `src/lib/commands/index.ts` and
   document them in `src/lib/commands/AGENT.md`.
7. **Wire the route** in `src/app/page.tsx` so `{ name: "component", category,
   slug: "<name>" }` renders the playground.
8. **Update navigation labels** in `src/store/navigation.ts` if necessary
   (`routeLabel`, `breadcrumbs`, slug→name maps).
9. **Document** the new component by creating `AGENT.md` and `SKILL.md` in
   `src/lib/components/<name>/`, then linking them from this file's router
   section (§9) and from `SKILL.md`.
10. Run `bun run lint` — must be 0 errors / 0 warnings on the new files.

### 5.2 Modifying an existing component

1. Read the component's `AGENT.md` first — it documents internal architecture,
   key algorithms, and known issues / TODOs.
2. Keep the public API stable. If you must change it, update the component's
   `SKILL.md`, the `ComponentMeta` in `content.ts`, and the playground.
3. Don't introduce framework dependencies in `src/lib/components/`.
4. Don't break `destroy()` idempotency or the `_destroyed` guard.
5. If you change a canvas render path, verify the cache key still covers every
   input that affects the cached pixels (otherwise you'll see stale renders).
6. If you fix or close a known issue, remove the entry from the component's
   `AGENT.md` "Known issues" section and note the fix in the worklog.

### 5.3 Debugging tips

- Canvas looks wrong / blurry? Check `dpr` handling in `updateCanvasSize()`
  and confirm `ctx.setTransform(dpr, ...)` was called.
- Markers / thumbs clip at the edge? Many components removed
  `border-radius: 50%` for exactly this reason — don't re-add it without
  confirming the markers don't sit on the edge.
- Pointer drag escapes? Confirm `setPointerCapture` is called and the matching
  `releasePointerCapture` is in `destroy()`.
- Listener leak / "Cannot read property of destroyed"? The `_destroyed` flag
  must short-circuit `scheduleRender`, async callbacks, and ResizeObserver
  notifications.
- Stale cached canvas? Verify the cache key includes every varying input;
  invalidate the cache (set the key to `""` or null the cache) when the inputs
  change.

---

## 6. Coding Conventions

- TypeScript throughout, strict typing. Avoid `any` except for handler
  payloads in event emitters (where callers supply their own typed payload).
- ES modules, named exports. Default exports are reserved for React view
  components consumed by `page.tsx`.
- Use `'use client'` on React components that use hooks / browser APIs.
- Use `'use server'` only for API route handlers (none currently).
- shadcn/ui components in `src/components/ui/` are vendored — prefer them over
  custom HTML. Do not edit them.
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes.
- No emojis in code, comments, or docs.
- No test files (per project policy — verification is done via the dev server
  log + VLM screenshot review).

---

## 7. Known Issues (Global)

These affect the platform as a whole. Component-specific issues live in each
component's `AGENT.md`.

- **Board's items resizing displacement at non-0 rotation** — the AABB-based
  resize math doesn't perfectly maintain item position when items are rotated.
  The current approach computes new AABB dimensions and positions the item
  center from the new AABB, but small drift can still occur during continuous
  drag. Needs a more robust approach, possibly tracking the item's corner
  positions in board space directly. See
  [`src/lib/components/board/AGENT.md`](./src/lib/components/board/AGENT.md).
- The browser back button does not navigate between in-app views (by design —
  routing is Zustand-only). A future enhancement could push state to
  `history.pushState` and listen for `popstate`.
- Planned components (`color-field`, `palette`, `range-control`, …) are listed
  in `content.ts` as `plannedComponents` and appear disabled in the directory.
  Their slugs must not collide with shipped components.

---

## 8. File Structure Overview

```
.
├── AGENT.md                      ← this file (contribution router)
├── SKILL.md                      ← usage router (links to per-component SKILL.md)
├── worklog.md                    ← shared multi-agent worklog (read first, append on done)
├── agent-ctx/                    ← per-task agent notes (named {taskID}-{agent}.md)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── eslint.config.mjs
├── next.config.ts
├── Caddyfile                     ← gateway config (XTransformPort routing)
├── prisma/
│   └── schema.prisma
├── db/
│   └── custom.db
├── public/
│   ├── logo.svg
│   └── robots.txt
├── examples/                     ← websocket demo (not part of the library)
├── upload/                       ← original spec files (PRD, Architecture, etc.)
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   └── api/route.ts
    ├── components/
    │   ├── ui/                   ← shadcn/ui (vendored, do not edit)
    │   ├── platform/             ← shell chrome
    │   ├── views/                ← top-level views
    │   ├── theme-editor/         ← live design-token editor view
    │   ├── <name>/               ← per-component React wrapper + playground
    │   └── socket-nodes-graph/   ← React-only wrapper (no vanilla core)
    ├── lib/
    │   ├── components/           ← 27 vanilla cores, each has AGENT.md + SKILL.md
    │   │   ├── color-wheel/      ← AGENT.md, SKILL.md, *.ts
    │   │   ├── color-range/
    │   │   ├── color-circle/
    │   │   ├── color-ramp/
    │   │   ├── periodic-range/
    │   │   ├── calendar/
    │   │   ├── custom-button/
    │   │   ├── toggle-group/
    │   │   ├── rich-text-editor/
    │   │   ├── smart-context-menu/
    │   │   ├── smart-tooltip/
    │   │   ├── board/
    │   │   ├── nodes-graph/
    │   │   ├── collapse/
    │   │   ├── carousel/
    │   │   ├── scroll-layout/
    │   │   ├── drawer/
    │   │   ├── marquee/
    │   │   ├── connection-path/
    │   │   ├── avatar/
    │   │   ├── badge/
    │   │   ├── timeline/
    │   │   ├── table-editor/
    │   │   ├── kanban/
    │   │   ├── gantt/
    │   │   ├── animation-track-editor/
    │   │   └── breadcrumb/
    │   ├── commands/             ← AGENT.md, SKILL.md, *.ts
    │   ├── platform/             ← AGENT.md, SKILL.md, content.ts
    │   ├── utils.ts
    │   └── db.ts
    ├── store/
    │   └── navigation.ts
    └── hooks/
        ├── use-toast.ts
        └── use-mobile.ts
```

---

## 9. Router — Per-Folder AGENT.md Files

Open the matching AGENT.md before editing files in that folder.

### Components

Organized by the same category slugs used in
`src/lib/platform/content.ts` (`color`, `inputs`, `layout`, `data-display`,
`productivity`, `navigation`).

#### Color

| Folder                                  | AGENT.md                                                                  |
|-----------------------------------------|---------------------------------------------------------------------------|
| `src/lib/components/color-wheel/`       | [color-wheel/AGENT.md](./src/lib/components/color-wheel/AGENT.md)         |
| `src/lib/components/color-range/`       | [color-range/AGENT.md](./src/lib/components/color-range/AGENT.md)         |
| `src/lib/components/color-circle/`      | [color-circle/AGENT.md](./src/lib/components/color-circle/AGENT.md)       |
| `src/lib/components/color-ramp/`        | [color-ramp/AGENT.md](./src/lib/components/color-ramp/AGENT.md)           |

#### Inputs

| Folder                                    | AGENT.md                                                                      |
|-------------------------------------------|-------------------------------------------------------------------------------|
| `src/lib/components/periodic-range/`      | [periodic-range/AGENT.md](./src/lib/components/periodic-range/AGENT.md)       |
| `src/lib/components/calendar/`            | [calendar/AGENT.md](./src/lib/components/calendar/AGENT.md)                   |
| `src/lib/components/custom-button/`       | [custom-button/AGENT.md](./src/lib/components/custom-button/AGENT.md)         |
| `src/lib/components/toggle-group/`        | [toggle-group/AGENT.md](./src/lib/components/toggle-group/AGENT.md)           |
| `src/lib/components/rich-text-editor/`    | [rich-text-editor/AGENT.md](./src/lib/components/rich-text-editor/AGENT.md)   |

#### Layout

| Folder                                      | AGENT.md                                                                        |
|---------------------------------------------|---------------------------------------------------------------------------------|
| `src/lib/components/smart-context-menu/`    | [smart-context-menu/AGENT.md](./src/lib/components/smart-context-menu/AGENT.md) |
| `src/lib/components/smart-tooltip/`         | [smart-tooltip/AGENT.md](./src/lib/components/smart-tooltip/AGENT.md)           |
| `src/lib/components/board/`                 | [board/AGENT.md](./src/lib/components/board/AGENT.md)                           |
| `src/lib/components/nodes-graph/`           | [nodes-graph/AGENT.md](./src/lib/components/nodes-graph/AGENT.md)               |
| `src/lib/components/collapse/`              | [collapse/AGENT.md](./src/lib/components/collapse/AGENT.md)                     |
| `src/lib/components/carousel/`              | [carousel/AGENT.md](./src/lib/components/carousel/AGENT.md)                     |
| `src/lib/components/scroll-layout/`         | [scroll-layout/AGENT.md](./src/lib/components/scroll-layout/AGENT.md)           |
| `src/lib/components/drawer/`                | [drawer/AGENT.md](./src/lib/components/drawer/AGENT.md)                         |
| `src/lib/components/marquee/`               | [marquee/AGENT.md](./src/lib/components/marquee/AGENT.md)                       |
| `src/lib/components/connection-path/`       | [connection-path/AGENT.md](./src/lib/components/connection-path/AGENT.md)       |

#### Data Display

| Folder                                    | AGENT.md                                                                      |
|-------------------------------------------|-------------------------------------------------------------------------------|
| `src/lib/components/avatar/`              | [avatar/AGENT.md](./src/lib/components/avatar/AGENT.md)                       |
| `src/lib/components/badge/`               | [badge/AGENT.md](./src/lib/components/badge/AGENT.md)                         |
| `src/lib/components/timeline/`            | [timeline/AGENT.md](./src/lib/components/timeline/AGENT.md)                   |
| `src/lib/components/table-editor/`        | [table-editor/AGENT.md](./src/lib/components/table-editor/AGENT.md)           |

#### Productivity

| Folder                                            | AGENT.md                                                                                  |
|---------------------------------------------------|-------------------------------------------------------------------------------------------|
| `src/lib/components/kanban/`                       | [kanban/AGENT.md](./src/lib/components/kanban/AGENT.md)                                   |
| `src/lib/components/gantt/`                        | [gantt/AGENT.md](./src/lib/components/gantt/AGENT.md)                                     |
| `src/lib/components/animation-track-editor/`       | [animation-track-editor/AGENT.md](./src/lib/components/animation-track-editor/AGENT.md)   |

#### Navigation

| Folder                              | AGENT.md                                                          |
|-------------------------------------|-------------------------------------------------------------------|
| `src/lib/components/breadcrumb/`    | [breadcrumb/AGENT.md](./src/lib/components/breadcrumb/AGENT.md)   |

> **Note — `socket-nodes-graph`**: registered in `content.ts` under the
> `layout` category, but lives only in `src/components/socket-nodes-graph/`
> as a React wrapper around `nodes-graph` (adds socket.io real-time sync).
> There is no vanilla core under `src/lib/components/`, so it has no
> per-folder AGENT.md. See the worklog for its conventions.

### Cross-cutting modules

| Folder                    | AGENT.md                                                  |
|---------------------------|-----------------------------------------------------------|
| `src/lib/commands/`       | [commands/AGENT.md](./src/lib/commands/AGENT.md)         |
| `src/lib/platform/`       | [platform/AGENT.md](./src/lib/platform/AGENT.md)         |

### Platform chrome & views (no per-folder AGENT.md)

These folders do not yet have dedicated AGENT.md files. Conventions are
documented in the worklog and in this file:

- `src/components/platform/` — shell chrome (header, sidebar, footer, search
  palette, code-block, breadcrumbs, shell, brand, theme-toggle, mobile-nav).
- `src/components/views/` — top-level view components consumed by `page.tsx`.
- `src/store/navigation.ts` — Zustand routing store.
- `src/app/` — Next.js app router (single route, layout, global CSS).

When editing these, follow the existing patterns (dark theme, lemon accent
only, no indigo/blue, `cn()` for conditional classes, `useNavigation` for
in-app navigation) and record changes in `worklog.md`.

---

## 10. Workflow

1. **Read the worklog** (`worklog.md`) — it captures every prior task and
   locks in shared conventions.
2. **Read the relevant AGENT.md** before editing a folder.
3. **Make the change.** Keep diffs minimal and focused.
4. **Lint**: `bun run lint` — must pass on new files.
5. **Verify** via the dev server log (`/home/z/my-project/dev.log`) and, for
   visual changes, a screenshot.
6. **Append a worklog entry** with: task ID, agent name, what you changed,
   files touched, and a stage summary. This is mandatory — future agents
   depend on it.
