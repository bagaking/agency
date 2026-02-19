const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { test, expect, _electron: electron } = require('@playwright/test');

const TEST_REPO = '/tmp/agency/test-cell';
const PORT_FILE = process.env.AGENCY_RENDERER_PORT_FILE
  || path.join(os.tmpdir(), 'agency-editor-renderer.json');

const resolveRendererUrl = () => {
  const envUrl = process.env.ELECTRON_RENDERER_URL || process.env.AGENCY_RENDERER_URL;
  if (envUrl) {
    return envUrl;
  }
  try {
    if (fs.existsSync(PORT_FILE)) {
      const raw = fs.readFileSync(PORT_FILE, 'utf8');
      const payload = JSON.parse(raw);
      if (payload?.url) {
        return payload.url;
      }
      if (payload?.port) {
        return `http://localhost:${payload.port}`;
      }
    }
  } catch (error) {
    // Ignore and fall through to error.
  }
  throw new Error(
    'Missing renderer URL. Run pnpm run test:e2e or set ELECTRON_RENDERER_URL.'
  );
};

const RENDERER_URL = resolveRendererUrl();
const createdUserDataPaths = new Set();

const setupTestRepo = () => {
  fs.rmSync(TEST_REPO, { recursive: true, force: true });
  fs.mkdirSync(TEST_REPO, { recursive: true });
  execSync('git init', { cwd: TEST_REPO });
  fs.writeFileSync(path.join(TEST_REPO, '.gitignore'), 'ignored.log\n');
  fs.writeFileSync(path.join(TEST_REPO, 'README.md'), 'hello\n');
  fs.mkdirSync(path.join(TEST_REPO, 'src'), { recursive: true });
  fs.writeFileSync(path.join(TEST_REPO, 'src', 'index.js'), 'console.log(\"hi\");\n');
  execSync('git add README.md .gitignore src/index.js', { cwd: TEST_REPO });
  execSync('git -c user.name=Agency -c user.email=agency@example.com commit -m \"init\"', {
    cwd: TEST_REPO,
  });
  fs.writeFileSync(path.join(TEST_REPO, 'README.md'), 'hello world\n');
  fs.writeFileSync(path.join(TEST_REPO, 'new.txt'), 'new file\n');
  fs.writeFileSync(path.join(TEST_REPO, '.hidden'), 'hidden\n');
  fs.writeFileSync(path.join(TEST_REPO, 'ignored.log'), 'ignored\n');
};

const launchTestApp = async ({
  projectRoot = TEST_REPO,
  emptyState = false,
  setupRepo = true,
} = {}) => {
  if (setupRepo) {
    setupTestRepo();
    fs.rmSync(path.join(TEST_REPO, '.agency'), { recursive: true, force: true });
  }
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-e2e-user-data-'));
  createdUserDataPaths.add(userDataPath);
  const env = {
    ...process.env,
    ELECTRON_RENDERER_URL: RENDERER_URL,
    AGENCY_TEST_USER_DATA_PATH: userDataPath,
    AGENCY_TEST_MODE: '1',
    AGENCY_CLI_STUB: '1',
    AGENCY_TEST_PROJECT_ROOT: projectRoot,
  };
  if (emptyState) {
    env.AGENCY_TEST_EMPTY_STATE = '1';
  }
  return electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env,
  });
};

test.afterEach(async () => {
  for (const userDataPath of createdUserDataPaths) {
    fs.rmSync(userDataPath, { recursive: true, force: true });
  }
  createdUserDataPaths.clear();
});

const openExplorer = async (window) => {
  await window.getByRole('button', { name: 'Explorer', exact: true }).click();
  await expect(window.getByTestId('explorer-header')).toBeVisible();
};

