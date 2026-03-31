import type { BrowserWindow } from "electron";

import { setupActionSheetsHandlers } from "../ipc/handlers/actionSheets";
import { setupAppShortcutsHandlers } from "../ipc/handlers/appShortcuts";
import { setupCaptureHandlers } from "../ipc/handlers/capture";
import { setupCellHandlers } from "../ipc/handlers/cells";
import { setupCommanderActionHandlers } from "../ipc/handlers/commander";
import { setupClipboardHandlers } from "../ipc/handlers/clipboard";
import { setupCommanderStatusHandlers } from "../ipc/handlers/commanderStatus";
import { setupCommentsHandlers } from "../ipc/handlers/comments";
import { setupDeliveryHandlers } from "../ipc/handlers/delivery";
import { setupExplorerHandlers } from "../ipc/handlers/explorer";
import { setupFileInteractionHandlers } from "../ipc/handlers/fileInteraction";
import { setupGatesHandlers } from "../ipc/handlers/gates";
import { setupHilHandlers } from "../ipc/handlers/hil";
import { setupMainAgentHarnessHandlers } from "../ipc/handlers/mainAgentHarness";
import { setupMainAgentHarnessSettingsHandlers } from "../ipc/handlers/mainAgentHarnessSettings";
import { setupProjectHandlers } from "../ipc/handlers/project";
import { setupQuickActionsHandlers } from "../ipc/handlers/quickActions";
import { setupReplyQuickPromptsHandlers } from "../ipc/handlers/replyQuickPrompts";
import { setupRuntimeLogHandlers } from "../ipc/handlers/runtimeLog";
import { setupSessionMapHandlers } from "../ipc/handlers/sessionMap";
import { setupSessionNamingHandlers } from "../ipc/handlers/sessionNaming";
import { setupSessionRepliesHandlers } from "../ipc/handlers/sessionReplies";
import { setupSessionHandlers } from "../ipc/handlers/sessions";
import { setupSessionRuntimeHandlers } from "../ipc/handlers/sessionRuntime";
import { setupSystemHandlers } from "../ipc/handlers/system";
import { setupTerminalHandlers } from "../ipc/handlers/terminal";
import { setupTerminusSettingsHandlers } from "../ipc/handlers/terminusSettings";
import { setupTmuxHandlers } from "../ipc/handlers/tmux";
import { setupUiStateHandlers } from "../ipc/handlers/uiState";
import { setupVoiceCaptureHandlers } from "../ipc/handlers/voiceCapture";
import { setupWorkbenchHandlers } from "../ipc/handlers/workbench";
import { setupWindowShellHandlers } from "../ipc/handlers/windowShell";
import { setupWindowHomeShellHandlers } from "../ipc/handlers/windowHomeShell";
import { setupWorktreeHandlers } from "../ipc/handlers/worktrees";
import { setupWorktreeLinksHandlers } from "../ipc/handlers/worktreeLinks";

type MainWindowGetter = () => BrowserWindow | undefined;
type CreateEditorWindow = (options?: {
  startEmpty?: boolean;
  projectRoot?: string;
  windowStateId?: string;
  allowStoredProjectRoot?: boolean;
}) => Promise<BrowserWindow | undefined>;
type HandlerDeps = { getMainWindow: MainWindowGetter; createEditorWindow: CreateEditorWindow };
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
  withoutDeps(setupSessionRepliesHandlers),
  withoutDeps(setupSessionRuntimeHandlers),
  withoutDeps(setupMainAgentHarnessHandlers),
  withoutDeps(setupMainAgentHarnessSettingsHandlers),
  withoutDeps(setupUiStateHandlers),
  withoutDeps(setupQuickActionsHandlers),
  withoutDeps(setupReplyQuickPromptsHandlers),
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
  withoutDeps(setupCommanderActionHandlers),
  withoutDeps(setupCommanderStatusHandlers),
  withoutDeps(setupCommentsHandlers),
  withoutDeps(setupDeliveryHandlers),
  withoutDeps(setupHilHandlers),
  withoutDeps(setupCaptureHandlers),
  withoutDeps(setupActionSheetsHandlers),
  withoutDeps(setupVoiceCaptureHandlers),
  withoutDeps(setupSystemHandlers),
  withoutDeps(setupSessionMapHandlers),
  withoutDeps(setupWindowHomeShellHandlers),
  withMainWindow(setupWindowShellHandlers),
];

export function setupMainIpcHandlers(
  getMainWindow: MainWindowGetter,
  createEditorWindow: CreateEditorWindow
): void {
  const deps = { getMainWindow, createEditorWindow };
  IPC_REGISTRATIONS.forEach((register) => register(deps));
}
