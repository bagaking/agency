# Change: Action Sheet Management

## Why
Action Sheets need lifecycle controls so users can retire or remove completed runs without losing active visibility.

## What Changes
- Add Archive and Delete actions for Action Sheets.
- Archived Action Sheets are hidden by default and can be viewed on demand.
- Delete removes the Action Sheet data from disk with confirmation.
- Introduce a global modal system with notice/confirm tiers and adopt it for Action Sheet deletes.
- Fix draft archive updates and add Draft delete with confirmation in Memo.

## Impact
- Affected spec: agency-editor
- Affected UI: Action Sheets panel + embedded status panels
- Affected services: actionSheets (list/filter/archive/delete)