const ensureExplorerDirectoryExpanded = async (window, directoryPath, visibleChildPath) => {
  const directoryRow = window.locator(`[data-explorer-path="${directoryPath}"]`);
  await expect(directoryRow).toBeVisible();
  const childRow = window.locator(`[data-explorer-path="${visibleChildPath}"]`);
  if ((await childRow.count()) === 0) {
    await directoryRow.locator('button').first().click();
  }
  await expect(childRow).toBeVisible();
};

const openFirstCellInHomeView = async (window) => {
  await window.getByTestId('activity-home').click();
  const cellItem = window.locator('[data-testid^="cell-item-"]').first();
  await expect(cellItem).toBeVisible();
  await cellItem.click();
  return cellItem;
};

test('renders the Agency shell', async () => {
  const electronApp = await launchTestApp();

  const window = await electronApp.firstWindow();

  await expect(window.getByTestId('sidebar')).toBeVisible();
  await expect(window.getByTestId('cell-list')).toBeVisible();

  await window.getByTestId('open-create-cell').click();
  await expect(window.getByTestId('create-cell-modal')).toBeVisible();

  await electronApp.close();
});

test('shows project selection empty state', async () => {
  const electronApp = await launchTestApp({ projectRoot: '', emptyState: true });

  const window = await electronApp.firstWindow();
  await expect(window.getByText('No project selected')).toBeVisible();
  await expect(window.getByRole('button', { name: 'Select Project' }).first()).toBeVisible();

  await electronApp.close();
});

test('project settings open action populates recent projects', async () => {
  const electronApp = await launchTestApp();

  const window = await electronApp.firstWindow();
  await window.getByTitle('Settings').click();
  await expect(window.getByRole('button', { name: 'Initialize', exact: true })).toBeVisible();

  await window.getByRole('button', { name: 'Initialize', exact: true }).click();
  await expect(window.getByTestId('recent-projects')).toBeVisible();
  await expect(window.getByTestId('recent-projects').getByText('test-cell').first()).toBeVisible();

  await window.evaluate(async () => {
    await window.agency.clearProjectRoot();
  });
  await expect(window.getByText('No project selected')).toBeVisible();
  await expect(window.getByRole('button', { name: 'Select Project' }).first()).toBeVisible();

  await electronApp.close();
});

test('settings dashboard shows navigation cards and home shortcut', async () => {
  const electronApp = await launchTestApp();

  const window = await electronApp.firstWindow();
  await window.getByTitle('Settings').click();
  await expect(window.getByRole('button', { name: 'Initialize', exact: true })).toBeVisible();
  await expect(window.getByTestId('settings-card-actions')).toBeVisible();
  await expect(window.getByTestId('settings-card-gates')).toBeVisible();
  await expect(window.getByTestId('settings-card-softlinks')).toBeVisible();

  await window.getByTestId('settings-card-actions').click();
  await expect(window.getByRole('heading', { name: 'Terminus' })).toBeVisible();

  await window.getByTestId('activity-home').click();
  await expect(window.getByTestId('cell-list')).toBeVisible();

  await electronApp.close();
});

test('keeps the active session stable while switching tabs', async () => {
  const electronApp = await launchTestApp();

  const window = await electronApp.firstWindow();
  await expect(window.getByTestId('sidebar')).toBeVisible();
  const cellItem = await openFirstCellInHomeView(window);
  const sessionTabs = window.locator('[data-testid^="session-tab-"]');
  const initialCount = await sessionTabs.count();
  expect(initialCount).toBeGreaterThan(0);
  const defaultTab = sessionTabs.first();
  const defaultTabId = await defaultTab.getAttribute('data-testid');

  await cellItem.locator('button[title="New Session"]').click();
  await window.getByRole('button', { name: 'Blank', exact: true }).click();
  const otherTab = window
    .locator(`[data-testid^="session-tab-"]:not([data-testid="${defaultTabId}"])`)
    .first();
  await expect(otherTab).toBeVisible();

  await otherTab.click({ force: true, position: { x: 6, y: 6 } });
  await expect(otherTab).toHaveAttribute('data-active', 'true');

  await defaultTab.click({ force: true, position: { x: 6, y: 6 } });
  await expect(defaultTab).toHaveAttribute('data-active', 'true');

  await otherTab.click({ force: true, position: { x: 6, y: 6 } });
  await expect(otherTab).toHaveAttribute('data-active', 'true');

  await electronApp.close();
});

