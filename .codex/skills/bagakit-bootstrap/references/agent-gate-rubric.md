# Agent Gate Rubric

Use this rubric for checks that are important but should stay in `Program Warning for Agent + Agent Gate`.

## Dimensions (1-10)

- Trigger precision for install/sync/migrate scenarios.
- Command determinism (same parameters lead to same installer behavior).
- Migration safety (no ambiguous org/ref/selection transitions).
- Standalone fallback quality (`--installer-script` path works when remote fetch fails).
- Auto destination detection quality (same-directory update resolves correctly).
- Documentation readiness (SKILL + references + tests are consistent).

## Decision

- approve: no `P1` finding and average score >= 8.
- revise: any `P1` finding or average score < 8.

## Finding Requirement

- Severity (`P1/P2/P3`).
- Evidence anchor (`file:line`).
- Impact and concrete fix direction.
