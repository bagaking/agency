## Context
Terminal output includes paths like `docs/card_contract_draft.md` or `docs/notes-terminal-keyboard.md:11` embedded within punctuation. Users want Cmd+Click navigation without manual cleanup. Separately, teams need a session-native reply workflow that captures selected text and enables rich markdown responses that can be recorded or routed to other sessions without coupling to CLI input.

## Goals / Non-Goals
- Goals:
  - Cmd+Click opens files from terminal output.
  - Detect relative/absolute paths with optional `:line[:col]` suffix.
  - Strip trailing punctuation (including Chinese punctuation) from link targets.
  - Cleanup link UI when pointer leaves selection.
  - Add a `reply` memo type for session-side replies.
  - Provide a rich markdown editor for reply input.
  - Support record-only or record+send flows with per-session reply threads.
  - Capture reply metadata (source selection, session info, send targets) as assets.
- Non-Goals:
  - Full regex-highlight for all URLs.
  - Automatic click without modifier.
  - Parsing inside binary blobs or multi-line wrapped paths beyond a single line.
  - Replacing memo inbox editing UX for existing memo types.
  - Building a full chat system with real-time typing indicators.

## Decisions
- Decision: Use xterm link provider to detect path ranges in the active line.
  - Rationale: fits xterm’s built-in linkification and avoids DOM hacks.
- Decision: Open in workbench with resolved worktree path; line/column parsed from `:line[:col]`.
  - Rationale: consistent with existing workbench open flow.
- Decision: Path extraction excludes surrounding punctuation (e.g., `。`, `，`, `)` , `]`, `}` , `.`) unless part of filename.
  - Rationale: matches real terminal text like “行为说明。docs/notes-terminal-keyboard.md:11”.
- Decision: Name the mechanism **Session Reply Relay** to emphasize cross-agent communication, CLI-decoupled input, and asset capture.
  - Rationale: communicates “reply” semantics without implying a chat protocol.
- Decision: Replies are stored as memo kind `reply` and are **not editable in Memo view**; creation lives in Session UI.
  - Rationale: keep memo view clean and prevent cross-context edits.
- Decision: Reply editor lives in a right-side session panel, default tab `Reply`.
  - Rationale: keeps replies adjacent to the terminal context.
- Decision: Reply actions: `Record`, `Send to Current`, `Send to Other`.
  - Rationale: matches user intent and keeps routing explicit.
- Decision: Send results render as chat-like cards with target avatar and jump links.
  - Rationale: preserves traceability and allows quick navigation to destinations.

## Detection Rules (initial)
- Accept paths containing `/` and a filename with extension (e.g., `.md`, `.ts`, `.jsx`, `.json`).
- Optional suffix `:line` or `:line:col` (1-based).
- Trim trailing punctuation: `. , ; : ! ? ) ] } 。 ， ； ： ！ ？`.
- Do not include leading punctuation; start at the first path character.

## Reply Data Model (initial)
- kind: `reply`
- body: markdown text
- meta:
  - source: `terminal-selection` or `reply-panel`
  - selection:
    - text (optional)
    - timeTag (selection time or fixed tag if no selection)
    - site
    - query
  - session:
    - cellId, cellName, sessionId, sessionName
  - sent:
    - targets (list of { type: current|other|record, cellId?, sessionId?, at })
    - status (success/failed)

## UI Notes
- Reply panel uses a compact header (session info) + markdown editor body + action row.
- Action row is sticky and sits below the editor; per-session threads render above the editor.
- Send-result cards: left avatar; if target != current agent add small link icon next to name and support click jump. For record-only, show memo icon and link to the memo item.

## Docs
- Update `docs/notes-session-management.md` to describe Session Reply Relay and reply memo semantics.

## Risks / Trade-offs
- Some false positives on strings that look like paths.
- Some valid paths without extensions may be missed initially.

## Migration
- No data migration.
- Update terminal UX notes if necessary.