test('explorer filters and keyboard navigation', async () => {
  const electronApp = await launchTestApp();

  const window = await electronApp.firstWindow();
  await openExplorer(window);

  await expect(window.locator('[data-explorer-path=".hidden"]')).toBeVisible();
  await expect(window.locator('[data-explorer-path="ignored.log"]')).toHaveCount(0);

  await window.getByTestId('explorer-filter-toggle').click();
  const filterMenu = window.locator('[data-explorer-filter-menu]');
  await expect(filterMenu).toBeVisible();

  await filterMenu.getByText('Show ignored').click();
  await expect(window.locator('[data-explorer-path="ignored.log"]')).toBeVisible();

  await filterMenu.getByText('Show hidden').click();
  await expect(window.locator('[data-explorer-path=".hidden"]')).toHaveCount(0);

  await filterMenu.getByText('Changes only').click();
  await expect(window.locator('[data-explorer-path="src"]')).toHaveCount(0);
  await window.getByTestId('explorer-filter-toggle').click();
  await expect(filterMenu).toHaveCount(0);

  const tree = window.getByTestId('explorer-tree');
  await tree.click();
  await window.locator('[data-explorer-path="README.md"]').click();
  await tree.press('Enter');
  await expect(window.getByText('hello world')).toBeVisible();

  await electronApp.close();
});

test('agent cells explorer panel toggles Changes/All views', async () => {
  const electronApp = await launchTestApp();

  try {
    const window = await electronApp.firstWindow();
    const cellItem = await openFirstCellInHomeView(window);
    const cellTestId = await cellItem.getAttribute('data-testid');

    const dashboard = window.getByTestId('agent-cells-file-dashboard');
    const list = dashboard.getByTestId('agent-cells-file-dashboard-list');
    expect(cellTestId).toMatch(/^cell-item-/);

    await expect(dashboard).toBeVisible();
    await dashboard.getByRole('button', { name: 'All', exact: true }).click();
    await expect
      .poll(async () => (await list.textContent()) || '')
      .toContain('.gitignore');

    await dashboard.getByRole('button', { name: 'Changes', exact: true }).click();
    await expect
      .poll(async () => (await list.textContent()) || '')
      .not.toContain('.gitignore');
    await expect(list).not.toContainText('.gitignore');
  } finally {
    await electronApp.close();
  }
});

test('agent cells explorer panel imports dropped external files', async () => {
  const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-agent-cells-drop-'));
  const externalName = `agent-cells-drop-${Date.now()}.txt`;
  const externalFile = path.join(externalDir, externalName);
  fs.writeFileSync(externalFile, 'agent cells drop payload\n');

  const electronApp = await launchTestApp();

  try {
    const window = await electronApp.firstWindow();
    await openFirstCellInHomeView(window);

    const dashboard = window.getByTestId('agent-cells-file-dashboard');
    await expect(dashboard).toBeVisible();

    const importResult = await window.evaluate(async ({ rootPath, sourcePath }) => {
      return window.agency.performFileIntent({
        intent: 'import_copy',
        sourceSurface: 'agent-cells',
        rootPath,
        sourcePaths: [sourcePath],
        targetDir: '',
      });
    }, { rootPath: TEST_REPO, sourcePath: externalFile });
    expect(importResult?.success).toBe(true);

    const importedPath = path.join(TEST_REPO, externalName);
    await expect.poll(() => fs.existsSync(importedPath)).toBe(true);
    expect(fs.readFileSync(importedPath, 'utf8')).toBe('agent cells drop payload\n');
  } finally {
    await electronApp.close();
    fs.rmSync(externalDir, { recursive: true, force: true });
  }
});

