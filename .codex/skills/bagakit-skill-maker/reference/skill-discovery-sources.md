# Skill Discovery Sources (Search-First)

Use this guide before creating/refactoring a skill for a problem that is not yet clearly solved.

## Principle

- Search first, build second.
- If an existing reliable skill/tool solves the need, reuse/adapt before writing from scratch.
- Keep discovery standalone: do not assume any specific marketplace skill or CLI is installed.

## How to Use This Guide (Avoid Closed-Door Design)

1. Start here for every unresolved skill request.
2. Build keyword sets (Section 1), then search in the ordered source layers (Section 2).
3. Pull at least 3 candidate sources from the yellow pages (Section 3) and compare:
   - fit to the current problem,
   - maintenance signal (recent update/push),
   - trust signal (maintainer type + ecosystem reputation).
4. Record reuse/adapt/reject decisions with reasons (Section 5).
5. Only create from scratch when the search log shows no good reusable/adaptable option.

If another discovery skill/tool exists and is useful, treat it as an optional accelerator on top of this baseline, not a prerequisite.

## 1) Plan Search Keywords First

Create 2-3 keyword sets:
- domain keywords (e.g. testing, deploy, docs),
- task keywords (e.g. regression gate, changelog automation),
- synonym/variant keywords (e.g. ci-cd / pipeline / workflow).

## 2) Search in Ordered Sources

### A. Project-local and trusted local context first

- current repo docs (`docs/`, `reference/`, `catalog/`, existing `SKILL.md` files),
- existing installed skill folders and payload files,
- existing scripts that may already provide the capability.

### B. Reliable primary sources

- official documentation,
- standards / authoritative engineering guidance,
- official repository docs/readmes.

### C. Broader community solutions

- GitHub implementations,
- Stack Overflow discussions,
- technical blog posts with runnable examples.

### D. Experience-only writeups last

- personal retrospectives and non-reproducible advice should be supporting input, not primary evidence.

## 3) Discovery Yellow Pages (Starter Set)

Snapshot date for scale/activity signals: 2026-02-20 (GitHub API + site metadata checks).

| Source | Type | Scale Signal | Suitable Scope | Reliability Signal* |
| --- | --- | --- | --- | --- |
| https://github.com/Prat011/awesome-llm-skills | Community curated list | 913 stars; pushed 2025-12-25 | Cross-agent skill/tool/resource discovery (Claude Code/Codex/Gemini/OpenCode style ecosystems) | Medium |
| https://github.com/heilcheng/awesome-agent-skills | Community curated list | 2304 stars; pushed 2026-01-25 | Agent skills + tutorials + ecosystem links; good broad starting index | Medium |
| https://github.com/ComposioHQ/awesome-claude-skills | Community curated list (org-owned) | 36,189 stars; pushed 2026-02-19 | Claude-oriented skill discovery; useful for pattern and format mining | Medium |
| https://github.com/anthropics/skills | Official vendor repo | 72,356 stars; pushed 2026-02-06 | Canonical Agent Skills examples and conventions for Anthropic ecosystem | High |
| https://github.com/openai/skills | Official vendor repo | 9,114 stars; pushed 2026-02-12 | Codex-oriented skills catalog and reusable task patterns | High |
| https://github.com/vercel-labs/agent-skills | Official vendor repo | 20,827 stars; pushed 2026-02-02 | Practical engineering workflows (release/process/task skills) | High |
| https://github.com/supabase/agent-skills | Official vendor/domain repo | 1,381 stars; pushed 2026-02-20 | Supabase-specific developer task accelerators | High (domain-specific) |
| https://github.com/CommandCodeAI/agent-skills | Community curated list (redirect from `LangbaseInc/agent-skills`) | 18 stars; pushed 2025-12-24 | Supplemental multi-agent skill index; useful as secondary scan | Medium-low |
| https://evomap.ai/ | Protocol/site docs (non-GitHub) | Public docs endpoint + `llms.txt`/`skill.md` available | A2A evolution/protocol exploration (self-described GEP model) | Exploratory |

\* Reliability Signal is a triage aid, not a guarantee:
- `High`: official/vendor-maintained source with recent activity.
- `Medium`: active community-curated source; verify linked implementations.
- `Medium-low`: small or less-proven community source; use as supplement.
- `Exploratory`: self-described protocol/site information; validate independently before adoption.

## 4) Decision Preference

Prefer in order:
1. ready-to-use skill/tool/code,
2. light adaptation/overlay of existing assets,
3. new design from first principles.

## 5) Record Findings (Minimum Log)

Capture at least:
- source link/path,
- what was found,
- applicability decision (`reuse` / `adapt` / `reject`),
- reason.

Minimal template:

```md
| Source | Finding | Decision | Reason |
| --- | --- | --- | --- |
| <url/path> | <summary> | reuse/adapt/reject | <why> |
```
