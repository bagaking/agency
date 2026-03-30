# Xterm Boundary Map

This reference exists to stop a common failure mode: application teams jump straight into local app code before they have separated universal xterm behavior from backend-adapter behavior.

## 1. Ownership Model

### Universal xterm / React layer
This layer owns:
- terminal instance creation
- DOM attachment
- focus
- keyboard and wheel interception
- selection state
- local `onData`, `onBinary`, and `write` integration
- ref and lifecycle correctness across mount and remount

This layer does **not** own:
- PTY or tmux session state
- application command routing
- application-specific session metadata

Typical files in any codebase:
- terminal manager
- React component or hook that mounts the terminal
- keyboard and wheel handler modules

### Backend-adapter layer
This layer owns:
- PTY, tmux, or WebSocket session attachment
- reconnect and resume semantics
- attach replay
- backend resize propagation
- adapter-specific confirm keys or send-key APIs
- transport or protocol semantics below the xterm lifecycle layer
- backend readiness state

This layer does **not** own:
- xterm selection UX
- general React ref correctness
- application-level navigation choices

Typical files in any codebase:
- PTY service
- tmux helper
- WebSocket server/client adapter
- host bridge or IPC handler

### Application orchestration layer
This layer owns:
- which surface opens the terminal
- which application action sends text
- which application workflow switches sessions
- application state machines and panel rules
- remount timing
- ownership transfer between hidden and visible mounts
- tab, pane, or window orchestration that can manufacture stale lifecycle state

Typical files in any codebase:
- session or tab coordinator
- pane or window manager
- view-level state machine
- route or selection ownership store

Important:
- A stale-handler or stale-listener failure is still a universal lifecycle bug until the xterm integration contract is proven correct.
- The application orchestration layer matters because it may create the remount or ownership-transfer timing that exposes the bug.

## 2. Diagnostic Order

Use this order when the terminal misbehaves:

1. **Container correctness**
   Confirm the terminal instance has a real container with non-zero dimensions.
2. **Lifecycle correctness**
   Confirm the current mount owns the active refs, callbacks, and readiness flags.
3. **Input correctness**
   Confirm a human or binary input event reaches xterm and reaches the current input callback.
4. **Output correctness**
   Confirm backend output reaches the current output callback, is written once, and is not duplicated by stale listeners.
5. **Adapter correctness**
   Confirm reconnect, replay, resize, or send-key logic matches backend semantics.
6. **Application orchestration correctness**
   Inspect local routing, timing, and ownership transfer if the application orchestration layer is what creates the remount or visibility transition.

## 3. Common Misclassification Errors

### Error A: Treating dead input as a backend bug
The visible terminal may already be attached correctly.
The real bug may be a stale mount-local closure, a stale readiness gate in the frontend, or application-owned remount timing that hands ownership to the wrong mount.

### Error B: Treating replay duplication as a paint-performance bug
The real bug may be an uncleared terminal buffer before backend attach replay.

### Error C: Treating programmatic send regressions as keyboard regressions
Human typing and programmatic dispatch use different contracts. A fix for one can break the other.

### Error D: Treating an application-routing regression as an xterm regression
If the raw terminal accepts bytes but an application action no longer triggers the right send path, the bug is already above xterm.

## 4. Generic Rules That Survive Across Codebases

### Cached terminal objects need callback freshness
If a codebase caches terminal instances across remounts, the first subscription is rarely enough forever.

Safer patterns:
- keep the subscription stable and update a mutable handler
- or dispose and rebind the subscription on remount

Risky pattern:
- subscribe once with a callback that closes over mount-local refs or state

### Reconnect is a lifecycle event, not just another output burst
When reconnect replays the current screen, treat the replay as a fresh view of backend state.

Questions to ask:
- does the backend replay enough state to justify any frontend buffer reset?
- if the frontend wants to clear stale state, is `clear()` sufficient, or would `reset()` destroy modes that the backend does not replay?
- is a cached preview also being restored?
- does resize happen before or after replay?

### Performance changes need lifecycle regression tests
Frame batching, delayed resize, or deferred refresh can look safe under steady output but fail during reconnect and remount.

## 5. Escalation Rule

Before escalating, answer:
- Which object owns the current terminal instance?
- Which callback currently receives human typing?
- Which callback currently receives binary input if the adapter uses binary input
- Which callback currently receives backend output?
- Whether reconnect replays the current screen
- Whether the backend replays enough terminal state to justify any frontend buffer reset

Then decide whether application timing already belongs in the active root-cause set.

If any answer is missing, stay grounded in the universal or adapter layers. Do not ignore application timing if application timing is the mechanism that creates the stale state.
