# Design: Promote Execution Dispatch

## Flow
1. User selects items, writes description, chooses session.
2. On Start Promote:
   - Create draft with `meta.promoted: false` (existing).
   - Build a structured prompt bundle including draft description, selected items, and anchors.
   - Dispatch the prompt to the chosen session via IPC to the terminal/agent runner.
   - Focus the selected session and open the terminal/workbench view.
3. Track execution status (`queued|running|complete|failed`) in draft metadata.
4. Gate readiness checks `meta.promoted: true` AND `meta.executionStatus: complete`.

## Prompt Payload
- Title: Promote Draft <id>
- Description: user-provided description
- Items: grouped by type/source with file anchors and context snippets
- Output expectation: update draft metadata with `promoted: true` and optional checklist

## UI
- Promote modal shows the dispatch status and the active session.
- Provide quick link to jump to the session terminal.

## Non-goals
- Auto-resolving merge conflicts or running tests.
