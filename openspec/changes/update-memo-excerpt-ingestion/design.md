## Context
Excerpt capture should represent a linked source rather than a manual snippet. The workflow must feel fast (paste URL, fetch, save) while keeping content trustworthy and lightweight.

## Goals / Non-Goals
- Goals:
  - Accept a URL, fetch the page, and extract readable text for a memo excerpt.
  - Persist source metadata to support Promote context (URL, title, excerpt, counts, fetch time).
  - Provide predictable limits and errors for invalid URLs or oversized pages.
- Non-Goals:
  - LLM-based summarization, browser automation, or authenticated crawling.
  - Parsing PDFs or binary assets.

## Design Lens (Who designs this best)
A balanced trio works best:
- Knowledge management + editorial UX: they focus on structured source capture, summary usefulness, and minimal friction.
- Web extraction + data engineering: they optimize fetch reliability, parsing, limits, and error handling.
- Security + privacy engineering: they enforce URL validation, size caps, and prevent local file or intranet abuse.

They would likely design:
- A single-field URL flow with explicit "Fetch" + "Save" to avoid surprise network activity.
- Clear, compact preview of extracted title/summary so users trust what was captured.
- Strict input validation, size/time limits, and sanitized metadata to keep HIL data clean.

## Decisions
- Use main-process fetch via Electron `net` to avoid renderer CORS limits.
- Parse HTML with Readability over a DOM parser to extract main content.
- Store memo `body` as a short summary (excerpt/title) and keep source text + metadata in `meta.source` with size limits.
- Cap fetched HTML and stored text length to keep HIL payloads bounded.

## Risks / Trade-offs
- Readability extraction can miss some site layouts; mitigate by storing raw text fallback.
- Hard size limits might truncate long articles; include a note in metadata for transparency.

## Migration Plan
- No migration required; existing excerpt items remain unchanged.

## Open Questions
- Should we add an optional "open in browser" action for excerpts?
- Should source text be stored separately on disk once length exceeds the limit?
