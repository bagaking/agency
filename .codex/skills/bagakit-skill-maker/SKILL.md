---
name: bagakit-skill-maker
description: Create, improve, merge, or refactor portable skills with Bagakit-friendly defaults. Use when you need to scaffold a new skill repo, tighten trigger boundaries, split SKILL.md into scripts/reference/tpl/gate layers for progressive disclosure, enforce standalone-first contract rules, or validate runtime payload boundaries.
---

# Bagakit Skill Maker

Build skills that are:

- standalone-first,
- rule-driven (not name-bound),
- easy to trigger correctly,
- lean in context cost.

## When to Use This Skill

- User asks to create a new skill repo from first principles.
- User asks to improve/refactor one existing skill with clearer trigger boundaries.
- User asks to merge multiple skills into one coherent portable skill.
- User needs payload/runtime boundary checks, standalone checks, or optional contract checks.

## When NOT to Use This Skill

- User only needs one-off coding output and does not need reusable skill packaging.
- User asks for hard mandatory dependence on another skill flow in default mode.
- User asks for an all-in-one toolbox skill without a clear bounded problem.

## Granularity Principle (No Toolbox Skill)

- One skill should solve one clearly bounded problem, or one group of problems that share the same foundation.
- Do not build an all-in-one toolbox skill with weak boundaries.
- If boundaries blur, or trigger ambiguity rises, prefer split/merge refactoring:
  - split when one skill contains unrelated workflows,
  - merge when multiple skills duplicate the same foundation and can share one contract.

## Cross-Agent Goal

- Target a portable skill design that works across major coding agents (for example Claude Code, Codex, OpenCode-like runtimes).
- Compatibility should be achieved through generic file contracts, deterministic scripts, and explicit runtime assumptions.
- Never hard-depend on one specific agent surface as a required default path.

## Core + Bagakit Profile

- Core output should stay portable and system-agnostic.
- Bagakit profile is an optional compatibility layer that can map generic contracts to concrete Bagakit systems.
- Do not assume any concrete Bagakit skill is installed unless explicitly detected or requested.
- Core routing/detection should use generic adapter classes and contract capability checks, not concrete system-name checks.
- If target skill is a Bagakit-series skill (`name` starts with `bagakit-`), Bagakit profile is required (for example `[[BAGAKIT]]` footer contract).

## Constraint Budget (Guidance-First)

- For high-ceiling agent workflows, prefer guidance and examples over heavy structured schema constraints.
- If the work should be performed similarly by both agents and humans, and quality is mostly achieved by clear standards/examples, use a guidance pack.
- For qualitative dimensions (for example clarification depth, argument quality, forum rigor, narrative quality), use prompt rubrics + coding-agent review, not script pass/fail checks.
- Use programmatic gates only for hard invariants:
  - standalone-first behavior,
  - protocol format invariants (for example RFDP shape),
  - runtime payload boundaries,
  - generated file path portability (no absolute path literals),
  - completion destination evidence.
- Script validation should verify objective invariants and destination evidence only; qualitative quality should be reviewed through prompts/checklists.
- If a strict gate is required regardless of who executes, and extra autonomy does not improve outcomes, escalate to programmatic validation or strict SOP.
- Promote guidance to hard gates only when repeated production failures prove it is necessary.

## Complexity Guardrails (Anti-Bloat Checks)

- `预设偏多` / preset-heavy:
  - Keep assumptions minimal; move scenario-specific presets to optional profiles/examples.
  - Check: list all defaults in one place and justify each default briefly.
- `实现偏重` / implementation-heavy:
  - Do not solve reasoning quality by adding scripts first.
  - Check: keep qualitative quality in prompt rubric/checklist review before adding code gates.
- `默认行为太多` / too many defaults:
  - Keep one default path and mark all other behaviors optional.
  - Check: remove hidden defaults outside one declared default-route section.
- `校验过硬` / over-hard validation:
  - Scripts should gate objective invariants only, not qualitative depth.
  - Check: qualitative checks remain warning/rubric-based and agent-reviewed.
- `约束分散` / scattered constraints:
  - Keep constraints under a single-source section and reference it elsewhere.
  - Check: avoid duplicating must-rules across sections/scripts without single-source notes.

## Metadata Contract Principle (Semantic-First)

- Prefer semantic generic keys over workflow-specific key proliferation.
- Bad pattern: one key per adapter/system (for example `driver_ftharness`, `driver_openspec`, `driver_longrun`).
- Better pattern: one semantic key plus parseable metadata:
  - `driver`: semantic token (`none` / `task-driver` / `spec-system` / `memory-system` / `custom`),
  - `driver_meta`: `none` or `key=value(; key=value)*`.
