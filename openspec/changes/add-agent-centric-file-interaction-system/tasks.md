## 1. Spec & Contract
- [x] 1.1 Finalize proposal/design/spec deltas for unified cross-surface file interaction.
- [x] 1.2 Validate change with `openspec validate add-agent-centric-file-interaction-system --strict`.
- [x] 1.3 Freeze `FileIntent` / `FileIntentResult` / `FileSemanticTag` contract fields before implementation.

## 2. Phase A - Explorer Baseline Unification
- [x] 2.1 Add IPC gateway `file:interact` and preload/bridge entry `performFileIntent`.
- [x] 2.2 Add renderer `fileInteraction` service and migrate Explorer mutation/reveal calls to it.
- [ ] 2.3 Route remaining Explorer open and non-mutation entry paths through unified result/error mapping.
- [ ] 2.4 Add regression tests for drag import, conflict resolution, and post-import reveal/select behavior.

## 3. Phase B - Cross-Surface Entry Points
- [ ] 3.1 Add Agent Cells open/reveal entry points through `fileInteraction`.
- [ ] 3.2 Add Session Map open/reveal shortcuts and lightweight drag routing into Explorer import.
- [ ] 3.3 Add Memo reference open/reveal and lightweight drag routing into Explorer import.

## 4. Phase C - Agent File Semantics
- [x] 4.1 Implement built-in semantic rules for core agent files (including `Agency.md` and Spark conventions).
- [x] 4.2 Add project-level semantic rule loading from `.agency/agent-files.yaml` with priority merge.
- [x] 4.3 Add Explorer semantic tag rendering, filtering, and quick-locate affordance.

## 5. IPC, Services, and Compatibility
- [x] 5.1 Add preload bridge APIs: `performFileIntent`, `classifyAgentFiles` (also exposed `performToolFileIntent`).
- [x] 5.2 Add IPC handlers: `file:interact`, `file:semantic:classify` (plus `file:tool:interact`).
- [ ] 5.3 Ensure explorer path safety and conflict behavior remain unchanged under the new gateway.

## 6. Toolization and Process-Interop Readiness
- [x] 6.1 Add tool-facing adapters for Explorer-grade file intents using the unified contract (`file:tool:interact` + renderer wrapper `runToolFileIntent`).
- [x] 6.2 Add capability-scoped authorization and audit metadata for tool-invoked file intents.
- [x] 6.3 Define and validate caller context schema (`sourceSurface`, `callerType`, `callerId`, trace id).
- [ ] 6.4 Add a process-boundary compatibility plan (dedicated helper process path) without changing caller semantics.
- [x] 6.5 Define CLI-friendly request/response schema and keep CLI as thin wrapper over `file:interact`.
- [x] 6.6 Add an actual CLI entrypoint wrapper (JSON in/out) that delegates to unified intent gateway.

## 7. Agent Cell Workflow Extensions
- [ ] 7.1 Add Agent Cell file-change dashboard requirements and first implementation slice.
- [ ] 7.2 Add Agent Cell quick drag/drop entry requirements that route to Explorer import semantics.
- [ ] 7.3 Ensure Session Map and Memo lightweight drag routing is consistent with Agent Cell interactions.

## 8. Validation & Docs
- [ ] 8.1 Add unit tests for intent normalization and semantic rule matching/merge.
- [ ] 8.2 Add integration tests for cross-surface intent consistency and lightweight drop routing.
- [ ] 8.3 Add integration tests for tool-invoked file intents and permission-denied outcomes.
- [ ] 8.4 Update `apps/editor/README.md` with unified file interaction, semantic-file behavior, and toolization model.
- [ ] 8.5 Run e2e/manual baseline checks for Explorer, Agent Cells, Session Map, and Memo entry flows.
