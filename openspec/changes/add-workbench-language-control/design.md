## Context
Workbench already has a stronger built-in language mapping and a small custom Monaco registry, but it still stops one layer too early.

The missing layer is not “more file extension heuristics”.
The missing layer is one explicit language decision system with product-grade ownership:
- built-in detection for common cases,
- project policy for repo conventions,
- local manual override for the last mile.

Without that system, the product keeps drifting toward the wrong implementation shape:
- more hard-coded branches in UI components,
- more special-case filename logic with no authoritative chain,
- more temptation to treat “set editor language” as the same thing as “this file is safe to edit”.

## Goals / Non-Goals
- Goals:
  - Keep one SSOT for supported Workbench language ids and override rule matching.
  - Let repositories declare Workbench-specific language rules through a project-owned config seam.
  - Let users correct the current file language locally without mutating repo config implicitly.
  - Keep the Workbench language control visually integrated with the existing footer/tooling instead of adding a clumsy separate settings view.
- Non-Goals:
  - Add TextMate grammar loading in this slice.
  - Add tree-sitter parsing in this slice.
  - Add LSP semantic tokens in this slice.
  - Turn language override into a generic binary/unknown-file bypass.

## Decisions
- Decision: Separate secure-kind detection from language selection.
  - Why: “can this file be edited safely” and “which tokenizer should color it” are different questions. The language chain must not silently convert unknown/binary files into normal code editors.
- Decision: Use one explicit language decision chain.
  - Order:
    1. local manual override
    2. project policy rule
    3. built-in detection
  - Why: this keeps authority predictable and debuggable.
- Decision: Keep project policy repo-owned and local manual override window-owned.
  - Why: repo config expresses team/shared conventions; local override expresses one user’s corrective intent for the current environment. Mixing them would be easy and wrong.
- Decision: Keep the tokenizer provider layer Monaco-native for now, with bounded custom Monarch registrations where Monaco lacks a built-in language id.
  - Why: this delivers materially better coverage now while preserving a future seam for TextMate or semantic-token integration.
- Decision: Expose language control inside the Workbench itself.
  - Why: language choice is document-local editing context, not a global settings concern. The right place to show and correct it is next to the current file state.

## Alternatives Considered
- Keep adding more extension branches directly inside `WorkbenchPane` and `CodeWorkbenchView`.
  - Rejected because it spreads language authority across UI files and guarantees drift.
- Write manual override directly back into `.agency/workbench.yaml` from a single click.
  - Rejected because it turns a local corrective action into a repo mutation with poor intent transparency.
- Pull in TextMate or tree-sitter immediately.
  - Rejected because the product still lacks the simpler policy/override chain. Upgrading parser technology before fixing ownership would raise complexity without fixing the main design problem.
- Let project policy force unknown files into editable code tabs.
  - Rejected because it collapses tokenizer choice and edit-safety into one unsafe shortcut.

## Risks / Trade-offs
- Risk: a local override can be mistaken for a shared rule.
  - Mitigation: show the current language source (`Auto`, `Project Rule`, `Local Override`) inside the control.
- Risk: project policy matching could become another ad-hoc glob system.
  - Mitigation: define one shared matcher contract and reuse it everywhere.
- Risk: the UI could become cluttered if the language control reads like a settings drawer.
  - Mitigation: keep it compact, document-local, and subordinate to the footer status rail.

## Migration Plan
1. Create the OpenSpec delta and docs updates.
2. Introduce one shared Workbench language core and project policy loader.
3. Apply project policy to Workbench language resolution without changing secure-kind behavior.
4. Add the local override UI and persistence.
5. Add tests, update manual verification, and keep future parser/provider expansion explicitly out of this slice.

## Open Questions
- Whether future repo-owned policy should also support explicit tokenizer-provider preference (`TextMate`, `tree-sitter`, `semantic tokens`) once those layers exist.
