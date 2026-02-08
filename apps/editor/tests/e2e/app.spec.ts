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

test('renders the Agency shell', async () => {
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: RENDERER_URL,
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
      AGENCY_TEST_PROJECT_ROOT: TEST_REPO,
    },
  });

  const window = await electronApp.firstWindow();
  
  // The UI has been updated to an IDE layout, so we check for the Sidebar
  await expect(window.getByTestId('sidebar')).toBeVisible();
  await expect(window.getByTestId('cell-list')).toBeVisible();

  await window.getByTestId('open-create-cell').click();
  await expect(window.getByTestId('create-cell-modal')).toBeVisible();

  await expect(window).toHaveScreenshot('agency-editor-home.png');

  await electronApp.close();
});

test('shows project selection empty state', async () => {
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: RENDERER_URL,
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
      AGENCY_TEST_EMPTY_STATE: '1',
      AGENCY_TEST_PROJECT_ROOT: '',
    },
  });

  const window = await electronApp.firstWindow();
  await expect(window.getByText('No project selected')).toBeVisible();
  await expect(window.getByText('Select Project')).toBeVisible();

  await electronApp.close();
});

test('project settings open action populates recent projects', async () => {
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: RENDERER_URL,
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
      AGENCY_TEST_PROJECT_ROOT: TEST_REPO,
    },
  });

  const window = await electronApp.firstWindow();
  await window.getByTitle('Settings').click();
  await expect(window.getByText('Project')).toBeVisible();

  await window.getByText('Open Project').click();
  await expect(window.getByTestId('recent-projects')).toBeVisible();
  await expect(window.getByText('test-cell')).toBeVisible();

  await window.evaluate(async () => {
    await window.agency.clearProjectRoot();
  });
  await expect(window.getByTestId('explorer-sidebar')).toBeVisible();
  await expect(window.getByTestId('recent-projects')).toBeVisible();

  await electronApp.close();
});

test('settings dashboard shows navigation cards and home shortcut', async () => {
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: RENDERER_URL,
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
      AGENCY_TEST_PROJECT_ROOT: TEST_REPO,
    },
  });

  const window = await electronApp.firstWindow();
  await window.getByTitle('Settings').click();
  await expect(window.getByText('Project')).toBeVisible();
  await expect(window.getByTestId('settings-card-actions')).toBeVisible();
  await expect(window.getByTestId('settings-card-gates')).toBeVisible();
  await expect(window.getByTestId('settings-card-softlinks')).toBeVisible();

  await window.getByTestId('settings-card-actions').click();
  await expect(window.getByRole('heading', { name: 'Actions' })).toBeVisible();

  await window.getByTestId('activity-home').click();
  await expect(window.getByTestId('cell-list')).toBeVisible();

  await electronApp.close();
});

test('keeps the active session stable while switching tabs', async () => {
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: RENDERER_URL,
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
      AGENCY_TEST_PROJECT_ROOT: TEST_REPO,
    },
  });

  const window = await electronApp.firstWindow();
  await expect(window.getByTestId('sidebar')).toBeVisible();
  const cellItem = window.getByTestId('cell-item-test-cell');
  await expect(cellItem).toBeVisible();
  await cellItem.click();
  const defaultTab = window.getByTestId('session-tab-default');
  await expect(defaultTab).toBeVisible();

  await window.getByTitle('New Session').click();
  const otherTab = window
    .locator('[data-testid^=\"session-tab-\"]:not([data-testid=\"session-tab-default\"])')
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
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: RENDERER_URL,
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
      AGENCY_TEST_PROJECT_ROOT: TEST_REPO,
    },
  });

  const window = await electronApp.firstWindow();
  await window.getByTitle('Explorer').click();
  await expect(window.getByTestId('explorer-header')).toBeVisible();

  await expect(window.locator('[data-explorer-path=".hidden"]')).toBeVisible();
  await expect(window.locator('[data-explorer-path="ignored.log"]')).toBeVisible();

  await window.getByTestId('explorer-filter-toggle').click();
  const filterMenu = window.locator('[data-explorer-filter-menu]');
  await expect(filterMenu).toBeVisible();

  await filterMenu.getByText('Show hidden').click();
  await expect(window.locator('[data-explorer-path=".hidden"]')).toHaveCount(0);

  await filterMenu.getByText('Show ignored').click();
  await expect(window.locator('[data-explorer-path="ignored.log"]')).toHaveCount(0);

  await filterMenu.getByText('Changes only').click();
  await expect(window.locator('[data-explorer-path="src"]')).toHaveCount(0);

  const tree = window.getByTestId('explorer-tree');
  await tree.click();
  await window.locator('[data-explorer-path="README.md"]').click();
  await tree.press('Enter');
  await expect(window.locator('[data-workbench-tab="README.md"]')).toBeVisible();

  await electronApp.close();
});

