## Context
Agency Editor already has the correct product-level UI model: Activity Bar, docked sidebars, Agent Cells, Explorer, Workbench, Hierarchy, HIL sidecar, and Session Map. The problem is not the feature map; it is the renderer implementation structure.

Today, the renderer has several structural issues:
- `App.tsx` acts as a global controller for too many domains.
- layout handoff relies on large untyped prop graphs across `buildComposedAppLayoutProps`, `buildAppLayoutProps`, and `AppLayout`.
- oversized hooks such as `useSessions` and `useProjectExplorer` mix transport, domain state, and view-facing orchestration.
- core flows still use browser-native `window.confirm` / `window.prompt`.
- some privileged preload APIs are still called directly from view code.

## Goals / Non-Goals
- Goals:
  - Preserve current shipped UI behavior while improving renderer structure.
  - Replace untyped layout/screen prop plumbing with explicit typed contracts.
  - Make screen ownership clearer so Agent Cells, Explorer, Workbench, HIL, and Session Map evolve independently.
  - Standardize interactive prompt/confirmation flows for consistency and testability.
  - Reduce regression risk by adding focused tests around extracted contracts.
- Non-Goals:
  - Redesigning the visual language or re-theming the product.
  - Changing the current information architecture of main views.
  - Replacing Electron, Tailwind, Monaco, xterm, or tmux integration patterns.

## Decisions
- Decision: Keep the current product shell and refactor the renderer around screen-specific composition boundaries.
  - Rationale: The UI concept is sound; the implementation graph is not.
- Decision: Introduce typed view-model / handler contracts for layout handoff instead of large `any`-based prop bags.
  - Rationale: This is the most direct way to improve robustness, naming quality, and self-explanation without changing behavior.
- Decision: Standardize prompt/confirmation flows through shared in-app interactions.
  - Rationale: Browser-native dialogs weaken consistency, accessibility, and automated verification.
- Decision: Keep preload access behind renderer service wrappers, including capture/overlay-specific APIs.
  - Rationale: View code should depend on renderer services, not transport details.
- Decision: Refactor in slices aligned with user-facing surfaces rather than one big renderer rewrite.
  - Rationale: The app is too stateful for a big-bang migration.

## Risks / Trade-offs
- Risk: Screen extraction can destabilize cross-panel coordination.
  - Mitigation: Keep behavior-preserving adapters during migration and verify routing paths after each slice.
- Risk: Introducing types into broad `any` surfaces can initially slow delivery.
  - Mitigation: Start from layout and screen boundaries where type leverage is highest.
- Risk: Modal/prompt standardization can create UX drift if copy and keyboard handling change unexpectedly.
  - Mitigation: Reuse the existing modal system and keep action semantics unchanged.

## Migration Plan
1. Add shared renderer contract types for layout, screen composition, and high-risk feature boundaries.
2. Introduce shared in-app prompt/confirmation helpers and migrate browser-native dialog call sites.
3. Wrap capture/overlay preload access in renderer services.
4. Extract top-level screen composition out of `App.tsx` into typed screen/controller modules.
5. Split oversized hooks and view components by responsibility, starting with Sessions, Explorer, and Workbench.
6. Add regression tests for extracted builders/contracts and rerun renderer/electron typechecks.

## Open Questions
- Whether Session Map and HIL sidecar should eventually become first-class screen composition modules instead of remaining layout-side attachments.
- Whether the refactor should also introduce a formal renderer domain-types package, or keep the first pass local to `renderer/src`.
