# Change: Memo Capture Modes (Flash, Excerpt, Screenshot)

## Why
The Memo view is currently limited to listing HIL items and drafts. Users need fast capture modes for ideas, excerpts, and screenshots that can later be promoted into drafts alongside comments.

## What Changes
- Add memo capture modes in Memo view: Flash note, Excerpt, Screenshot.
- Store captured items as HIL `memo` entries with structured metadata for type/source/attachments.
- Allow memo items to be selected and promoted into drafts, just like comments.

## Impact
- Affected spec: agency-editor
- Affected UI areas: Memo view, HIL promote flow
- Affected data storage: `.agency/hil/index-<worktree>.yaml`, plus memo assets
