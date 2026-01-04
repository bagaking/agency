# Design: Action Sheet Integrations

## Context
Explorer and Promote currently dispatch prompts directly to sessions. Action Sheets should be the default execution wrapper so checks, status, and retries are consistent.

## Goals / Non-Goals
- Goals:
  - Route Explorer feed through Action Sheets using selection context and description.
  - Create and bind Action Sheets during Promote, and sync gate completion.
  - Provide UI navigation from Promote to the Action Sheet panel.
- Non-Goals:
  - Replace the Promote UI workflow.
  - Add new gate semantics beyond existing HIL promote completion.

## Decisions
- Explorer feed will create an Action Sheet with:
  - requirements = user description
  - context = selection tree
  - checks = empty by default (user can edit later)
  - done = instruction to update check status
- Promote will create an Action Sheet and store `actionSheetId` in draft meta.
- Promote gate completion will mark the Action Sheet checks/status as passed/completed.

## Risks / Trade-offs
- Promote gate sync must avoid race conditions; prefer idempotent updates.
- Action Sheet creation should fail gracefully if no active session is available.

## Migration Plan
- Add Action Sheet integration behind existing UI entrypoints; no data migration.
