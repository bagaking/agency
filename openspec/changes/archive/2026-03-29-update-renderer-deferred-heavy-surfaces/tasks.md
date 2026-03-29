## 1. Spec + Docs
- [x] 1.1 Add an OpenSpec delta for deferred heavyweight renderer surfaces.
- [x] 1.2 Update `openspec/project.md` so the project charter explicitly requires deferred loading for heavyweight hidden renderer surfaces.
- [x] 1.3 Update `docs/norms-dev.md` with renderer performance rules that point teams to shared deferred/lazy mechanisms.
- [x] 1.4 Update `docs/notes-reusable-items-coding.md` with the new reusable mechanisms.

## 2. Shared Mechanisms
- [x] 2.1 Add a shared `DeferredMount` renderer component with explicit `retain` vs `unmount` strategy.
- [x] 2.2 Add a shared `LazyMonacoEditor` wrapper and preload helper.
- [x] 2.3 Refactor `RiveAnimation` so the heavy runtime is imported through a wrapper boundary instead of eagerly.

## 3. Adoption
- [x] 3.1 Update `AppShellChrome` to defer Session Map overlay mount while closed.
- [x] 3.2 Update `AppMainPanels` to defer first mount of the Explorer workbench pane.
- [x] 3.3 Update Monaco-backed surfaces to use `LazyMonacoEditor` instead of direct imports.

## 4. Verification
- [x] 4.1 Run `pnpm --dir apps/editor run typecheck:renderer`.
- [x] 4.2 Run `pnpm --dir apps/editor run build:renderer`.
- [x] 4.3 Review the updated implementation for lifecycle fragility and ensure the new wrappers remain the only path for these deferred behaviors.
