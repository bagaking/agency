## MODIFIED Requirements

### Requirement: Bulk Promote Pending Comments
The editor SHALL provide a global Promote flow for pending comments.
Promote SHALL be initiated from a dedicated modal that requires a draft description and a target Agent session (existing or newly created).
The Promote modal SHALL display gate status for the selected session and MUST wait for draft completion before enabling confirmation.

#### Scenario: Promote via modal
- **WHEN** a user opens Promote
- **THEN** the modal requests a draft description and a session selection
- **AND** the modal displays the session gate status
- **AND** the confirm action stays disabled until the draft is completed

### Requirement: Promote Consumption Semantics
Confirming Promote SHALL mark selected comments as processed and record the draft reference.
Comments SHALL NOT be marked processed until the draft completion gate passes.

#### Scenario: Consume comments after draft complete
- **WHEN** a draft is marked complete in `.agency/hil/index-<worktree>.yaml`
- **AND** the user confirms the Promote modal
- **THEN** selected comments are marked `meta.processed: true`
- **AND** each comment records the draft reference

## REMOVED Requirements

### Requirement: Promote Comment to Draft
**Reason**: Promote becomes a global workflow rather than a per-comment action.
**Migration**: Use the global Promote modal to convert selected comments into a draft.
