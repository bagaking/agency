import { isAgencyAvailable, isAgencyMethodAvailable, invokeAgencyMethod } from './agencyBridge.core';
import {
  createOptionalAction,
  createOptionalInvoke,
  createOptionalSubscribe,
} from './agencyBridge.factories';

export { isAgencyAvailable, isAgencyMethodAvailable };

// Cells / project / session core
export const listCells = createOptionalInvoke('listCells');
export const createCell = createOptionalInvoke('createCell');
export const listWorktrees = createOptionalInvoke('listWorktrees', { fallback: [] });
export const listBranches = createOptionalInvoke('listBranches', { fallback: [] });
export const getProjectContext = createOptionalInvoke('getProjectContext');
export const listSessions = createOptionalInvoke('listSessions', { fallback: [] });
export const createSession = createOptionalInvoke('createSession');
export const closeSession = createOptionalInvoke('closeSession');
export const detachSession = createOptionalInvoke('detachSession');
export const renameSession = createOptionalInvoke('renameSession');
export const updateSessionMeta = createOptionalInvoke('updateSessionMeta');
export const moveSessionNode = createOptionalInvoke('moveSessionNode');
export const setSessionMouse = createOptionalInvoke('setSessionMouse');
export const prepareSessionContinueOnMobile = createOptionalInvoke('prepareSessionContinueOnMobile');
export const updateCellState = createOptionalInvoke('updateCellState');
export const updateCellMeta = createOptionalInvoke('updateCellMeta');
export const clearCellAttachment = createOptionalInvoke('clearCellAttachment');
export const deleteCell = createOptionalInvoke('deleteCell');

// Runtime send actions
export const logRuntime = createOptionalAction('logRuntime');
export const writeTerminal = createOptionalAction('writeTerminal');
export const dispatchTerminalInput = createOptionalAction('dispatchTerminalInput');
export const dispatchTerminalCommand = createOptionalAction('dispatchTerminalCommand');
export const resizeTerminal = createOptionalAction('resizeTerminal');
export const disposeTerminal = createOptionalAction('disposeTerminal');
export const setSessionInteractive = createOptionalAction('setSessionInteractive');

// Runtime subscriptions
export const onTerminalData = createOptionalSubscribe('onTerminalData');
export const onTerminalError = createOptionalSubscribe('onTerminalError');
export const onTerminalDetached = createOptionalSubscribe('onTerminalDetached');
export const onAppShortcutTriggered = createOptionalSubscribe('onAppShortcutTriggered');
export const onCellsUpdated = createOptionalSubscribe('onCellsUpdated');
export const onVoiceCaptureEvent = createOptionalSubscribe('onVoiceCaptureEvent');
export const onProjectUpdated = createOptionalSubscribe('onProjectUpdated');
export const onRecentProjectsUpdated = createOptionalSubscribe('onRecentProjectsUpdated');
export const onWindowShellUpdated = createOptionalSubscribe('onWindowShellUpdated');
export const onExplorerChanged = createOptionalSubscribe('onExplorerChanged');
export const onMainAgentHarnessProgress = createOptionalSubscribe('onMainAgentHarnessProgress');

// UI state / map
export const getUiState = createOptionalInvoke('getUiState');
export const setUiState = createOptionalInvoke('setUiState');
export const getSessionMap = createOptionalInvoke('getSessionMap');
export const setSessionMap = createOptionalInvoke('setSessionMap');
export const getSessionMapPreview = createOptionalInvoke('getSessionMapPreview');
export const getSessionMapSnapshot = createOptionalInvoke('getSessionMapSnapshot');

// Terminal / settings
export const startTerminal = createOptionalInvoke('startTerminal');
export const getAppShortcuts = createOptionalInvoke('getAppShortcuts');
export const setAppShortcuts = createOptionalInvoke('setAppShortcuts');
export const applyAppShortcuts = createOptionalInvoke('applyAppShortcuts');
export const getQuickActions = createOptionalInvoke('getQuickActions');
export const setQuickActions = createOptionalInvoke('setQuickActions');
export const getReplyQuickPrompts = createOptionalInvoke('getReplyQuickPrompts');
export const setReplyQuickPrompts = createOptionalInvoke('setReplyQuickPrompts');
export const getTerminusSettings = createOptionalInvoke('getTerminusSettings');
export const setTerminusSettings = createOptionalInvoke('setTerminusSettings');
export const getSessionNamingSettings = createOptionalInvoke('getSessionNamingSettings');
export const setSessionNamingSettings = createOptionalInvoke('setSessionNamingSettings');
export const getGates = createOptionalInvoke('getGates');
export const setGates = createOptionalInvoke('setGates');
export const checkGates = createOptionalInvoke('checkGates');
export const getTmuxStatus = createOptionalInvoke('getTmuxStatus');

// Worktree links
export const getWorktreeLinks = createOptionalInvoke('getWorktreeLinks');
export const setWorktreeLinks = createOptionalInvoke('setWorktreeLinks');
export const applyWorktreeLink = createOptionalInvoke('applyWorktreeLink');
export const applyAllWorktreeLinks = createOptionalInvoke('applyAllWorktreeLinks');

