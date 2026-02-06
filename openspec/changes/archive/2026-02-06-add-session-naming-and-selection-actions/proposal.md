# Change: Add session auto-naming rules and selection actions

## Why
Users need consistent, configurable session naming and reliable terminal text selection to copy or forward content between sessions. Current selection clears on mouse release, and naming is manual or generic.

## What Changes
- Add configurable auto-naming rules for new sessions with placeholders (time/sequence/name lists/context).
- Resolve naming rules by Global -> Project -> Agent scope with a safe fallback.
- Persist and reuse sequence counters for absolute/active/profile/cell numbering.
- Keep terminal selection after mouse release, enable Cmd+C copy when a selection exists.
- Show a floating selection action bar with Copy and Send-to-Session.

## Impact
- Affected specs: `openspec/specs/agency-editor/spec.md`
- Affected code: session creation flow, session registry, terminal UI, settings storage, session map/menus.
