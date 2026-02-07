## 1. Implementation
- [ ] 1.1 Add scoped Reply Quick Prompts config model and persistence (Global/Project/Agent).
- [ ] 1.2 Add IPC/preload/bridge APIs to read and save scoped prompt lists.
- [ ] 1.3 Implement resolved list algorithm as ordered union + dedupe, and keep scope-source metadata for UI.
- [ ] 1.4 Add Hierarchy entry and configuration view for Reply Quick Prompts.
- [ ] 1.5 In Hierarchy view, show resolved prompts with source scope badges and dedupe result.
- [ ] 1.6 Add `快捷回复如何` quick action near Agent Cells Reply editor input.
- [ ] 1.7 Implement prompt menu selection behavior to insert prompt text into the Reply editor.
- [ ] 1.8 Update docs for reply workflow + Hierarchy configuration and regenerate `docs/must-sop.md` if frontmatter changes.

## 2. Validation
- [ ] 2.1 Manual test: prompts can be configured in each scope and persisted.
- [ ] 2.2 Manual test: resolved list is unioned and deduplicated in stable order.
- [ ] 2.3 Manual test: duplicate prompts show merged source scope badges in Hierarchy UI.
- [ ] 2.4 Manual test: `快捷回复如何` appears near Reply input in Agent Cells and inserts selected prompt text.
