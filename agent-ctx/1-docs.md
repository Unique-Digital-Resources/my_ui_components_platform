# Task 1 — docs agent

## Task
Create AGENT.md and SKILL.md files for the Workshop component library project.
AGENT.md files describe how to modify, extend, and debug the code (contribution).
SKILL.md files describe how to USE components/utilities (usage). Both are aimed
at AI agents and human developers.

## Context
Read `/home/z/my-project/worklog.md` to understand the project. The platform is
a Next.js 16 documentation site for a vanilla JS UI component library. 10
components shipped (color-wheel, color-range, color-circle, color-ramp,
custom-button, periodic-range, toggle-group, smart-context-menu, smart-tooltip,
board) plus two cross-cutting modules (commands, platform).

## Files created (26 total)

### Root (2)
- `/home/z/my-project/AGENT.md` — contribution router. Project overview, tech
  stack, architecture, design system, contribution guidelines, known issues
  (including the Board resize-at-rotation drift), per-folder AGENT.md router.
- `/home/z/my-project/SKILL.md` — usage router. Project overview, install
  instructions, component inventory with links to per-component SKILL.md,
  commands overview, design system summary, "choosing a component" table.

### Per-component AGENT.md (10)
- `src/lib/components/color-wheel/AGENT.md`
- `src/lib/components/color-range/AGENT.md`
- `src/lib/components/color-circle/AGENT.md`
- `src/lib/components/color-ramp/AGENT.md`
- `src/lib/components/custom-button/AGENT.md`
- `src/lib/components/periodic-range/AGENT.md`
- `src/lib/components/toggle-group/AGENT.md`
- `src/lib/components/smart-context-menu/AGENT.md`
- `src/lib/components/smart-tooltip/AGENT.md`
- `src/lib/components/board/AGENT.md`

Each contains: component name + purpose, file structure, architecture notes,
key algorithms/math (HSV conversion, canvas rendering, pointer interaction,
harmony engine, etc.), known issues + TODOs, how to extend/modify.

### Per-component SKILL.md (10)
Same folders as above. Each contains: one-line description, install/import
instructions, full API reference (constructor options, public methods, events)
in tables, code examples (basic + advanced + React), integration notes,
related components.

### Cross-cutting modules (4)
- `src/lib/commands/AGENT.md` — registry internals, shortcut matching,
  how to add commands, digit-key collision caveat.
- `src/lib/commands/SKILL.md` — registry API, shortcut utilities,
  ShortcutHandler, code examples, built-in command categories.
- `src/lib/platform/AGENT.md` — content metadata system, how to add a
  component/category/example/changelog entry/docs section.
- `src/lib/platform/SKILL.md` — exported data shapes, lookup helpers,
  code examples for rendering directory/API reference/changelog.

## Writing style followed
- Clear, concise technical writing.
- Code blocks for code examples; tables for API references.
- Specific file paths, function names, data structures.
- NO emojis (verified via script — all 26 files clean).
- Did not create any TypeScript/JavaScript files.
- Did not modify existing source files.

## Known issues captured
- Root AGENT.md "Known Issues (Global)" section includes the verbatim text
  requested: "Board's items resizing displacement at non-0 rotation — the
  AABB-based resize math doesn't perfectly maintain item position when items
  are rotated. The current approach computes new AABB dimensions and positions
  the item center from the new AABB, but small drift can still occur during
  continuous drag. Needs a more robust approach, possibly tracking the item's
  corner positions in board space directly."
- The board AGENT.md has a more detailed version of the same issue with the
  exact location (`applyResize` around line 1030) and the math explanation.

## Verification
- All 26 files exist and are non-empty.
- No emojis in any file (script-checked).
- No source files modified.
- Relative links between files use correct paths (e.g.
  `./src/lib/components/color-wheel/AGENT.md` from root,
  `../color-range/SKILL.md` from a sibling component,
  `../../commands/SKILL.md` from a component to a cross-cutting module).

## Worklog
Appended a Task 1 entry to `/home/z/my-project/worklog.md` documenting the
26 files created and the conventions used.
