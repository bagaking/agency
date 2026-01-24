## Context
The dev renderer URL is currently hard-coded to port 5173 in scripts, tests, and Electron startup. This causes collisions and prevents flexible local dev setup.

## Goals / Non-Goals
- Goals:
  - Avoid port 5173 as the default dev port.
  - Auto-discover the active dev server port.
  - Allow packaged apps to load a dev renderer URL when explicitly configured.
- Non-Goals:
  - Changing the production renderer loading flow (packaged still defaults to bundled HTML).
  - Adding new external dependencies unless required.

## Decisions
- Decision: Use a renderer port discovery mechanism.
  - Option A: Vite writes a port file on start; Electron reads it.
  - Option B: Electron scans a predefined port range to locate the dev server.
  - Preferred: Port file (deterministic, avoids scan delay).

- Decision: Use a non-5173 default port seed.
  - Example: 5174 or a project-specific port range.

- Decision: Allow explicit renderer URL overrides even when packaged.
  - Guarded by a dedicated env var to avoid accidental production use.

## Risks / Trade-offs
- Risk: Port discovery adds startup complexity.
  - Mitigation: fallback to env var override; log discovery steps.

## Migration Plan
- Update scripts/tests to stop assuming 5173.
- If port file is missing, fall back to configured default and show a clear log message.

## Open Questions
- Exact port range to use as fallback.
- Where to store the port file (repo root vs temp directory).
