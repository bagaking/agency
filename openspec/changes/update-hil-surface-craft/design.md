## Context
Agency's HIL surface already has the right product boundary: Memo is the artifact workspace, Comments and Drafts are bounded artifact modes, and Promote is the dispatch bridge from artifact review into execution. The weak point is not capability coverage but surface craft.

Today the user sees too many local metaphors:
- `Memo Inbox`
- `HIL Repository`
- `Neural Comments`
- `HIL Drafts`

That weakens product identity and makes the user mentally re-parse the same object family on every panel switch. The current typography and spacing also bias toward "dense tool UI" more than "confident operator workspace".

## Goals / Non-Goals
- Goals:
  - Make the HIL area read as one Memo workspace with consistent sub-surface naming.
  - Clarify the primary action path in each panel without flattening detail.
  - Reuse a small set of shared HIL surface primitives instead of repeating bespoke panel chrome.
  - Keep session reply, attention, and commander boundaries intact.
- Non-Goals:
  - Changing HIL storage or workflow ownership.
  - Folding Session Reply back into Memo/HIL.
  - Redesigning unrelated Explorer or Workbench affordances.

## Decisions
- Decision: `Memo` becomes the primary surface noun; `Comments`, `Drafts`, `Capture`, and `Promote` are sub-modes inside that system.
  - Rationale: The canonical object model already says Memo is the artifact surface. The UI should stop competing with that truth.
- Decision: Replace decorative or ad-hoc labels (`Neural Comments`, `HIL Repository`) with explicit operational labels.
  - Rationale: Product-specific design should come from composition and craft, not from random metaphor swaps.
- Decision: Introduce a small shared HIL surface chrome layer for panel headers, section labels, and status chips.
  - Rationale: Shared craft matters more than local cleverness, and it keeps future polish DRY.
- Decision: Promote should become summary-first and action-first, not form-first.
  - Rationale: The user needs to understand "what will be sent, where, and when it is safe to confirm" before reading lower-priority details.

## Visual Direction
- Use one dark, archival-operator language across HIL panels:
  - slightly warmer card layers than generic shell chrome
  - clearer section rhythm
  - fewer tiny uppercase labels doing primary work
  - stronger distinction between action controls, context evidence, and passive metadata
- Typography:
  - panel titles and key labels should be readable at a glance; avoid relying on sub-10px text for primary comprehension
  - uppercase micro-labels stay secondary, not structural
- Motion:
  - only use subtle reveal/expand transitions where they help orientation
  - avoid decorative motion in dense artifact lists

## Risks / Trade-offs
- Risk: a more designed surface could drift into low-density "showroom UI".
  - Mitigation: keep list density and keyboard reach intact; only elevate hierarchy and wording.
- Risk: shared HIL primitives could become generic wrappers that obscure intent.
  - Mitigation: keep them narrowly scoped to HIL surface chrome and status presentation.

## Validation Plan
1. Static review against AGENTS interaction-design bar:
   - `Does it feel whole?`
   - `Does it show intent?`
   - `Is the craft clean?`
   - `Can the user operate it without hesitation?`
2. Renderer typecheck.
3. Focused tests for Promote, Memo, and Comments interactions.
4. Checkpoint reviews from parallel subagents:
   - design/coherence review
   - behavior/regression review
