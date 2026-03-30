# Commit Title

`refactor(explorer): turn explorer into a capability platform`

# PR Title

`refactor: turn Explorer into a capability platform`

# Summary

## What changed
- refactored Explorer to resolve working-set, search, filter, and command affordances from shared platform descriptors instead of growing `ProjectExplorerSidebar` branch logic
- promoted `Changed Files` into a registered working-set surface with explicit capability metadata
- activated project-policy seams for working-set ordering and command visibility
- fixed async Explorer capability hydration so late policy/default loading no longer overwrites live user interaction
- synchronized OpenSpec, design docs, reusable-item catalog, and regression coverage

## Why this design
- preserves Agency's product boundary that Explorer is a capability surface, not a pile of ad hoc sidebar widgets
- keeps `Changed Files` as a first-class working-set instead of collapsing it into a one-off mode or search hack
- keeps path/name search and content search as different capabilities, even when they share the same header region
- keeps project policy shaping visibility and ordering only; it does not mutate file-intent execution semantics
- refuses to invent fake folder/selection context for non-tree working-sets until they own a real local scope model

## Explicit non-goals preserved
- no file-intent substrate rewrite
- no Commander or Session Map architecture changes
- no research-lane expansion into a general browser

## Validation
- `pnpm -C apps/editor run typecheck:renderer`
- `pnpm -C apps/editor run typecheck:electron`
- `pnpm -C apps/editor exec tsx --test electron/services/__tests__/explorerPolicy.test.ts electron/services/__tests__/explorer.contentSearch.test.ts renderer/src/components/explorer/__tests__/explorerCapabilityPlatform.test.ts renderer/src/components/explorer/__tests__/ExplorerHeader.test.tsx renderer/src/components/explorer/__tests__/useExplorerCapabilityPreferences.test.tsx`
- `ELECTRON_RENDERER_URL=http://localhost:5183 pnpm -C apps/editor exec playwright test tests/e2e/app.spec.ts -g "changed"`
- `pnpm run openspec:validate:explorer-platform`

## Remaining risk
- non-tree working-sets intentionally expose a narrow content-search contract today; `Changed Files` only supports project-wide content search until a real working-set-local scope model exists
- broader end-to-end coverage for future non-tree working-set families is still not present
