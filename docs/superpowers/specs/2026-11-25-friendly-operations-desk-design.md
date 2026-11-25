# Friendly Operations Desk Design

## Intent

SmartBiz Analyzer should feel like a calm, capable business partner for Indonesian small-business owners and analysts. The interface must replace the current generic glass-card dashboard with a warmer, clearer workspace that helps people understand what to do next.

## Goals

- Use consistent Indonesian product copy.
- Make the dashboard useful in empty, loading, success, and API-error states.
- Work cleanly at 360, 768, 1024, and 1440 pixel viewport widths.
- Preserve every existing route and business workflow.
- Make primary actions, data sources, status, and recovery actions obvious.
- Respect keyboard focus and reduced-motion preferences.

## Non-goals

- No backend contract changes.
- No new analytics features or authentication flows.
- No external UI framework or additional runtime dependency.
- No decorative animation system.

## Anti-goals

- No generic glassmorphism, gradient washes, or identical rounded cards everywhere.
- No desktop sidebar squeezed into a mobile viewport.
- No silent API failures that look like legitimate empty states.
- No mixed Indonesian and English navigation or action vocabulary.

## Visual system

### Color

- `Canvas` — `#F4F6F3`, a mineral grey-green background.
- `Paper` — `#FFFFFF`, reserved for working surfaces.
- `Ink` — `#18201E`, a soft deep green-black for primary text.
- `Forest` — `#176B55`, the primary action and success color.
- `Marigold` — `#E7A43B`, a warm accent for attention and progress.
- `Brick` — `#C95845`, destructive and critical states.

Dark mode uses deep forest-charcoal surfaces rather than pure black. Semantic colors retain sufficient text contrast.

### Typography

Use `Manrope` for the interface because its open forms feel conversational while numerals remain clear in business data. Use tabular numerals for KPIs. Headings use weight and spacing rather than decorative labels.

### Layout

Desktop uses a quiet 248px navigation rail and a centered content canvas capped at 1440px. Tablet collapses the rail to icons. Mobile removes the rail, introduces a compact top bar and four-item bottom navigation, and reserves bottom padding so content and the chat trigger never collide.

```text
Desktop                         Mobile
┌──────────┬────────────────┐   ┌──────────────────────┐
│ brand    │ top utilities  │   │ brand       actions │
│          ├────────────────┤   ├──────────────────────┤
│ nav      │ page context   │   │ page context         │
│          │ content        │   │ content, one column  │
│ help     │                │   ├──────────────────────┤
└──────────┴────────────────┘   │ bottom navigation    │
                               └──────────────────────┘
```

## Interaction principles

- One primary action per page.
- Empty states explain the next useful action.
- Errors identify the failed operation and provide a retry path.
- Motion responds to interaction; page-load decoration is minimized and disabled with reduced motion.
- Tables keep horizontal scrolling local and expose sticky headers where practical.
- Chat uses the full available width on small screens and never covers bottom navigation.

## Approaches considered

1. **Friendly operations desk — selected.** Warm, direct, and suited to owners who need guidance as much as analytics.
2. **Editorial analytics.** Strong information density, but too formal and less approachable for the product's mixed audience.
3. **Modern data studio.** Visually energetic, but too close to a generic technology dashboard and less calm for operational work.

## Constraints and builder calls

- Keep Next.js 16, React 19, Tailwind CSS, Radix primitives, Recharts, and Framer Motion already in the project.
- Keep all route URLs and API request shapes unchanged.
- Use responsive CSS and existing primitives; do not add dependencies.
- Treat existing user data and server responses as untrusted-length content: truncate, wrap, or scroll without breaking layout.

