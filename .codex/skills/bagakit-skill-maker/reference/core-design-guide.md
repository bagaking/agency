# Core Design Guide (Portable)

## 1) Target Outcome

Design skills that are:
- standalone-first,
- portable across major coding-agent runtimes,
- not hard-bound to one vendor-specific hook/API,
- deterministic where fragile, flexible where context-dependent.

## 2) Applicability Modes

- **Create**: scaffold a new portable skill from first principles.
- **Improve**: refactor one existing skill to be clearer, leaner, and more trigger-accurate.
- **Merge**: combine multiple skills into one coherent portable skill with unified contract and validation.

## 3) Granularity Rule

- Do not design toolbox skills.
- One skill should own one bounded problem (or one cohesive cluster with the same foundation).
- Split when unrelated foundations are mixed.
- Merge when separate skills duplicate the same foundation.

## 4) Trigger-First Design

Always define:
- 3-5 positive examples (should trigger),
- 2-3 negative examples (must not trigger).

Also require:
- `## When to Use`
- `## When NOT to Use`

## 4.1) Search-First Discovery

Before creating/improving/merging a skill for an unresolved problem:

1. Search first; do not jump directly to implementation.
2. Use `reference/skill-discovery-sources.md` as the default standalone discovery playbook.
3. Think in keyword sets (domain terms, task terms, synonym terms) before searching.
4. Source order:
   - project-local docs/contracts/catalogs,
   - reliable primary sources (official docs, standards, authoritative guides),
   - broader community solutions (GitHub, Stack Overflow, technical blogs),
   - experience-only notes last.
5. Prefer ready-to-use skills/tools/code where feasible.
6. Record useful findings to avoid repeated search and to justify design choices.
7. Discovery must remain standalone; do not require any single marketplace CLI/skill to exist.
8. If discovery identifies a better complementary skill, use it as an optional accelerator, never as a required prerequisite.
9. Compare at least three candidates before deciding `reuse` / `adapt` / `build-new` unless the first match is clearly authoritative and complete.

## 5) Progressive Disclosure

- Keep `SKILL.md` concise and execution-oriented.
- Put deep material in `reference/`.
- Put reusable templates in `reference/tpl/`.
- Put deterministic repeatable work in `scripts/`.
- Put validation protocol assets in `gate/<case>/` (`rules.toml` + `check-*` scripts).

Rule of thumb:
- high freedom -> text guidance,
- medium freedom -> structured steps/pseudocode,
- low freedom -> executable scripts.

Reference layout rule:
- `reference/`: explanatory docs, guides, rationale.
- `reference/tpl/`: reusable templates/examples.
- Avoid mixing templates into generic docs.

Gate layout rule:
- `gate/`: validation protocol root.
- `gate/<case>/rules.toml`: single-source rules for one validation domain.
- `gate/<case>/check-*.py|sh|js|ts`: scripts that read `rules.toml` for that case.

## 5.1) Constraint Budget (Guidance-First)

For high-ceiling agent workflows, do not overfit behavior into rigid schema too early.

Rules:
- Prefer guidance + examples first.
- If both agents and humans should execute in roughly the same way, and quality depends on clear standards with low creative variance, use a guidance pack.
- Treat qualitative reasoning quality as prompt-reviewed:
  - Examples: clarification depth, option quality, debate rigor, writing quality.
  - Encode these as explicit prompt rubrics/checklists in SKILL/reference templates.
  - Do not enforce these qualitative dimensions as script pass/fail tests.
- Add programmatic gates only for hard invariants that are expensive to recover:
  - standalone-first behavior,
  - protocol shape (for example RFDP format),
  - runtime payload boundary,
  - completion destination evidence.
- Script tests should remain objective: file/protocol invariants, parseability, and destination evidence.
- Do not force heavy structured fields for domain reasoning if agents can handle it better via guidance.
- If strict gate behavior is required regardless of operator, and autonomy brings no meaningful quality gain, enforce programmatic validation or strict SOP.
- Promote guidance into hard gates only after repeated production failures of the same pattern.

Guidance pack files for this skill:
- `reference/guidance-pack/patterns.md`
- `reference/guidance-pack/anti-patterns.md`
- `reference/guidance-pack/examples.md`

