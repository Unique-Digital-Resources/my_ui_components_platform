# Task 2 — Board React wrapper + playground

Agent: board-subagent
Task ID: 2
Started: in progress

## Scope
Build the React wrapper + playground for the Board component (vanilla JS Board class already complete at `src/lib/components/board/board.ts`).

## Files to create
- `src/components/board/board-react.tsx` — React wrapper
- `src/components/board/board-playground.tsx` — Playground

## Files to modify
- `src/lib/platform/content.ts` — add board metadata in `layout` category
- `src/store/navigation.ts` — add "board" → "Board" label
- `src/app/page.tsx` — route `component/layout/board` → `<BoardPlayground />`

## Notes
- Following established wrapper/playground pattern from SmartTooltip/ToggleGroup (instanceRef forwarding, refs-for-callbacks so create-once effect stays empty, change-driven state mirroring, code-tab generation, documentation section).
- Board container MUST have a fixed height (the canvas fills `clientWidth`/`clientHeight`).
- `registerBuiltinCommands()` already defines all board.* commands (align/distribute/fit/shapes/delete).

## Status: COMPLETE

### Files created
- `src/components/board/board-react.tsx` — React wrapper (~160 lines)
- `src/components/board/board-playground.tsx` — Playground view (~1140 lines)

### Files modified
- `src/lib/platform/content.ts` — added `board` metadata in `layout` category (6 properties, 21 methods, 3 events)
- `src/store/navigation.ts` — added `board` → "Board" in `routeLabel`
- `src/app/page.tsx` — added `BoardPlayground` import + route handler for `component/layout/board`

### Files unchanged
- `src/lib/components/board/board.ts` (vanilla JS Board class — already complete)
- `src/lib/components/board/index.ts` (barrel exports — already complete)

### Lint
`bun run lint` — 0 errors, 0 warnings.

### Notable implementation decisions
- **Wrapper ref pattern**: used `React.useEffect(() => { ref.current = cb; }, [cb])` to update callback refs (ToggleGroup pattern) instead of writing refs during render. The older SmartTooltip wrapper pattern (`ref.current = cb` during render) now errors under the React Compiler's `react-hooks/refs` rule.
- **Action handlers**: stored in an `actionsRef` updated via a no-deps effect, with thin stable wrappers for the toolbar. The ShortcutHandler effect has empty deps and dispatches through the ref — created once on mount, never re-attaches. This avoids the React Compiler's `react-hooks/preserve-manual-memoization` error that `useCallback(fn, [])` with setState calls triggers.
- **addShape placement**: computes view center in board coords as `((w/2 - panX)/zoom, (h/2 - panY)/zoom)` using `liveAreaRef.clientWidth/Height`, then adds ±70 board units of random offset. Shape size 90×90, color picked from a 5-color palette (lemon/lavender/pink/mint/amber — no indigo/blue).
- **Board container**: `relative h-[520px]` wrapper with `<BoardReact className="absolute inset-0" ...>`. The wrapper's clientWidth/Height = the Board container's clientWidth/Height (used for view-center math).
- **Starter items**: 3 seeded on mount (rect/circle/triangle in lemon/lavender/pink) so the canvas isn't empty. Reset clears and re-seeds the same 3.
- **Shortcut scope**: all 14 board.* command IDs (align ×6, distribute ×2, fit ×2, add-shape ×3, delete ×1) wired to the scoped ShortcutHandler.
