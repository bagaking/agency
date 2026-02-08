import { contextBridge, ipcRenderer, webUtils } from 'electron';
import fs from 'node:fs';

import { normalizeRelPath, resolveSafePath } from './services/shared/pathSafety';
import {
  createInvokeBridge,
  createSendBridge,
  createSubscribeBridge,
} from './preload/ipcBridgeHelpers';

const MAX_TEXT_BYTES = Number(process.env.AGENCY_WORKBENCH_MAX_BYTES || 1024 * 1024);
const BINARY_CHECK_BYTES = 8000;
const WORKBENCH_TIMEOUT_MS = Number(process.env.AGENCY_WORKBENCH_TIMEOUT_MS || 8000);

type EntryPayload = {
  rootPath?: string;
  targetPath?: string;
};

async function readLocalTextFile({ rootPath, targetPath }: EntryPayload) {
  if (!targetPath) {
    throw new Error('targetPath is required.');
  }

  const absolute = resolveSafePath(rootPath, targetPath, { fallbackToCwd: true });
  const stats = await fs.promises.stat(absolute);
  if (!stats.isFile()) {
    throw new Error('Target is not a file.');
  }

  const size = stats.size || 0;
  const length = Math.min(size, MAX_TEXT_BYTES);
  const handle = await fs.promises.open(absolute, 'r');
  const buffer = Buffer.alloc(length);
  try {
    await handle.read(buffer, 0, length, 0);
  } finally {
    await handle.close();
  }

  const binary = buffer.slice(0, Math.min(length, BINARY_CHECK_BYTES)).includes(0);
  return {
    path: normalizeRelPath(targetPath),
    size,
    mtimeMs: stats.mtimeMs || 0,
    truncated: size > MAX_TEXT_BYTES,
    binary,
    content: binary ? '' : buffer.toString('utf-8'),
  };
}

async function statLocalEntry({ rootPath, targetPath }: EntryPayload) {
  if (!targetPath) {
    throw new Error('targetPath is required.');
  }

  const absolute = resolveSafePath(rootPath, targetPath, { fallbackToCwd: true });
  const stats = await fs.promises.stat(absolute);
  return {
    path: normalizeRelPath(targetPath),
    absolutePath: absolute,
    size: stats.size || 0,
    mtimeMs: stats.mtimeMs || 0,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
  };
}

function invokeWithTimeout(channel: string, payload?: unknown, timeoutMs = WORKBENCH_TIMEOUT_MS) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return ipcRenderer.invoke(channel, payload);
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`IPC timeout for ${channel}`));
    }, timeoutMs);
  });

  return Promise.race([ipcRenderer.invoke(channel, payload), timeoutPromise]).finally(() => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  });
}

