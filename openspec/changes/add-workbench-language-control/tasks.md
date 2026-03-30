## 1. Spec And Docs
- [x] 1.1 Add an OpenSpec delta for Workbench language resolution, project policy, and manual override control.
- [x] 1.2 Add/update design docs so Workbench highlighting rules, policy scope, and safety boundaries survive future refactors.
- [ ] 1.3 Update reusable-item catalogs and manual verification docs for the new Workbench language seams.

## 2. Resolution And Policy
- [x] 2.1 Introduce one shared Workbench language core for supported language ids, labels, and rule matching.
- [x] 2.2 Add project policy loading from `.agency/workbench.yaml` / `.agency/workbench.yml`.
- [x] 2.3 Keep secure kind detection separate from language selection so unknown/binary safety behavior does not silently loosen.

## 3. Workbench UX
- [ ] 3.1 Add an active-tab Workbench language control with a polished inline affordance.
- [ ] 3.2 Persist local manual overrides through window UI state without writing repo config implicitly.
- [ ] 3.3 Apply the effective language chain to Monaco-backed Workbench rendering and status UI.

## 4. Verification
- [ ] 4.1 Add unit coverage for shared language resolution and project policy normalization.
- [ ] 4.2 Add renderer coverage for Workbench language control / effective language application.
- [ ] 4.3 Run targeted tests plus `pnpm -C apps/editor run test:unit` and `pnpm -C apps/editor run typecheck`.
