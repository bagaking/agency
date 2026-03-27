## 1. Spec
- [ ] 1.1 Add `agency-editor` requirements for Commander-backed session context actions and readiness gating.
- [ ] 1.2 Define bounded Smart Name behavior and confirmation semantics.

## 2. Commander Readiness
- [ ] 2.1 Add a shared renderer/main readiness surface for Commander-backed session actions.
- [ ] 2.2 Treat readiness as `provider settings complete + provider/backend probe succeeded`.
- [ ] 2.3 Hide Commander-backed menu actions when readiness is false.

## 3. Session Context Menu
- [ ] 3.1 Update the Agent Cells session context menu to show `Smart Fork [by commander]` and `Smart Name [by commander]`.
- [ ] 3.2 Keep non-Commander local actions available independently.
- [ ] 3.3 Ensure menu labeling clearly distinguishes Commander-backed actions from local ones.

## 4. Smart Fork
- [ ] 4.1 Add a session suitability gate so unsupported source sessions do not expose `Smart Fork [by commander]`.
- [ ] 4.2 Route `Smart Fork [by commander]` through the existing Harness `Create Agent` specialization entry.
- [ ] 4.3 Preserve immediate failure feedback and durable `Command Ops` evidence when the run fails.

## 5. Smart Name
- [ ] 5.1 Add a bounded Commander-backed smart-name capability/run path.
- [ ] 5.2 Collect recent session context and naming settings as smart-name input.
- [ ] 5.3 Present 1-3 suggested names and apply the selected candidate through existing rename flow.

## 6. Verification
- [ ] 6.1 Add unit coverage for Commander readiness gating and smart-name decision plumbing.
- [ ] 6.2 Add manual verification for hidden/visible Commander actions, smart-name suggestion, and smart-fork launch.
- [ ] 6.3 Update session-management documentation if the delivered behavior changes the recommended workflow.
