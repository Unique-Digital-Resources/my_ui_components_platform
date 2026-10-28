# Platform Website Structure & UX Specification

Scope: Information architecture · Page specifications · Interaction design · Functionality · Routing

## 1. Platform structure at a glance

The website should combine three complementary experiences:

- Discover: Browse component categories, search the library, and explore use cases.
- Explore: Interact with live components, adjust their properties, and understand their behavior.
- Implement: Access installation instructions, API documentation, code examples, and integration guidance.

The platform should feel like a professional software-development tool rather than a conventional marketing website or a simple gallery of UI elements.

## 2. Global information architecture

Platform

Global navigation · Search · Theme · Version

Home

Introduction · Featured components · Categories · Quick start

Components

Category index · Component details · Live playground

Documentation

Installation · API reference · Guides · Integration

Resources

Examples · Patterns · Recipes · Templates

Project

About · Principles · Contribution · Changelog

### Primary navigation

| Item          | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| Components    | Discover and browse the library                        |
| Documentation | Learn how to install and use components                |
| Examples      | Explore components in realistic application interfaces |
| Resources     | Find patterns, recipes, and reusable solutions         |
| Search        | Search components, APIs, guides, and examples          |

The platform logo links to Home. A persistent theme control and a global search shortcut should be available throughout the documentation experience.

## 3. Route structure

Use human-readable, stable URLs that reflect the content hierarchy.

PUBLIC ROUTES

`/`

Home and product introduction

`/components`

Component directory and category overview

`/components/color`

Color category overview

`/components/color/color-wheel`

Individual component documentation and playground

`/docs`

Documentation landing page

`/docs/installation`

Setup and distribution

`/docs/concepts`

Architecture and component conventions

`/docs/theming`

Styling and customization

`/examples`

Application-oriented examples

`/examples/[slug]`

Individual example with component references

`/changelog`

Releases and component changes

`/contributing`

Contribution guidelines

These are proposed routes, not requirements for any specific framework. Component pages should use stable slugs rather than internal identifiers or implementation filenames.

## 4. Global application shell

The shared shell must support efficient navigation and long technical documentation pages.

