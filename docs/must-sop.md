# Agency SOP

This SOP is generated from docs frontmatter. Do not edit manually.

## Update Requirements
- When a document with SOP frontmatter changes, regenerate this file with `node scripts/generate-sop.mjs` and commit `docs/must-sop.md`.
- Add new SOP items by updating the `sop` list in the source document frontmatter.
- Keep SOP items small and actionable; use the source document for details.

## SOP Items

### Design Docs Index
Source: `docs/architecture-design-index.md`
- Read this doc to find the authoritative design sources for Agency Editor.
- Update this doc when design source locations change.
- Regenerate docs/must-sop.md after updating this doc.

### UI Component Reuse Guidelines
Source: `docs/guidelines-ui-components.md`
- Use focusRing for focus-visible styles instead of inline classes.
- Use IconButton for icon-only actions and set label for accessibility.
- Use Tooltip for icon-only controls or truncated labels.
- When extracting shared UI components, update this doc and regenerate docs/must-sop.md.

### Memory Policy
Source: `docs/must-memory.md` (required)
- Read this doc before capturing or using project memory.
- Update this doc when memory workflow changes.
- Regenerate docs/must-sop.md after updating this doc.

### Development Norms
Source: `docs/norms-dev.md` (required)
- Read docs/must-guidebook.md before working.
- Use pnpm for workspace dependencies and keep pnpm-lock.yaml committed.
- Renderer IPC must go through apps/editor/renderer/src/services/agencyBridge.js.
- Avoid direct window.agency usage in React components.
- When changing voice input, rescore behavior, or language handling, update docs/notes-voice-input.md.
- Keep code DRY and SOLID; refactor files over 800 lines.
- Verify preload and IPC injection health; surface a minimal status indicator if missing.

### Session Map (SLG Overview)
Source: `docs/notes-session-map.md`
- Read this doc when working on the session map overlay or multi-session navigation.
- Update this doc when map layout, config, or hover preview behavior changes.
- Regenerate docs/must-sop.md after updating this doc.

### Terminal Keyboard Notes
Source: `docs/notes-terminal-keyboard.md`
- When changing terminal keyboard sequences, update this doc and regenerate docs/must-sop.md.
- Validate Shift+Enter behavior using the manual verification checklist in this doc.

### Voice Input Implementation Notes
Source: `docs/notes-voice-input-implementation.md`
- Read this doc when looking for voice input implementation entrypoints.
- Update docs/notes-voice-input.md first, then keep this doc aligned if needed.
- Regenerate docs/must-sop.md after updating this doc.

### Voice Input Notes
Source: `docs/notes-voice-input.md`
- When modifying voice input, rescore, or language handling, update this doc and regenerate docs/must-sop.md.
- Keep permission flow, warmup, and fallback behavior aligned with this doc.
