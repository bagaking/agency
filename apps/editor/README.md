# Agency Editor

## Development

```bash
cd apps/editor
npm install
npm run dev
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
