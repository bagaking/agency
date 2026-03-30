---
title: Terminal reconnect can reopen with stale xterm input handler
kind: gotcha
tags:
  - gotcha
  - terminal
  - reconnect
  - xterm
sources:
  - apps/editor/renderer/src/terminal/terminalManager.ts
  - apps/editor/renderer/src/components/terminal/useTerminalRuntimeEffect.ts
  - apps/editor/renderer/src/components/TerminalPane.tsx
created: 2026-03-31
confidence: high
updated: 2026-03-31
---

## What
- Agency caches a renderer-side xterm terminal entry per `cellId:sessionId`.
- A reconnect or remount bug can happen even when tmux attach succeeds, because the renderer may still be using a stale input callback from an earlier mount.
- This incident is Agency's concrete instance of **Fault Model A: Stale Input Callback After Remount** from `bagaking-xterm-skills/references/reconnect-playbook.md`.

## Why It Failed
- `terminalManager.ensureInputListener` originally subscribed to xterm `onData` only once.
- The original callback closed over the first mount's `sessionReadyRef`.
- Later remounts reused the cached terminal entry and its existing `inputDisposable`, so the callback never changed owners.
- Result: the terminal reopened and rendered output, but local typing was ignored because the old callback still saw the old mount as not ready.

## Companion Reconnect Gotcha
- Reconnect through tmux can replay the current screen.
- In Agency, replay duplication became a companion symptom because stale frontend state and attach replay could stack visually.
- The correct action is conditional: choose `clear()`, `reset()`, or no frontend wipe only after checking what the attach path actually replays.

## Fix Pattern
- Keep one xterm `onData` subscription, but route the subscription through a mutable `inputHandler` that is refreshed on remount.
- Clear the mutable handler on unmount/dispose, and make cleanup respect current ownership so an old mount cannot wipe the live mount's handler.
- Only reset frontend terminal state before reconnect when the attach path is known to replay enough state for Agency's use case; otherwise a reset can hide duplication while breaking terminal modes.

## Applies When
- The codebase caches terminal instances or terminal entries across remounts.
- The reconnect path can reopen a live backend session instead of creating a brand-new terminal every time.
- The backend can replay current screen state on attach.
