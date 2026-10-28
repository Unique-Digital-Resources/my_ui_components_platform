# Design System PRD — Vanilla JavaScript UI Component Platform

Version 1.0 · Brand identity, visual language, UI foundations, iconography, and interaction standards

The design direction should feel like a professional software workshop with a distinctive, slightly experimental identity: nearly black surfaces, deep purple structure, and a sharp light-lemon-green accent.

It should communicate precision, flexibility, and technical independence—not look like a generic SaaS dashboard or a conventional UI component gallery.

The same design system must serve two different purposes:

- The platform website: a polished developer workspace for discovering, testing, and understanding components.
- The component library: reusable, framework-independent vanilla JavaScript components whose visual styling can be customized independently of the documentation website.

## 1. Brand identity and visual direction

# [Brand Name]

UI components for real software.

# Build interfaces.

&#x20;Not dependencies.

A flexible toolkit for the interfaces behind creative tools, editors, and applications.

Explore components ↗

Read the docs

FRAMEWORK

Independent

INTERACTION

Functional

CUSTOMIZATION

Composable

Visual direction study. The brand name and final logo remain undecided; the logo shown is a conceptual mark.

### Brand personality

| Attribute    | Direction                                                    |
| ------------ | ------------------------------------------------------------ |
| Technical    | Precise, structured, implementation-oriented                 |
| Experimental | Unusual but purposeful details and geometry                  |
| Professional | Calm layouts, readable documentation, reliable states        |
| Independent  | Minimal framework assumptions and portable components        |
| Expressive   | Lemon accent, deep-purple layers, occasional bold typography |

### The visual signature

The brand should be recognizable through the combination of:

1. Near-black backgrounds and dark-purple structural surfaces.
2. Light lemon green for active states, primary actions, and key indicators.
3. Fine borders and carefully layered surfaces instead of excessive shadows.
4. Compact developer-tool layouts with generous spacing around important content.
5. Geometric iconography and restrained abstract branching or connected-node motifs.

Design rule: Purple establishes the environment; lemon green identifies the action. Green should not cover every surface or turn the interface into a neon theme.

## 2. Color system

The palette is built around three primary families: black, dark purple, and light lemon green. Neutral grays and a softer lavender support readable content and secondary states.

## Primary brand palette

Obsidian

\#101014

Main dark background

Deep Violet

\#211A30

Elevated surfaces

Lemon Signal

\#D9FF66

Primary accent

Soft Lavender

\#B9A0FF

Secondary accent

### 2.1 Complete token palette

| Token                 | Hex       | Intended use                          |
| --------------------- | --------- | ------------------------------------- |
| `brand-black`         | `#101014` | Primary dark canvas                   |
| `brand-purple`        | `#211A30` | Panels and elevated surfaces          |
| `brand-purple-strong` | `#342348` | Selected navigation and emphasis      |
| `brand-purple-soft`   | `#B9A0FF` | Secondary highlights and links        |
| `brand-lemon`         | `#D9FF66` | Primary actions and active indicators |
| `brand-lemon-hover`   | `#C8F34F` | Hovered primary action                |
| `neutral-950`         | `#15151A` | Deep surface                          |
| `neutral-900`         | `#202027` | Raised panel                          |
| `neutral-800`         | `#303039` | Borders and dividers                  |
| `neutral-600`         | `#777783` | Muted text                            |
| `neutral-400`         | `#AAAAB5` | Secondary text on dark surfaces       |
| `neutral-200`         | `#DCDCE4` | Light-theme borders                   |
| `neutral-100`         | `#F0F0F4` | Light-theme secondary surface         |
| `neutral-50`          | `#FAFAFC` | Light-theme canvas                    |
| `white`               | `#FFFFFF` | Light surface and dark-theme text     |

These are proposed design tokens. Before implementation, validate text contrast and refine individual shades if necessary.

### 2.2 Semantic colors

Semantic colors must communicate meaning rather than branding.

| Semantic role | Dark theme | Light theme |
| ------------- | ---------- | ----------- |
| Success       | `#8FE3A5`  | `#207A3B`   |
| Warning       | `#FFD36B`  | `#8A5A00`   |
| Error         | `#FF858B`  | `#B42332`   |
| Information   | `#91B8FF`  | `#245CC5`   |
| Focus         | `#D9FF66`  | `#6547C8`   |

