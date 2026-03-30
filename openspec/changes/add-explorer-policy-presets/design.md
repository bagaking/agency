## Context
Explorer now has capability descriptors for filters, commands, working sets, and search. Project policy can influence defaults and visibility, but it still cannot define reusable named starting points for common workflows.

That means teams can set one global default, but they cannot tell Explorer:
- “start in Changed Files for review mode”
- “start in semantic-file mode for agent artifacts”
- “start in content-search mode for docs/research”

without either changing the global default or teaching users to manually rebuild the same state each time.

## Goals
- let projects define named Explorer presets in policy
- keep presets declarative and capability-driven
- preserve override order: built-in defaults -> project policy -> user-local state -> explicit preset apply
- avoid mutating file-intent semantics or creating new ad hoc Explorer-only execution paths

## Non-Goals
- no arbitrary saved query language
- no new working-set family unless it earns its own change
- no per-session hidden state that bypasses the capability registries

## Decisions

### 1. Presets are named policy entries, not free-form saved searches
Each preset should have a stable `id`, product-facing `label`, and a bounded payload made only from existing Explorer capability seams:
- working-set id
- search mode
- content-search scope defaults
- descriptor default state

This keeps presets self-explanatory and auditable.

### 2. Presets apply through the same capability state model
Applying a preset should reuse the existing Explorer capability persistence and normalization layer instead of bypassing it with one-off state mutation code.

### 3. Project presets do not replace user-local persistence
Project policy may define available presets and optionally a default preset, but user-local state still owns what the user last did unless they explicitly apply a preset again.

## Risks / Trade-offs
- presets can become a hidden second configuration system if they are too powerful
  - mitigation: keep preset schema bounded to existing capability seams only
- preset semantics may overlap with future saved queries
  - mitigation: explicitly separate “named starting states” from “arbitrary search history / saved query artifacts”

## Migration Plan
1. Add spec coverage for named Explorer policy presets.
2. Extend policy parser/normalizer with preset schema.
3. Add renderer affordance for selecting/applying named presets.
4. Add regression coverage for preset apply semantics and persistence interaction.
