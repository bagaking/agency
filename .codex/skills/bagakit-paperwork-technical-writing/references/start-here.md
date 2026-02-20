# Start Here

Use this route when creating or rewriting a technical article.

## Step 0: Lock the task contract

Before writing, state:

- target reader
- expected action after reading
- scope and out-of-scope
- success signal

If any item is missing, stop and clarify first.

## Step 1: Draft with the article template

File:

- `references/tpl/article-template.md`

Goal:

- create one concrete `H1`
- keep `H2` count in 3-5 range
- give each `H2` at least one `H3` scan anchor

## Step 2: Apply writing techniques

File:

- `references/writing-techniques.md`

Focus:

- argument chain (`phenomenon -> mechanism -> evidence -> signal -> action`)
- paragraph/list/table choice
- term consistency
- anti-regression checks

## Step 3: Enforce formatting stability

File:

- `references/markdown-formatting.md`

Focus:

- markdown render stability
- Mermaid syntax safety
- diagram and narrative role split

## Step 4: Run quality gates

Files:

- `references/quality-gates.md`
- `scripts/check-article.py`

Command:

```bash
python3 scripts/check-article.py --input article.md --strict --report review_report.md
```

Rule:

- fix all hard-gate failures before proceeding
- warning gates require explicit human judgment in report

## Step 5: Build execution appendix

File:

- `references/tpl/execution-appendix-template.md`

Must include:

- operational fields
- verification command and observed signal
- recovery trigger and action

## Step 6: Finalize review report

File:

- `references/tpl/review-report-template.md`

Must include:

- hard/warning gate results
- structural and argument deltas
- unresolved risks and mitigation owner

## Done criteria

- `article.md` readable and evidence-backed
- `execution_appendix.md` executable with clear fallback
- `review_report.md` complete with gate evidence
