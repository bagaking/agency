# Change: HIL Notes Drawer and Memo Center

## Why
HIL (human-in-loop) artifacts such as comments and memos are scattered across temporary storage and inline views, making them hard to recover, manage, and evolve into structured deliverables.
A dedicated HIL store and UI center improves discoverability, supports future expansion, and keeps review artifacts mergeable per worktree.

## What Changes
- Add a worktree-scoped HIL index stored under `.agency/hil/` to consolidate comments, memos, and drafts.
- Introduce a global right-side drawer that hosts HIL panels (initially comments), default-collapsed but auto-opens when comment workflows are invoked.
- Add a Memo navigation entry to manage HIL artifacts across the worktree.
- Support promoting a comment into a draft HIL item without directly modifying any spec system.
- Provide a bulk promote flow for pending comments with a required description and context preview.
- Migrate legacy comment storage into the HIL index (non-destructive).

## Impact
- Affected spec: `agency-editor`
- Affected UI areas: Workbench, Activity bar, Global layout/drawer
- Affected data storage: `.agency/hil/index-<worktree>.yaml`
