# Change: Add Explorer Policy Presets

## Why
Explorer policy currently handles defaults, ordering, and command visibility, but it still cannot express reusable task presets. That leaves projects without a coherent way to say “for this repo, reviewing changed files, semantic files, or docs research should start from these Explorer settings.”

The current platform is now strong enough to support presets without falling back into ad hoc sidebar logic. This is the next natural slice after descriptor-driven working sets and policy seams.

## What Changes
- add named Explorer policy presets to `.agency/explorer.yaml`
- define what a preset can configure across working-set, search mode, content-search scope, and descriptor defaults
- define how presets are surfaced and applied without mutating file-intent behavior
- add validation and persistence rules so project presets and user-local state do not fight each other

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/explorer/*`
  - `apps/editor/electron/services/explorerPolicy.ts`
  - Explorer OpenSpec + docs
