# Change: Update HIL Promote to quick-first unified send interaction

## Why
Agency now has multiple “select content and send to Agent” entry points (Promote, Explorer selection send). They should behave as one delivery system with different source adapters, not separate mental models.

The default path must stay lightweight like send, while preserving optional strict audit/gated behavior.

## What Changes
- Keep Promote quick-first behavior and extend interaction to unified send semantics across:
  - Promote source (`source=promote`)
  - Explorer selection source (`source=explorer`)
- Use one delivery envelope with explicit source and mode tags in payload metadata.
- Keep `Quick` as default mode for both sources.
- Keep `Gated` as optional advanced mode.
- For quick mode, keep immediate consumption policy after dispatch ACK.
- Show source/mode-aware execution badges and expose unified delivery timeline entry points.
- Preserve Action Sheet linkage only for gated runs.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/App.tsx`
  - `apps/editor/renderer/src/components/hil/HilCommentsPanel.tsx`
  - `apps/editor/renderer/src/components/explorer/ExplorerFooter.tsx`
  - `apps/editor/renderer/src/utils/hilPromotePrompt.ts`
  - `apps/editor/renderer/src/hooks/useActionSheets.ts`
  - `apps/editor/renderer/src/services/agencyBridge.ts`
- Dependency:
  - Uses package/facade foundation from `add-agency-data-promote-system-foundation`
- Risk:
  - Multi-entry unification can introduce UI inconsistency if partial migration ships.
- Mitigation:
  - Switch both Promote and Explorer to the same delivery API in one interaction change.
