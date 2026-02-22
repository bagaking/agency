# Guidance Pack: Output/Archive Patterns

Use these patterns before adding new hard validator rules.

## Pattern 1: Explicit Output Triplet

Always define:
- `action-handoff`
- `memory-handoff`
- `archive`

Even when memory is intentionally absent, keep explicit wording (`none` + rationale).

## Pattern 2: Default-First Routing

Define local default route first, then optional adapters.

Recommended order:
1. local/default route
2. optional external adapters
3. archive destination evidence

## Pattern 3: Completion As Destination Evidence

Completion language should mention resolved destination path/id, not vague status words.

Good:
- "archive only when action destination + memory destination are explicit"

Weak:
- "archive when task feels done"

## Pattern 4: Role-Neutral Instructions

Write guidance that works for both humans and agents.

Use:
- checklist style
- short deterministic verbs
- one observable output per bullet

Avoid role-dependent wording that only one executor can follow.

## Pattern 5: Adapter Is Optional By Contract

When mapping to external systems:
- mark as optional,
- specify fallback behavior,
- avoid required direct flow calls.

This keeps standalone-first guarantees intact.