[Introducing: Documentation template for Astro and daisyUI — daisyUI Tailwind CSS Component UI Library](https://images.openai.com/static-rsc-4/2hXuiFl0woqnjq0DN7AcH1m22Y6s_FrSB0I8gdB-Bj15FSE97fCjRg046xBrNrKPzNpNWBkFp7dd8IbKZZai1xkcueIRv46rKpdnXm_b6TMaFck59po8v3CviKKabVCy28PGcd4rECDxjTL3pp0PV_cNOwGCbjXp1CoqCbOsbD0?purpose=inline)

[daisyui.com](https://daisyui.com/blog/daisyui-astro-tailwind-documentation-template/?utm_source=chatgpt.com)

### Layout regions

[Navigation Menus Components | 21st](https://images.openai.com/static-rsc-4/XHPmTuDKuescYqVGSMcV5FQehLNkxosYqY3L5tdefReJsC46wqJ9YFs6F82bopsG7SgRQAUqWcUyNPlLRvLGkQ_peLH4e3ZvUqVZUx1liDZ1kvPYQsirfHRvhGSXUtXCNl0boyhqItAFpuqYOzOo19fG6jOWRkRQbALOToZGIs8?purpose=inline)

A. Global header

- Brand logo and name.
- Main navigation links.
- Global search field or search trigger.
- Theme switcher.
- Git repository link, when available.
- Responsive mobile navigation.

[Sweating the small stuff in Fern Docs | Fern](https://images.openai.com/static-rsc-4/QXTBSF8qiAIO_fdu2nfsRPTc9NV1O_8nuvLuR3ApWTenM9d6rtUNISARTUF7hr4EF0jTiEuOhi8Aab5Yf8S2q4SVWFIVpUvK80MUqtAmeVN36dmpCkm3pZRqnMVzMg4VhbH6JsCjqbV8P0Atc1jpwbnCycoFDm6S0qmH7stwhBc?purpose=inline)

B. Documentation sidebar

- Component categories and nested component links.
- Documentation sections.
- Expandable and collapsible groups.
- Current-page indicator.
- Optional sidebar collapse control.

[New Storybook integration & hosting | Made with Supernova](https://images.openai.com/static-rsc-4/z6PjMJVqB5l-TjwznL6vHfNmrygq15wCHgDKuAtR5sfn2URWGzqrqpsa39S2_g7O_WnA0SZim_C9M1nXRXh6Qm4TrrSCnzAkilKh1MVuzUjNIedk7O5PAjUvunRjGGss0ah13ggMzNLsx3HYdTkn3NjTxuLPWxODvSq7e56zb4E?purpose=inline)

C. Main content region

- Page title and summary.
- Component previews or documentation content.
- Interactive examples and configuration controls.
- Code examples and contextual actions.

[Sticky Nested Table of Contents JS - CodeShack](https://images.openai.com/static-rsc-4/KKoR4e28XlEKraiuHSbtCSSgM89hf0SDnk7NqzO52DkZCPlBza4PDcARIs5OEG_SCNK2WnhnfVOA686TzCM-_uzP2Yr8OrcwOTHROkMLRlU89955XKG1p5KPMUKRsfaGVsNWv_mUjcKhcEUAvzWqZdhOO8IgxWhUpcICN78LJOI?purpose=inline)

D. Contextual right sidebar

- Table of contents.
- Section anchors.
- Optional component properties summary.
- Related components or documentation links.

The right sidebar should be contextual rather than mandatory. On the homepage and category index, the full content width should be used instead.

### Responsive behavior

- Desktop: persistent navigation sidebar, wide content region, and optional right sidebar.
- Tablet: collapsible component sidebar and simplified content layout.
- Mobile: drawer navigation, full-width content, stacked previews and controls.

The interactive component must remain usable on touch devices even when its primary target is a precision control such as a color wheel.

## 5. Page-by-page specifications

### Page 1 — Home

Route: `/`

Purpose: Explain the library's value and help developers quickly reach a component or learn how to use it.

[The 10 Best Alternatives to Ark UI in 2025](https://images.openai.com/static-rsc-4/_OXwXNbFQC45uVZQtH1-081WjFCcDao_T9s9QvPW0-_ZymOGsyMMs4l3OhqHG9Xko2cPPY19lPEccfn-T9d_JZVS4WoEO2M5I7YgK90wB29QLvA3GPHJKGU1sTUZKDgRm-ABzZ2yv1PCoG8-KEVPR5t7-1N5PD_SNUeBbw6A-nE?purpose=inline)

[subframe.com](https://www.subframe.com/tips/ark-ui-alternatives?utm_source=chatgpt.com)

| Section            | Content and functionality                                                     |
| ------------------ | ----------------------------------------------------------------------------- |
| Hero               | Product statement, short description, Browse Components and Get Started links |
| Featured component | A live interactive demonstration of the Color Wheel Picker                    |
| Category explorer  | Visual category cards, descriptions, and component counts                     |
| Why this library   | Framework independence, application-focused components, composability         |
| Quick start        | Minimal installation and usage example                                        |
| Featured examples  | Application interfaces demonstrating component use                            |
| Footer             | Documentation, repository, contribution, and project information              |

Interactions

- Clicking a category opens its category overview.
- Clicking a component opens its dedicated page.
- The featured component can be manipulated directly without leaving Home.
- Quick-start actions navigate to the relevant documentation.
- Global search opens from the header.

The homepage should emphasize working components over oversized promotional illustrations.

### Page 2 — Component Directory

Route: `/components`

Purpose: Provide a searchable, browsable index of the entire component library.

[15 Open-source Tailwind-based UI Frameworks and Component Libraries](https://images.openai.com/static-rsc-4/RpGtW9jTcUeXDwRTIBWXKpEymXVMoaHLGSmX90y7XfaHbeuz2AaDrOYLEb7zOg18V2abefQS1iv2_g-QBVI771HhMRG-8PrLxh6fctt9vp6VCY-pzWCbZo2jCUqTmkliohz6lA_pKjt3ChySgY3ypAZa3sV9g9Zy_XDWZMeLQik?purpose=inline)

[medevel.com](https://medevel.com/15-tailwind-libraries/?utm_source=chatgpt.com)

Content structure

- Page title and introduction.
- Component search.
- Category navigation.
- Component cards.
- Optional filters for component status and capabilities.
- Sorting controls when the library grows.

Each component card should include:

- Component name.
- Short description.
- Small visual preview or interactive thumbnail.
- Category.
- Availability status, such as stable, beta, or experimental.
- Link to its documentation and playground.

Interactions

- Search filters the displayed component list.
- Selecting a category navigates to its category page.
- Selecting a component opens its dedicated page.
- Filters can be combined and cleared.
- Search and filter state should be preserved in the URL when appropriate.

Do not introduce rating systems or popularity rankings without a real reason and reliable data.

### Page 3 — Category Overview

Route example: `/components/color`

Purpose: Explain a component category and provide a focused index of its members.

[What is a Design System? A 2026 Guide With Best Practice Examples | Untitled UI](https://images.openai.com/static-rsc-4/-pSM0BCRlYloPHbOQTg1XS_HUhRaSUwyWMc6e78oYYKEiDB1gbR4nyLUZvStbGh3nUOdie95_EAhc0GfFybMYZbd2OKQKzsUcoGcwHGYVBuNCxOyTd7NnbRxB4VnmCh8eNB8sRT-yD60md86-YUV3_nBDSTgMjftzFdqYIJWywk?purpose=inline)

[untitledui.com](https://www.untitledui.com/blog/what-is-a-design-system?utm_source=chatgpt.com)

Page sections

1. Breadcrumb navigation.
2. Category title and description.
3. Category-specific introduction and usage context.
4. Component gallery.
5. Related components or relevant documentation.
6. Contribution or request guidance when appropriate.

For the initial Color category, the page should introduce the category and showcase the Color Wheel Picker as its first component.

The category structure must support additional color controls later without requiring a redesign of the entire site.

### Page 4 — Component Details and Playground

Route: `/components/color/color-wheel`

This is the platform's most important page because it represents the main differentiator: a component library built around actual application interactions.

[Slint 1.8 Released with New Property Changed Callbacks, Timer, and Swipe Gesture — Slint Blog](https://images.openai.com/static-rsc-4/TTCAdeDO91ddDGEl2tN-SzvVhCWixMfG38h2Z1ju7549wZ0D8v5jEKG6mTyeAItSrcmrIqbOxmKDveq9W4qdFVFNJgUAyjP8tnuLd9VJom0-Ln89zOrEyrEEiaQ0GnKIWUiXp9IwnSpVWDYzjObYTpF-9cUAehz8IksvZuR2Fag?purpose=inline)

[slint.dev](https://slint.dev/blog/slint-1.8-released?utm_source=chatgpt.com)

#### Page layout

BREADCRUMBS

Home / Components / Color / Color Wheel

## Color Wheel Picker

An interactive color-selection component with configurable inner geometry.

Vanilla JS

Interactive

Configurable

Live Preview

Reset

[Color picker – Hugo Daniel](https://images.openai.com/static-rsc-4/AfQdLPO5HWCLKb0h3YANbWxtF9DDcyc4UJLkOjleXbrzpUR99P2JLw62UogmPY3HJwQ0QoqpjNPFmM6nRaV5EubJGZP5cK4Te0mKT3NriJ2LKGZ32t5UvKxIAE3CwSXq2Gk0chOHMvX9tw33PDWVZZAo-achqgLeDAocveyn_VM?purpose=inline)

Selected color

\#4287F5

Properties

Shape

Triangle

Square

Disk

None

Inner size

180 px

Implementation

Preview

HTML

JavaScript

CSS

Installation instructions and code examples appear here.

The layout above illustrates the intended page regions. The preview and controls represent the eventual working playground, not an implemented color picker.

#### Required page regions

A. Component header

- Component name and concise description.
- Category breadcrumb.
- Component status.
- Links to source code and contribution information, when available.

B. Live preview

- Render the actual vanilla JavaScript component.
- Allow direct manipulation.
- Provide a reset-to-default action.
- Support preview resizing where relevant.
- Display selected output values when useful.

C. Interactive property inspector

For the Color Wheel Picker:

- Inner shape selector: triangle, square, disk, none.
- Inner shape size control.
- Wheel thickness and spacing controls, if exposed by the component API.
- Current hue and color values.
- Additional controls only when supported by the component.

Changing a property must update the actual preview immediately. The inspector must not simulate configuration using independent decorative elements.

D. Output and color information

- Display the current color in HEX.
- Offer RGB, HSV, and HSL representations.
- Provide a copy action for individual values.
- Keep values synchronized with direct interaction.

E. Implementation tabs

- Preview.
- HTML markup.
- JavaScript initialization and configuration.
- CSS and customization.
- Optional framework integration examples.

The source examples must use the real public API and must not imply that Next.js or React is required to run the component.

F. Documentation content

- Overview and use cases.
- Installation.
- Basic usage.
- Configuration properties.
- Events and public methods.
- Accessibility and keyboard behavior.
- Examples and known limitations.

Interaction rule: Changes made in the playground should be reflected in the preview and generated code. If a configuration is unsupported, the interface should explain why rather than displaying code that does not work.

### Page 5 — Documentation Landing

Route: `/docs`

Purpose: Give developers a clear entry point to learn the library's architecture and usage conventions.

Sections:

- Introduction and core principles.
- Installation and first component.
- How the component API works.
- Component styling and theming.
- Component lifecycle and cleanup.
- Navigation to API reference and examples.

The landing page should guide a first-time user through one short successful integration rather than presenting a large collection of disconnected documentation links.

### Page 6 — Installation

Route: `/docs/installation`

Purpose: Explain how to obtain and integrate the vanilla JavaScript library.

Required content:

- Supported distribution methods.
- Installation or package import instructions.
- Required CSS inclusion.
- Minimal HTML example.
- Initialization and configuration.
- Versioning and updates.
- Troubleshooting common setup errors.

The exact package name and distribution commands should be specified only after the project defines its package and release strategy.

### Page 7 — Concepts and Theming

Routes: `/docs/concepts` and `/docs/theming`

Concepts page

Explain component initialization, configuration, events, state synchronization, lifecycle cleanup, and framework interoperability.

Theming page

Explain design tokens, CSS custom properties, sizing, color schemes, and supported customization points. Include live examples demonstrating how styles change without modifying the component's underlying behavior.

### Page 8 — Examples

Routes: `/examples` and `/examples/[slug]`

Purpose: Demonstrate how individual components fit into realistic application interfaces.

Example categories could include:

- Creative software tools.
- Property inspectors.
- Settings panels.
- Developer utilities.
- Productivity applications.

Each example should explain which components it uses, what can be interacted with, and how the relevant implementation can be reproduced.

Examples should remain secondary to the core component documentation until the library contains enough components to support compelling combinations.

### Page 9 — Changelog and Contribution

Routes: `/changelog` and `/contributing`

Changelog

- Version and release date.
- Added components and features.
- API changes.
- Fixes and improvements.
- Migration notes for breaking changes.

Contribution

- Component design standards.
- Development and testing requirements.
- Accessibility expectations.
- Documentation requirements.
- Bug reports and feature requests.
- Contribution workflow.

These pages should reflect actual project practices, not promise governance, releases, or guarantees that have not yet been established.

## 6. Global Interaction Specifications

| Interaction           | Expected behavior                                            |
| --------------------- | ------------------------------------------------------------ |
| Global search         | Search component names, categories, docs, and examples       |
| Sidebar navigation    | Navigate between sections and preserve the active page state |
| Breadcrumbs           | Navigate to parent sections                                  |
| Theme toggle          | Change the site's theme consistently                         |
| Preview controls      | Update the actual component instance                         |
| Code tabs             | Show the corresponding implementation example                |
| Copy controls         | Copy the associated value or code snippet                    |
| Reset preview         | Restore documented default settings                          |
| Section anchors       | Navigate directly to documentation sections                  |
| Browser navigation    | Back and forward actions restore the correct route           |
| Responsive navigation | Open and close mobile navigation without losing context      |

Interactive controls must have visible focus states, appropriate disabled states, clear labels, and meaningful feedback.

## 7. Search and Discovery

The search experience should be global rather than limited to the currently visible category.

Searchable content:

- Component names and aliases.
- Categories.
- Component descriptions.
- API methods and configuration properties.
- Documentation headings.
- Example names and use cases.

Expected behavior:

1. Open search from the header or a keyboard shortcut.
2. Enter a query.
3. Display grouped results by content type.
4. Highlight matching terms when practical.
5. Navigate to the selected result.
6. Preserve the previous page when the user returns from a result.

Keyboard shortcuts should be documented and must not conflict with browser or assistive-technology conventions.

## 8. Routing and User Flows

\#chatgpt-mermaid-\_r_3i4\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_3i4\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_3i4\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_3i4\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_3i4\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3i4\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_3i4\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_3i4\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_3i4\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_3i4\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_3i4\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_3i4\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3i4\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3i4\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_3i4\_ p{margin:0;}#chatgpt-mermaid-\_r_3i4\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3i4\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3i4\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3i4\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_3i4\_ .label text,#chatgpt-mermaid-\_r_3i4\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3i4\_ .node rect,#chatgpt-mermaid-\_r_3i4\_ .node circle,#chatgpt-mermaid-\_r_3i4\_ .node ellipse,#chatgpt-mermaid-\_r_3i4\_ .node polygon,#chatgpt-mermaid-\_r_3i4\_ .node path{fill:rgb(52, 24, 11);stroke:rgb(172, 79, 35);stroke-width:1px;}#chatgpt-mermaid-\_r_3i4\_ .rough-node .label text,#chatgpt-mermaid-\_r_3i4\_ .node .label text,#chatgpt-mermaid-\_r_3i4\_ .image-shape .label,#chatgpt-mermaid-\_r_3i4\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_3i4\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_3i4\_ .rough-node .label,#chatgpt-mermaid-\_r_3i4\_ .node .label,#chatgpt-mermaid-\_r_3i4\_ .image-shape .label,#chatgpt-mermaid-\_r_3i4\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_3i4\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_3i4\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3i4\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3i4\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_3i4\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_3i4\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_3i4\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_3i4\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_3i4\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_3i4\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_3i4\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3i4\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3i4\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_3i4\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3i4\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_3i4\_ .icon-shape,#chatgpt-mermaid-\_r_3i4\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_3i4\_ .icon-shape p,#chatgpt-mermaid-\_r_3i4\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_3i4\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_3i4\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_3i4\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_3i4\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_3i4\_ .node .neo-node{stroke:rgb(172, 79, 35);}#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_3i4\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_3i4\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].node .neo-line path{stroke:rgb(172, 79, 35);filter:none;}#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_3i4\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_3i4\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3i4\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_3i4\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3i4\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(255, 183, 144);}#chatgpt-mermaid-\_r_3i4\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(255, 183, 144);}#chatgpt-mermaid-\_r_3i4\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_3i4\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_3i4\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(40, 17, 5);stroke:rgb(92, 56, 31);stroke-width:1px;}#chatgpt-mermaid-\_r_3i4\_ .node rect,#chatgpt-mermaid-\_r_3i4\_ .node circle,#chatgpt-mermaid-\_r_3i4\_ .node ellipse,#chatgpt-mermaid-\_r_3i4\_ .node polygon,#chatgpt-mermaid-\_r_3i4\_ .node path{fill:rgb(74, 34, 6);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_3i4\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_3i4\_ .node.mermaid-decision .label-container{fill:rgb(40, 17, 5);stroke:rgb(92, 56, 31);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_3i4\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_3i4\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3i4\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}HomeComponent DirectoryDocumentationExamplesCategory OverviewComponent DetailsLive PlaygroundConfigure ComponentInspect Generated CodeRead API ReferenceIntegrate into ApplicationInstallationFirst ComponentExample Details

### Primary developer journey

1. Discover the library on Home.
2. Open Components.
3. Select a category.
4. Open a component.
5. Experiment with the live preview.
6. Change properties to understand the component.
7. Inspect the generated configuration and code.
8. Read the API documentation.
9. Copy the integration example and use it in an application.

### Secondary journeys

- Experienced developer: Search directly for a method or component property, then jump to its reference.
- Visual explorer: Browse examples, open a component used in an example, and inspect its configuration.
- Contributor: Discover a component, review its implementation requirements, and navigate to contribution guidance.

All journeys should work without requiring user registration.

## 9. Shared Design and Content Rules

- Use consistent page headers, breadcrumbs, section headings, and documentation conventions.
- Prioritize readable technical content and usable interactive previews.
- Keep component demonstrations visually neutral enough to distinguish the component from the website's branding.
- Use consistent spacing, typography, icon sizing, borders, and interaction states.
- Provide light and dark themes if supported by the component library's design goals.
- Avoid unnecessary dashboards, accounts, social features, or community systems in the initial release.
- Treat the component API and actual behavior as the source of truth for the playground and documentation.

## 10. Recommended Delivery Phases

1. Phase 1 — Platform foundation

   Establish navigation, global shell, component directory, category pages, documentation structure, and routing conventions.
2. Phase 2 — Component documentation engine

   Establish reusable component page layouts, live preview containers, property inspectors, code tabs, and API documentation sections.
3. Phase 3 — First integrated component

   Integrate the Color Wheel Picker and connect its real configuration API to the playground, output display, and code examples.
4. Phase 4 — Developer experience

   Add global search, responsive navigation, theming documentation, keyboard support, and copy-to-clipboard behavior.
5. Phase 5 — Examples and project resources

   Add realistic application examples, contribution guidance, and release documentation.

## 11. Acceptance Criteria

The platform's initial structure is ready when:

- Every primary section has a defined purpose and route.
- Components are discoverable through both category browsing and global search.
- Each component has a consistent documentation and playground layout.
- The live preview can be controlled through its documented properties.
- Code examples correspond to the actual vanilla JavaScript API.
- Documentation clearly distinguishes the platform's framework from the component implementation.
- Navigation, breadcrumbs, browser history, and responsive layouts work consistently.
- The initial Color Wheel Picker can be discovered, tested, understood, and integrated without requiring a developer account.