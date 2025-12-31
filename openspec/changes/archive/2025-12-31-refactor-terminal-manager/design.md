# Design: Terminal Manager and Persistent Surfaces

## Goals
- Keep one xterm instance per session for the lifetime of that session.
- Avoid xterm initialization in zero-sized containers.
- Make tab switching and state changes idempotent and resilient to rapid toggling.

## Non-Goals
- Change tmux session semantics or backend session registry format.
- Add new UI features beyond robustness and lifecycle correctness.

## Architecture Overview
- **TerminalManager (renderer)**: Singleton-like module keyed by `{cellId, sessionId}`.
  - Owns `xterm` and `FitAddon` instances.
  - Exposes `ensureStarted`, `attach`, `detach`, `dispose`, `resize`.
- **TerminalSurface**: Lightweight component that renders an absolutely positioned container per session.
  - Uses `visibility`/`opacity` to hide inactive sessions while keeping dimensions.
  - Triggers `fit/refresh` on activation.
- **TerminalPane**: Becomes a coordinator that requests the manager to attach/detach and listens for data events.

## Lifecycle
1. On session open, TerminalManager creates xterm once and attaches it to the active container.
2. On tab switch, the active surface becomes visible and requests `fit/refresh`.
3. On session close/terminate, TerminalManager disposes the xterm and removes listeners.

## Error Handling
- Terminal start is idempotent; repeated starts are ignored after first success.
- Resize uses the existing guardrails and adds an activation refresh pass.

## Data Flow
- Input/output remains via `window.agency` IPC events.
- Renderer owns display and attach/detach only; tmux session management stays in main.
