# Change: Enforce TypeScript-only repo-authored source

## Why
Agency's desktop editor codebase now mixes TypeScript with a growing CommonJS/JavaScript cluster in the Electron main-process orchestration layer. That split is no longer acceptable:
- it weakens type safety exactly in the most stateful and failure-prone host code;
- it makes refactors across renderer/main/shared contracts harder to audit;
- it leaves the "no JS in project source" goal as an informal preference instead of a build-enforced rule.

The project needs one explicit end-state:
- repo-authored source is TypeScript-first and TypeScript-only in governed code areas;
- JavaScript/CJS/MJS survives only as generated output, vendored assets, or explicitly documented external/tool artifacts.

## What Changes
- Migrate the remaining repo-authored JavaScript/CJS/MJS implementation under governed project source roots to TypeScript or another non-JS declarative format when appropriate.
- Remove the Electron-main allowance for checked-in `.js` source and tighten the build so governed source compiles from TypeScript only.
- Add a project-level validation rule that fails when new repo-authored JavaScript appears in governed source paths.
- Update project norms/docs so "no JS in governed source" becomes a recoverable repo rule rather than transient chat context.
- Keep generated build output and third-party/vendor files out of the governed set.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/services/mainAgentHarness/**/*.js`
  - `apps/editor/electron/services/mainAgentHarness.js`
  - remaining repo-authored JS/CJS/MJS under `apps/editor/`, `pkg/`, and `scripts/`
  - Electron build/config scripts and TypeScript compiler settings
  - project validation/docs (`docs/norms-dev.md`, `docs/notes-reusable-items-coding.md`, `AGENTS.md`)
- Risks:
  - migrating the Harness/runtime path to TypeScript can break Electron main boot, CLI wrappers, or packaging hooks if module boundaries drift;
  - over-broad "no JS" enforcement can accidentally catch generated or vendored files and make local workflows brittle.
- Mitigation:
  - define a narrow governed-source allowlist/denylist first;
  - land the migration in coherent slices with build + targeted unit coverage after each slice;
  - keep generated output explicitly excluded from the source-policy validator.
