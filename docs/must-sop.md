# Project SOP

This SOP is generated from docs frontmatter. Do not edit manually.

## Update Requirements
- When a document with SOP frontmatter changes, regenerate this file and commit the result:
  - `sh scripts/bagakit_generate_sop.sh .`
- Add new SOP items by updating the `sop` list in the source document frontmatter.
- Keep SOP items small and actionable; use the source document for details.

## SOP Items

### Design Docs Index
Source: `docs/architecture-design-index.md`
- Read this doc to find the authoritative design sources for Agency Editor.
- Update this doc when design source locations change.
- Regenerate docs/must-sop.md after updating this doc.

### Doc Co-Authoring Workflow (Guidelines)
Source: `docs/guidelines-doc-coauthoring.md`
- Use this workflow when drafting substantial docs (proposals, specs, decision docs, RFCs).
- Update this doc when your team changes its doc-writing workflow or quality bar.
- Regenerate `docs/must-sop.md` after SOP/frontmatter changes.

### UI Component Reuse Guidelines
Source: `docs/guidelines-ui-components.md`
- Use focusRing for focus-visible styles instead of inline classes.
- Use IconButton for icon-only actions and set label for accessibility.
- Use Tooltip for icon-only controls or truncated labels.
- When extracting shared UI components, update this doc and regenerate docs/must-sop.md.

### Development Norms
Source: `docs/norms-dev.md`
- Read docs/must-guidebook.md before working.
- Use pnpm for workspace dependencies and keep pnpm-lock.yaml committed.
- Renderer IPC must go through apps/editor/renderer/src/services/agencyBridge.ts.
- Avoid direct window.agency usage in React components.
- When changing voice input, rescore behavior, or language handling, update docs/notes-voice-input.md.
- Keep code DRY and SOLID; refactor files over 800 lines.
- Verify preload and IPC injection health; surface a minimal status indicator if missing.
- Directives:
  - DEBUG: When debugging, include a final-response attempt summary using `<问题>: 尝试 <次数> - <一句话描述方法>` (7 Chinese characters), and note the inbox record.

### Maintaining Reusable Items (可复用项维护)
Source: `docs/norms-maintaining-reusable-items.md`
- At the start of each iteration, check whether the project needs a new reusable-items catalog for an active domain (coding/design/writing/knowledge) and create/update it.
- When introducing or updating a reusable item (component/library/mechanism/token/style pattern/index; including API/behavior/ownership/deprecation), verify the relevant catalog entry is correct and update it in the same change.
- When SOP/frontmatter changes in these docs, regenerate `docs/must-sop.md` with `sh scripts/bagakit_generate_sop.sh .`.

### Adopting Living Docs in an Existing Project
Source: `docs/notes-adopting-living-docs.md`
- Read this doc before adopting Bagakit living-docs into a repo that already has documentation under `docs/`.
- Update this doc when the repo's adoption/migration strategy changes (e.g., naming rules, CI gating, or legacy-doc handling).
- Regenerate `docs/must-sop.md` after SOP/frontmatter changes.

### Continuous Learning (Default)
Source: `docs/notes-continuous-learning.md`
- At the end of a Codex work session, capture a draft learning note into `docs/.bagakit/inbox/` (manual or via `sh scripts/bagakit_learning.sh extract --last`). The default extractor upserts into a daily file to avoid fragmentation.
- Weekly (or before major releases), review `docs/.bagakit/inbox/` and promote durable items into `docs/.bagakit/memory/`.
- When promoting, keep entries short and source-linked; prefer `decision-*`/`preference-*`/`gotcha-*`/`howto-*` over long narratives. If the curated target already exists, merge instead of creating duplicates.

### Response Directives (Examples)
Source: `docs/notes-directives-examples.md`
- Read this doc when you want to introduce or change response directives (`directives:` in doc frontmatter).
- Keep directive usage practical: only add directives that reduce mistakes or improve debuggability.
- Regenerate `docs/must-sop.md` after SOP/frontmatter changes.

### Unified File Interaction System
Source: `docs/notes-file-interaction-system.md`
- Read this doc when changing Explorer, Agent Cells, Session Map, or Memo file interactions.
- Update this doc when end-state goals, interaction contracts, or semantic-file rules change.
- Regenerate docs/must-sop.md after updating this doc.

### Turn Workflow (Gates + Action Sheets)
Source: `docs/notes-gate-turn-workflow.md`
- Read this doc when adjusting lifecycle gate UX, Action Sheet gating patterns, or Cell/worktree merge workflows.
- Update this doc when the recommended Turn patterns (Gate Create / Gate Execute) or examples change.
- Regenerate docs/must-sop.md after updating this doc.

### Promotion Delivery Mechanism
Source: `docs/notes-promotion-delivery-mechanism.md`
- Read this doc when changing Promote, Explorer feed dispatch, or Session Reply delivery flows.
- Update this doc when delivery lifecycle, storage contract, or metadata schema changes.
- Regenerate docs/must-sop.md after updating this doc.

### Reusable Items - Coding (Catalog)
Source: `docs/notes-reusable-items-coding.md`
- Update this list when you introduce or adopt a new reusable component/library/mechanism.
- When you remove or deprecate something, update this list and point to the replacement or migration.
- Regenerate `docs/must-sop.md` after SOP/frontmatter changes.

### Reusable Items - Design (Catalog)
Source: `docs/notes-reusable-items-design.md`
- Update this list when you introduce a new token/palette/component pattern or a new design artifact workflow.
- Keep links to the source of truth (design files, token definitions, component library docs).
- Regenerate `docs/must-sop.md` after SOP/frontmatter changes.

### Session Management (Map + Attach Lifecycle)
Source: `docs/notes-session-management.md`
- Read this doc when working on session management (attach, idle, preview cache) or the session map overlay.
- Update this doc when attach/idle/preview behavior or map layout/config changes.
- Regenerate docs/must-sop.md after updating this doc.

### Terminal Interaction Requirements
Source: `docs/notes-terminal-interaction-requirements.md`
- Read this doc when changing terminal mouse/selection/scroll behavior.
- Update this doc when interaction requirements or competitive research changes.
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

