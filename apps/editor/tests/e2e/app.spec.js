const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');

test('renders the Agency Editor shell', async () => {
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
