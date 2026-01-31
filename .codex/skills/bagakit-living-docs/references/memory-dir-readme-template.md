# Memory (Curated)

This directory holds *curated* project memory: durable decisions, preferences, gotchas, glossaries, and how-tos.

Rules:
- Keep entries short, factual, and source-linked.
- Prefer one canonical memory entry over duplicates.
- If something becomes a stable policy or deep guide, promote it into `docs/`.

Filename rule:
- Use kind-first: `<kind>-<topic>.md` (e.g. `gotcha-zsh-glob.md`).

Recall workflow (mandatory before answering "what did we decide/why"):
1) Search: `sh scripts/bagakit_memory.sh search '<query>'`
2) Quote: `sh scripts/bagakit_memory.sh get <path> --from <line> --lines <n>`

