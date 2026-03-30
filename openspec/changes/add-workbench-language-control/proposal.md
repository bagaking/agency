# Change: Add Workbench language control

## Why
Workbench syntax highlighting is now materially better than before, but it still lacks one coherent language-resolution system.
Today the product can detect many file types, yet it does not give users a bounded way to correct mis-detected languages, and it does not expose a project-owned rule seam for repository-specific file conventions.

## What Changes
- Define one explicit Workbench language decision chain:
  - local manual override
  - project policy from `.agency/workbench.yaml` / `.agency/workbench.yml`
  - built-in filename/extension detection
- Add a bounded Workbench language control for the active text tab.
- Add project-level Workbench language rules without relaxing existing secure-kind safety boundaries.
- Update canonical docs, reusable-item catalogs, and manual verification to preserve the design and implementation boundaries.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/shared/workbenchLanguageCore.ts`
  - `apps/editor/electron/services/workbenchPolicy.ts`
  - `apps/editor/renderer/src/components/workbench/**`
  - `apps/editor/renderer/src/services/agencyBridge.ts`
- Affected docs:
  - `docs/norms-dev.md`
  - `docs/notes-reusable-items-coding.md`
  - `docs/notes-workbench-highlighting-system.md`
  - `apps/editor/README.md`
  - `apps/editor/docs/manual-test.md`
