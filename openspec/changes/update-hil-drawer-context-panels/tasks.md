## 1. Implementation
- [x] 1.1 Add view-aware HIL drawer defaults (Agent Cells -> Drafts; Action Sheets/Explorer -> Comments) with per-view panel memory and forced-open overrides.
- [x] 1.2 Add a Drafts drawer panel (list drafts + navigate to Memo draft detail) and enable the Drafts tab.
- [x] 1.3 In Memo view, replace Comments/Drafts tabs with Inbox shortcuts (Flash, Screenshot) plus an Open Inbox entry.
- [x] 1.4 Ensure Memo main Inbox inputs remain unchanged (drawer is supplemental only).
- [x] 1.5 Default Promote session selection to the active session when opened from Agent Cells; otherwise fall back to last selection or first available session.
- [x] 1.6 Update copy and add QA notes for view-specific drawer behavior.

## 2. Validation
- [x] 2.1 Update specs and validate with `openspec validate --strict`.

## 3. QA Notes
- Verify drawer defaults: Agent Cells -> Drafts; Action Sheets/Explorer -> Comments; other views fall back to Comments.
- Confirm per-view panel selection persists and forced opens (comment/promote) do not overwrite the stored preference.
- In Memo view, confirm drawer shows shortcuts only; Flash/Screenshot/Open Inbox select the corresponding inbox section in the main pane.
- Drafts drawer panel lists drafts and clicking a draft opens Memo with that draft selected.
- Promote session defaults to active session when opened from Agent Cells; other views use last selection or first available session.