test('explorer shows companion changed-files panel above footer', async () => {
  const electronApp = await launchTestApp();

  try {
    const window = await electronApp.firstWindow();
    await openFirstCellInHomeView(window);
    await openExplorer(window);

    const changesPanel = window.getByTestId('explorer-changes-panel');
    const changesList = window.getByTestId('explorer-changes-panel-list');

    await expect(changesPanel).toBeVisible();
    await expect(changesPanel).toContainText('Changed Files');
    await changesPanel.getByRole('button', { name: 'Refresh changed files', exact: true }).click();
    await expect(changesList).toBeVisible();
    await expect
      .poll(async () => (await changesList.textContent() || '').trim().length > 0)
      .toBe(true);

    await changesPanel.getByRole('button', { name: 'Tree', exact: true }).click();
    await expect
      .poll(async () => (await changesList.textContent() || '').trim().length > 0)
      .toBe(true);
  } finally {
    await electronApp.close();
  }
});

test('explorer move operation relocates files into target directory', async () => {
  const electronApp = await launchTestApp();

  const window = await electronApp.firstWindow();
  await openExplorer(window);

  const moveResult = await window.evaluate(async ({ rootPath }) => {
    return window.agency.performFileIntent({
      intent: 'move',
      sourceSurface: 'explorer',
      rootPath,
      sourcePath: 'new.txt',
      targetPath: 'src/new.txt',
    });
  }, { rootPath: TEST_REPO });
  expect(moveResult?.success).toBe(true);

  await expect
    .poll(() => fs.existsSync(path.join(TEST_REPO, 'src', 'new.txt')))
    .toBe(true);
  await ensureExplorerDirectoryExpanded(window, 'src', 'src/index.js');
  await expect(window.locator('[data-explorer-path="src/new.txt"]')).toBeVisible();

  await electronApp.close();
});

test('explorer external import adds entries to target directory', async () => {
  const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-external-drop-'));
  const externalFile = path.join(externalDir, 'external-note.txt');
  fs.writeFileSync(externalFile, 'external payload\n');

  const electronApp = await launchTestApp();

  try {
    const window = await electronApp.firstWindow();
    await openExplorer(window);

    const targetDirRow = window.locator('[data-explorer-path="src"]');
    await expect(targetDirRow).toBeVisible();

    const importResult = await window.evaluate(async ({ rootPath, sourcePath, targetDir }) => {
      return window.agency.importExplorerEntries({
        rootPath,
        sourcePaths: [sourcePath],
        targetDir,
      });
    }, { rootPath: TEST_REPO, sourcePath: externalFile, targetDir: 'src' });
    expect(Array.isArray(importResult?.imported)).toBe(true);

    await expect
      .poll(() => fs.existsSync(path.join(TEST_REPO, 'src', 'external-note.txt')))
      .toBe(true);
    await ensureExplorerDirectoryExpanded(window, 'src', 'src/index.js');
    const importedRow = window.locator('[data-explorer-path="src/external-note.txt"]');
    await expect(importedRow).toBeVisible();
  } finally {
    await electronApp.close();
    fs.rmSync(externalDir, { recursive: true, force: true });
  }
});

