# Change: Settings Dashboard and Activity Home Shortcut

## Why
- The activity bar logo reads as a home affordance but currently has no action.
- The Settings view lacks actionable content for project-level navigation.
- Users need a single place to see project context and jump into configuration views.

## What Changes
- Make the activity bar logo act as a home shortcut to the Agent Cells view.
- Evolve the Settings view into a dashboard with project summary, recent projects, and entry cards that link to Actions, Gates, and Softlinks.
- Keep detailed editing in Hierarchy; Settings remains an index/overview.

## Impact
- Affected specs: `agency-editor`
- Affected code: renderer activity bar, settings view, app layout wiring, and UI tests.
