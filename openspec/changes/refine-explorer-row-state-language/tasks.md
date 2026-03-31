## 1. Scope

- [x] 1.1 Define the Explorer left-tree refinement as a row-state and header-hierarchy change, not a broad Explorer architecture rewrite.
- [x] 1.2 Keep shell collapse/resize ownership outside Explorer-local controls.

## 2. Checkpoint 1: Row State Language

- [x] 2.1 Remove the harsh ignored-row treatment and keep ignored entries legible.
- [x] 2.2 Clarify hover / focus / selection hierarchy so row ownership reads more clearly.
- [x] 2.3 Reduce row metadata density so file names stay primary.
- [x] 2.4 Add focused renderer tests for the updated row-state behavior.
- [x] 2.5 Commit the checkpoint before review.
- [x] 2.6 Run parallel review and apply checkpoint fixes.
- [x] 2.7 Commit the reviewed row-state checkpoint.

## 3. Checkpoint 2: Header And Contract

- [x] 3.1 Refine the Explorer header so it stops competing with the list.
- [x] 3.2 Update docs/specs so ignored-entry treatment and row-state hierarchy survive reset.
- [x] 3.3 Keep the header aligned with shell-owned sidebar boundaries so it remains file-context chrome rather than a second local surface.
- [ ] 3.4 Commit the header/spec checkpoint before review.
- [ ] 3.5 Run parallel review and apply checkpoint fixes.
- [ ] 3.6 Commit the reviewed final checkpoint.

## 4. Verification

- [x] 4.1 Run focused Explorer renderer tests for row/header behavior.
- [ ] 4.2 Perform final review against the AGENTS four-question bar.
