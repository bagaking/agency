## Context
Agency already binds each UI session to a tmux session, but lacks a UI affordance for remote continuation from mobile SSH clients.

## Goals / Non-Goals
- Goals:
  - Provide a one-click flow to copy a ready-to-run SSH + tmux attach command for a specific session.
  - Prefer Tailscale IP when available; otherwise fallback to LAN IPv4.
  - Auto-attempt SSH service enablement (best effort) when no listening port is found, then re-probe.
  - Return explicit readiness diagnostics so UI can show actionable feedback.
- Non-Goals:
  - Managing third-party tunnel provisioning (e.g., creating Tailscale auth, installing apps).
  - Persisting per-user remote login credentials in project config.
  - Multi-hop proxy orchestration.

## Decisions
- Decision: Add a dedicated service module `mobileSessionContinuation.ts` in Electron main.
  - Why: keeps `sessions.ts` from growing further and isolates OS/network probing complexity.
- Decision: Use a single IPC request-response shape (`sessions:continueOnMobile`) that returns command + diagnostics.
  - Why: renderer remains dumb and only handles copy + notices.
- Decision: Perform port discovery via candidate-port probing (`127.0.0.1:<port>`) and parse sshd config when available.
  - Why: avoids shelling out to platform-specific netstat output parsing as the primary path.
- Decision: Attempt non-interactive SSH service enablement (platform-aware) and surface manual command fallback.
  - Why: satisfies "统一打开 + 端口发现" while respecting privilege boundaries.

## Risks / Trade-offs
- Some hosts require admin password to enable SSH; non-interactive attempts can fail.
  - Mitigation: include explicit manual command in payload and warning text.
- LAN host discovery may return multiple interfaces.
  - Mitigation: deterministic host priority (tailscale > private LAN > hostname).
- Session may become stale between command generation and mobile attach.
  - Mitigation: require live tmux session at generation time and surface stale errors early.

## Migration Plan
1. Add backend service and IPC surface.
2. Add renderer bridge and session hook action.
3. Add context-menu entry + copy/notice UX.
4. Update docs/spec and validate.

## Open Questions
- Future enhancement: Should command format be user-configurable (e.g., `mosh`, custom ssh flags)? Out of this change.
