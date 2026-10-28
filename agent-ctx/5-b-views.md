# Task 5-b — Components + Category views

Agent: full-stack-developer
Started: reading worklog + content.ts + navigation.ts + existing views (docs-view, examples-view) for styling consistency.

## Plan
1. Build `src/components/views/components-view.tsx` (default export `ComponentsView`) — the `/components` page.
2. Build `src/components/views/category-view.tsx` (default export `CategoryView`) — the `/components/[category]` page.

## Key decisions
- Reuse the `MiniColorWheel` SVG pattern from `examples-view.tsx` for visual consistency across the platform's preview thumbnails.
- Treat planned components as visually muted, non-interactive cards (per spec).
- Status filter uses local React state (the navigation store only tracks query + category).
- Color category guidance card is concrete (wheel vs triangle vs square vs disk); other categories fall back to a generic guidance card.
