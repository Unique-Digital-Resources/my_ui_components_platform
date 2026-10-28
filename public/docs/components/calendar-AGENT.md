# AGENT.md — Calendar

Contribution guide for the Calendar component.

## Architecture

Single-file `calendar.ts` with pure date math at the top (no Date object for date-only values to avoid TZ issues) and a DOM-based renderer at the bottom.

### Key types
- `CalendarDate = { year, month, day }` — date-only, no timezone.
- `SelectionMode = "none" | "single" | "multiple" | "range"`.
- `WeekdayFormat = "narrow" | "short" | "long"`.

### Grid generation
`buildGrid()` produces a 6×7 grid of `GridCell` objects. Each cell has derived states: isOutside, isToday, isSelected, isRangeStart, isRangeEnd, isInRange, isDisabled, isFocused, isPreviewed.

### Selection
- Single: click replaces selection. Click same date + allowClear → deselect.
- Multiple: toggle dates.
- Range: first click = start, hover preview, second click = end (auto-swap if reversed).

### Events
- `selection_changed` — general purpose, fires after commit.
- `view_changed` — displayed period changed.
- `date_selected` — specific date click.
- `range_changed` — range start/end/complete.

### Known issues
None currently.
