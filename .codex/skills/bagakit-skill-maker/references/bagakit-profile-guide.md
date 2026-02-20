# Bagakit Profile Guide (Overlay)

This guide is an overlay on top of `core-design-guide.md`.

## RFDP (Response Footer Driven Protocol)

To avoid ambiguous wording like "驱动语句", use this term:

- **RFDP (Response Footer Driven Protocol)** = the canonical `[[BAGAKIT]]` footer block contract.

RFDP invariants (must not change):

1. Anchor line is exactly: `[[BAGAKIT]]`
2. Following lines are peer lines starting with `- `
3. No nested bullets under peer lines
4. Keep a single footer block for one response/update

Canonical shape:

```text
[[BAGAKIT]]
- <LineA>: ...
- <LineB>: ...
```

## When this profile is required

Bagakit profile is **required** when:
- target skill `name` starts with `bagakit-`, or
- target distribution explicitly targets Bagakit ecosystem defaults.

Bagakit profile is optional for generic skills.

## Required Bagakit profile elements

1. RFDP (`[[BAGAKIT]]` footer protocol) in `SKILL.md`.
   - Keep canonical format unchanged.
2. Bagakit-compatible response-driving lines where the skill needs deterministic continuation.
3. Adapter mappings to concrete Bagakit systems are optional-by-default (never hard dependency).
4. Default/fallback route must still work when no other Bagakit systems are present.

## Adapter mapping policy

- Map generic adapters to concrete systems only as optional routes.
- Use system-agnostic contract names first, then Bagakit example mappings.
- Keep core routing logic generic: resolve adapter class/capability first, then apply profile mapping.
- If profile mapping is missing/unresolved, fallback to default local route.
- Do not hardcode direct required calls to other skill scripts.
- Do not encode core route priority directly by concrete system names.

Example mapping style:

- `task-driver` -> optional `bagakit-feat-task-harness`
- `spec-system` -> optional `openspec`
- `memory-system` -> optional `bagakit-living-docs`

## Archive gate policy in Bagakit profile

For Bagakit-series skills:
- archive record must state action destination,
- archive record must state memory destination (or explicit `none` rationale),
- archive destination evidence must be explicit before marking complete.

## Validation expectation

For Bagakit-series skills (`bagakit-*`):
- missing `[[BAGAKIT]]` footer is a validation error.

For generic skills:
- missing `[[BAGAKIT]]` footer is a warning only.
