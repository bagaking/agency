# Guidance Pack: Output/Archive Examples

Copy and adapt these snippets.

## Example A: Generic Skill (No External Adapter)

```md
## Output Routes and Default Mode

- Archetype: process-driver
- action-handoff: `plan-<slug>.md` under project root
- memory-handoff: `summary-<slug>.md` under project root
- archive: `.skill/archive/<date>-<slug>/archive.md`
- adapter policy: standalone-only / no-adapter
```

```md
## Archive Gate

- action destination resolved (`path`)
- memory destination resolved (`path`)
- archive destination recorded (`path`)
- completion only after all three are explicit
```

## Example B: Bagakit-Series Skill

```md
## Output Routes and Default Mode

- Archetype: execution-result-heavy
- action-handoff:
  - default: local `plan-<slug>.md`
  - optional adapter classes: task-driver / spec-system
- memory-handoff:
  - default: local summary
  - optional adapter class: memory-system
- Bagakit profile optional mappings:
  - task-driver -> feat-task-harness
  - spec-system -> openspec
  - memory-system -> living-docs inbox
- archive: `.bagakit/<skill>/archive/<date>-<slug>/archive.md`
```

```text
[[BAGAKIT]]
- Skill: Status=in_progress; Evidence=output paths resolved; Next=run archive check
```

## Example C: Memory-Heavy Skill With `none` Action

```md
## Output Routes and Default Mode

- Archetype: memory-governance
- action-handoff: none (rationale: no execution artifact in this workflow)
- memory-handoff: `docs/.bagakit/inbox/<slug>.md`
- archive: `docs/.bagakit/archive/<slug>.md`
```

```md
## Archive Gate

- memory destination explicit
- action is `none` with rationale
- archive destination explicit
```
