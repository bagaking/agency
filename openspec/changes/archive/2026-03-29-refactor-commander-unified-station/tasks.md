## 1. Cleanup Existing Commander Changes
- [x] 1.1 Mark `add-session-map-commander-dialog` as superseded by this change.
- [x] 1.2 Mark `update-session-map-commander-drawer` as superseded by this change.
- [x] 1.3 Mark `add-commander-smart-session-actions` as superseded by this change.
- [x] 1.4 Fold any still-relevant requirement language from those changes into one canonical Commander delta.

## 2. Spec
- [x] 2.1 Add `agency-editor` requirements for Commander as one bounded operator station/package.
- [x] 2.2 Add requirements for shared Commander visual language and ownership cues across Commander-owned surfaces.
- [x] 2.3 Add requirements that distinguish evidence-backed briefing from provider-backed Commander actions.
- [x] 2.4 Preserve Commander-backed smart session actions and readiness semantics inside the unified plan.

## 3. Architecture
- [x] 3.1 Define one shared Commander model for context, readiness, action ownership, and presentation mapping.
- [x] 3.2 Define one Electron-side Commander facade for readiness probing and Harness-backed action routing.
- [x] 3.3 Remove duplicated run/context/status derivation from Session Map-specific Commander components.

## 4. UX
- [x] 4.1 Unify Session Map `Ops`, Commander entry, and `Briefing` under one station-level visual system.
- [x] 4.2 Align Agent Cells Commander-backed menu actions with the same naming and ownership language.
- [x] 4.3 Align Commander task sheets with the same Commander family instead of ad-hoc modal styling.
- [x] 4.4 Keep Commander distinct from Session Reply, HIL, and any shell-level global drawer.

## 5. Verification And Docs
- [x] 5.1 Update manual verification for Commander station continuity and Commander-backed action readiness.
- [x] 5.2 Update reusable-item references so future work extends one Commander station mechanism.
- [x] 5.3 Verify the resulting doc set has one canonical Commander plan rather than overlapping active slices.
