---
title: Session runtime orchestration should stay host-owned and JSON-friendly
kind: decision
status: inbox
tags:
  - decision
  - sessions
  - orchestration
  - harness
sources:
  - apps/editor/electron/services/sessionRuntime.ts
  - apps/editor/electron/cli/sessionRuntimeCli.ts
  - docs/notes-session-management.md
  - docs/notes-reusable-items-coding.md
created: 2026-03-23
---

## Candidate
- Session-level orchestration that needs source inspection, source-side actions, child-session creation, and ready waits should be host-owned in Electron main, not scripted in renderer UI.
- The stable boundary should be a JSON-friendly gateway contract (`performSessionRuntimeIntent`) with caller metadata (`sourceSurface`, `callerType`, `callerId`, `traceId`) so UI, CLI, future tool callers, and a future Main-as-Agent Harness all share the same deterministic runtime path.
- Tool-specific logic belongs in drivers (current first driver: `codex` smart fork), while tmux details stay hidden behind host primitives such as inspect / dispatch / wait / create-child.
- If Main later hosts a negotiator/harness agent, that agent should call the gateway, not script tmux directly.

## Promote To
- `docs/.bagakit/memory/decision-session-runtime-gateway.md` (curated), or
- `docs/<type>-<topic>.md` (normative/deep guide)