Do not use lemon green for every success message. Reserve the accent for primary actions and active interaction; use semantic colors for actual feedback.

### 2.3 Color usage proportions

A useful starting balance for the dark platform is:

- 65–75%: dark canvas and neutral surfaces.
- 15–25%: purple surfaces, borders, and secondary accents.
- 5–10%: lemon green and other high-attention highlights.

These are visual targets, not strict measurements. The accent should be concentrated in purposeful locations.

### 2.4 Light and dark themes

The platform's default theme should be dark because it best expresses the intended identity. A light theme should also be available for comfortable reading and varied working environments.

DARK THEME

## Obsidian workspace

Deep surfaces, fine borders, bright focus states.

Property inspector

Selected value: 180 px

Apply changes

LIGHT THEME

## Clear workspace

Soft neutral canvas, restrained purple, dark text.

Property inspector

Selected value: 180 px

Apply changes

The component library itself must not require the website's dark theme. Its components should support their own documented styling and allow applications to adopt either theme—or define an entirely different one.

## 3. Typography

Typography should combine a contemporary sans-serif for interface clarity with a compact monospace face for code, values, and technical metadata.

### Recommended font stack

HEADINGS & INTERFACE

# Inter

Use Inter or a comparable neutral sans-serif for navigation, headings, buttons, labels, and body text.

CODE & TECHNICAL VALUES

# JetBrains Mono

Use for code snippets, keyboard shortcuts, numeric property values, CSS tokens, and API signatures.

Both fonts are available through open font projects. Prefer self-hosting licensed font files where practical, with system-font fallbacks.

### Type scale

| Token     | Size / line height | Usage                                |
| --------- | ------------------ | ------------------------------------ |
| `display` | 44 / 52 px         | Homepage hero only                   |
| `h1`      | 32 / 40 px         | Main page title                      |
| `h2`      | 24 / 32 px         | Major section heading                |
| `h3`      | 20 / 28 px         | Subsection heading                   |
| `h4`      | 16 / 24 px         | Card and panel headings              |
| `body-lg` | 16 / 26 px         | Introductions and lead text          |
| `body`    | 14 / 22 px         | Standard interface and documentation |
| `body-sm` | 13 / 20 px         | Secondary information                |
| `caption` | 12 / 16 px         | Metadata and helper text             |
| `code`    | 13 / 20 px         | Code and technical values            |

Use font weights 400 for body text, 500 for interface labels, 600 for section headings, and 700 sparingly for strong emphasis.

Typography rules

- Use sentence case rather than all caps for most labels.
- Reserve uppercase text for small technical overlines or status metadata.
- Avoid overly tight line-height in documentation.
- Keep paragraphs at a comfortable reading width.
- Use tabular numerals for changing numeric values where supported.
- Do not make every heading bold or every label monospace.

## 4. Spacing and layout

Use a consistent four-pixel base grid.

| Token      | Value | Typical use                    |
| ---------- | ----- | ------------------------------ |
| `space-1`  | 4 px  | Icon-to-label gaps             |
| `space-2`  | 8 px  | Compact control spacing        |
| `space-3`  | 12 px | Input and list spacing         |
| `space-4`  | 16 px | Standard component padding     |
| `space-5`  | 20 px | Card content spacing           |
| `space-6`  | 24 px | Section spacing                |
| `space-8`  | 32 px | Large group separation         |
| `space-10` | 40 px | Page section separation        |
| `space-12` | 48 px | Major layout transitions       |
| `space-16` | 64 px | Hero and major section spacing |

### Layout dimensions

- Global header: approximately 60–68 px high.
- Desktop documentation sidebar: approximately 224–256 px wide.
- Contextual right sidebar: approximately 180–220 px wide.
- Main content maximum width: approximately 1,200 px, with wider workspace layouts permitted.
- Standard input height: 36–40 px.
- Compact toolbar control height: 28–32 px.
- Standard button height: 36–40 px.
- Touch-target size: aim for at least 44 × 44 px on touch interfaces.

The playground may use a wider, application-like layout than standard documentation pages. Do not force every page into the same narrow content column.

## 5. Shape language, borders, and depth

The interface should feel precise but not sterile. Use moderately rounded corners, crisp dividers, and limited depth rather than excessive pill shapes and floating cards.

