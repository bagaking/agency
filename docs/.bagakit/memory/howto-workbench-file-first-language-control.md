---
title: Workbench file-first language control cold start
kind: howto
confidence: high
tags:
  - workbench
  - explorer
  - monaco
  - language-control
  - cold-start
sources:
  - openspec/changes/add-workbench-language-control/proposal.md
  - openspec/changes/add-workbench-language-control/design.md
  - openspec/changes/add-workbench-language-control/specs/agency-editor/spec.md
  - docs/notes-workbench-highlighting-system.md
  - apps/editor/renderer/src/components/workbench/WorkbenchPane.tsx
  - apps/editor/renderer/src/components/workbench/WorkbenchLanguageControl.tsx
  - apps/editor/renderer/src/components/workbench/useWorkbenchLanguageOverrides.ts
  - apps/editor/shared/workbenchLanguageCore.ts
created: 2026-03-31
updated: 2026-03-31
---

# Workbench file-first language control cold start

## What this capability is
- Agency keeps `Explorer -> Workbench` file-first.
- The root object is still the file, not a task buffer, note graph, or agent artifact.
- The language control is a file-context refinement layer over the current text file.

## General vs specialized boundaries
- General Workbench domain:
  file tabs, breadcrumb reveal, dirty/open state, diff, blame, media preview, disk sync.
- Specialized language-control domain:
  effective editor language only.
  It does not own secure file kind, file unlock, repo mutation, or task routing.

## Non-negotiable rules
- Effective language chain:
  `window-local manual override -> project policy -> builtin detection`
- Manual override is window-local UI state, not repo policy.
- Project policy lives in `.agency/workbench.yaml` or `.agency/workbench.yml`.
- Language choice must not silently reclassify `unknown` or binary files into editable code.
- The control belongs only on text/code tabs. Do not promote it to a generic object-level setting.

## Where to start reading
1. `docs/notes-workbench-highlighting-system.md`
2. `openspec/changes/add-workbench-language-control/design.md`
3. `openspec/changes/add-workbench-language-control/specs/agency-editor/spec.md`
4. `apps/editor/shared/workbenchLanguageCore.ts`
5. `apps/editor/renderer/src/components/workbench/WorkbenchPane.tsx`

## Canonical implementation seams
- Shared language ids / labels / matcher rules:
  `apps/editor/shared/workbenchLanguageCore.ts`
- Project policy loading:
  `apps/editor/electron/services/workbenchPolicy.ts`
- Effective language decision:
  `apps/editor/renderer/src/components/workbench/workbenchLanguageDecision.ts`
- Window-local override persistence:
  `apps/editor/renderer/src/components/workbench/useWorkbenchLanguageOverrides.ts`
- UI surface:
  `apps/editor/renderer/src/components/workbench/WorkbenchLanguageControl.tsx`

## Shortcuts that are wrong
- Do not write `.agency/workbench.yaml` from a single file-level click.
- Do not bind overrides to tab serialization.
- Do not show repo-global diagnostics on non-project-rule files.
- Do not let “Reset” imply builtin-only if project policy still applies.
- Do not extend the override UI to vector/media/unknown surfaces without a new spec.
