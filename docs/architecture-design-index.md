---
title: Design Docs Index
required: false
sop:
  - Read this doc to find the authoritative design sources for Agency Editor.
  - Update this doc when design source locations change.
  - Regenerate docs/must-sop.md after updating this doc.
---

# Design Docs Index

This is a lightweight index that points to the authoritative design sources. It does not duplicate spec content.

## Core design sources (authoritative)
- Project goals, principles, and constraints: `openspec/project.md`
- Product requirements/specification: `openspec/specs/agency-editor/spec.md`
- Change proposals and detailed designs: `openspec/changes/*/proposal.md`, `openspec/changes/*/design.md`
- Archived historical designs: `openspec/changes/archive/**`
- Unified control bus (delivered): `openspec/changes/archive/2026-03-30-add-unified-control-bus/`
- Attention layer (delivered): `openspec/changes/archive/2026-03-30-add-attention-layer/`
- Explorer capability platform (delivered): `openspec/changes/archive/2026-03-30-refactor-explorer-capability-platform/`
- Canonical object model (delivered): `openspec/changes/archive/2026-03-29-refactor-canonical-object-model/`
- Commander unified station (delivered): `openspec/changes/archive/2026-03-29-refactor-commander-unified-station/`
- Main Agent Harness (delivered): `openspec/changes/archive/2026-03-29-add-main-agent-harness/`
- Session runtime orchestration gateway (delivered): `openspec/changes/archive/2026-03-29-add-session-runtime-orchestration-gateway/`
- Deferred heavyweight renderer surfaces (delivered): `openspec/changes/archive/2026-03-29-update-renderer-deferred-heavy-surfaces/`
- Unified file interaction system (delivered): `openspec/changes/archive/2026-02-10-add-agent-centric-file-interaction-system/`
- Unified file interaction evolution (delivered): `openspec/changes/archive/2026-02-16-update-agent-cells-embedded-explorer/`
- Window instance strategy (delivered): `openspec/changes/archive/2026-03-29-update-window-instance-strategy/`

## Behavior + verification sources
- Current feature scope & manual verification: `apps/editor/README.md`
- Manual test checklist: `apps/editor/docs/manual-test.md`

## Supplemental notes & guidelines (supporting)
- Notes: `docs/notes-*.md`
- Electron native browser surface geometry, layering, and debugging: `docs/notes-electron-browser-surface.md`
- Unified file interaction philosophy and end-state: `docs/notes-file-interaction-system.md`
- Explorer interaction capability and external research synthesis: `docs/notes-explorer-interaction-system.md`
- Workbench highlighting resolution and provider boundaries: `docs/notes-workbench-highlighting-system.md`
- Guidelines: `docs/guidelines-*.md`
- Norms: `docs/norms-*.md`
