# Discovery Log: Technical Writing Skill Optimization

Date: 2026-02-23

## skills

- Source: https://raw.githubusercontent.com/anthropics/skills/main/skills/doc-coauthoring/SKILL.md
- Checked: staged co-authoring workflow (context gathering, section curation, reader test).
- Relevance: high, directly improves human-like collaborative drafting flow.
- Usefulness: high, maps to pre-gate writer loop without adding new runtime dependency.
- Value: improves readability and recall while keeping skill boundary unchanged.
- Reference Plan: adapt as `references/human-writing-patterns.md` guidance overlay.

- Source: https://raw.githubusercontent.com/anthropics/skills/main/skills/internal-comms/SKILL.md
- Checked: audience-first format selection and communication type framing.
- Relevance: medium-high, useful for reducing generic template tone.
- Usefulness: high, easy to map into section-level rewrite prompts.
- Value: improves community readability without changing hard gates.
- Reference Plan: use as audience/format check in writing overlay guidance.

- Source: https://raw.githubusercontent.com/openai/skills/main/skills/.curated/doc/SKILL.md
- Checked: pragmatic quality loop (edit -> render/review -> fix).
- Relevance: medium, confirms iterative quality loops are effective in skill design.
- Usefulness: medium, adapted as repeatable self-check loop pattern.
- Value: supports process discipline and deterministic revision rhythm.
- Reference Plan: reuse loop framing in `start-here.md` and review template guidance.

## authority-guides

- Source: https://developers.google.com/tech-writing/one
- Checked: structure, clarity, and sentence-level readability rules.
- Relevance: high, aligns with technical article clarity goals.
- Usefulness: high, reinforces concrete style guidance.
- Value: reduces slogan-heavy wording and improves scanability.
- Reference Plan: cite in human-writing overlay as style baseline.

- Source: https://learn.microsoft.com/en-us/style-guide/welcome/
- Checked: objective tone, action-oriented wording, and consistency rules.
- Relevance: high, useful for publish-ready technical prose.
- Usefulness: high, directly supports AI-tone warning rewrites.
- Value: improves portability and editorial consistency.
- Reference Plan: cite in overlay and apply to revision checklist.

## papers-and-discussions

- Source: https://arxiv.org/abs/2303.11156
- Checked: detector robustness limits under paraphrase/rewrites.
- Relevance: medium, supports policy that AI-risk is guidance, not hard gate.
- Usefulness: medium, clarifies why detector-oriented optimization is risky.
- Value: prevents overfitting writing style to detector behavior.
- Reference Plan: keep AI-risk in rubric/self-check, avoid script-level hard fail.