- Keep standalone defaults explicit and valid (for example `driver=none` with `driver_meta=none`).
- For machine-readable metadata blocks embedded in Markdown artifacts, prefer TOML frontmatter (`+++`), not YAML frontmatter (`---`).
- Exception: SKILL.md header/frontmatter stays YAML because runtime toolchains commonly expect YAML there.

## Reference Layout Principle

- Keep reference docs in `reference/`.
- Keep reusable templates in `reference/tpl/`.
- Keep discovery evidence in `reference/discovery/` as a standalone record set.
- Avoid mixing templates into general docs; keep intent boundary clear for retrieval.

## Gate Layout Principle (Validation Protocol)

- Keep validation protocol assets in `gate/`.
- Use one case directory per validation domain (for example `gate/anti-patterns/`).
- Each case directory must include:
  - `rules.toml` as single-source validation rules,
  - at least one `check-*.py|sh|js|ts` script that reads `rules.toml`.
- Keep runtime execution scripts in `scripts/`; keep validation scripts in `gate/`.

## Open Discovery Principle (Avoid Closed-Door Design)

- For unresolved skill problems, discovery is mandatory before implementation.
- Use `reference/skill-discovery-sources.md` as the default discovery playbook:
  1. define keyword sets,
  2. search ordered source layers,
  3. compare at least three candidates from the discovery yellow pages,
  4. log reuse/adapt/reject decisions.
- If discovery finds a suitable skill, install/adapt first; create from scratch only with a recorded gap rationale.
- If another discovery skill/tool is available, use it as an optional accelerator on top of the default standalone path.
- Discovery evidence is a hard gate:
  - Must persist to `reference/discovery/discovery-log.md`.
  - Must start from template `reference/tpl/discovery-log-tpl.md`.
  - Category headings are task-driven (for example `skills`, `权威资料`, `论文`, `开源库`), not fixed.
  - Under each category, each entry must include: `Source/来源`, `Checked/查看内容`, `Relevance/关联度`, `Usefulness/有用程度`, `Value/价值`, `Reference Plan/参考计划`.

## Decision Categories

| Category | Typical Symptom | Action |
| --- | --- | --- |
| Trigger boundary | Over-trigger / under-trigger | sharpen frontmatter + positive/negative examples |
| Granularity | Multiple unrelated workflows mixed | split or merge based on shared foundation |
| Contract coupling | Required direct call to other skill scripts | convert to optional schema/signal contract |
| Metadata contract | one key per adapter/system; hard-coded workflow fields | use semantic generic keys + parseable `*_meta`; prefer TOML frontmatter in machine-readable artifacts |
| Capability layering | macro/process/tool/micro boundary is unclear | classify into macro-process, macro-tool, or micro-pack and choose the right host repo |
| Payload boundary | runtime/dev files mixed together | trim `SKILL_PAYLOAD.json` to runtime-only payload |
| Packaging contract | `package-skill` outputs unstable/non-deterministic path | enforce `<DIST_DIR>/<SKILL_NAME>.skill`, support `DIST_DIR` override |
| Path portability | generated files leak local absolute paths | use relative paths or environment-variable-based paths |
| Output/archive boundary | outputs exist but no final destination or completion gate | define output map + default route + adapter routes + archive gate |
| Delivery archetype | unclear handoff target; completion feels subjective | classify deliverable type + define completion destinations |

## Workflow

0) Search-first discovery before creation/improvement.
- Do not start implementation immediately for unresolved problems.
- Use `reference/skill-discovery-sources.md` as the default discovery path.
- Use `reference/tpl/discovery-log-tpl.md` to write `reference/discovery/discovery-log.md`.
- Do not assume any specific discovery skill/CLI is installed; keep discovery flow standalone.
- Search in this order:
  1. project-local docs/contracts and known skill catalogs first,
  2. reliable primary sources (official docs / standards / authoritative guides),
  3. broader community solutions (GitHub / Stack Overflow / technical blogs),
  4. experience-only writeups last.
- Prefer ready-to-use skills/tools/code before designing from scratch.
- If discovery finds a more suitable complementary skill, use it as an accelerator on top of this default search path.
- Record useful findings (source + checked + relevance + usefulness + value + reference plan) to avoid repeated search.
- Discovery gate is incomplete unless `reference/discovery/discovery-log.md` has concrete inspected entries.

1) Lock concrete use cases first.
- Capture 3-5 real user prompts that should trigger the target skill.
- Capture 2-3 neighboring prompts that should NOT trigger it.