test('explorer external drop keeps conflict-safe naming semantics', async () => {
  setupTestRepo();
  fs.rmSync(path.join(TEST_REPO, '.agency'), { recursive: true, force: true });
  fs.writeFileSync(path.join(TEST_REPO, 'src', 'conflict.txt'), 'existing\n');

  const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-external-drop-'));
  const externalFile = path.join(externalDir, 'conflict.txt');
  fs.writeFileSync(externalFile, 'incoming\n');

  const electronApp = await launchTestApp({ setupRepo: false });

  try {
    const window = await electronApp.firstWindow();
    await openExplorer(window);

    const targetDirRow = window.locator('[data-explorer-path="src"]');
    await expect(targetDirRow).toBeVisible();

    const importResult = await window.evaluate(async ({ rootPath, sourcePath, targetDir }) => {
      return window.agency.importExplorerEntries({
        rootPath,
        sourcePaths: [sourcePath],
        targetDir,
      });
    }, { rootPath: TEST_REPO, sourcePath: externalFile, targetDir: 'src' });
    expect(Array.isArray(importResult?.imported)).toBe(true);

    await expect
      .poll(() => fs.existsSync(path.join(TEST_REPO, 'src', 'conflict (1).txt')))
      .toBe(true);
    await ensureExplorerDirectoryExpanded(window, 'src', 'src/index.js');
    const importedRow = window.locator('[data-explorer-path="src/conflict (1).txt"]');
    await expect(importedRow).toBeVisible();

    const existingContent = fs.readFileSync(path.join(TEST_REPO, 'src', 'conflict.txt'), 'utf8');
    const importedContent = fs.readFileSync(path.join(TEST_REPO, 'src', 'conflict (1).txt'), 'utf8');

    expect(existingContent).toBe('existing\n');
    expect(importedContent).toBe('incoming\n');
  } finally {
    await electronApp.close();
    fs.rmSync(externalDir, { recursive: true, force: true });
  }
});


test('explorer external drop accepts newline-separated text/plain payloads', async () => {
  const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-external-drop-'));
  const externalA = path.join(externalDir, 'routing-a.txt');
  const externalB = path.join(externalDir, 'routing-b.txt');
  fs.writeFileSync(externalA, 'A\n');
  fs.writeFileSync(externalB, 'B\n');

  const electronApp = await launchTestApp();

  try {
    const window = await electronApp.firstWindow();
    await openExplorer(window);

    const targetDirRow = window.locator('[data-explorer-path="src"]');
    await expect(targetDirRow).toBeVisible();

    const importResult = await window.evaluate(async ({ rootPath, sourcePaths, targetDir }) => {
      return window.agency.importExplorerEntries({
        rootPath,
        sourcePaths,
        targetDir,
      });
    }, { rootPath: TEST_REPO, sourcePaths: [externalA, externalB], targetDir: 'src' });
    expect(Array.isArray(importResult?.imported)).toBe(true);

    await expect
      .poll(() => fs.existsSync(path.join(TEST_REPO, 'src', 'routing-a.txt')))
      .toBe(true);
    await expect
      .poll(() => fs.existsSync(path.join(TEST_REPO, 'src', 'routing-b.txt')))
      .toBe(true);
    await ensureExplorerDirectoryExpanded(window, 'src', 'src/index.js');
    await expect(window.locator('[data-explorer-path="src/routing-a.txt"]')).toBeVisible();
    await expect(window.locator('[data-explorer-path="src/routing-b.txt"]')).toBeVisible();
    expect(fs.readFileSync(path.join(TEST_REPO, 'src', 'routing-a.txt'), 'utf8')).toBe('A\n');
    expect(fs.readFileSync(path.join(TEST_REPO, 'src', 'routing-b.txt'), 'utf8')).toBe('B\n');
  } finally {
    await electronApp.close();
    fs.rmSync(externalDir, { recursive: true, force: true });
  }
});

test('explorer copy and paste duplicates entries', async () => {
  const electronApp = await launchTestApp();

  const window = await electronApp.firstWindow();
  await openExplorer(window);

  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  const tree = window.getByTestId('explorer-tree');
  await tree.click();
  await window.locator('[data-explorer-path="new.txt"]').click();
  await window.keyboard.press(`${modifier}+C`);

  await window.locator('[data-explorer-path="src"]').click();
  await window.keyboard.press(`${modifier}+V`);
  await expect
    .poll(() => fs.existsSync(path.join(TEST_REPO, 'src', 'new.txt')))
    .toBe(true);
  await ensureExplorerDirectoryExpanded(window, 'src', 'src/index.js');
  await expect(window.locator('[data-explorer-path="src/new.txt"]')).toBeVisible();

  await electronApp.close();
});
