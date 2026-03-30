# Reconnect Playbook

This reference focuses on reconnect, remount, and reattach failures.

## 1. Symptom Splitter

| Symptom | Most likely layer | First question |
| --- | --- | --- |
| Terminal becomes visible again but typing does nothing | Universal lifecycle, input pipeline, or application-owned remount timing | Which exact owner currently handles DOM focus, xterm input callbacks, and mount ownership? |
| Reconnect is slow before first useful frame | Backend-adapter or output pipeline | Is replay large, duplicated, or blocked behind batching and resize churn? |
| Screen contains old content plus a fresh replay | Reconnect lifecycle | Does the backend replay enough state to justify clearing or resetting the frontend first? |
| Programmatic send works but human typing fails | Input pipeline | Is the human path gated or intercepted? |
| Human typing works but programmatic send does not confirm | Backend-adapter transport semantics | Is the failure really confirm-key semantics, or is it CR/LF, bracketed paste, cooked/raw mode, keypad mode, key-table routing, or target-TUI binding mismatch? |
| Typing and output are fine, but cols/rows or TUI layout corrupt after reconnect | Reconnect lifecycle or resize ownership | Which object currently owns frontend `fit()` or resize observation, and which path currently owns backend resize propagation? |

### Protocol-Space Discriminator For Programmatic Dispatch
Before blaming a missing confirm key, classify the failure:
- If the target tool receives the body text but does not execute, suspect confirm-key or target-binding semantics.
- If the target tool receives malformed text, suspect CR/LF handling, bracketed paste, cooked/raw mode, or transport translation.
- If the target tool only fails in one terminal mode, suspect keypad mode, key tables, or mode-sensitive bindings.

Handoff rule:
- If lifecycle ownership is already correct and the remaining bug lives entirely in transport or TUI protocol semantics, hand off to a backend-adapter-specific reference or the backend adapter source itself instead of expanding lifecycle fixes further.

## 2. Fault Models

Ownership-family note:
- Fault Models A, D, and E are one reconnect family: stale per-mount ownership survives reconnect.
- The signal differs by pipeline: input, output, or resize.

### Fault Model A: Stale Input Callback After Remount
Pattern:
- terminal instance or terminal entry is cached
- the code subscribes once to terminal input
- the callback closes over mount-local state or refs
- the UI remounts or reconnects
- the cached subscription still points to the old mount
- an old mount can still clear or replace the live handler unless ownership is generation-guarded

Observed result:
- the terminal is visible
- output may continue to arrive
- local typing is ignored or gated by stale readiness

Preferred fix:
- keep one stable subscription and replace the mutable handler on remount, with an ownership or generation guard
- or dispose and recreate the subscription when ownership changes
- make unmount cleanup prove that an old owner cannot clear the live owner's handler

### Fault Model B: Uncleared Buffer Before Attach Replay
Pattern:
- reconnect attaches to an already-running backend session
- the backend replays the current screen
- the frontend keeps stale pre-detach buffer state

Observed result:
- reconnect feels slow because the user sees stale content plus replay
- the screen may look duplicated or visually “heavier” than a clean replay

Preferred fix:
- only clear or reset frontend terminal state if the backend replay contract is strong enough to reconstruct the required state
- choose between `clear()` and `reset()` deliberately:
  - `clear()` removes scrollback but does not reset parser-visible modes
  - `reset()` wipes far more state and is only safe when the backend will reconstruct that state

### Fault Model C: Performance Optimization Masks Correctness Regression
Pattern:
- frame batching, delayed resize, or deferred refresh improves steady-state output
- reconnect path was not validated

Observed result:
- first frame arrives late
- replay appears sluggish
- a hidden lifecycle bug is blamed on the optimization

Preferred fix:
- test reconnect and remount separately from steady-state throughput
- only keep the optimization if reconnect remains correct

### Fault Model D: Stale Output Listener After Remount
Pattern:
- the backend output path subscribes per mount or per reconnect
- an old listener survives
- a cached terminal instance receives the same chunk more than once, or receives chunks from the wrong owner

Observed result:
- duplicated output
- replay that looks “slow” because the same screen is written multiple times
- reconnect that appears visually correct at first glance but keeps corrupting state afterward

Preferred fix:
- make output listener ownership explicit
- prove that old listeners are removed on remount and reconnect
- verify that each backend chunk is written exactly once

### Fault Model E: Stale Resize Owner After Remount
Pattern:
- resize observation or `fit()` ownership is registered per mount
- backend resize propagation is also registered per mount or reconnect
- an old resize owner survives

Observed result:
- cols and rows drift after reconnect
- TUI layout breaks without obvious replay duplication
- the terminal appears attached, but layout corruption persists

Preferred fix:
- make resize ownership explicit on both frontend and backend resize paths
- prove that there is exactly one live resize owner and one resize stream after reconnect
- test reconnect while resize activity is happening

## 3. Verification Grid

### Human typing
Verify:
- initial mount typing works
- hidden -> visible typing works
- disconnect -> reconnect typing works
- remount with the same cached terminal object but a different mount owner or readiness ref typing works
- binary-input paths still work if the adapter uses `onBinary` for mouse reporting or similar flows
- IME and composition still work
- custom key handlers and paste handlers still fire exactly once

### Programmatic dispatch
Verify:
- text appears in the terminal or target tool
- the confirm action actually submits
- dispatch and human typing still behave independently
- CR vs LF handling is correct
- bracketed paste behavior is correct when relevant
- keypad or key-table mode does not change the result unexpectedly

### Replay and screen correctness
Verify:
- reconnect shows exactly one current screen
- stale screen content does not remain beneath the replay
- resize after reconnect does not trigger another duplicate paint
- each backend chunk is written exactly once after reconnect
- alt-screen applications still look correct
- cursor position and cursor style are still correct
- bracketed paste, mouse reporting, scroll region, and title or OSC state still behave correctly if the adapter depends on them
- addon or frontend state such as decorations, markers, link state, search state, renderer disposables, and per-mount DOM hooks is still coherent after reconnect

Inspect addon or frontend state only when:
- lifecycle ownership already looks correct
- output is written once
- replay is no longer obviously duplicated
- but reconnect still corrupts derived UI behavior such as links, markers, search state, or addon-owned decorations

### Performance
Verify:
- high-output steady state
- reconnect after long-running session
- reconnect while the terminal is hidden and then shown
- reconnect while resize and refresh activity are also happening

## 4. Anti-Patterns

Do not:
- assume visible output means the input path is healthy
- assume a reconnect bug is caused by the latest performance change without checking lifecycle ownership
- use pronouns like “it” in debugging notes when multiple callbacks or refs exist
- merge human typing and programmatic dispatch into one fuzzy “send bytes” model
- assume stale `onData` ownership is the only dead-input failure mode; also inspect focus, `disableStdin`, `onKey`, custom key handlers, addon listeners, composition state, and paste routing
- assume `clear()` or `reset()` can repair addon or frontend state that actually requires listener disposal, addon reset, or mount cleanup

## 5. Minimal Incident Record Template

When a reconnect bug is fixed, capture a short project memory entry with:
- which generic fault model the incident instantiates
- symptom
- exact failing owner object
- exact fix
- why the bug survived initial intuition
- which regression test now protects the path

Keep that project memory entry specific. Keep this skill generic.
