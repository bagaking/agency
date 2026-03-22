## 1. Specification
- [x] 1.1 Update `agency-editor` spec for session tree semantics, topology reordering, persistence, and invalid-tree guards.
- [x] 1.2 Document the Cell/session boundary explicitly so tree nodes are not interpreted as nested Cells.

## 2. Data Model And Host APIs
- [x] 2.1 Extend the per-worktree session registry to support topology metadata (`parentSessionId`, `order`, `nodeKind`, optional `sourceSessionId`).
- [x] 2.2 Add backward-compatible migration from legacy flat registries.
- [x] 2.3 Add validation/repair for missing parents, self-parenting, and cycles.
- [x] 2.4 Add IPC + host APIs for moving/reparenting sessions within a Cell.

## 3. Renderer UI
- [x] 3.1 Replace the flat session list in Agent Cells with a tree projection and visible-row flattening model.
- [x] 3.2 Add drag-and-drop topology editing with `before`, `after`, `into`, and one-level `outdent` intents.
- [x] 3.3 Preserve current per-session interactions in the tree rows, including active selection, rename, avatar picker, create-session menu, and detached/closed overflow actions.
- [x] 3.4 Surface session node kind metadata in the tree in a way that is compatible with future `fork` / `sub terminal` creation flows.

## 4. Validation
- [x] 4.1 Add tests for registry migration and invalid-tree repair.
- [x] 4.2 Add tests for move/reparent invariants, including cycle prevention.
- [x] 4.3 Verify Agent Cells supports sibling reorder, child reparent, and one-level outdent persistence across reload.
- [x] 4.4 Verify detached/closed overflow behavior and active-session selection still work with tree topology.
- [x] 4.5 Update manual verification steps and README wording for the new session tree model.
