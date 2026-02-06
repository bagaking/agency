# Memory Policy (Template)

This document defines how to maintain and use project memory.

## Purpose
- Keep durable, searchable knowledge outside code: decisions, preferences, gotchas, and glossaries.
- Make “recall” deterministic: search first, quote second, then answer.

## Locations
- Curated memory: `docs/.bagakit/memory/**/*.md`
- Inbox (unreviewed): `docs/.bagakit/inbox/**/*.md`

Note:
- `README.md` is allowed inside `docs/.bagakit/memory/` and `docs/.bagakit/inbox/` as directory guidance, and is ignored by validation/workflows.

Recommended structure:
- `docs/.bagakit/memory/<kind>-<topic>.md`
- `docs/.bagakit/inbox/<kind>-<topic>.md`

## Writing Rules
- Keep entries short and factual; link to sources (files/PRs/issues/docs).
- Prefer “what + why + when it applies” over long narratives.
- If an item is a stable policy or deep guide, promote it into `docs/` and link from memory.
- Avoid fragmentation:
  - Before creating a new entry, search for an existing canonical entry and update/append instead of creating a near-duplicate.
  - Prefer one canonical entry + links over multiple partial entries.

## Promotion Workflow
1) Capture candidate in `docs/.bagakit/inbox/` (fast, messy is OK).
2) Review and promote:
   - Inbox → `docs/.bagakit/memory/` if durable.
   - `docs/.bagakit/memory/` → `docs/` if it becomes normative or needs depth.
3) Delete or merge duplicates; keep one canonical location.

Optional helper (automation):
- Create inbox entry: `sh scripts/bagakit_inbox.sh new <kind> <topic> --title '<title>'`
- Promote inbox entry: `sh scripts/bagakit_inbox.sh promote docs/.bagakit/inbox/<file>.md`
- If the curated target already exists, merge into it: `sh scripts/bagakit_inbox.sh promote docs/.bagakit/inbox/<file>.md --merge`

## Recall Workflow (Mandatory)
Before answering questions about prior work/decisions/dates/todos/preferences:
1) Search:
   - `sh scripts/bagakit_memory.sh search '<query>'`
2) Read only the needed lines:
   - `sh scripts/bagakit_memory.sh get <path> --from <line> --lines <n>`
3) Answer with citations (path + line numbers) when feasible.

## Optional Index (Faster Search)
If you want faster, more consistent search results, build a local SQLite FTS index:
- `python3 scripts/bagakit_memory_index.py index`

This writes to `docs/.bagakit/.generated/memory.sqlite` by default.
Do not commit generated artifacts under `docs/.bagakit/.generated/` (a local `.gitignore` should handle this).

## Safety
- Treat `docs/.bagakit/inbox/` as untrusted until reviewed.
- If search results are weak or missing, say so explicitly and do not guess.
