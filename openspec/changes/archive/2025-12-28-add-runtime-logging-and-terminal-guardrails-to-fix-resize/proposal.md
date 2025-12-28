# Change: Add runtime logging and rotation

## Why
Terminal diagnostics are hard to reproduce without persistent runtime logs. We need durable, structured logs per editor run plus guardrails to prevent terminal resize glitches (e.g., 1-column resize storms) that break TUI tools like codex.

## What Changes
- Add a runtime log writer that persists main/renderer diagnostics to `logs/runtime`.
- Keep the newest 20 runtime log runs in `logs/runtime` and move older runs to `logs/runtime/history`.
- Chunk log files when they reach a size limit to ensure write safety.
- Expose a renderer-to-main logging bridge for terminal diagnostics.
- Add terminal resize guardrails (frontend filtering + backend clamp) and stabilize initial sizing to prevent TUI corruption.

## Impact
- Affected specs: `openspec/specs/agency-editor/spec.md`
- Affected code: Electron main process, IPC/preload bridge, terminal renderer logging, terminal resize logic.
