# Split Strategy Guide

## Goal

Decompose one large diff into small, reviewable, revertible commits.

## Split Axes

Prefer split by intent boundary:

1. **Behavior**: feature/fix/refactor logic changes.
2. **Tests**: assertions and fixtures tied to behavior commit.
3. **Docs**: user-facing docs, changelog, ADR notes.
4. **Tooling/Config**: CI, lint, build, scripts.
5. **Mechanical changes**: renames/reformat/mass move.

## Ordering Strategy

1. Structural/mechanical groundwork.
2. Core behavioral change.
3. Validation/tests and docs alignment.

## Practical Staging Techniques

- Use `git add -p` for hunk-level split.
- Use path-based staging for docs/config commits.
- Keep generated artifacts in separate commit when possible.

## Split Gate Checklist

For each planned commit:

- [ ] one intent sentence,
- [ ] one check/evidence item,
- [ ] rollback note,
- [ ] clear scope for reviewers.

## Common Failure Modes

- "Kitchen sink" commit from long session without checkpoints.
- Late split attempt after stage contains unrelated hunks.
- Commit order inversion (docs first, behavior unresolved).
- No archive evidence for why split decisions were made.