Sharp

Code blocks, separators, technical regions

Standard

Inputs, buttons, cards, panels

Soft

Large previews, dialogs, feature areas

Pill

Chips, tags, segmented controls where suitable

### Border radius tokens

- `radius-sm`: 4 px.
- `radius-md`: 8 px.
- `radius-lg`: 12 px.
- `radius-xl`: 16 px.
- `radius-pill`: 999 px.

### Border and shadow rules

- Use subtle neutral borders to separate adjacent surfaces.
- Reserve stronger purple borders for selected or emphasized regions.
- Use a visible accent-colored focus ring for keyboard focus.
- Prefer one subtle elevation level for overlays and popovers.
- Avoid shadows on every card and button.
- Use glow effects only for exceptional emphasis, never as a default state.

## 6. Iconography system

Use a consistent general-purpose icon library rather than drawing individual icons or mixing unrelated styles.

### Recommended primary library: Lucide

[Font libraries by Ashwin Bajaj on Muzli](https://images.openai.com/static-rsc-4/nwbb6yQPGEwCCzspAvAOnueZF3iE-PrqIwDoN9H5fBHMpXMJ9D6ht5yhNrKvXJ16berM3OmIOW9yZH3LELPLst71mm_DKfI1WDg1OpohOQ2uts5CLtF2evzXwKKeVJ3eBrunQ4erfXGgEpyjgWib4aggNy4ez06QIWTZbvu35wA?purpose=inline)

Lucide

Recommended default for navigation, toolbar actions, property controls, documentation, and status indicators. Its restrained outline style fits a precise developer-tool interface.

[Browse Lucide icons](https://lucide.dev/icons/?utm_source=chatgpt.com) · [Source repository](https://github.com/lucide-icons/lucide?utm_source=chatgpt.com)

[Penpot | Libraries & templates detail page](https://images.openai.com/static-rsc-4/VNWobzK4XI3LU_m4-389CjrbavjMEp70eeA3-cZBi2GMzt1ASOW5Wtidx1OjoQcSVu3HpQTrLGhJauTW9CldzkU6hUThjNmrT9EMssbBMpKXV_1Efc_5ZAunWxgMPvzxvugjPKhhXkjNOPaihHJ6nl92iUJLJO-HIupjRqgOPUo?purpose=inline)

Phosphor

A strong alternative when more expressive weights or duotone icons are desirable. Choose one consistent weight for ordinary interface actions.

[Browse Phosphor icons](https://phosphoricons.com/?utm_source=chatgpt.com) · [Source organization](https://github.com/phosphor-icons?utm_source=chatgpt.com)

[GitHub - gurindersingh/mdi-search-icons](https://images.openai.com/static-rsc-4/Jd2nCg3rHqQTmGbMzGp5csYunyuc0E8HXWu_oGrqWXNziOSP0fuRIA0FVHzZIIc4qBatmsVlfEoylWN9CipVJKsWEiD-Li4VMCge_H-WYHG_TRaoRpH_-xD-J5Q1FTuyuN9v0Ox7AnJWZ5LFWAZagUGkbNsLyVmS5qMawSRkiBY?purpose=inline)

Material Design Icons

Useful for specialist symbols and application-oriented actions not covered by the primary icon set. Use selectively to avoid visual inconsistency.

[Browse MDI](https://pictogrammers.com/library/mdi/?utm_source=chatgpt.com) · [Source repository](https://github.com/Templarian/MaterialDesign?utm_source=chatgpt.com)

### Icon usage rules

| Context                    | Specification                                     |
| -------------------------- | ------------------------------------------------- |
| Inline text icon           | 14–16 px                                          |
| Standard interface action  | 18 px                                             |
| Navigation icon            | 18–20 px                                          |
| Prominent empty-state icon | 28–40 px                                          |
| Standard stroke            | Approximately 1.75–2 px                           |
| Button icon spacing        | 8 px from label                                   |
| Icon-only button           | Tooltip, accessible name, and visible focus state |

Use consistent optical sizes and stroke weights. Avoid combining filled Material-style icons with thin outline icons in the same toolbar unless a deliberate distinction is needed.

Implementation: Use the chosen library's official SVG or framework-independent package, or vendor selected SVG assets. The component library should not require an online request for every icon at runtime.

## 7. Logo and brand-icon system

The logo should be an original geometric mark, while third-party logo libraries should be used for the brands and technologies referenced by the platform—not as a substitute for the platform's own identity.

### 7.1 Recommended logo direction

Modular Grid

Composition · reusable blocks · connections

Connected Blocks

Systems · composition · flexible architecture

These are conceptual logo explorations, not finalized vector assets. The final logo should be custom-designed and tested at small sizes.

### 7.2 Logo variants

Create the following variants:

- Primary lockup: symbol plus brand wordmark.
- Compact lockup: reduced horizontal version for the header.
- Symbol only: favicon, app icon, and compact navigation.
- Monochrome: single-color version for constrained contexts.
- Light and dark variants: versions with sufficient contrast on both surfaces.

The symbol should remain recognizable at 16–24 px and must not depend on tiny internal details or color gradients to remain legible.

### 7.3 Online brand-logo libraries

Use an established logo-icon collection when displaying external technologies, framework compatibility, package managers, or development tools.

[Simple Icons: SVG icons for popular brands | AlternativeTo](https://images.openai.com/static-rsc-4/Vz0xUw6FihWxMTmJQhtjX4HUTg4uTNQNTYHEGMMWvkboqjyM5-B-SK1NaWxqJ81kywXfS9UsZpTgu31B29jP-9TB92gwcoFTsAx_TbSbso0V68JxHcL74HHXsQZ2WSy_dZroN0K-Zs1jwCrLLdk6mJOZz45ejkc_m4DTPtwx-WM?purpose=inline)

Simple Icons

Preferred for recognizable technology and company logos, including development tools and frameworks.

[Browse brand icons](https://simpleicons.org/?utm_source=chatgpt.com) · [Repository and licensing](https://github.com/simple-icons/simple-icons?utm_source=chatgpt.com)

[Iconify is an open source icon library that collects over 275,000 icons from over 200 icon sets. - GIGAZINE](https://images.openai.com/static-rsc-4/EMbxaHndZ9GDMqQlll0rt4r-3Gvpq3hEC-2YJhul-mxZKzSVV-6MVGaRUfLF5lRL8jRZ47I9ow7nDuDbhYrwzX42GMGNhN8bHuOQ93Z_jIxM9WIRMHOxhP_0FnHKS0Cy_BEfNV2Sb0hIUEtJ8WRZrXxxPCbHVoDSoepA78Rf9iI?purpose=inline)

Iconify

Useful for discovering icons across many collections, especially when a specialist logo is missing. Verify the license of the specific icon set and icon.

[Browse icon sets](https://icon-sets.iconify.design/?utm_source=chatgpt.com) · [Iconify website](https://iconify.design/?utm_source=chatgpt.com)

### Brand-logo rules

- Never use a third-party brand mark as the platform's primary logo.
- Preserve the original proportions and recognizable silhouette of external logos.
- Do not apply the platform's accent color to an official logo when its recognizable brand treatment should be preserved.
- Check licensing and attribution requirements for each icon set.
- Bundle frequently used assets locally where appropriate.
- Avoid loading icons dynamically from an external service during normal component interaction.

## 8. Component visual language

The platform should distinguish between brand UI and demonstrated component UI.

Brand UI includes navigation, documentation panels, the playground shell, buttons, and property inspectors. These use the black, purple, and lemon palette.

Demonstrated components should use their own neutral or configurable styling so developers can judge their appearance independently of the platform branding.

### 8.1 Buttons

Primary action

Primary

Lemon background, near-black text. Use for one dominant action per region.

Secondary action

Secondary

Purple surface with readable text. Use for alternative actions.

Outline action

Outline

Transparent or neutral surface with a visible border.

Text action ↗

Text and icon action

For navigation, low-emphasis actions, and inline links.

Rules:

- Avoid multiple competing primary buttons in the same small region.
- Use a consistent 8 px corner radius.
- Include hover, active, focus, disabled, and loading states where relevant.
- Loading must not cause unexpected layout shifts.
- Disabled actions must be visually distinct and non-interactive.

### 8.2 Inputs and property controls

Inputs should resemble precision instruments rather than oversized form fields.

- Compact labels positioned consistently above or beside the control.
- Clear value alignment, especially for numeric properties.
- Visible units when relevant, such as `180 px` or `35°`.
- Validation feedback near the affected input.
- Keyboard navigation and editing support.
- A visible focus ring.
- Consistent disabled and read-only styles.

Numeric fields should support direct editing, while sliders provide rapid adjustment when a bounded range is appropriate.

### 8.3 Cards and panels

Use three structural patterns:

- Flat regions: documentation sections and ordinary page content.
- Bordered panels: property inspectors, code editors, and grouped controls.
- Elevated overlays: dialogs, menus, command palettes, and popovers.

Do not wrap every paragraph or documentation section in a card. Cards should represent actual grouping, navigation, or a distinct interactive area.

### 8.4 Tabs and segmented controls

Use tabs when switching between content views, such as JavaScript, HTML, and CSS examples.

Use segmented controls when selecting one of a small set of related values, such as triangle, square, disk, or none.

Requirements:

- Clear selected state.
- Keyboard support.
- Consistent dimensions.
- Accessible labels.
- No reliance on color alone to communicate selection.

### 8.5 Status badges

Use small, low-emphasis labels for states such as Stable, Beta, Experimental, Deprecated, and Planned.

The badge must communicate a real state. It should not be used merely as decoration or repeated for every shared property.

## 9. Component playground visual standards

The playground is the defining feature of the platform. It should resemble a compact professional software workspace, with a clear division between the working area and the controls.

### Component Playground

LIVE CANVAS

[Python - custom shaped user input area - Developer Questions - Krita Artists](https://images.openai.com/static-rsc-4/3p2rXRiIE5LeL0Gpt7CbxBUWVJUkQelmJjpf6hMkH_0XUnSLozFCr_uXeMorr_qE6ukGOOkoG9Fktwd8i5XOGq3aAxhC9o3HYLXbk5S9RJ_LPR6ztCCDzPamtRWmkaxZmiZywYjxY55AWrcJkO6P3BH44X0pYA_Gmlu04uXF1lc?purpose=inline)

Selected value

\#D9FF66

Properties

Inner shape

Inner size

180 px

Hue

210°

Reset properties

JavaScript

HTML

CSS

Configuration example synchronized with the live preview.

### Workspace layout rules

- The preview canvas should be visually distinct from the property inspector.
- Keep toolbars compact and predictable.
- Use the lemon accent for selected tools and important actions, not as a canvas background.
- Property controls should be grouped logically and labeled consistently.
- Code panels should use a dark editor-like surface in the dark theme and a readable equivalent in the light theme.
- Allow the preview area to expand without forcing the inspector to expand with it.
- On narrow screens, stack the inspector beneath the preview.

### Preview isolation

The component preview must be isolated from the platform's own styles where necessary. Use an explicit preview container and scoped styles so global documentation styles cannot unintentionally change the component's rendering.

The website's visual theme must never become a mandatory dependency of the vanilla JavaScript library.

## 10. Motion and interaction feedback

Motion should communicate changes, not decorate every interaction.

| Interaction         | Recommended behavior                                 |
| ------------------- | ---------------------------------------------------- |
| Button hover        | Subtle surface or brightness change                  |
| Button press        | Brief pressed-state feedback                         |
| Popover open        | Short opacity and small-scale transition             |
| Sidebar collapse    | Smooth width transition where practical              |
| Tab change          | Immediate content change or restrained transition    |
| Property adjustment | Update preview immediately                           |
| Copy action         | Brief confirmation label or icon state               |
| Loading             | Subtle indicator that preserves layout               |
| Color wheel drag    | Direct, immediate response without delayed animation |

Suggested timing tokens:

- `motion-fast`: 100–140 ms.
- `motion-standard`: 160–220 ms.
- `motion-emphasis`: 240–300 ms.

Use easing that feels responsive and controlled. Do not animate numeric values or color changes in ways that make the component feel laggy during direct manipulation.

Respect `prefers-reduced-motion`. Animation must not be the only way to communicate an important state change.

## 11. Design tokens and CSS architecture

The design system should use semantic CSS custom properties rather than scattering literal hex values throughout the website.

Example token foundation:

```
:root {
  color-scheme: light dark;

  --brand-black: #101014;
  --brand-purple: #211A30;
  --brand-purple-strong: #342348;
  --brand-purple-soft: #B9A0FF;
  --brand-lemon: #D9FF66;

  --surface: #FAFAFC;
  --surface-raised: #FFFFFF;
  --text-primary: #17151D;
  --text-secondary: #666371;
  --border: #DCDCE4;

  --font-sans: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --border-width: 1px;
  --focus-ring-width: 2px;

  --motion-fast: 120ms;
  --motion-standard: 180ms;
}

[data-theme="dark"] {
  color-scheme: dark;

  --surface: #101014;
  --surface-raised: #211A30;
  --text-primary: #F4F1FF;
  --text-secondary: #B8B2CA;
  --border: #383343;
}
```

This is an initial example, not the final complete token file.

### CSS architecture requirements

- Separate global design tokens from component-specific tokens.
- Use semantic roles such as `--surface`, `--text-primary`, and `--border` for everyday styling.
- Keep brand-specific values separate from generic component behavior.
- Avoid global selectors that unintentionally alter components embedded in other applications.
- Document the supported customization API.
- Use a clear prefix or another deliberate scoping strategy for library-owned CSS variables.
- Do not make the library depend on the website's root theme tokens.

A component may offer its own variables such as `--color-picker-ring-width` while retaining safe defaults when no custom values are provided.

## 12. Accessibility and usability standards

The design system must be accessible in both themes and across all supported interaction modes.

### Requirements

- Text and interactive controls meet WCAG 2.2 AA contrast requirements wherever applicable.
- Keyboard focus is visible against dark and light surfaces.
- Interactive controls have accessible names and appropriate semantic roles.
- Icon-only controls include accessible labels and tooltips where useful.
- Hover states have equivalent focus and touch behavior.
- Error messages identify the affected input and explain how to correct it.
- State changes are not communicated through color alone.
- Components support keyboard interaction according to their control type.
- Motion respects user preferences.
- Touch controls have appropriately sized targets.

For the lemon accent, dark text such as `#171521` should be used on the bright background. Do not assume white text will be readable on every purple or lemon shade; validate actual color combinations before release.

## 13. Separation between the brand and component themes

This is a core architectural requirement, not just a styling preference.

### Platform design system

Owns navigation, documentation, search, playground layout, code panels, and platform-level interactions.

Black

Purple

Lemon

### Vanilla JavaScript component system

Owns component behavior, public properties, state, events, accessibility, and independently configurable styling.

Default theme

Custom theme

Host application

The website can use the brand palette as its default presentation, while a developer embedding a component can customize its appearance without inheriting the platform's branding.

For example, the Color Wheel Picker must work inside a light-themed editor, a dark creative application, or a custom interface without requiring Next.js or the platform's CSS.

## 14. Design system implementation checklist

Use this checklist to validate the first design-system release.

## Release readiness

0 / 18

Brand foundation

Finalize the brand name and original logo

Define dark and light color tokens

Approve typography and font licensing

Define spacing, radius, and border tokens

Iconography

Select Lucide as the primary icon family

Define specialist icon and brand-logo usage rules

Verify licenses and attribution

Establish local asset and SVG conventions

Reusable interface patterns

Buttons and icon buttons

Inputs and numeric property controls

Cards, panels, and overlays

Tabs, segmented controls, and badges

Loading, empty, error, and disabled states

Developer experience

Playground layout and preview isolation

Code panel and copy interaction

Responsive documentation shell

Keyboard navigation and accessibility

Independent component theming

Reset checklist

## 15. Final design principles

The final design system should follow these rules:

1. Distinctive, not distracting. Black, purple, and lemon create identity without overpowering technical content.
2. Functional over decorative. Every interactive preview and property control should do what it claims.
3. Consistent but flexible. The website has one recognizable design language; components remain independently themeable.
4. Precise, not cramped. Compact controls coexist with readable documentation and adequate spacing.
5. Lightweight by design. Use reusable CSS tokens, carefully selected icon assets, and minimal runtime dependencies.
6. Accessible by default. Contrast, keyboard operation, visible focus, and semantic controls are foundational.
7. Honest documentation. Clearly distinguish available components, proposed features, static previews, and actual interactive implementations.

The recommended starting combination is Obsidian `#101014` + Deep Violet `#211A30` + Lemon Signal `#D9FF66`, with Lucide for general icons and Simple Icons for external technology logos.