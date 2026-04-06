# Change: Move Browser Lane Geometry Into The Shell

## Why
Agency's bounded web `View` already moved from iframe to native `WebContentsView`, but the product still computes native bounds from a tab-local DOM host. That leaves one structural flaw in place:
- the browser lane is still a projected native surface, not a shell-owned pane;
- sibling shell surfaces such as the attention rail, HIL drawer, title bar chrome, and future overlays do not participate in one authoritative geometry contract;
- repeated fixes now oscillate between DOM measurement, native bounds mapping, and delayed hide/show behavior without reaching a stable completion state.

The current implementation can be made incrementally less wrong, but it still violates the first-principles ownership model that an embedded native browser surface needs. If Agency wants the bounded browser lane to render correctly and stay correct, the shell must own its rectangle and overlay behavior directly.

## What Changes
- Introduce a shell-owned browser-lane geometry contract that is produced by Workbench/App shell rather than by tab-local DOM measurement.
- Move native browser lane placement to that shell contract and stop treating a nested DOM host as the authoritative native pane owner.
- Define explicit browser-lane occlusion behavior for shell siblings such as the attention rail, HIL drawer, and modal/popover families.
- Keep bounded web research as a Workbench-owned research object rather than a window-global browser product.
- Preserve `Reader`, `Save Markdown`, `Cite`, and `Open in Browser`, but make them consume the shell-owned browser lane instead of indirectly owning it.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/AppLayout.tsx`
  - `apps/editor/renderer/src/components/layout/*`
  - `apps/editor/renderer/src/components/workbench/*`
  - `apps/editor/renderer/src/hooks/useWorkbench.ts`
  - `apps/editor/electron/services/workbenchBrowserSurface.ts`
  - `apps/editor/electron/ipc/handlers/workbench.ts`
  - docs / tests / packaging verification
- Risks:
  - moving geometry ownership into the shell can break unrelated layout composition if the new rect contract is vague;
  - native-surface occlusion can become inconsistent if modal/drawer rules stay implicit;
  - preserving bounded product scope while strengthening shell ownership requires stronger SSOT boundaries between tab metadata and host lifecycle.
- Mitigation:
  - define one shell-level rect contract and one occlusion contract before more code changes;
  - keep Workbench tab metadata as SSOT for the research object, and limit the shell contract to geometry + visibility + occlusion only;
  - verify behavior through shell-geometry logging, unit tests, and packaged manual checks before claiming completion.
