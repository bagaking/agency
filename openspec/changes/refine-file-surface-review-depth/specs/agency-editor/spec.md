## MODIFIED Requirements

### Requirement: Explorer Content Search And Replace
The editor SHALL support content search and scoped content replace across files.
Content replace SHALL provide target visibility and confirmation semantics suitable for multi-file mutation.
The replace review surface SHALL support per-match confirmation and SHALL require explicit full-file confirmation when a file has hidden matches beyond the visible review list.

#### Scenario: Review individual replacement targets
- **WHEN** a user prepares a multi-file content replace
- **THEN** the result surface shows replacement impact with enough granularity for the user to curate confirmed targets before mutation
- **AND** files with hidden, non-visible matches retain an explicit whole-file confirmation path instead of silently downgrading to visible-only review

### Requirement: Blame Insights
The workbench SHALL surface git blame metadata for the current line via hover or inline badge.
The editor SHALL allow toggling blame visibility per tab.
Workbench review tools SHALL remain contextual secondary actions rather than competing with top-level navigation.
The shell SHALL NOT expose inert review actions when the backing capability is unavailable in the current environment.
Workbench review tools SHALL only appear once the active tab resolves to a code editor state so media/unknown tabs do not advertise hollow review affordances.

#### Scenario: Review tools stay contextual
- **WHEN** the workbench renders diff, blame, or comment tooling
- **THEN** those controls appear as contextual review actions subordinate to navigation and file lifecycle controls
- **AND** remain hidden until the active document has resolved to a code editor state
