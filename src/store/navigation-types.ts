/**
 * Pure, side-effect-free routing types and helpers.
 *
 * These are kept in a separate module from the Zustand store so they can be
 * imported from anywhere (server or client, store or view) without pulling in
 * the store. The store now only owns UI-only state (search palette, mobile
 * nav, components filter) — actual navigation is handled by the URL via
 * Next.js App Router file-based routing.
 */

export type Route =
  | { name: "home" }
  | { name: "components" }
  | { name: "category"; category: string }
  | { name: "component"; category: string; slug: string }
  | { name: "docs" }
  | { name: "docs-installation" }
  | { name: "docs-concepts" }
  | { name: "docs-theming" }
  | { name: "docs-api" }
  | { name: "theme-editor" }
  | { name: "examples" }
  | { name: "example"; slug: string }
  | { name: "resources" }
  | { name: "changelog" }
  | { name: "contributing" };

/**
 * Convert a `Route` value into its App Router URL. This is the bridge between
 * the legacy `Route` discriminated union (still used in a few places, e.g. the
 * search palette and footer link tables) and the new file-based routes.
 */
export function routeToHref(route: Route): string {
  switch (route.name) {
    case "home":
      return "/";
    case "components":
      return "/components";
    case "category":
      return `/components/${route.category}`;
    case "component":
      return `/components/${route.category}/${route.slug}`;
    case "docs":
      return "/docs";
    case "docs-installation":
      return "/docs/installation";
    case "docs-concepts":
      return "/docs/concepts";
    case "docs-theming":
      return "/docs/theming";
    case "docs-api":
      return "/docs/api";
    case "theme-editor":
      return "/theme-editor";
    case "examples":
      return "/examples";
    case "example":
      return `/examples/${route.slug}`;
    case "resources":
      return "/resources";
    case "changelog":
      return "/changelog";
    case "contributing":
      return "/contributing";
  }
}

/** Map a category slug to a human-readable label. */
export function categoryLabel(slug: string): string {
  switch (slug) {
    case "color":
      return "Color";
    case "inputs":
      return "Inputs";
    case "layout":
      return "Layout";
    case "data-display":
      return "Data Display";
    case "productivity":
      return "Project Management & Productivity";
    case "navigation":
      return "Navigation";
    default:
      return slug;
  }
}

/** A human-readable label for any `Route` value. */
export function routeLabel(route: Route): string {
  switch (route.name) {
    case "home":
      return "Home";
    case "components":
      return "Components";
    case "category":
      return categoryLabel(route.category);
    case "component":
      return componentSlugLabel(route.slug);
    case "docs":
      return "Documentation";
    case "docs-installation":
      return "Installation";
    case "docs-concepts":
      return "Core Concepts";
    case "docs-theming":
      return "Theming";
    case "docs-api":
      return "API Reference";
    case "theme-editor":
      return "Theme Editor";
    case "examples":
      return "Examples";
    case "example":
      return "Example";
    case "resources":
      return "Resources";
    case "changelog":
      return "Changelog";
    case "contributing":
      return "Contributing";
  }
}

/**
 * Resolve a component slug to a display label. Imported lazily from content.ts
 * would create a circular dependency, so we keep a small static map here. The
 * authoritative source is `components` in `content.ts`; this fallback returns
 * the slug title-cased if it isn't in the map.
 */
function componentSlugLabel(slug: string): string {
  const map: Record<string, string> = {
    "color-wheel": "Color Wheel Picker",
    "color-range": "Color Range",
    "color-circle": "Color Circle",
    "color-ramp": "Color Ramp",
    "periodic-range": "Periodic Range",
    "custom-button": "Custom Button",
    "toggle-group": "Toggle Group",
    "smart-context-menu": "Smart Context Menu",
    "smart-tooltip": "Smart Tooltip",
    board: "Board",
    "nodes-graph": "Nodes Graph",
    "socket-nodes-graph": "Socket Nodes Graph",
    calendar: "Calendar",
    kanban: "Kanban Board",
    gantt: "Gantt Timeline",
    "animation-track-editor": "Animation Track Editor",
    breadcrumb: "Breadcrumb",
    collapse: "Collapse",
    carousel: "Carousel",
    "scroll-layout": "ScrollLayout",
    drawer: "Drawer",
    marquee: "Marquee",
    avatar: "Avatar",
    badge: "Badge",
    timeline: "Timeline",
    "table-editor": "Table Editor",
    "connection-path": "Connection Path",
    "rich-text-editor": "Rich Text Editor",
  };
  return map[slug] ?? slug;
}
