---
name: bagaking-xterm-skills
description: Use when debugging or hardening xterm-based terminal lifecycle issues, especially reconnect/remount behavior, cached terminal instances, keyboard or wheel ownership, PTY or tmux adapters, and input-fidelity regressions.
---

# Bagaking Xterm Skills

## Scope
This skill captures reusable xterm experience.

This skill is intentionally generic:
- Keep the core skill about xterm, React, terminal lifecycle, and backend-adapter boundaries.
- Keep project-specific file maps, product nouns, and one-off incidents in project memory, not in the skill body.

Use this skill first when the failure smells like:
- terminal reconnect or remount
- visible terminal but dead input
- duplicate or stale screen after reattach
- modifier-key or wheel handling regressions
- confusion between local typing and programmatic dispatch
- performance optimizations that may have changed terminal correctness

Do **not** start with this skill when the task is mainly:
- choosing xterm addons or renderer options
- learning the xterm API from scratch
- building a simple local-only terminal with no reconnect/remount semantics
- making broad architecture decisions unrelated to lifecycle bugs

For those cases, start with `xterm-js`. This skill is the narrower lifecycle and fault-model playbook.

## Use Order
1. If the task is general xterm API or greenfield design work, use `xterm-js` instead.
2. Read `references/boundary-map.md` to classify the failure.
3. If the symptom involves reconnect, remount, reattach, dead input, or replay weirdness, read `references/reconnect-playbook.md`.
4. If the repository keeps local incident memory, search that memory before coding so you can map the generic fault model to the local codebase.

## Canonical Terms
Use explicit names. Avoid pronouns like "it" when multiple moving parts exist.

- **Terminal instance**: the xterm object.
- **Terminal entry**: a cached holder that owns the terminal instance plus local metadata. Some codebases do not have this layer.
- **Input pipeline**: keyboard, paste, or binary-input events moving from DOM -> xterm -> application callback -> backend.
- **Output pipeline**: backend output moving from adapter -> application callback -> xterm write.
- **Reconnect**: a new frontend attachment to an existing backend session.
- **Attach replay**: backend-driven repaint of current screen content after reconnect.
- **Programmatic dispatch**: application-initiated text or key delivery, not human typing.

## High-Risk Patterns
These are not universal invariants. These are the patterns most likely to create lifecycle bugs:

1. A cached terminal instance or terminal entry keeps a subscription that still points at an old mount owner.
2. A reconnect path assumes the frontend can blindly `clear()` or `reset()` before replay without checking whether the backend truly replays the full screen and terminal state.
3. Human typing and programmatic dispatch are debugged as if they were the same path.
4. A cached terminal instance keeps stale output-listener or resize-owner state after remount.
5. A performance optimization is accepted without reconnect, remount, and high-output regression checks.
6. The debugging notes use vague pronouns instead of naming the exact owner object and transition.

Read the references for the detailed symptom router, fault models, and validation bar.

## Implementation Checklist
1. Classify the bug into universal xterm, backend-adapter, or application orchestration.
2. Write down the exact input, output, and resize pipelines with concrete owner names.
3. Identify the live input owner, live output listener, and live resize owner or stream after reconnect.
4. If terminal instances are cached, verify callback freshness and ownership transfer across remount.
5. If reconnect exists, verify what the backend actually replays before using `clear()` or `reset()`.
6. Test human typing separately from programmatic dispatch.
7. Test hidden -> visible, inactive -> active, and disconnect -> reconnect transitions.
8. Search local incident memory before writing a fix if the repository provides one.

## Progressive Disclosure
- `references/boundary-map.md`: ownership model, layer boundaries, escalation rules, and where application timing can still be the real root cause.
- `references/reconnect-playbook.md`: reconnect/remount symptom router, ownership-family fault models, anti-patterns, stronger verification steps, and backend-adapter handoff cues.
