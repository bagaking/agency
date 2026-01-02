# Change: Settings Dashboard and Activity Home Shortcut

## Why
- The activity bar logo reads as a home affordance but currently has no action.
- The Settings view lacks actionable content for project-level navigation.
- Users need a single place to see project context and jump into configuration views.

## What Changes
- Make the activity bar logo act as a home shortcut to the Agent Cells view.
- Evolve the Settings view into a dashboard with project summary, recent projects, and entry cards that link to Actions, Gates, and Softlinks.
- Keep detailed editing in Hierarchy; Settings remains an index/overview.
- Remove redundant Agent Cells activity bar entry to simplify navigation.
- Add Explorer copy/cut/paste support for files and folders.
- Make project selection window-local so new windows open without inheriting another window's project.
- Allow Explorer to paste files or screenshots from the system clipboard with conflict-safe renaming.
- Allow Terminal paste to materialize clipboard files/images into `.agency/tmp` and insert relative paths.
- Add paste-as-Markdown support that captures clipboard content into temporary markdown files.
- Allow submitting line comments with optional TODO intent that are stored per worktree.

## Impact
- Affected specs: `agency-editor`
- Affected code: renderer activity bar, settings view, explorer interactions, project selection IPC, and UI tests.
