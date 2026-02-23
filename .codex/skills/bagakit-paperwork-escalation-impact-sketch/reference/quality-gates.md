# Quality Gates

Quality gates are split into hard gates and warning gates.

- hard gates: block publish
- warning gates: require explicit reviewer judgment

## 1. Hard Gates (block publish)

| Gate | Rule | Why this matters |
|---|---|---|
| Five-step structure | Hook + Ping-Pong + Escalation + Anchor Question + Cold Knife are all present | guarantees rhythm completeness |
| Line range | dialogue lines in `[8, 18]` by default | keeps 15s pacing viable |
| Blame engine | at least one `我问你...你说...` chain | establishes this format's core mechanic |
| Question anchors | at least 2 questions (opening + anchor question) | ensures hook and reveal focus |
| Placeholder hygiene | no `TODO`, `TBD`, `{{...}}`, `待补充` | prevents unfinished delivery |
| Non-moral ending | final line cannot be policy lecture/moral sentence | preserves comedy closure |
| Cold-fact tail | final line must add a new fact and worsen consequences | guarantees punchline quality |
| Checker status | `scripts/check-sketch.py --strict` exits `0` | objective baseline passed |

## 2. Warning Gates (human review required)

| Gate | Trigger | Required reviewer action |
|---|---|---|
| Jargon overload | dense technical terms in short script | replace with people/scene impact language |
| Visual anchor weak | low camera-capturable scene markers | add concrete location/position/screen signals |
| Role drift | role function changes without purpose | restore stable role responsibilities |
| Escalation weak | lines explain context but do not worsen stakes | rewrite with stronger social-risk escalation |
| Screenshotability weak | no quotable visual line | add one line suitable for screenshot sharing |

## 3. Review recording contract

For every warning that remains:

- record decision in `review_report.md`
- include rationale and reviewer role
- include next action if deferred

## 4. Release policy

- `pass`: all hard gates pass, warnings reviewed
- `fail`: any hard gate fails
- `conditional pass`: hard gates pass, warning follow-up has owner and deadline

## 5. Operational command

```bash
python3 scripts/check-sketch.py --input sketch.md --strict --report review_report.md
```