test('explorer drag and drop moves files', async () => {
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: RENDERER_URL,
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
      AGENCY_TEST_PROJECT_ROOT: TEST_REPO,
    },
  });

  const window = await electronApp.firstWindow();
  await window.getByTitle('Explorer').click();
  await expect(window.getByTestId('explorer-header')).toBeVisible();

  const source = window.locator('[data-explorer-path="new.txt"]');
  const target = window.locator('[data-explorer-path="src"]');
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();

  await source.dragTo(target);
  await target.locator('button').click();
  await expect(window.locator('[data-explorer-path="src/new.txt"]')).toBeVisible();

  await electronApp.close();
});

test('explorer external drop imports and selects first imported entry', async () => {
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });

  const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-external-drop-'));
  const externalFile = path.join(externalDir, 'external-note.txt');
  fs.writeFileSync(externalFile, 'external payload\n');

  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: RENDERER_URL,
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
      AGENCY_TEST_PROJECT_ROOT: TEST_REPO,
    },
  });

  try {
    const window = await electronApp.firstWindow();
    await window.getByTitle('Explorer').click();
    await expect(window.getByTestId('explorer-header')).toBeVisible();

    const targetDirRow = window.locator('[data-explorer-path="src"]');
    await expect(targetDirRow).toBeVisible();

    const dataTransfer = await window.evaluateHandle((rawPath) => {
      const transfer = new DataTransfer();
      transfer.setData('text/plain', String(rawPath || ''));
      return transfer;
    }, externalFile);

    await targetDirRow.dispatchEvent('dragover', { dataTransfer });
    await targetDirRow.dispatchEvent('drop', { dataTransfer });

    const importedRow = window.locator('[data-explorer-path="src/external-note.txt"]');
    await expect(importedRow).toBeVisible();
    await expect
      .poll(async () => importedRow.evaluate((node) => node.className.includes('bg-primary/20')))
      .toBe(true);
  } finally {
    await electronApp.close();
    fs.rmSync(externalDir, { recursive: true, force: true });
  }
});

test('explorer external drop keeps conflict-safe naming semantics', async () => {
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });
  fs.writeFileSync(path.join(TEST_REPO, 'src', 'conflict.txt'), 'existing\n');

  const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-external-drop-'));
  const externalFile = path.join(externalDir, 'conflict.txt');
  fs.writeFileSync(externalFile, 'incoming\n');

  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: RENDERER_URL,
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
      AGENCY_TEST_PROJECT_ROOT: TEST_REPO,
    },
  });

  try {
    const window = await electronApp.firstWindow();
    await window.getByTitle('Explorer').click();
    await expect(window.getByTestId('explorer-header')).toBeVisible();

    const targetDirRow = window.locator('[data-explorer-path="src"]');
    await expect(targetDirRow).toBeVisible();

    const dataTransfer = await window.evaluateHandle((rawPath) => {
      const transfer = new DataTransfer();
      transfer.setData('text/plain', String(rawPath || ''));
      return transfer;
    }, externalFile);

    await targetDirRow.dispatchEvent('dragover', { dataTransfer });
    await targetDirRow.dispatchEvent('drop', { dataTransfer });

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

test('explorer copy and paste duplicates entries', async () => {
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', '.electron-build', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: RENDERER_URL,
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
      AGENCY_TEST_PROJECT_ROOT: TEST_REPO,
    },
  });

  const window = await electronApp.firstWindow();
  await window.getByTitle('Explorer').click();
  await expect(window.getByTestId('explorer-header')).toBeVisible();

  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  const tree = window.getByTestId('explorer-tree');
  await tree.click();
  await window.locator('[data-explorer-path="new.txt"]').click();
  await window.keyboard.press(`${modifier}+C`);

  await window.locator('[data-explorer-path="src"]').click();
  await window.keyboard.press(`${modifier}+V`);
  await expect(window.locator('[data-explorer-path="src/new.txt"]')).toBeVisible();

  await electronApp.close();
});
