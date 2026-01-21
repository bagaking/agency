## 1. Implementation
- [x] 1.1 Add IPC handler + service to fetch and parse Excerpt URLs with validation, timeouts, and size limits.
- [x] 1.2 Extend renderer agency bridge to request Excerpt ingestion and surface errors.
- [x] 1.3 Update Memo Excerpt capture state to accept a URL, show preview, and create memo items with source metadata.
- [x] 1.4 Update Excerpt UI to use URL input + preview instead of selection-based capture.
- [x] 1.5 Update spec delta and validate with `openspec validate --strict`.

## 2. QA Notes
- Paste a valid URL, fetch, and confirm Excerpt memo stores title/summary + source metadata.
- Paste an invalid URL and verify the UI shows an error without creating a memo.
- Fetch a very large page and verify size limit handling without UI lockups.
