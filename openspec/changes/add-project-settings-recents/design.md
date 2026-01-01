## Context
The editor currently relies on ad-hoc project selection from empty states, and the Settings view does not provide a working project flow. Recent project recall is missing, making it hard to resume work after closing the app.

## Goals
- Provide a dedicated Project settings view that can open a repository.
- Maintain a recent projects list with lightweight metadata.
- Surface recent projects in the sidebar when no project is selected.

## Decisions
- Persist recent projects in UI state (userData) to keep the data local and simple.
- Show recent projects in both Settings and the left sidebar empty state to reduce dead ends.
- Store name/path/lastOpenedAt as the minimum usable metadata.
- Cap recent projects to the latest 8 entries to keep the list focused.

## Risks
- Paths can become invalid; the UI must handle missing directories gracefully.

## Open Questions
- None.
