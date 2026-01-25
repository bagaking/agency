# Agency SOP

This SOP is generated from docs frontmatter. Do not edit manually.

## Update Requirements
- When a document with SOP frontmatter changes, regenerate this file with `node scripts/generate-sop.mjs` and commit `docs/sop.md`.
- Add new SOP items by updating the `sop` list in the source document frontmatter.
- Keep SOP items small and actionable; use the source document for details.

## SOP Items

### Development Norms
Source: `docs/dev-norms.md` (required)
- Read docs/guidebook.md before working.
- Use pnpm for workspace dependencies and keep pnpm-lock.yaml committed.
- Renderer IPC must go through apps/editor/renderer/src/services/agencyBridge.js.
- Avoid direct window.agency usage in React components.
- When changing voice input, rescore behavior, or language handling, update docs/voice-input-notes.md.
- Keep code DRY and SOLID; refactor files over 800 lines.
- Verify preload and IPC injection health; surface a minimal status indicator if missing.

### Terminal Keyboard Notes
Source: `docs/terminal-keyboard-notes.md`
- When changing terminal keyboard sequences, update this doc and regenerate docs/sop.md.
- Validate Shift+Enter behavior using the manual verification checklist in this doc.

### UI Component Reuse Guidelines
Source: `docs/ui-components-guidelines.md`
- Use focusRing for focus-visible styles instead of inline classes.
- Use IconButton for icon-only actions and set label for accessibility.
- Use Tooltip for icon-only controls or truncated labels.
- When extracting shared UI components, update this doc and regenerate docs/sop.md.

### Voice Input Notes
Source: `docs/voice-input-notes.md`
- When modifying voice input, rescore, or language handling, update this doc and regenerate docs/sop.md.
- Keep permission flow, warmup, and fallback behavior aligned with this doc.
