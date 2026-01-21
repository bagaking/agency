# Change: Link-based Excerpt ingestion

## Why
Excerpt capture currently relies on manual selection, which duplicates prompt-style input and misses the common workflow of capturing references from the web. Enabling link-based ingestion keeps Excerpt distinct as a source-backed capture mode.

## What Changes
- Replace selection-based Excerpt capture with URL input and automated fetching + analysis.
- Store extracted content metadata (title, source, word count, fetch time) in the memo item for later Promote context.
- Provide clear feedback for invalid URLs, fetch failures, and oversized content.

## Impact
- Affected specs: agency-editor
- Affected code: Memo Excerpt capture UI/state, IPC bridge, Electron main services for URL fetch + parsing

## Non-Goals
- LLM-based summarization or rewriting.
- Full browser rendering or login/paywall handling.
- PDF and binary document extraction (follow-up).
