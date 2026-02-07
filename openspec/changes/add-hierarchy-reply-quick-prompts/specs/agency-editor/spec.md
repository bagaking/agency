## ADDED Requirements

### Requirement: Reply Quick Prompt Scoped Configuration
The editor SHALL provide Reply Quick Prompt configuration in Hierarchy with Global, Project, and Agent scopes.
The editor SHALL persist prompt lists per scope using the same scoped-config conventions as other Hierarchy settings.

#### Scenario: Open Reply Quick Prompts in Hierarchy
- **WHEN** a user navigates to Hierarchy configuration
- **THEN** a Reply Quick Prompts section is available
- **AND** users can switch between Global, Project, and Agent scopes.

#### Scenario: Save scoped prompts
- **WHEN** a user edits prompt items in a scope and saves
- **THEN** the prompt list is persisted for that scope and reloads correctly.

### Requirement: Reply Quick Prompt Resolution Uses Union + Dedupe
The editor SHALL resolve effective Reply Quick Prompts by computing the ordered union of Global, Project, and Agent lists.
The editor SHALL deduplicate prompts by normalized prompt text instead of overriding by scope.
The first occurrence in scope order (Global -> Project -> Agent) SHALL be canonical for display text, while later duplicates SHALL still contribute source metadata.

#### Scenario: Duplicate prompt across scopes
- **WHEN** the same prompt text exists in both Global and Agent scopes
- **THEN** the effective prompt list contains one entry for that text
- **AND** the entry records both scopes as sources.

#### Scenario: Scope-specific additions preserved
- **WHEN** each scope contributes different prompt texts
- **THEN** the effective prompt list includes all unique prompts in stable scope order.

### Requirement: Hierarchy Shows Resolved Prompt Sources
The editor SHALL show a resolved prompt preview in the Hierarchy Reply Quick Prompts view.
Each resolved prompt SHALL show source scope badges to explain dedupe/union results.

#### Scenario: Visualize merged source badges
- **WHEN** a resolved prompt is contributed by multiple scopes
- **THEN** the Hierarchy resolved list shows all contributing scope badges for that prompt.

### Requirement: Reply Composer Quick Prompt Entry
In Agent Cells Reply panel, the editor SHALL provide a quick prompt action labeled `快捷回复如何` near the reply input controls.
The action SHALL open the resolved prompt list and allow inserting a selected prompt into the reply editor.

#### Scenario: Insert prompt from quick action
- **WHEN** a user selects a prompt from `快捷回复如何`
- **THEN** the prompt text is inserted into the Reply editor at the cursor position
- **AND** the Reply editor remains focused for further editing.
