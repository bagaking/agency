# Change: Project selection empty state + packaged UI diagnostics

## Why
Packaged builds can start without a git repo context and currently show no visible UI. Users also need a clear entry point to choose a project directory when no repo is configured.

## What Changes
- Add a project root selection flow with an explicit empty state when no project is configured.
- Default to Explorer with a project picker when no project is selected.
- Show a placeholder Agent Cells view that only allows opening the default terminal until a project is chosen.
- Add startup diagnostics and guardrails so packaged builds always load the local renderer UI.

## Impact
- Affected specs: `openspec/specs/agency-editor/spec.md`
- Affected code: Electron main startup, explorer root resolution, UI routing/empty state
