## 1. Implementation
- [x] 1.1 Add Action Sheets entry in activity bar below Agent Cells.
- [x] 1.2 Move Action Sheets view to left/right panel layout matching other primary views.
- [x] 1.3 Refactor Action Sheets UI into embeddable panel component.
- [x] 1.4 Embed compact Action Sheet panel in Promote modal with session jump.
- [x] 1.5 Embed compact Action Sheet panel in Draft detail with retry + session jump.

## 2. Validation
- [x] 2.1 Update specs and validate with `openspec validate --strict`.

## 3. Notes
- Keep Tailwind calc spacing valid for min-height layouts (use `calc(100% - 200px)` formatting).
- Use real newlines in textarea placeholders (avoid HTML entities inside JSX strings).
- Preserve keyboard accessibility for check toggles (prefer buttons over div click targets).
