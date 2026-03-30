# Change: Refactor Explorer Into A Capability Platform

## Why
Agency Explorer is already stronger than a basic file tree, but its growth path is still constrained by product-specific hardcoding in filters, command surfaces, and workflow-adjacent actions.

The current implementation is good enough to use, but not yet good enough to scale cleanly:
- filters are powerful but mostly fixed;
- header and context menu actions are still hard-coded rather than declared;
- `Changed Files` is useful but still a special-case panel instead of part of a broader working-set model;
- research/browser-oriented file intake is recognized as strategically important, but has no bounded product contract yet.

We now have enough product research and implementation experience to define the next Explorer architecture before more ad hoc capability slices land.

## What Changes
- Define Explorer as a capability platform with staged evolution, not only a single sidebar implementation.
- Add a descriptor-driven filter model so built-in filters become the first entries in a registry.
- Add an Explorer search model that distinguishes path/name search from cross-file content search instead of leaving “search” as one overloaded behavior.
- Treat cross-file content search and replace as baseline editor capability, with explicit review and replacement safety.
- Add an Explorer command registry for header actions, context menus, and future shortcut/action routing.
- Introduce the concept of Explorer working-set views, with `Changed Files` as the first member instead of a one-off companion panel.
- Define a bounded URL/browser research lane for URL-driven file workflows without turning Agency into a general-purpose browser.
- Clarify project-level Explorer policy and preset opportunities for future repo-aware customization.
- Preserve the current unified file interaction gateway as the execution base layer for all future Explorer growth.
- Preserve baseline file and folder operations such as copy, duplicate, move, rename, and clipboard flows throughout the refactor.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/explorer/*`
  - `apps/editor/renderer/src/components/fileDashboard/*`
  - `apps/editor/renderer/src/hooks/useProjectExplorer.ts`
  - `apps/editor/electron/services/explorer.ts`
  - unified file interaction and future browser/research handoff seams
  - Explorer design docs and follow-up implementation changes
- Risks:
  - an over-broad Explorer plan could become a vague umbrella with no executable slices;
  - introducing registries too early could create abstraction debt if command/filter boundaries are not concrete enough;
  - a browser/research lane could bloat the sidebar if not strongly bounded.
- Mitigation:
  - define staged implementation tasks with explicit acceptance targets;
  - keep the execution layer unchanged in phase 1 and focus first on descriptor/command architecture;
  - define the browser lane as bounded research workflow support, not as a full browser replacement.
