# Guidance Pack: Output/Archive Anti-Patterns

## Core Anti-Bloat Checks (Must Review)

### Check A: `预设偏多` / Preset-Heavy

Symptoms:
- too many baked assumptions for one target repo/runtime
- defaults encode scenario-specific behavior

Risk:
- portability drops and trigger errors increase

Fix:
- keep minimum defaults only,
- move scenario-specific behavior to optional profiles/examples,
- document each default with one-line rationale.

### Check B: `实现偏重` / Implementation-Heavy

Symptoms:
- scripts grow faster than guidance/rubric quality
- qualitative quality is delegated to brittle code checks

Risk:
- workflow becomes code-heavy but low-signal

Fix:
- keep qualitative quality in prompt rubrics + review,
- add scripts only for objective invariants and deterministic routines.

### Check C: `默认行为太多` / Too Many Defaults

Symptoms:
- multiple implicit default routes/commands
- hidden fallback behaviors across files

Risk:
- users cannot predict runtime behavior

Fix:
- keep one explicit default route,
- mark all other paths optional/adapter-based,
- keep default declaration in one canonical section.

### Check D: `校验过硬` / Over-Hard Validation

Symptoms:
- strict pass/fail for qualitative dimensions
- hard gates added before real failure evidence exists

Risk:
- false negatives, prompt gaming, high maintenance cost

Fix:
- use hard gates only for invariants,
- downgrade qualitative checks to rubric/warnings,
- promote to hard gate only after repeated production failures.

### Check E: `约束分散` / Scattered Constraints

Symptoms:
- the same must-rules repeated in many sections/scripts
- no single source of constraints

Risk:
- drift and contradiction between docs/scripts

Fix:
- maintain one single-source constraint section,
- reference it from other sections instead of duplicating rules.

## Anti-Pattern 1: Output Exists, Destination Missing

Symptoms:
- mentions plan/summary/archive
- no concrete destination path/id

Risk:
- completion cannot be audited

Fix:
- add destination evidence fields in output + archive sections.

## Anti-Pattern 2: Validation Assets Scattered Outside `gate/`

Symptoms:
- validation TOML and check scripts are spread across `reference/`, `scripts/`, and ad-hoc folders
- no single validation protocol root

Risk:
- rule/script drift and poor discoverability

Fix:
- keep all validation protocol assets under `gate/<case>/`,
- keep one `rules.toml` + `check-*` scripts per validation case,
- keep `reference/` for narrative docs only.

## Anti-Pattern 3: Adapter-First Without Fallback

Symptoms:
- only external routes described
- local route missing

Risk:
- standalone execution breaks

Fix:
- declare local default route first, adapters second.

## Anti-Pattern 4: Over-Schema For High-Variance Reasoning

Symptoms:
- too many rigid fields for exploratory reasoning
- agent/human adaptation quality drops

Risk:
- workflow becomes compliance-heavy, low-signal

Fix:
- keep guidance pack + examples,
- retain hard gates only for invariants.

## Anti-Pattern 5: Protocol Drift In Footer Blocks

Symptoms:
- `[[BAGAKIT]]` renamed/reformatted
- nested bullets in footer

Risk:
- tools and reviewers lose stable parse target

Fix:
- keep RFDP canonical shape unchanged.

## Anti-Pattern 6: Hard Coupling By Script Invocation

Symptoms:
- required `bash .bagakit/<other-skill>/...` call
- no optional contract wording

Risk:
- hidden dependency across skills

Fix:
- convert to optional contract/signal model + fallback route.

## Anti-Pattern 7: Script-Scoring Qualitative Reasoning

Symptoms:
- scripts attempt to pass/fail "discussion depth", "question quality", "argument rigor", "writing quality"
- validator relies on brittle keyword counts as a quality proxy

Risk:
- false confidence and prompt gaming
- high maintenance with low real signal

Fix:
- move qualitative checks into prompt rubrics and agent review steps,
- keep scripts focused on objective invariants and destination evidence.
