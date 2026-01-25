---
title: UI Component Reuse Guidelines
required: false
sop:
  - Use focusRing for focus-visible styles instead of inline classes.
  - Use IconButton for icon-only actions and set label for accessibility.
  - Use Tooltip for icon-only controls or truncated labels.
---

# UI Component Reuse Guidelines

This document describes how to keep UI components DRY and consistent in the renderer.

## Component Layers
- UI primitives live in `apps/editor/renderer/src/components/ui`.
- Feature-level UI stays in `apps/editor/renderer/src/components/**`.
- If a pattern appears in 2+ screens, consider a shared primitive.

## Focus Rings
- Use `focusRing` from `components/ui/focusRing.js` for all focus-visible styles.
- Do not inline long `focus-visible:*` chains in components.
- Pick the correct offset:
  - `focusRing.default` for general surfaces.
  - `focusRing.sidebar` for sidebar backgrounds.
  - `focusRing.dark` for dark or near-black surfaces.
  - `focusRing.inverse` for light-on-dark controls.
- If you need a different ring color, add a small override after the base class.

## Icon-Only Actions
- Use `IconButton` from `components/ui/IconButton.jsx`.
- Always set `label` for accessibility and tooltip text.
- Use `tooltip={false}` only when the label should not be shown.
- Prefer icons and tooltip for dense toolbars and quick actions.

## Tooltips
- Use `Tooltip` for icon-only controls or when labels are truncated.
- The Tooltip implementation is viewport-aware and should not overflow the app bounds.

## When To Extract
- If the same layout and classes appear in 2+ components, extract a helper component.
- If a component mixes layout, behavior, and styling, consider splitting for reuse.
- Keep primitives small and composable; avoid over-abstracting.