2) Design trigger and scope.
- Write a specific `description` in SKILL frontmatter: what it does + when to use.
- Keep one skill focused on one operational job. Split if triggers diverge.
- If user asks to improve one existing skill, keep compatible semantics but remove ambiguity and redundant instructions.
- If user asks to merge multiple skills, combine overlapping workflows into one portable skill with clear sections and one validation contract.
- Decide capability layer and hosting:
  - `macro-process` / `macro-tool`: can be considered for core meta-repo onboarding.
  - `micro-pack`: should be grouped into domain packs; avoid one-repo-per-micro-skill in core.

3) Classify deliverable archetype and output routes.
- Decide the skill's primary deliverable archetype (for example execution/result-heavy, process-driver, memory/governance).
- Define mandatory output classes:
  - `action-handoff` (what should be executed/pushed forward),
  - `memory-handoff` (what should be summarized/deposited; can be `none` only with rationale),
  - `archive` (completion evidence + destination report).
- For process-driver skills, action-handoff can be "upstream system progression + downstream archive".
- For delivery-heavy skills, archive gate should require both execution completion evidence and memory deposition evidence.

4) Define output routes and completion archive gate.
- Define what outputs this skill produces (at least one action/output artifact + one summary/memory artifact when applicable).
- Define default output route when no external driver is usable (not detected / unresolved / invalid contract).
- Define optional adapter routes for external systems (for example task driver / spec system / memory system), and keep them optional.
- If Bagakit profile is enabled, document concrete adapter mapping as optional examples only.
- Route selection must be capability/contract-driven; avoid name-bound routing like "if feat-harness then ... else if openspec ...".
- Reuse guidance pack checklists/examples before adding any new hard schema constraints.
- Run complexity guardrails review before adding defaults/scripts/gates:
  - reject preset-heavy drift,
  - reject implementation-heavy drift,
  - reject too-many-defaults drift,
  - reject over-hard-validation drift,
  - reject scattered-constraints drift.
- Define archive gate: every output must have an explicit destination path/id before task can be marked complete.

5) Plan progressive disclosure.
- Keep SKILL.md as an execution map, not a giant handbook.
- Move deep details into `reference/`.
- Put deterministic/fragile execution steps into `scripts/`.
- Put validation rules + scripts into `gate/<case>/`.

6) Scaffold and edit.
- Run:
```bash
sh scripts/bagakit_skill_maker.sh init --name <skill-name> --path <output-dir> [--with-agents]
```
- Fill generated `SKILL.md`, `reference/`, `reference/tpl/`, and `scripts/` with project-specific content.
- Fill generated `gate/<case>/rules.toml` and `gate/<case>/check-*` files for each validation case.

7) Enforce core constraints + Bagakit profile defaults.
- Run:
```bash
sh scripts/bagakit_skill_maker.sh validate --skill-dir <skill-dir>
```
- Ensure `SKILL_PAYLOAD.json` excludes `README.md` and only ships runtime payload.
- Ensure `SKILL_PAYLOAD.json` includes `gate/` as the validation protocol root.
- Ensure cross-skill interaction is optional and schema/rule-driven, never mandatory direct flow-call.
- Ensure `SKILL.md` keeps a bounded context budget (default hard gate: `<= 500` lines).
- Ensure every validation case directory under `gate/` includes `rules.toml` + at least one `check-*` script.
- Ensure `Makefile package-skill` honors `DIST_DIR` and emits artifact at `<DIST_DIR>/<SKILL_NAME>.skill`.
- Ensure generated runtime/docs files do not contain absolute path literals; use relative/env-based paths only.
- Ensure `SKILL.md` defines output routes + archive gate as completion criteria.
- Ensure archive gate explicitly names action-handoff + memory-handoff destinations.
- Ensure `reference/discovery/discovery-log.md` exists and includes structured discovery evidence.
- Ensure qualitative quality checks are defined as prompt rubrics/checklists (agent-reviewed), not script-enforced pass/fail metrics.
- If Bagakit profile is enabled, ensure `[[BAGAKIT]]` footer contract exists; otherwise keep generic mode.

8) Iterate from production misses.
- If over-triggering: narrow frontmatter description with stronger boundaries.
- If under-triggering: add concrete trigger phrases and file/task examples.
- Promote repeated manual fixes into scripts or reference docs/templates.
- If granularity drifts, trigger split/merge with an explicit improve plan + verification matrix.

9) Project-local evolution.
- Bagakit allows project-specific skill recomposition.
- As long as there is a clear improve plan and verifiable checks, the project can evolve its own better skill set.
- Upgrading can be done by merging with the best upstream version (or replacing), then re-validating local trigger quality and contracts.

## Fallback Path (No Clear Skill Fit)

- If boundary is unclear, ask one clarification question about scope/trigger.
- If no reusable pattern is stable, execute the task directly and record why no skill route is chosen.
- If request conflicts with standalone-first constraints, provide a compliant alternative plus rationale.