// Explorer / file interaction
export const getExplorerRoot = createOptionalInvoke('getExplorerRoot');
export const listExplorerEntries = createOptionalInvoke('listExplorerEntries');
export const getExplorerStatus = createOptionalInvoke('getExplorerStatus');
export const searchExplorerFiles = createOptionalInvoke('searchExplorerFiles');
export const searchExplorerContent = createOptionalInvoke('searchExplorerContent');
export const replaceExplorerContent = createOptionalInvoke('replaceExplorerContent');
export const getExplorerProjectPolicy = createOptionalInvoke('getExplorerProjectPolicy');
export const getWorkbenchProjectPolicy = createOptionalInvoke('getWorkbenchProjectPolicy');
export const watchExplorer = createOptionalInvoke('watchExplorer');
export const performFileIntent = createOptionalInvoke('performFileIntent');
export const performToolFileIntent = createOptionalInvoke('performToolFileIntent');
export const classifyAgentFiles = createOptionalInvoke('classifyAgentFiles');
export const materializeClipboard = createOptionalInvoke('materializeClipboard');
export const materializeMarkdown = createOptionalInvoke('materializeMarkdown');

// HIL / comments / action sheets
export const listComments = createOptionalInvoke('listComments');
export const submitComment = createOptionalInvoke('submitComment');
export const listSessionReplies = createOptionalInvoke('listSessionReplies', { fallback: [] });
export const createSessionReply = createOptionalInvoke('createSessionReply');
export const updateSessionReply = createOptionalInvoke('updateSessionReply');
export const updateHilItem = createOptionalInvoke('updateHilItem');
export const deleteHilItem = createOptionalInvoke('deleteHilItem');
export const promoteHilItem = createOptionalInvoke('promoteHilItem');
export const fetchHilExcerpt = createOptionalInvoke('fetchHilExcerpt');
export const listHilItems = createOptionalInvoke('listHilItems');
export const createHilItem = createOptionalInvoke('createHilItem');
export const listActionSheets = createOptionalInvoke('listActionSheets');
export const readActionSheet = createOptionalInvoke('readActionSheet');
export const createActionSheet = createOptionalInvoke('createActionSheet');
export const updateActionSheetStatus = createOptionalInvoke('updateActionSheetStatus');
export const archiveActionSheet = createOptionalInvoke('archiveActionSheet');
export const deleteActionSheet = createOptionalInvoke('deleteActionSheet');
export const updateActionSheetPlan = createOptionalInvoke('updateActionSheetPlan');
export const updateActionSheetPrompt = createOptionalInvoke('updateActionSheetPrompt');
export const updateActionSheetChecks = createOptionalInvoke('updateActionSheetChecks');
export const runActionSheetChecks = createOptionalInvoke('runActionSheetChecks');

// Delivery / capture / voice
export const startDelivery = createOptionalInvoke('startDelivery');
export const confirmDelivery = createOptionalInvoke('confirmDelivery');
export const getDeliveryStatus = createOptionalInvoke('getDeliveryStatus');
export const getDeliveryTimeline = createOptionalInvoke('getDeliveryTimeline');
export const performSessionRuntimeIntent = createOptionalInvoke('performSessionRuntimeIntent');
export const inspectMainAgentHarnessRun = createOptionalInvoke('inspectMainAgentHarnessRun');
export const cancelMainAgentHarnessRun = createOptionalInvoke('cancelMainAgentHarnessRun');
export const resumeMainAgentHarnessRun = createOptionalInvoke('resumeMainAgentHarnessRun');
export const listMainAgentHarnessRuns = createOptionalInvoke('listMainAgentHarnessRuns', {
  fallback: [],
});
export const getMainAgentHarnessSettings = createOptionalInvoke('getMainAgentHarnessSettings');
export const setMainAgentHarnessSettings = createOptionalInvoke('setMainAgentHarnessSettings');
export const getCommanderStatus = createOptionalInvoke('getCommanderStatus');
export const performCommanderAction = createOptionalInvoke('performCommanderAction');
export const startScreenshotCapture = createOptionalInvoke('startScreenshotCapture');
export const saveCaptureAsset = createOptionalInvoke('saveCaptureAsset');
export const copyCaptureToClipboard = createOptionalInvoke('copyCaptureToClipboard');
export const getVoiceCaptureSupport = createOptionalInvoke('getVoiceCaptureSupport');
export const startVoiceCapture = createOptionalInvoke('startVoiceCapture');
export const stopVoiceCapture = createOptionalInvoke('stopVoiceCapture');
export const saveVoiceCaptureAudio = createOptionalInvoke('saveVoiceCaptureAudio');
export const discardVoiceCaptureAudio = createOptionalInvoke('discardVoiceCaptureAudio');

// Workbench
export const getWorkbenchFileUrl = createOptionalInvoke('getWorkbenchFileUrl');
export const getFileSnippet = createOptionalInvoke('getFileSnippet');
export const readWorkbenchEntry = createOptionalInvoke('readWorkbenchEntry');
export const statWorkbenchEntry = createOptionalInvoke('statWorkbenchEntry');
export const writeWorkbenchEntry = createOptionalInvoke('writeWorkbenchEntry');
export const diffWorkbenchEntry = createOptionalInvoke('diffWorkbenchEntry');
export const blameWorkbenchEntry = createOptionalInvoke('blameWorkbenchEntry');

// Project-level helpers / OS
export const selectProjectRoot = createOptionalInvoke('selectProjectRoot');
export const setProjectRoot = createOptionalInvoke('setProjectRoot');
export const listWindowShells = createOptionalInvoke('listWindowShells', { fallback: { windows: [] } });
export const createWindowShell = createOptionalInvoke('createWindowShell');
export const focusWindowShell = createOptionalInvoke('focusWindowShell');
export const openExternalUrl = createOptionalInvoke('openExternalUrl');
export const openSystemPermissions = createOptionalInvoke('openSystemPermissions');

export const getPathForDroppedFile = (file: File): string =>
  invokeAgencyMethod('getPathForDroppedFile', file, '');
