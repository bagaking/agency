## 1. Spec and Rules
- [x] 1.1 Add/modify spec text so governed repo-authored source is TypeScript-only.
- [x] 1.2 Document governed-source roots, exclusions, and the "no checked-in JS" rule in project docs/norms.

## 2. Validation Guardrail
- [x] 2.1 Add a repo-local validator that fails on repo-authored `.js`/`.cjs`/`.mjs` in governed source paths.
- [x] 2.2 Wire the validator into the normal developer validation path.

## 3. Harness Migration
- [x] 3.1 Migrate `apps/editor/electron/services/mainAgentHarness.js` to TypeScript.
- [x] 3.2 Migrate `apps/editor/electron/services/mainAgentHarness/**/*.js` to TypeScript.
- [x] 3.3 Keep CLI/provider/runtime tests green after the migration.

## 4. Remaining Governed JS Migration
- [x] 4.1 Migrate remaining repo-authored JS/CJS/MJS under `apps/editor/`, `pkg/`, and `scripts/` or replace them with TS/declarative equivalents.
- [x] 4.2 Tighten compiler/build configuration so Electron source no longer relies on `allowJs`.

## 5. Final Verification
- [x] 5.1 Run governed-source validator and confirm zero violations.
- [x] 5.2 Run targeted Electron/unit/build validation after migration.
- [x] 5.3 Update manual/test docs and repo instructions to reflect the final rule.
