# Change: Move Bounded Web Research Into Workbench

## Why
Agency's current bounded URL research entry is structurally better than the earlier icon-only lane, but the main work surface is still attached to Explorer. That keeps discovery short, yet it leaves the actual reading and action flow in the sidebar instead of the product's primary object workspace.

The next step should borrow the right lesson from `cmux` and similar tools without turning Agency into a browser product:
- Explorer should remain the intake and context switch surface;
- Workbench should become the host for the bounded web research document once the user commits to working with a URL;
- full browsing should still escape to the system browser rather than growing a general-purpose in-app browser.

## What Changes
- Move the bounded web research host surface from Explorer's primary panel area into a first-class Workbench tab kind.
- Keep Explorer search as the intake point and add URL-aware affordances so URL-shaped input can switch into the bounded web research flow with less friction.
- Define a bounded Workbench web research document contract with page content plus research actions such as `Open in Browser`, `Save Markdown`, `Cite`, and `Reload`.
- Preserve the existing bounded-scope rules: no browser-global tabs, cookies, auth/session management, or arbitrary browser-product posture.
- Update specs, notes, README, and manual verification so the canonical contract is `Explorer intake -> Workbench bounded web tab`.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/explorer/*`
  - `apps/editor/renderer/src/components/workbench/*`
  - `apps/editor/renderer/src/hooks/useWorkbench.ts`
  - `apps/editor/electron/services/hilExcerpt.ts`
  - related docs and manual verification
- Risks:
  - Workbench could accidentally grow into a generic browser shell if the bounded contract is not explicit enough.
  - A remote-URL tab kind could fragment the Workbench object model if it is bolted on instead of modeled as a bounded document type.
  - Explorer and Workbench could drift into duplicate URL state if the intake and host contracts are not unified.
- Mitigation:
  - define one bounded web research tab object and one controller path for intake, inspection, save, cite, and browser escape;
  - keep browser-product concerns explicitly out of scope in both spec and implementation;
  - add regression coverage for the shortest-path URL affordance and Workbench host transition.