const INVOKE_CHANNELS: Record<string, string> = {
  listCells: 'cells:list',
  listWorktrees: 'worktrees:list',
  getProjectContext: 'project:get',
  selectProjectRoot: 'project:select',
  setProjectRoot: 'project:set',
  clearProjectRoot: 'project:clear',
  listSessions: 'sessions:list',
  createSession: 'sessions:create',
  closeSession: 'sessions:close',
  detachSession: 'sessions:detach',
  renameSession: 'sessions:rename',
  updateSessionMeta: 'sessions:updateMeta',
  setSessionMouse: 'sessions:setMouse',
  getUiState: 'ui-state:get',
  setUiState: 'ui-state:set',
  getSessionMap: 'session-map:get',
  setSessionMap: 'session-map:set',
  getSessionMapPreview: 'session-map:preview',
  getSessionMapSnapshot: 'session-map:snapshot',
  getAppShortcuts: 'app-shortcuts:get',
  setAppShortcuts: 'app-shortcuts:set',
  applyAppShortcuts: 'app-shortcuts:apply',
  getQuickActions: 'quick-actions:get',
  setQuickActions: 'quick-actions:set',
  getTerminusSettings: 'terminus-settings:get',
  setTerminusSettings: 'terminus-settings:set',
  getSessionNamingSettings: 'session-naming:get',
  setSessionNamingSettings: 'session-naming:set',
  getGates: 'gates:get',
  setGates: 'gates:set',
  checkGates: 'gates:check',
  getWorktreeLinks: 'worktree-links:get',
  setWorktreeLinks: 'worktree-links:set',
  applyWorktreeLink: 'worktree-links:apply',
  applyAllWorktreeLinks: 'worktree-links:applyAll',
  getTmuxStatus: 'tmux:status',
  getExplorerRoot: 'explorer:root',
  listExplorerEntries: 'explorer:list',
  getExplorerStatus: 'explorer:status',
  searchExplorerFiles: 'explorer:search',
  readExplorerEntry: 'explorer:read',
  watchExplorer: 'explorer:watch',
  writeWorkbenchEntry: 'workbench:write',
  getWorkbenchFileUrl: 'workbench:fileUrl',
  getFileSnippet: 'workbench:snippet',
  diffWorkbenchEntry: 'workbench:diff',
  materializeClipboard: 'clipboard:materialize',
  materializeMarkdown: 'clipboard:materializeMarkdown',
  createExplorerEntry: 'explorer:create',
  renameExplorerEntry: 'explorer:rename',
  deleteExplorerEntry: 'explorer:delete',
  copyExplorerEntry: 'explorer:copy',
  importExplorerEntries: 'explorer:import',
  revealExplorerEntry: 'explorer:reveal',
  listComments: 'comments:list',
  submitComment: 'comments:submit',
  listHilItems: 'hil:list',
  createHilItem: 'hil:create',
  updateHilItem: 'hil:update',
  deleteHilItem: 'hil:delete',
  promoteHilItem: 'hil:promote',
  fetchHilExcerpt: 'hil:excerpt:fetch',
  listActionSheets: 'actionSheets:list',
  readActionSheet: 'actionSheets:read',
  createActionSheet: 'actionSheets:create',
  updateActionSheetStatus: 'actionSheets:updateStatus',
  archiveActionSheet: 'actionSheets:archive',
  deleteActionSheet: 'actionSheets:delete',
  updateActionSheetPlan: 'actionSheets:updatePlan',
  updateActionSheetPrompt: 'actionSheets:updatePrompt',
  updateActionSheetChecks: 'actionSheets:updateChecks',
  runActionSheetChecks: 'actionSheets:runChecks',
  startScreenshotCapture: 'capture:start',
  saveCaptureAsset: 'capture:saveAsset',
  copyCaptureToClipboard: 'capture:copy',
  getVoiceCaptureSupport: 'voice:capture:support',
  startVoiceCapture: 'voice:capture:start',
  stopVoiceCapture: 'voice:capture:stop',
  saveVoiceCaptureAudio: 'voice:capture:saveAudio',
  discardVoiceCaptureAudio: 'voice:capture:discardAudio',
  createCell: 'cells:create',
  updateCellState: 'cells:updateState',
  updateCellMeta: 'cells:updateMeta',
  startTerminal: 'terminal:start',
  openSystemPermissions: 'system:openPermissions',
};

const SEND_CHANNELS: Record<string, string> = {
  logRuntime: 'runtime-log:write',
  writeTerminal: 'terminal:write',
  resizeTerminal: 'terminal:resize',
  disposeTerminal: 'terminal:dispose',
  setSessionInteractive: 'session:interactive',
};

const SUBSCRIBE_CHANNELS: Record<string, string> = {
  onProjectUpdated: 'project:updated',
  onRecentProjectsUpdated: 'project:recents',
  onVoiceCaptureEvent: 'voice:capture:event',
  onAppShortcutTriggered: 'app-shortcuts:trigger',
  onTerminalData: 'terminal:data',
  onTerminalError: 'terminal:error',
  onTerminalDetached: 'terminal:detached',
  onCellsUpdated: 'cells:updated',
  onExplorerChanged: 'explorer:changed',
};

const agencyBridge = {
  ...createInvokeBridge(INVOKE_CHANNELS),
  ...createSendBridge(SEND_CHANNELS),
  ...createSubscribeBridge(SUBSCRIBE_CHANNELS),
  getPathForDroppedFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (error) {
      return '';
    }
  },
  readWorkbenchEntry: async (payload?: EntryPayload) => {
    try {
      return await invokeWithTimeout('workbench:read', payload);
    } catch (error) {
      return readLocalTextFile(payload || {});
    }
  },
  statWorkbenchEntry: async (payload?: EntryPayload) => {
    try {
      return await invokeWithTimeout('workbench:stat', payload);
    } catch (error) {
      return statLocalEntry(payload || {});
    }
  },
};

contextBridge.exposeInMainWorld('agency', agencyBridge);
