const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { test, expect, _electron: electron } = require('@playwright/test');

const TEST_REPO = '/tmp/agency/test-cell';
const SECOND_TEST_REPO = '/tmp/agency/test-cell-second';
const THIRD_TEST_REPO = '/tmp/agency/test-cell-third';
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

const killRepoElectronProcesses = () => {
  try {
    execSync('pkill -f "apps/editor/.electron-build/electron/main.js"', { stdio: 'ignore' });
  } catch (_error) {
    // Ignore the common "no matching process" case.
  }
};

const initializeGitRepo = (repoPath, trackedEntries) => {
  const resetRepoDir = () => {
    fs.rmSync(repoPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
    fs.mkdirSync(repoPath, { recursive: true });
  };

  resetRepoDir();
  try {
    execSync('git init', { cwd: repoPath });
  } catch (_error) {
    resetRepoDir();
    execSync('git init', { cwd: repoPath });
  }
  trackedEntries.forEach(({ relativePath, content }) => {
    const absolutePath = path.join(repoPath, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  });
  execSync(`git add ${trackedEntries.map(({ relativePath }) => relativePath).join(' ')}`, {
    cwd: repoPath,
  });
  execSync('git -c user.name=Agency -c user.email=agency@example.com commit -m "init"', {
    cwd: repoPath,
  });
};

const resolveRealPath = (repoPath) => {
  try {
    return fs.realpathSync.native(repoPath);
  } catch (_error) {
    return repoPath;
  }
};

const setupTestRepo = () => {
  initializeGitRepo(TEST_REPO, [
    { relativePath: '.gitignore', content: 'ignored.log\n' },
    { relativePath: 'README.md', content: 'hello\n' },
    { relativePath: 'src/index.js', content: 'console.log("hi");\n' },
  ]);
  fs.writeFileSync(path.join(TEST_REPO, 'README.md'), 'hello world\n');
  fs.writeFileSync(path.join(TEST_REPO, 'new.txt'), 'new file\n');
  fs.writeFileSync(path.join(TEST_REPO, '.hidden'), 'hidden\n');
  fs.writeFileSync(path.join(TEST_REPO, 'ignored.log'), 'ignored\n');
};

const setupNamedRepo = (repoPath, label) => {
  initializeGitRepo(repoPath, [
    { relativePath: 'README.md', content: `${label}\n` },
    { relativePath: 'src/index.js', content: `console.log(${JSON.stringify(label)});\n` },
  ]);
  fs.writeFileSync(path.join(repoPath, 'README.md'), `${label} workspace\n`);
};

const launchTestApp = async ({
  projectRoot = TEST_REPO,
  emptyState = false,
  setupRepo = true,
  userDataPath,
  includeProjectRootEnv = true,
  cleanupExistingProcesses = true,
} = {}) => {
  if (cleanupExistingProcesses) {
    killRepoElectronProcesses();
  }
  if (setupRepo) {
    setupTestRepo();
    fs.rmSync(path.join(TEST_REPO, '.agency'), { recursive: true, force: true });
  }
  const effectiveUserDataPath = userDataPath
    || fs.mkdtempSync(path.join(os.tmpdir(), 'agency-e2e-user-data-'));
  createdUserDataPaths.add(effectiveUserDataPath);
  const env = {
    ...process.env,
    ELECTRON_RENDERER_URL: RENDERER_URL,
    AGENCY_TEST_USER_DATA_PATH: effectiveUserDataPath,
    AGENCY_TEST_MODE: '1',
    AGENCY_CLI_STUB: '1',
  };
  if (includeProjectRootEnv) {
    env.AGENCY_TEST_PROJECT_ROOT = projectRoot;
  }
  if (emptyState) {
    env.AGENCY_TEST_EMPTY_STATE = '1';
  }
  const launch = () =>
    electron.launch({
      args: [path.join(__dirname, '..', '..', '.electron-build', 'electron', 'main.js')],
      env,
    });

  try {
    return await launch();
  } catch (error) {
    killRepoElectronProcesses();
    await new Promise((resolve) => setTimeout(resolve, 300));
    return launch();
  }
};

test.afterEach(async () => {
  killRepoElectronProcesses();
  for (const userDataPath of createdUserDataPaths) {
    try {
      fs.rmSync(userDataPath, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 150,
      });
    } catch (_error) {
      // Best-effort cleanup for transient Chromium cache handles.
    }
  }
  createdUserDataPaths.clear();
});

const cleanupTransientElectronApp = async () => {
  killRepoElectronProcesses();
  await new Promise((resolve) => setTimeout(resolve, 300));
};

const openExplorer = async (window) => {
  const header = window.getByTestId('explorer-header');
  if (await header.isVisible().catch(() => false)) {
    return;
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await window.getByRole('button', { name: 'Explorer', exact: true }).click();
    try {
      await expect(header).toBeVisible({ timeout: 4000 });
      return;
    } catch (_error) {
      // Retry around occasional sidebar/activity timing jitter.
    }
  }
  await expect(header).toBeVisible();
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

const waitForWindowCount = async (electronApp, count) => {
  await expect.poll(async () => {
    return electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  }).toBe(count);
};

const getFocusedWindowTitle = async (electronApp) => {
  return electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getFocusedWindow()?.getTitle() || '');
};

const getProjectContext = async (window) => {
  return window.evaluate(async () => window.agency.getProjectContext());
};

const getWindowUiState = async (window) => {
  return window.evaluate(async () => window.agency.getUiState());
};

const getFirstWindow = async (electronApp, timeoutMs = 15_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const windows = await electronApp.windows();
    if (windows.length > 0) {
      return windows[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for the first Electron window after ${timeoutMs}ms.`);
};

const findWindowByProjectRoot = async (electronApp, projectRoot, timeoutMs = 15_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const windows = await electronApp.windows();
    for (const window of windows) {
      try {
        const context = await getProjectContext(window);
        if (context?.projectRoot === projectRoot) {
          return window;
        }
      } catch (_error) {
        // Window may still be booting.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for a window bound to project root: ${projectRoot}`);
};

test('renders the Agency shell', async () => {
  const electronApp = await launchTestApp();

  const window = await getFirstWindow(electronApp);

  await expect(window.getByTestId('sidebar')).toBeVisible();
  await expect(window.getByTestId('cell-list')).toBeVisible();

  await window.getByTestId('open-create-cell').click();
  await expect(window.getByTestId('create-cell-modal')).toBeVisible();

  await electronApp.close();
});

test('shows project selection empty state', async () => {
  const electronApp = await launchTestApp({ projectRoot: '', emptyState: true });

  const window = await getFirstWindow(electronApp);
  await expect(window.getByText('No project selected')).toBeVisible();
  await expect(window.getByRole('button', { name: 'Select Project' }).first()).toBeVisible();

  await electronApp.close();
});

test('project settings open action populates recent projects', async () => {
  const electronApp = await launchTestApp();

  const window = await getFirstWindow(electronApp);

  await window.evaluate(async () => {
    await window.agency.clearProjectRoot();
  });
  await expect(window.getByText('No project selected').first()).toBeVisible();
  await expect(window.getByTestId('recent-projects')).toBeVisible();
  await expect(window.getByTestId('recent-projects').getByText('test-cell').first()).toBeVisible();

  await electronApp.close();
});

test('settings dashboard shows navigation cards and home shortcut', async () => {
  const electronApp = await launchTestApp();

  const window = await getFirstWindow(electronApp);
  await window.evaluate(async () => {
    await window.agency.setUiState({ activeView: 'settings' });
  });
  await window.reload();
  await expect(window.getByTestId('settings-card-actions')).toBeVisible();
  await expect(window.getByTestId('settings-card-gates')).toBeVisible();
  await expect(window.getByTestId('settings-card-harness-providers')).toBeVisible();

  await window.getByTestId('activity-home').click();
  await expect(window.getByTestId('cell-list')).toBeVisible();

  await electronApp.close();
});

test('keeps the active session stable while switching tabs', async () => {
  const electronApp = await launchTestApp();

  const window = await getFirstWindow(electronApp);
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

  const window = await getFirstWindow(electronApp);
  await openExplorer(window);

  await expect(window.getByRole('tree', { name: /file tree/i })).toBeVisible();

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
  await filterMenu.press('Escape');
  await expect(filterMenu).toHaveCount(0);

  await window.getByTestId('explorer-filter-toggle').click();
  await expect(filterMenu).toBeVisible();
  await window.getByTestId('explorer-tree').click();
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
    const window = await getFirstWindow(electronApp);
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
    const window = await getFirstWindow(electronApp);
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

test('explorer promotes changed files into a registered working-set view', async () => {
  const electronApp = await launchTestApp();

  try {
    const window = await getFirstWindow(electronApp);
    await openFirstCellInHomeView(window);
    await openExplorer(window);

    await window.getByRole('button', { name: 'Changed', exact: true }).click();

    const changesList = window.getByTestId('explorer-working-set-list');
    await expect(window.getByText('Changed Files')).toBeVisible();
    await window.getByRole('button', { name: 'Refresh working set', exact: true }).click();
    await expect(changesList).toBeVisible();
    await expect
      .poll(async () => (await changesList.textContent() || '').trim().length > 0)
      .toBe(true);

    await window.getByRole('button', { name: 'Grouped', exact: true }).click();
    await expect
      .poll(async () => (await changesList.textContent() || '').trim().length > 0)
      .toBe(true);

    await window.getByRole('button', { name: 'Tree', exact: true }).click();
    await expect(window.getByTestId('explorer-tree')).toBeVisible();
  } finally {
    await electronApp.close();
  }
});

test('changed working-set switches Explorer into content-search layering', async () => {
  const electronApp = await launchTestApp();

  try {
    const window = await getFirstWindow(electronApp);
    await openFirstCellInHomeView(window);
    await openExplorer(window);

    await window.getByRole('button', { name: 'Changed', exact: true }).click();

    await expect(window.getByRole('button', { name: 'Content', exact: true })).toBeVisible();
    await expect(window.getByRole('button', { name: 'Paths', exact: true })).toHaveCount(0);
    const searchInput = window.getByLabel('Search file contents…');
    await expect(searchInput).toBeVisible();
    await expect(window.getByTestId('explorer-filter-toggle')).toHaveCount(0);

    await searchInput.fill('hello');
    await expect(window.getByRole('button', { name: 'Project', exact: true })).toBeVisible();
    await expect(window.getByRole('button', { name: 'Folder', exact: true })).toHaveCount(0);
    await expect(window.getByRole('button', { name: 'Selection', exact: true })).toHaveCount(0);
  } finally {
    await electronApp.close();
  }
});

test('url mode keeps Explorer as intake across working-set views', async () => {
  const electronApp = await launchTestApp();

  try {
    const window = await getFirstWindow(electronApp);
    await openFirstCellInHomeView(window);
    await openExplorer(window);

    await window.getByRole('button', { name: 'URL', exact: true }).click();

    await expect(window.getByLabel('Paste a documentation or research URL…')).toBeVisible();
    await expect(window.getByRole('button', { name: 'Open Web', exact: true })).toBeVisible();
    await expect(window.getByTestId('explorer-tree')).toBeVisible();
    await expect(window.getByTestId('explorer-filter-toggle')).toHaveCount(0);

    await window.getByRole('button', { name: 'Changed', exact: true }).click();

    await expect(window.getByRole('button', { name: 'URL', exact: true })).toBeVisible();
    await expect(window.getByLabel('Paste a documentation or research URL…')).toBeVisible();
    await expect(window.getByRole('button', { name: 'Open Web', exact: true })).toBeVisible();
    await expect(window.getByTestId('explorer-working-set-list')).toBeVisible();
    await expect(window.getByText('Changed Files')).toBeVisible();
    await expect(window.getByTestId('explorer-filter-toggle')).toHaveCount(0);

    await window.getByRole('button', { name: 'Content', exact: true }).click();
    await expect(window.getByLabel('Search file contents…')).toBeVisible();
  } finally {
    await cleanupTransientElectronApp();
  }
});

test('url-shaped explorer input opens a bounded web research tab in Workbench', async () => {
  const electronApp = await launchTestApp();

  try {
    const window = await getFirstWindow(electronApp);
    await openFirstCellInHomeView(window);
    await openExplorer(window);

    const searchInput = window.getByLabel('Search files…');
    await searchInput.fill('example.com/docs');
    await expect(window.getByRole('button', { name: 'Open Web', exact: true })).toBeVisible();

    await window.getByRole('button', { name: 'Open Web', exact: true }).click();

    await expect(window.getByRole('button', { name: 'View', exact: true })).toBeVisible();
    await expect(window.getByRole('button', { name: 'Reader', exact: true })).toBeVisible();
    await expect(window.getByTestId('workbench-web-research-back')).toBeVisible();
    await expect(window.getByTestId('workbench-web-research-forward')).toBeVisible();
    await window.getByRole('button', { name: 'Reader', exact: true }).click();
    await expect(window.getByTestId('workbench-web-research-reload')).toBeVisible();
    await expect(window.getByTestId('workbench-web-research-open-browser')).toBeVisible();
    await expect(window.getByTestId('workbench-web-research-save-markdown')).toBeVisible();
    await expect(window.getByTestId('workbench-web-research-cite')).toBeVisible();
  } finally {
    await cleanupTransientElectronApp();
  }
});

test('explorer selection actions use an explicit hierarchy popover', async () => {
  const electronApp = await launchTestApp();

  try {
    const window = await getFirstWindow(electronApp);
    await openExplorer(window);

    const tree = window.getByTestId('explorer-tree');
    await tree.click();
    await window.locator('[data-explorer-path="README.md"]').click();

    await expect(window.getByText('Selection Actions')).toBeVisible();

    const trigger = window.getByRole('button', { name: 'Show selection hierarchy' });
    await trigger.click();

    const dialog = window.getByRole('dialog', { name: 'Selection hierarchy' });
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await dialog.click();
    await expect(dialog).toBeVisible();

    await tree.click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  } finally {
    await electronApp.close();
  }
});

test('explorer move operation relocates files into target directory', async () => {
  const electronApp = await launchTestApp();

  const window = await getFirstWindow(electronApp);
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
    const window = await getFirstWindow(electronApp);
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
    const window = await getFirstWindow(electronApp);
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
    const window = await getFirstWindow(electronApp);
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

  const window = await getFirstWindow(electronApp);
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

test('opening another project creates a second window and keeps project state isolated', async () => {
  setupNamedRepo(SECOND_TEST_REPO, 'second project');
  setupNamedRepo(THIRD_TEST_REPO, 'third project');
  const expectedMainRepo = resolveRealPath(TEST_REPO);
  const expectedSecondRepo = resolveRealPath(SECOND_TEST_REPO);
  const expectedThirdRepo = resolveRealPath(THIRD_TEST_REPO);

  const electronApp = await launchTestApp();

  try {
    const firstWindow = await getFirstWindow(electronApp);
    await expect(firstWindow.getByTestId('window-titlebar-project-name')).toHaveText(path.basename(TEST_REPO));

    const createResult = await firstWindow.evaluate(async (projectRoot) => {
      return window.agency.createWindowShell({ projectRoot });
    }, SECOND_TEST_REPO);

    await waitForWindowCount(electronApp, 2);
    const secondWindow = await findWindowByProjectRoot(electronApp, expectedSecondRepo);
    expect(createResult?.ok).toBe(true);
    expect(createResult?.windowStateId).toBeTruthy();

    await expect(secondWindow.getByTestId('window-titlebar-project-name')).toHaveText(
      path.basename(SECOND_TEST_REPO)
    );

    const [firstContext, secondContext] = await Promise.all([
      getProjectContext(firstWindow),
      getProjectContext(secondWindow),
    ]);
    expect(firstContext.projectRoot).toBe(expectedMainRepo);
    expect(secondContext.projectRoot).toBe(expectedSecondRepo);

    await firstWindow.evaluate(async (projectRoot) => {
      await window.agency.setProjectRoot({ projectRoot });
    }, THIRD_TEST_REPO);

    await expect.poll(async () => (await getProjectContext(firstWindow)).projectRoot).toBe(expectedThirdRepo);
    await expect.poll(async () => (await getProjectContext(secondWindow)).projectRoot).toBe(expectedSecondRepo);
    await expect(firstWindow.getByTestId('window-titlebar-project-name')).toHaveText(path.basename(THIRD_TEST_REPO));
    await expect(secondWindow.getByTestId('window-titlebar-project-name')).toHaveText(
      path.basename(SECOND_TEST_REPO)
    );

    const secondContextAfterSwitch = await getProjectContext(secondWindow);
    expect(secondContextAfterSwitch.recentProjects.map((entry) => entry.path)).toContain(expectedThirdRepo);

    await firstWindow.getByTestId('window-titlebar-menu-button').click();
    await expect(firstWindow.getByTestId('window-titlebar-menu')).toBeVisible();
    await firstWindow.getByTestId(`window-switcher-item-${createResult.windowStateId}`).click();
    await expect(firstWindow.getByTestId('window-titlebar-menu')).toHaveCount(0);
  } finally {
    await electronApp.close();
  }
});

test('relaunch restores the previous multi-window set with window-local state and geometry', async () => {
  setupNamedRepo(SECOND_TEST_REPO, 'second project');
  const expectedMainRepo = resolveRealPath(TEST_REPO);
  const expectedSecondRepo = resolveRealPath(SECOND_TEST_REPO);
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-e2e-user-data-restore-'));
  createdUserDataPaths.add(userDataPath);

  const firstRun = await launchTestApp({
    userDataPath,
    setupRepo: true,
  });

  try {
    const firstWindow = await getFirstWindow(firstRun);
    await firstWindow.evaluate(async (projectRoot) => {
      await window.agency.createWindowShell({ projectRoot });
    }, SECOND_TEST_REPO);

    await waitForWindowCount(firstRun, 2);
    const secondWindow = await findWindowByProjectRoot(firstRun, expectedSecondRepo);

    await firstWindow.getByTestId('activity-explorer').click({ force: true, position: { x: 10, y: 10 } });
    await firstWindow.evaluate(async () => {
      await window.agency.setUiState({
        sidebarWidth: 301,
      });
    });
    await secondWindow.evaluate(async () => {
      await window.agency.setUiState({
        sidebarWidth: 377,
      });
    });

    const windows = await firstWindow.evaluate(async () => window.agency.listWindowShells());
    const firstWindowId = windows.windows.find((entry) => entry.projectRoot === expectedMainRepo)?.windowId;
    const secondWindowId = windows.windows.find((entry) => entry.projectRoot === expectedSecondRepo)?.windowId;
    expect(firstWindowId).toBeTruthy();
    expect(secondWindowId).toBeTruthy();

    await firstRun.evaluate(
      ({ BrowserWindow }, payload) => {
        for (const item of payload) {
          const target = BrowserWindow.fromId(item.windowId);
          target?.setBounds(item.bounds);
        }
      },
      [
        {
          windowId: firstWindowId,
          bounds: { x: 48, y: 64, width: 1180, height: 780 },
        },
        {
          windowId: secondWindowId,
          bounds: { x: 160, y: 120, width: 1100, height: 760 },
        },
      ]
    );

    await new Promise((resolve) => setTimeout(resolve, 1200));
  } finally {
    await firstRun.close();
  }

  const restoredApp = await launchTestApp({
    userDataPath,
    setupRepo: false,
    includeProjectRootEnv: false,
    cleanupExistingProcesses: false,
  });

  try {
    await waitForWindowCount(restoredApp, 2);

    const restoredFirstWindow = await findWindowByProjectRoot(restoredApp, expectedMainRepo);
    const restoredSecondWindow = await findWindowByProjectRoot(restoredApp, expectedSecondRepo);

    await expect.poll(async () => (await getWindowUiState(restoredFirstWindow)).activeView).toBe('explorer');
    await expect.poll(async () => (await getWindowUiState(restoredSecondWindow)).activeView).toBe('agent-cells');

    const restoredShells = await restoredFirstWindow.evaluate(async () => window.agency.listWindowShells());
    const mainWindowId = restoredShells.windows.find((entry) => entry.projectRoot === expectedMainRepo)?.windowId;
    const secondWindowId = restoredShells.windows.find((entry) => entry.projectRoot === expectedSecondRepo)?.windowId;

    const restoredGeometry = await restoredApp.evaluate(({ BrowserWindow }, payload) => {
      return payload.map(({ windowId }) => ({
        windowId,
        bounds: BrowserWindow.fromId(windowId)?.getBounds() || null,
      }));
    }, [{ windowId: mainWindowId }, { windowId: secondWindowId }]);

    const mainWindowGeometry = restoredGeometry.find((entry) => entry.windowId === mainWindowId);
    const secondWindowGeometry = restoredGeometry.find((entry) => entry.windowId === secondWindowId);

    expect(mainWindowGeometry?.bounds).toMatchObject({ x: 48, y: 64, width: 1180, height: 780 });
    expect(secondWindowGeometry?.bounds).toMatchObject({ x: 160, y: 120, width: 1100, height: 760 });
  } finally {
    await restoredApp.close();
  }
});

test('window switcher surfaces attention summary for other windows and focuses the target window', async () => {
  setupNamedRepo(SECOND_TEST_REPO, 'second project');
  const expectedSecondRepo = resolveRealPath(SECOND_TEST_REPO);
  const attentionLabelByKind = {
    failed: 'Failed',
    pending_confirmation: 'Confirm',
    return_required: 'Review',
    running: 'Running',
    unread: 'Unread',
  };

  const electronApp = await launchTestApp();

  try {
    const firstWindow = await getFirstWindow(electronApp);
    const createResult = await firstWindow.evaluate(async (projectRoot) => {
      return window.agency.createWindowShell({ projectRoot });
    }, SECOND_TEST_REPO);

    await waitForWindowCount(electronApp, 2);
    const secondWindow = await findWindowByProjectRoot(electronApp, expectedSecondRepo);
    expect(createResult?.ok).toBe(true);
    expect(createResult?.windowStateId).toBeTruthy();

    await secondWindow.evaluate(async () => {
      await window.agency.setUiState({
        attentionSummary: {
          version: 1,
          itemCount: 2,
          highestSeverity: 'critical',
          countsByKind: {
            failed: 1,
            unread: 1,
          },
          primary: {
            id: 'run-failed',
            kind: 'failed',
            ownerKind: 'run',
            severity: 'critical',
            label: 'Create Child Agent via Fork',
            detail: 'Source session is blocked.',
            refs: {
              runId: 'run-failed',
              cellId: 'cell-main',
              sessionId: 'session-source',
            },
          },
          updatedAt: '2026-03-30T12:10:00.000Z',
        },
      });
    });

    await expect.poll(async () => {
      const payload = await firstWindow.evaluate(async () => window.agency.listWindowShells());
      return payload?.windows?.find((entry) => entry.windowStateId === createResult.windowStateId)?.attentionSummary?.primary?.kind || '';
    }).not.toBe('');

    const shellPayload = await firstWindow.evaluate(async () => window.agency.listWindowShells());
    const windowAttentionSummary = shellPayload?.windows?.find(
      (entry) => entry.windowStateId === createResult.windowStateId
    )?.attentionSummary;

    await firstWindow.getByTestId('window-titlebar-menu-button').click();
    const switcherItem = firstWindow.getByTestId(`window-switcher-item-${createResult.windowStateId}`);
    await expect(switcherItem).toBeVisible();
    await expect(switcherItem).toContainText(
      attentionLabelByKind[windowAttentionSummary.primary.kind] || 'Attention'
    );
    if (windowAttentionSummary.primary?.detail) {
      await expect(switcherItem).toContainText(windowAttentionSummary.primary.detail);
    }

    await switcherItem.click();
    await expect.poll(async () => getFocusedWindowTitle(electronApp)).toBe(
      `${path.basename(SECOND_TEST_REPO)} - Agency`
    );
  } finally {
    await electronApp.close();
  }
});
