# Start Here

Use this route when writing or rewriting an EIS sketch.

## Step 0: Lock incident and scene

Before drafting, write these in `execution_appendix.md`:

- incident seed (what small mistake happened)
- high-pressure scene (meeting/group chat/screen share/interview/review)
- cast and role function
- one-sentence target reaction

If one item is missing, stop and clarify first.

## Step 1: Build 5-step skeleton

Draft the following placeholders first:

- Hook
- Blame Ping-Pong
- Escalation
- Anchor Question
- Cold Knife

Do not optimize wording before all 5 steps exist.

## Step 2: Force escalation every line

For each line, ask:

- does this line make the situation worse?
- if deleted, does escalation weaken?

Delete filler lines that do not increase pressure.

## Step 3: Keep it visual and human

Prefer social-risk scenes over technical mechanism details.

- write what camera can capture (`门口`, `第一排`, `投屏`, `会议室`, `群里`).
- keep jargon as garnish only.

## Step 4: Validate with checker

```bash
python3 scripts/check-sketch.py --input sketch.md --strict --report review_report.md
```

Fix all hard errors before handoff.

## Step 5: Run reviewer gate

Use `reference/quality-gates.md` warning rules.

- warnings require explicit reviewer decision in `review_report.md`
- if ending is still explanatory (not factual), block publish and rewrite

## Done criteria

- `sketch.md` is fast, clear, and escalation-complete
- `execution_appendix.md` includes beat timing and role instructions
- `review_report.md` records hard/warning outcomes and next action