Gate baseline files for this skill:
- `gate/anti-patterns/rules.toml`
- `gate/anti-patterns/check-anti-patterns.py`

## 6) Core Contract Rules

- Standalone-first execution is mandatory.
- Cross-skill exchange is optional and rule/schema-driven.
- Routing/discovery must be capability/contract-driven, not concrete system-name-driven.
- Never require direct flow-calls to another skill as default prerequisite.
- Runtime payload must be explicit in `SKILL_PAYLOAD.json`.
- `README.md` must not be in runtime payload.
- Generated runtime/docs files must not contain local absolute path literals; prefer relative paths or env-variable forms.

## 6.1) Metadata Contract Rule (Semantic-First)

- Avoid adapter/system-specific key proliferation in machine-readable contracts.
- Prefer semantic generic keys + parseable metadata payload:
  - good: `driver` + `driver_meta`,
  - avoid: `driver_ftharness` / `driver_openspec` / `driver_longrun`.
- Keep standalone default state explicit and parseable.
- For machine-readable metadata frontmatter embedded in Markdown artifacts, prefer TOML frontmatter (`+++`) for strict key-value parsing.
- Keep SKILL.md header/frontmatter in YAML unless the runtime contract explicitly changes.

## 7) Output + Archive Principle (Completion Gate)

Every skill should define completion using explicit output destinations.

Required:
- Define output set clearly (what files/signals are produced).
- Define default output route when no external driver is usable (not detected, unresolved, or invalid contract).
- Define optional adapter routes for external systems (for example task driver, spec system, memory system), or explicitly declare `standalone-only/no-adapter`.
- Route selection rules must use generic adapter classes/capabilities first; concrete system names belong only to optional profile mappings.
- Define archive gate: each output must have a resolved destination path/id before marking task complete.

Recommended output shape:
- `action-handoff`,
- `memory-handoff`,
- `archive`.

If no driver is usable:
- write a local fallback artifact (for example `plan-<slug>.md`),
- still write archive metadata with destination evidence.

## 8) Deliverable Archetypes

1. **Execution/result-heavy**
- Action: execution completion artifacts.
- Memory: delivery summary/lessons.
- Gate: execution + memory destination both explicit.

2. **Process-driver**
- Action: upstream progression artifacts.
- Memory: route rationale/session summary.
- Gate: upstream target + memory destination explicit.

3. **Memory/governance-heavy**
- Action: governance/docs updates.
- Memory: inbox/memory depositions.
- Gate: docs + memory destinations explicit.

Design requirement:
- If one handoff is intentionally absent, write `none` with rationale.
- Completion is valid only when all required destinations are explicit.

## 9) Improve/Merge Required Outputs

Improve output must include:
- improve plan,
- verification matrix,
- output/archive map,
- deliverable archetype choice + destination rules,
- risk/rollback note.

Merge output must include:
- merge map,
- de-dup rationale,
- output/archive map,
- deliverable archetype choice + destination rules,
- post-merge validation matrix.

## 10) Publish Checklist

- frontmatter valid (`name`, `description` only, no placeholders),
- metadata contract is semantic (avoid one-key-per-adapter),
- machine-readable artifact frontmatter uses TOML where applicable,
- reference layout is clean (`reference/` docs + `reference/tpl/` templates),
- trigger boundary clear and tested,
- granularity decision explicit and justified,
- payload minimal and runtime-only,
- gate protocol present and structured (`gate/<case>/rules.toml` + `check-*`),
- standalone behavior verified,
- fallback path exists,
- output routes explicit (default + optional adapters),
- archive gate and destination evidence explicit.

## 11) Validator Failure Baseline

Validation should fail on:
- missing trigger semantics in frontmatter (`when/适用/用于`),
- machine-readable metadata schema hardcodes adapter-specific key expansion where semantic generic keys are expected,
- missing standalone-first wording,
- missing `When to Use` / `When NOT to Use`,
- missing fallback path,
- missing output route/default/adapters or archive gate,
- missing action/memory/archive handoff wording,
- hard direct flow-call without optional contract wording,
- payload include drift (duplicate/out-of-root/README),
- missing gate protocol structure (`gate/` missing, or case rules/script files missing),
- generated files containing absolute path literals,
- oversized `SKILL.md` (`> 500` lines),
- ambiguous legacy/workaround runtime file names.