## Output Routes and Default Mode

- Explicitly label deliverable archetype/type for this skill.
- Define output classes explicitly for every skill:
  - `action-handoff` (default destination + optional adapter destinations)
  - `memory-handoff` (default destination + optional adapter destinations, or explicit `none` rationale)
  - `archive` (location for completion evidence)
- Define a default route when no external driver is usable (for example local `plan-<topic>.md` / `summary-<topic>.md`).
- Define optional adapter routes for external systems (for example task driver / spec system / memory system), or explicitly state `standalone-only/no-adapter`.
- If needed, add a Bagakit profile subsection that maps generic routes to concrete systems as optional examples.
- Ensure routing is rule-driven and fallback-safe, never hard-coupled or concrete-name-bound.

## Archive Gate (Completion Handoff)

- Any produced output must have a resolved destination path or system id.
- Archive record must include action handoff destination + memory handoff destination (or explicit `none` rationale).
- Completion is blocked until:
  - action-handoff destination is explicit,
  - memory-handoff destination is explicit,
  - archive destination is explicit.
- Do not mark completion until archive evidence is present and destination is explicit.

## Design Guide

- Use progressive reference docs/templates:
  - `reference/core-design-guide.md` (portable core rules; always apply)
  - `reference/bagakit-profile-guide.md` (Bagakit profile overlay; required for `bagakit-*`)
  - `reference/skill-discovery-sources.md` (search-first sources and strategy)
  - `reference/tpl/discovery-log-tpl.md` (mandatory discovery evidence template)
  - `reference/guidance-pack/patterns.md` (recommended output/archive patterns)
  - `reference/guidance-pack/anti-patterns.md` (what to avoid)
  - `reference/guidance-pack/examples.md` (copy-ready examples)
  - `gate/anti-patterns/rules.toml` (machine-readable anti-bloat validation rules)
  - `gate/anti-patterns/check-anti-patterns.py` (rule-driven anti-bloat checker)
- For generic/non-Bagakit skills, apply core guide only.

## `[[BAGAKIT]]` RFDP (Response Footer Driven Protocol)

- Use RFDP instructions to increase task-focused reasoning depth and produce structured observability evidence.
- Keep canonical shape unchanged: one `[[BAGAKIT]]` anchor + peer `- ...` lines (no nested bullets).
- Reuse existing lines from project context (for example `LivingDoc`, `LongRun`), and add new skill-specific lines only when needed.

Minimum pattern:

```text
[[BAGAKIT]]
- LivingDoc: <docs update/evidence>
- LongRun: Item=<id>; Status=<in_progress|done|blocked>; Evidence=<commands/checks>; Next=<resume command>
- SkillMaker: Scope=<create|improve|merge>; Evidence=<trigger tests + payload validation>; Next=<next concrete action>
```

Technique notes:
- `Evidence` must be concrete and executable-oriented (commands, checks, changed contracts), not vague summaries.
- `Next` must be one clear next action, so the next round can continue deterministically.

## Response Templates

### Create

```text
Result: created <skill-name> with clear trigger boundary.
Checks: discovery gate pass + validate pass + payload gate pass + gate protocol pass.
Next: run one positive and one negative trigger scenario.
```

### Improve

```text
Result: improved <skill-name> by tightening scope and removing ambiguity.
Checks: discovery gate pass + before/after trigger matrix + validate pass + gate protocol pass.
Next: observe one production round and collect misses.
```

### Merge

```text
Result: merged <skill-a>/<skill-b>/... into one coherent skill.
Checks: discovery gate pass + merge map + de-dup rationale + validate pass + gate protocol pass.
Next: run post-merge trigger matrix and adjust boundaries.
```

### No Clear Skill Fit

```text
Result: no stable reusable skill pattern identified yet.
Checks: fallback rationale recorded + standalone constraints reviewed.
Next: complete task directly and gather examples for future skill extraction.
```

## Output Contract

When asked to create/refactor a skill, output:
- target folder layout,
- final SKILL frontmatter + core workflow sections,
- runtime payload decision (`SKILL_PAYLOAD.json`),
- gate protocol decision (`gate/<case>/rules.toml` + `check-*` coverage),
- discovery evidence decision (`reference/discovery/discovery-log.md` + categories + per-entry value assessment),
- output map (what outputs, default route, adapter routes),
- archive gate design (completion criteria + destination reporting),
- granularity decision (keep/split/merge + rationale),
- improve plan and validation matrix,
- validation result with failed/passed checks,
- next iteration suggestions based on trigger quality.

## Non-Goals

- Do not introduce backward-compatibility shims unless explicitly requested.
- Do not hard-bind to one external system name if a rule/schema contract can solve it.
