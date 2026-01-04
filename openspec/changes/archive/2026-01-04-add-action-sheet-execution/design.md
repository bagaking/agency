# Design: Action Sheet Execution

## Context
Action execution is repeated across HIL Promote, gates, and other flows. A single Action Sheet engine reduces duplication and makes progress tracking and recovery consistent.

## Goals / Non-Goals
- Goals:
  - Provide a reusable Action Sheet engine with stable storage and execution tracking.
  - Support conditional branching and repeat-until loops via a plugin mechanism.
  - Surface execution status and related session/terminal in the UI.
- Non-Goals:
  - Build a full workflow editor.
  - Replace existing Actions/Gates configuration UI.

## Data Model
- Storage root: `.agency/action-sheets/<id>/`
- Files:
  - `plan.md` (human plan + checklist)
  - `prompt.json` (prompt bundle with requirements/context/checks/done)
  - `checks.json` (gate/check state)
  - `status.json` (state machine + timestamps + session binding)
  - `logs/` (execution logs, optional)

## Prompt Format
A canonical prompt format with tagged sections:
```
<requirements>
...
</requirements>
<context>
...
</context>
<checks>
...
</checks>
<done>
...
</done>
```

## Execution State Machine
States: `queued -> running -> waiting_gate -> completed | failed | canceled`.
- Dispatch sends the prompt to a chosen session.
- Gate evaluation drives transition to `completed` or `repeat`.
- The UI polls or subscribes to status changes.

## Conditional Plugin
- A `conditional` plugin evaluates simple rules and can loop:
  - `when`: condition (e.g., `checks.all_passed`)
  - `then`: actions (summarize, commit, notify)
  - `else`: `repeat_current` with `maxAttempts`, `cooldown`
- Conditions are evaluated by the Action Sheet runner, not by the session itself.

## UI Integration
- Action Sheet panel shows:
  - current state and gate results
  - linked session with jump-to-terminal
  - ability to collapse while running
- Status updates are reflected in a unified Activity/Actions view.

## Risks / Trade-offs
- Looping can cause infinite retries; guard with `maxAttempts` and manual stop.
- Partial failures require clear recovery prompts and retry UI.

## Migration Plan
- Introduce Action Sheets as additive capability.
- Existing flows can adopt the Action Sheet engine incrementally.
