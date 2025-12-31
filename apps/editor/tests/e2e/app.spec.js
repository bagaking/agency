const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { test, expect, _electron: electron } = require('@playwright/test');

const TEST_REPO = '/tmp/agency/test-cell';

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
    args: [path.join(__dirname, '..', '..', 'electron', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: 'http://localhost:5173',
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
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

test('keeps the active session stable while switching tabs', async () => {
  setupTestRepo();
  fs.rmSync('/tmp/agency/test-cell/.agency', { recursive: true, force: true });
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'electron', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: 'http://localhost:5173',
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
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
    args: [path.join(__dirname, '..', '..', 'electron', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: 'http://localhost:5173',
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
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
    args: [path.join(__dirname, '..', '..', 'electron', 'main.js')],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: 'http://localhost:5173',
      AGENCY_TEST_MODE: '1',
      AGENCY_CLI_STUB: '1',
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
