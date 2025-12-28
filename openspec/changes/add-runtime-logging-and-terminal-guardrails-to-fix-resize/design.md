## Context
The editor needs durable runtime logs to diagnose terminal and session issues. Logs must be stored in the repository, keep recent runs visible, and retain older runs without deletion.

## Goals / Non-Goals
- Goals:
  - Persist runtime logs under `logs/runtime` with per-run log files.
  - Keep the newest 20 runs in `logs/runtime` and move older runs to `logs/runtime/history`.
  - Chunk large log files to avoid oversized files.
  - Provide a renderer-to-main logging bridge for terminal diagnostics.
  - Prevent terminal resize glitches that corrupt TUI output.
- Non-Goals:
  - Full log ingestion/analytics pipeline.
  - Remote log upload.

## Decisions
- Decision: Use a runtime log service in the main process to own file rotation and chunking.
- Decision: Identify runs by timestamp in the filename and group chunked files by run id.
- Decision: Keep logging opt-in from the renderer via an IPC bridge.
- Decision: Centralize resize logic (single resize helper) with frontend filtering and backend clamping.
- Decision: Apply a minimum cols/rows gate and suppress resize during heavy output.
- Decision: Re-run fit/resize after fonts are ready and after terminal start completes.

## Risks / Trade-offs
- File I/O overhead → mitigate by batching writes through a single stream and rotating on size.
- Log growth → keep only 20 runs in `logs/runtime`, move older runs to `logs/runtime/history`.
- Over-filtered resize events → mitigate by logging skipped resizes and allowing forced resize on explicit triggers.

## Migration Plan
1. Add runtime log service + IPC bridge.
2. Hook logging into terminal lifecycle and renderer diagnostics.
3. Document and validate in spec.

## Open Questions
- None.
