import type { BrowserWindow } from "electron";

import { setupActionSheetsHandlers } from "../ipc/handlers/actionSheets";
import { setupAppShortcutsHandlers } from "../ipc/handlers/appShortcuts";
import { setupCaptureHandlers } from "../ipc/handlers/capture";
import { setupCellHandlers } from "../ipc/handlers/cells";
import { setupClipboardHandlers } from "../ipc/handlers/clipboard";
import { setupCommentsHandlers } from "../ipc/handlers/comments";
import { setupExplorerHandlers } from "../ipc/handlers/explorer";
import { setupFileInteractionHandlers } from "../ipc/handlers/fileInteraction";
import { setupGatesHandlers } from "../ipc/handlers/gates";
import { setupHilHandlers } from "../ipc/handlers/hil";
import { setupProjectHandlers } from "../ipc/handlers/project";
import { setupQuickActionsHandlers } from "../ipc/handlers/quickActions";
import { setupRuntimeLogHandlers } from "../ipc/handlers/runtimeLog";
import { setupSessionMapHandlers } from "../ipc/handlers/sessionMap";
import { setupSessionNamingHandlers } from "../ipc/handlers/sessionNaming";
import { setupSessionHandlers } from "../ipc/handlers/sessions";
import { setupSystemHandlers } from "../ipc/handlers/system";
import { setupTerminalHandlers } from "../ipc/handlers/terminal";
import { setupTerminusSettingsHandlers } from "../ipc/handlers/terminusSettings";
import { setupTmuxHandlers } from "../ipc/handlers/tmux";
import { setupUiStateHandlers } from "../ipc/handlers/uiState";
import { setupVoiceCaptureHandlers } from "../ipc/handlers/voiceCapture";
import { setupWorkbenchHandlers } from "../ipc/handlers/workbench";
import { setupWorktreeHandlers } from "../ipc/handlers/worktrees";
import { setupWorktreeLinksHandlers } from "../ipc/handlers/worktreeLinks";

type MainWindowGetter = () => BrowserWindow | undefined;
type HandlerDeps = { getMainWindow: MainWindowGetter };
type IpcRegistration = (deps: HandlerDeps) => void;

const withMainWindow = (
  setup: (deps: HandlerDeps) => void
): IpcRegistration => {
  return (deps) => setup(deps);
};

const withoutDeps = (setup: () => void): IpcRegistration => {
  return () => setup();
};

const IPC_REGISTRATIONS: IpcRegistration[] = [
  withMainWindow(setupCellHandlers),
  withoutDeps(setupWorktreeHandlers),
  withMainWindow(setupTerminalHandlers),
  withoutDeps(setupSessionHandlers),
  withoutDeps(setupUiStateHandlers),
  withoutDeps(setupQuickActionsHandlers),
  withoutDeps(setupAppShortcutsHandlers),
  withoutDeps(setupTerminusSettingsHandlers),
  withoutDeps(setupSessionNamingHandlers),
  withoutDeps(setupGatesHandlers),
  withoutDeps(setupTmuxHandlers),
  withoutDeps(setupWorktreeLinksHandlers),
  withoutDeps(setupExplorerHandlers),
  withoutDeps(setupFileInteractionHandlers),
  withoutDeps(setupWorkbenchHandlers),
  withoutDeps(setupRuntimeLogHandlers),
  withoutDeps(setupProjectHandlers),
  withoutDeps(setupClipboardHandlers),
  withoutDeps(setupCommentsHandlers),
  withoutDeps(setupHilHandlers),
  withoutDeps(setupCaptureHandlers),
  withoutDeps(setupActionSheetsHandlers),
  withoutDeps(setupVoiceCaptureHandlers),
  withoutDeps(setupSystemHandlers),
  withoutDeps(setupSessionMapHandlers),
];

export function setupMainIpcHandlers(getMainWindow: MainWindowGetter): void {
  const deps = { getMainWindow };
  IPC_REGISTRATIONS.forEach((register) => register(deps));
}
