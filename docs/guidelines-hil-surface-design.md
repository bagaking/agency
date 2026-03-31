---
title: HIL Surface Design Guidelines
required: false
sop:
  - Read this doc when changing Memo, Comments, Drafts, Promote, or HIL drawer chrome.
  - Update this doc when HIL terminology, hierarchy, or shared surface patterns change.
  - Regenerate docs/must-sop.md after updating this doc.
---

# HIL Surface Design Guidelines

This guideline keeps the Memo/HIL area coherent as one product surface.

## Surface Language
- Use `Memo` as the primary surface noun for artifact work.
- Treat `HIL` as an internal/storage term, not as the primary UI noun.
- Use `Comments`, `Drafts`, `Capture`, and `Promote` as explicit sub-modes inside Memo/HIL.
- Do not rename the same artifact family with unrelated metaphors such as one-off “clever” panel titles.

## Hierarchy
- Primary action and current context must be visible without reading secondary metadata first.
- Tiny uppercase labels are allowed only for secondary framing, not for the main information path.
- Status chips and execution state must be visually distinct from passive counts or timestamps.
- Comments compose must visibly separate context, snippet evidence, note input, and commit action.
- Promote must make “what is selected / where it goes / what state it is in” readable before auxiliary detail.

## Craft
- Keep panel titles, list rows, and modal actions readable at a glance; do not rely on sub-10px text for core comprehension.
- Use one consistent card rhythm, border softness, and shadow language across Comments, Drafts, Memo, and Promote.
- Prefer intentional density over decorative clutter: the surface should feel compact, not cramped.

## Boundaries
- Memo/HIL remains the artifact workspace.
- Session Reply remains session-owned and must not be restyled as a Memo/HIL inbox mode.
- Promote is the execution bridge out of artifact review; it should not feel like a generic settings form.
