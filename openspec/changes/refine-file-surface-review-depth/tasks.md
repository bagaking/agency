## 1. Scope

- [x] 1.1 Reconcile the remaining Explorer/Workbench review-depth gaps against current spec and docs.
- [x] 1.2 Keep the write scopes split so Explorer and Workbench implementation can land in parallel.

## 2. Explorer Review Depth

- [x] 2.1 Upgrade Explorer content replace review so confirmed targets are more granular and more legible than file-only selection.
- [x] 2.2 Keep host-side replace semantics explicit and safe while expanding renderer review depth.
- [x] 2.3 Add targeted tests for the stronger replace-review flow.
- [x] 2.4 Commit the Explorer checkpoint before review.

## 3. Workbench Review Hierarchy

- [x] 3.1 Rework Workbench review tooling hierarchy so review actions read as contextual secondary tools.
- [x] 3.2 Preserve save/navigation clarity while making the review cluster feel less over-prominent.
- [x] 3.3 Add targeted tests for the updated Workbench review surface.
- [x] 3.4 Commit the Workbench checkpoint before review.

## 4. Review And Finish

- [x] 4.1 Run parallel review on both checkpoints.
- [x] 4.2 Apply review fixes and update current spec/docs to match the final reviewed behavior.
- [x] 4.3 Verify targeted tests/typechecks and commit the reviewed final version.
