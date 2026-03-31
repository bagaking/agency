# Change: Refine HIL surface craft and interaction hierarchy

## Why
The current HIL surfaces are functional but they do not yet meet Agency's interaction-design bar. Terminology is mixed (`Memo Inbox`, `HIL Repository`, `Neural Comments`), primary actions are not consistently legible, and the visual language across Comments, Drafts, Memo, and Promote still feels assembled feature-by-feature instead of designed as one coherent product surface.

## What Changes
- Unify HIL/Memo terminology and chrome so artifact workflows read as one Memo workspace.
- Strengthen primary action hierarchy across Comments, Memo, Drafts, and Promote.
- Raise craft quality for typography, spacing, status treatment, and panel composition without reducing information density.
- Add/align design docs so future agents preserve the same surface boundaries and quality bar.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/layout/AppHilPanel.tsx`
  - `apps/editor/renderer/src/components/hil/**`
  - `apps/editor/renderer/src/components/hil/memo/**`
  - `apps/editor/renderer/src/app/useHilPromoteWorkflow.ts`
  - `apps/editor/renderer/src/hooks/useHilMemoState.ts`
  - related renderer tests
- Affected docs:
  - `AGENTS.md`
  - `docs/guidelines-hil-surface-design.md`
  - `docs/must-guidebook.md`
  - `apps/editor/README.md`
  - `docs/notes-session-management.md`
  - `docs/notes-reusable-items-*.md` (if shared patterns are introduced)

## Risks
- Over-correcting aesthetics could blur operational clarity.
- Renaming panels could break current mental models if not applied consistently.

## Mitigation
- Keep object boundaries stable: HIL/Memo remains the artifact workspace, Session Reply remains session-owned.
- Validate with focused renderer tests and checkpoint reviews before final polish.
