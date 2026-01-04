# Change: Action Sheet Management

## Why
Action Sheets need lifecycle controls so users can retire or remove completed runs without losing active visibility.

## What Changes
- Add Archive and Delete actions for Action Sheets.
- Archived Action Sheets are hidden by default and can be viewed on demand.
- Delete removes the Action Sheet data from disk with confirmation.

## Impact
- Affected spec: agency-editor
- Affected UI: Action Sheets panel + embedded status panels
- Affected services: actionSheets (list/filter/archive/delete)
