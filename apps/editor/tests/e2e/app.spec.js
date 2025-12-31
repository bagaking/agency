const fs = require('fs');
const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');

test('renders the Agency shell', async () => {
  fs.mkdirSync('/tmp/agency/test-cell', { recursive: true });
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
  fs.mkdirSync('/tmp/agency/test-cell', { recursive: true });
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
