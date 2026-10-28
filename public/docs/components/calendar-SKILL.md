# SKILL.md — Calendar

A reusable calendar component for date display, navigation, and selection.

## Installation

```ts
import { Calendar } from "@workshop/calendar";
```

No CSS import required — scoped styles are injected automatically.

## Quick Start

```ts
const cal = new Calendar(container, {
  selectionMode: "single",
  weekStart: 0,
  showToday: true,
});

cal.on("selection_changed", ({ selection }) => {
  console.log(selection); // { year, month, day }
});
```

## Options

| Property | Type | Default |
|---|---|---|
| selectionMode | none, single, multiple, range | single |
| value | CalendarDate, null | null |
| weekStart | 0-6 | 0 (Sunday) |
| weekdayFormat | narrow, short, long | short |
| showOutsideDates | boolean | true |
| showToday | boolean | true |
| showWeekNumbers | boolean | false |
| showNavigation | boolean | true |
| showFooter | boolean | false |
| readOnly | boolean | false |
| cellSize | number | 36 |
| minDate | CalendarDate, null | null |
| maxDate | CalendarDate, null | null |
| allowClear | boolean | true |
| hoverPreview | boolean | true |

## Methods

| Method | Purpose |
|---|---|
| selectDate(date) | Select a date |
| setSelection(value) | Set single/multi/range |
| clearSelection() | Clear all |
| navigate(direction) | Prev/next month |
| navigateTo(date) | Go to a date's month |
| focusDate(date) | Keyboard focus |
| getValue() | Current single value |
| getRange() | { start, end } |
| getSelectedDates() | Multi-selection array |
| setProperty(name, value) | Update any option |
| destroy() | Cleanup |

## Events

| Event | Payload |
|---|---|
| selection_changed | { selection, selectionMode } |
| view_changed | { viewDate } |
| date_selected | { date, source } |
| range_changed | { startDate, endDate, complete } |
| focused_date_changed | { date } |
| validation_failed | { date, reason } |
