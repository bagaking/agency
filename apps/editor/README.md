# Agency Editor

## Scope & Stack

- v0.2 targets macOS first while keeping a path open for cross-platform support.
- Electron + React + Tailwind CSS + Rive (animation placeholder).
- Embedded terminal via xterm.js and node-pty.

## Cell Lifecycle Files

- Each worktree contains `.agency/cell-<worktree-name>.yaml`.
- The editor reads and updates lifecycle state through this file.
- Validation is minimal (temporary) and surfaces warnings only.

## Branch Naming

- When creating a new Cell, the branch name is generated as `<type>/<cell-name>`.
- Available types: `feat`, `refactor`, `fix`, `lint`, `chore`, `doc`.

## Development

```bash
cd apps/editor
npm install
npm run dev
```

## Makefile (from repo root)

```bash
make editor-install
make editor-dev
```

## Environment Flags

- `AGENCY_CLI_COMMAND="codex"` override the CLI command
- `AGENCY_CLI_STUB=1` use the CLI stub script
- `AGENCY_TEST_MODE=1` use stubbed cells/worktrees

## UI Testing (Playwright)

```bash
cd apps/editor
npx playwright install
npm run test:e2e
```

To create/update visual baselines:

```bash
npx playwright test --update-snapshots
```
