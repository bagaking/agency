---
title: Turn Workflow (Gates + Action Sheets)
required: false
sop:
  - Read this doc when adjusting lifecycle gate UX, Action Sheet gating patterns, or Cell/worktree merge workflows.
  - Update this doc when the recommended Turn patterns (Gate Create / Gate Execute) or examples change.
  - Regenerate docs/must-sop.md after updating this doc.
---

# Turn Workflow (Gates + Action Sheets)

This note documents the intended **Turn** workflow pattern for Agency Editor.

## Core Idea

- A **Turn** is an iteration unit that is **not strongly bound to OpenSpec**, but is **strongly bound to worktree merge readiness**.
- Every Turn has two explicit checkpoints around “development”:
  1) **Gate Create** (before development)
  2) **Gate Execute** (after development)

The goal is to make pre/post steps **repeatable, inspectable, and automatable** without hard-coding OpenSpec as the only workflow.

## Mapping to Existing Concepts

- **Cell**: 1:1 with a git worktree + branch.
- **Lifecycle gates**: shell-command checks that can block lifecycle transitions.
- **Action Sheets**: a workflow artifact with plan/prompt/checks, bound to a session; suitable for “agent does work → system runs checks → repeat/follow-up until ready”.

### When to Use Which

- Use **Gates** when you need **hard enforcement** (e.g., block transition to Active/Archived).
- Use an **Action Sheet** when you want a **guided workflow loop** (plan → dispatch to a session → checks → repeat/follow-up).
- The recommended Turn pattern uses **both**:
  - Gate Create: generate/adjust gates and checks (often via an Action Sheet).
  - Gate Execute: run checks (either directly as gates, or as an Action Sheet whose checks mirror the gates).

## Gate Create / Gate Execute (Recommended)

### Gate Create (Before Development)

Goal: ensure the “contract + checklist + verification hooks” exist before coding.

Typical outcomes:
- Spec/proposal exists (if applicable).
- Tasks/checklist exists with ownership and exit criteria.
- Checks are defined (gates or Action Sheet checks) so “done” is measurable.

### Gate Execute (After Development)

Goal: deterministically prove the Turn is merge-ready.

Typical outcomes:
- All gates/checks pass.
- Conflicts are resolved.
- Required docs are updated.
- The change is either merged or ready to be merged.

## Required Examples

### Example 1: OpenSpec Change (Create on Main → Archive at Finish)

Gate Create (before development):
1. Create change scaffolding on the mainline repo context:
   - `openspec new change <change-id>`
2. Fill in `proposal.md` / `tasks.md` (and `design.md` when needed).
3. Validate:
   - `openspec validate <change-id> --strict`

Gate Execute (after development):
1. Ensure all tasks are actually done and checked in `tasks.md`.
2. Validate again:
   - `openspec validate <change-id> --strict`
3. Archive the change when ready:
   - `openspec archive <change-id> --yes`
4. Validate the whole spec surface:
   - `openspec validate --all --strict`

Notes:
- The Turn is not “OpenSpec-only”; OpenSpec is one concrete pattern that benefits from Gate Create/Execute.
- If the archive step is intentionally postponed (e.g., waiting for deployment), record that in the Turn notes and keep the checks explicit.

### Example 2: Text Design → Development → Tests to Exit

Gate Create (before development):
1. Write a short design note with acceptance criteria (doc or OpenSpec design delta).
2. Create an Action Sheet that includes:
   - Requirements: what the feature must do.
   - Context: links to the design note + key files.
   - Checks: commands (typecheck/unit/e2e) + invariant checks.

Gate Execute (after development):
1. Run the checks until they pass (either via lifecycle gates or Action Sheet checks).
2. Only then proceed to merge or lifecycle transition.

## Additional Suggested Patterns (Pick 3-5 Per Project)

Below are additional Turn patterns that benefit from explicit Gate Create/Execute.

### Pattern A: Bug Fix With Regression Contract

- Gate Create:
  - Add a failing test (unit/integration/e2e) that reproduces the bug.
  - Record the minimal reproduction steps and expected behavior.
- Gate Execute:
  - Fix the bug.
  - Ensure the new test passes and no flaky retries are required.

### Pattern B: UI/UX Iteration With Manual Checklist

- Gate Create:
  - Add a small manual checklist (focus/keyboard/empty state/accessibility) to the Turn plan.
  - Define the “before vs after” screenshots or interactions.
- Gate Execute:
  - Run Playwright (or the relevant subset).
  - Execute the manual checklist and record outcomes.

### Pattern C: Performance Work With Baselines

- Gate Create:
  - Capture baseline measurements (time-to-first-tree, tab-open latency, etc.).
  - Define a target budget or regression threshold.
- Gate Execute:
  - Re-measure and compare.
  - Ensure no correctness regressions (tests + spot checks).

### Pattern D: Release/Packaging Turn

- Gate Create:
  - Define the packaging target(s) (DMG/ZIP) and smoke test list.
- Gate Execute:
  - Build artifacts.
  - Run smoke tests (launch, open project, terminal, explorer, workbench).

### Pattern E: Data/Schema Migration

- Gate Create:
  - Write a migration plan and rollback plan.
  - Add checks to detect partial migration.
- Gate Execute:
  - Run migration.
  - Verify invariants and ensure rollback instructions are correct.

## UI Direction (Implementation Guideline)

- A Turn should expose **two explicit UI actions** near the development workflow:
  - **Gate Create**: create an Action Sheet template to help author/update gates + checks.
  - **Gate Execute**: create an Action Sheet whose checks mirror the current gates for the selected stage, so “ready” is visible and repeatable.

This keeps the “Turn” concept flexible (not locked to OpenSpec) while still being operationally tied to worktree merge readiness.

## Implementation (Current)

- Location: this flow should be treated as an optional workflow-suite affordance rather than a default core workspace control.
- The base `Create Cell` modal should stay focused on worktree management; it should not default to starting Turn tooling as part of the core path.
- **Gate Create**:
  - creates an Action Sheet template that prompts for Turn exit criteria + gate/check authoring;
  - includes pointers to project/agent gate config paths;
  - opens **Action Sheets** view with the new sheet selected.
- **Gate Execute**:
  - creates an Action Sheet whose checks mirror the **resolved** lifecycle gates for the selected stage
    (`active` by default; `archived` when the Cell is archived);
  - normalizes gate commands to match gate semantics (skips empty lines and `#` comment lines);
  - opens **Action Sheets** view with the new sheet selected.

Notes:
- If a workflow suite is enabled, lifecycle gates remain its hard enforcement mechanism for stage transitions.
- The Action Sheet creation path always appends a completion-marker check (plan.md checkbox) so it can be completed deterministically.
