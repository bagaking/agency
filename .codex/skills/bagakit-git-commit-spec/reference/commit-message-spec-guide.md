# Commit Message Spec Guide

Use commit messages as mini-specs with machine-readable TOML frontmatter + human-readable GFM body.

## 1) Subject Line

Recommended format:

`<type>(<scope>): <summary>`

Rules:

- imperative and outcome-oriented,
- specific and reversible in intent,
- avoid vague verbs like `update` / `misc`.

## 2) Required Frontmatter

Message subject is followed by a blank line, then TOML frontmatter:

```text
feat(commit-spec): add frontmatter lint gate

+++
schema = "bagakit.commit-spec/v3"
kind = "commit_message_spec"
generated_at = "2026-02-21T10:00:00Z"
session = "2026-02-21-commit-clarity"
goal_target = "make commit history queryable"
goal_status = "partial"
goal_completion = "frontmatter + lint implemented; template rollout pending"
driver = "openspec"
driver_meta = "change=improve-commit-spec; status=in_progress; completion=2/4"
activity_brainstorm = "none"
activity_spec = "updated commit spec schema v3"
activity_skill = "updated bagakit-git-commit-spec"
activity_docs = "updated README and reference docs"
module_count = "2"
+++
```

## 3) Required GFM Body Sections

```markdown
## Purpose
- ...

## Why This Change
- Before: ...
- Change: ...
- Gain: ...

## Goal Status
- Target: ...
- Status: partial
- Completion: ...

## Changes by Module
- **scripts** (commit-spec)
  - Change: ...
  - Key refs: scripts/bagakit-git-commit-spec.py:320

## Learnings and Cases
- ...

## Validation
- ...

## Driver Context
- Driver: ...
- Driver-Meta: ...

## Knowledge Activities
- Brainstorm: ...
- Spec: ...
- Skill: ...
- Docs: ...

## Remaining Work
- None
```

When unfinished items exist, use the 3-line template for each item (see `reference/tpl/remaining-work-item-template.md`):

```markdown
## Remaining Work
- What: <one sentence>
- Why Pending: <one sentence>
- Plan: <one sentence>
```

## 4) Optional Sections

- `## Risk`
- `## Rollback`
- `## Follow-ups` (legacy compatibility only)

## 5) Optional Trailers

```text
Refs: #123
Spec-ID: 2026-02-21-commit-clarity
Co-authored-by: Name <mail@example.com>
```

## 6) Anti-Patterns

- one-line commit message with no objective/context/evidence,
- missing frontmatter keys for activities or driver context,
- setting `driver=none` while keeping `driver_meta` non-`none`,
- missing `Why This Change` (`Before/Change/Gain`) explanation,
- missing concrete learning/case from debug loop, research, or user discussion,
- unfinished work listed without `What/Why Pending/Plan` template,
- `Changes by Module` without `Key refs`,
- using placeholder tokens (for example `<fill ...>`) in final commit message.
