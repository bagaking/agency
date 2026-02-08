import type { BrowserWindow } from 'electron';

const { setupCellHandlers } = require('../ipc/handlers/cells');
const { setupWorktreeHandlers } = require('../ipc/handlers/worktrees');
const { setupTerminalHandlers } = require('../ipc/handlers/terminal');
const { setupSessionHandlers } = require('../ipc/handlers/sessions');
const { setupUiStateHandlers } = require('../ipc/handlers/uiState');
const { setupQuickActionsHandlers } = require('../ipc/handlers/quickActions');
const { setupAppShortcutsHandlers } = require('../ipc/handlers/appShortcuts');
const { setupTerminusSettingsHandlers } = require('../ipc/handlers/terminusSettings');
const { setupSessionNamingHandlers } = require('../ipc/handlers/sessionNaming');
const { setupGatesHandlers } = require('../ipc/handlers/gates');
const { setupTmuxHandlers } = require('../ipc/handlers/tmux');
const { setupWorktreeLinksHandlers } = require('../ipc/handlers/worktreeLinks');
const { setupExplorerHandlers } = require('../ipc/handlers/explorer');
const { setupRuntimeLogHandlers } = require('../ipc/handlers/runtimeLog');
const { setupWorkbenchHandlers } = require('../ipc/handlers/workbench');
const { setupProjectHandlers } = require('../ipc/handlers/project');
const { setupClipboardHandlers } = require('../ipc/handlers/clipboard');
const { setupCommentsHandlers } = require('../ipc/handlers/comments');
const { setupHilHandlers } = require('../ipc/handlers/hil');
const { setupCaptureHandlers } = require('../ipc/handlers/capture');
const { setupActionSheetsHandlers } = require('../ipc/handlers/actionSheets');
const { setupVoiceCaptureHandlers } = require('../ipc/handlers/voiceCapture');
const { setupSystemHandlers } = require('../ipc/handlers/system');
const { setupSessionMapHandlers } = require('../ipc/handlers/sessionMap');

type MainWindowGetter = () => BrowserWindow | undefined;

export function setupMainIpcHandlers(getMainWindow: MainWindowGetter): void {
  setupCellHandlers({ getMainWindow });
  setupWorktreeHandlers();
  setupTerminalHandlers({ getMainWindow });
  setupSessionHandlers();
  setupUiStateHandlers();
  setupQuickActionsHandlers();
  setupAppShortcutsHandlers();
  setupTerminusSettingsHandlers();
  setupSessionNamingHandlers();
  setupGatesHandlers();
  setupTmuxHandlers();
  setupWorktreeLinksHandlers();
  setupExplorerHandlers();
  setupWorkbenchHandlers();
  setupRuntimeLogHandlers();
  setupProjectHandlers();
  setupClipboardHandlers();
  setupCommentsHandlers();
  setupHilHandlers();
  setupCaptureHandlers();
  setupActionSheetsHandlers();
  setupVoiceCaptureHandlers();
  setupSystemHandlers();
  setupSessionMapHandlers();
}
