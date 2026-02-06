# Change: Add Cmd+Click terminal path navigation

## Why
Terminal output often contains file paths. Users need a fast way to jump to referenced files (including line numbers) without copy/paste, and path detection must handle punctuation and Chinese sentence separators. Users also need a session-native “reply” workflow that captures selections, supports rich markdown input, and records communication as durable assets without coupling to CLI input.

## What Changes
- Add Cmd+Click navigation for file paths in terminal output.
- Support absolute and worktree-relative paths with optional line/column suffixes.
- Trim trailing punctuation (including Chinese `。`/`，`) from detected paths.
- Resolve paths relative to the active session’s worktree and open in the workbench.
- Add a new memo type `reply` that is created from session selections or a session-side reply panel.
- Provide a rich markdown editor for replies and actions to record/send to current/other sessions.
- Display per-session reply threads and send-result cards with navigation affordances.

## Impact
- Affected specs: `openspec/specs/agency-editor/spec.md`
- Affected code: terminal rendering/link detection, workbench open-file flow, session UI panels, memo storage, terminal UX docs.
