const getAgencyApi = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.agency || null;
};

export const isAgencyAvailable = () => Boolean(getAgencyApi());

export const listCells = async (payload) => {
  const api = getAgencyApi();
  if (!api?.listCells) {
    return null;
  }
  return api.listCells(payload);
};

export const getProjectContext = async () => {
  const api = getAgencyApi();
  if (!api?.getProjectContext) {
    return null;
  }
  return api.getProjectContext();
};

export const logRuntime = async (payload) => {
  const api = getAgencyApi();
  if (!api?.logRuntime) {
    return null;
  }
  return api.logRuntime(payload);
};

export const getUiState = async () => {
  const api = getAgencyApi();
  if (!api?.getUiState) {
    return null;
  }
  return api.getUiState();
};

export const setUiState = async (payload) => {
  const api = getAgencyApi();
  if (!api?.setUiState) {
    return null;
  }
  return api.setUiState(payload);
};

export const getSessionMap = async (payload) => {
  const api = getAgencyApi();
  if (!api?.getSessionMap) {
    return null;
  }
  return api.getSessionMap(payload);
};

export const setSessionMap = async (payload) => {
  const api = getAgencyApi();
  if (!api?.setSessionMap) {
    return null;
  }
  return api.setSessionMap(payload);
};

export const getSessionMapPreview = async (payload) => {
  const api = getAgencyApi();
  if (!api?.getSessionMapPreview) {
    return null;
  }
  return api.getSessionMapPreview(payload);
};

export const getSessionMapSnapshot = async (payload) => {
  const api = getAgencyApi();
  if (!api?.getSessionMapSnapshot) {
    return null;
  }
  return api.getSessionMapSnapshot(payload);
};

export const startTerminal = async (payload) => {
  const api = getAgencyApi();
  if (!api?.startTerminal) {
    return null;
  }
  return api.startTerminal(payload);
};

export const setSessionInteractive = (payload) => {
  const api = getAgencyApi();
  if (!api?.setSessionInteractive) {
    return null;
  }
  return api.setSessionInteractive(payload);
};

export const onTerminalData = (handler) => {
  const api = getAgencyApi();
  if (!api?.onTerminalData) {
    return null;
  }
  return api.onTerminalData(handler);
};

export const onTerminalError = (handler) => {
  const api = getAgencyApi();
  if (!api?.onTerminalError) {
    return null;
  }
  return api.onTerminalError(handler);
};

export const onTerminalDetached = (handler) => {
  const api = getAgencyApi();
  if (!api?.onTerminalDetached) {
    return null;
  }
  return api.onTerminalDetached(handler);
};

export const getAppShortcuts = async (payload) => {
  const api = getAgencyApi();
  if (!api?.getAppShortcuts) {
    return null;
  }
  return api.getAppShortcuts(payload);
};

export const setAppShortcuts = async (payload) => {
  const api = getAgencyApi();
  if (!api?.setAppShortcuts) {
    return null;
  }
  return api.setAppShortcuts(payload);
};

export const applyAppShortcuts = async (payload) => {
  const api = getAgencyApi();
  if (!api?.applyAppShortcuts) {
    return null;
  }
  return api.applyAppShortcuts(payload);
};

export const getQuickActions = async (payload) => {
  const api = getAgencyApi();
  if (!api?.getQuickActions) {
    return null;
  }
  return api.getQuickActions(payload);
};

export const setQuickActions = async (payload) => {
  const api = getAgencyApi();
  if (!api?.setQuickActions) {
    return null;
  }
  return api.setQuickActions(payload);
};

export const getTerminusSettings = async (payload) => {
  const api = getAgencyApi();
  if (!api?.getTerminusSettings) {
    return null;
  }
  return api.getTerminusSettings(payload);
};

export const setTerminusSettings = async (payload) => {
  const api = getAgencyApi();
  if (!api?.setTerminusSettings) {
    return null;
  }
  return api.setTerminusSettings(payload);
};

export const getSessionNamingSettings = async (payload) => {
  const api = getAgencyApi();
  if (!api?.getSessionNamingSettings) {
    return null;
  }
  return api.getSessionNamingSettings(payload);
};

export const setSessionNamingSettings = async (payload) => {
  const api = getAgencyApi();
  if (!api?.setSessionNamingSettings) {
    return null;
  }
  return api.setSessionNamingSettings(payload);
};

export const onAppShortcutTriggered = (handler) => {
  const api = getAgencyApi();
  if (!api?.onAppShortcutTriggered) {
    return null;
  }
  return api.onAppShortcutTriggered(handler);
};

export const onCellsUpdated = (handler) => {
  const api = getAgencyApi();
  if (!api?.onCellsUpdated) {
    return null;
  }
  return api.onCellsUpdated(handler);
};

export const getTmuxStatus = async () => {
  const api = getAgencyApi();
  if (!api?.getTmuxStatus) {
    return null;
  }
  return api.getTmuxStatus();
};

export const listComments = async (payload) => {
  const api = getAgencyApi();
  if (!api?.listComments) {
    return null;
  }
  return api.listComments(payload);
};

export const submitComment = async (payload) => {
  const api = getAgencyApi();
  if (!api?.submitComment) {
    return null;
  }
  return api.submitComment(payload);
};

export const updateHilItem = async (payload) => {
  const api = getAgencyApi();
  if (!api?.updateHilItem) {
    return null;
  }
  return api.updateHilItem(payload);
};

export const deleteHilItem = async (payload) => {
  const api = getAgencyApi();
  if (!api?.deleteHilItem) {
    return null;
  }
  return api.deleteHilItem(payload);
};

export const promoteHilItem = async (payload) => {
  const api = getAgencyApi();
  if (!api?.promoteHilItem) {
    return null;
  }
  return api.promoteHilItem(payload);
};

export const fetchHilExcerpt = async (payload) => {
  const api = getAgencyApi();
  if (!api?.fetchHilExcerpt) {
    return null;
  }
  return api.fetchHilExcerpt(payload);
};

export const listHilItems = async (payload) => {
  const api = getAgencyApi();
  if (!api?.listHilItems) {
    return null;
  }
  return api.listHilItems(payload);
};

export const createHilItem = async (payload) => {
  const api = getAgencyApi();
  if (!api?.createHilItem) {
    return null;
  }
  return api.createHilItem(payload);
};

export const listActionSheets = async (payload) => {
  const api = getAgencyApi();
  if (!api?.listActionSheets) {
    return null;
  }
  return api.listActionSheets(payload);
};

export const readActionSheet = async (payload) => {
  const api = getAgencyApi();
  if (!api?.readActionSheet) {
    return null;
  }
  return api.readActionSheet(payload);
};

export const createActionSheet = async (payload) => {
  const api = getAgencyApi();
  if (!api?.createActionSheet) {
    return null;
  }
  return api.createActionSheet(payload);
};

export const updateActionSheetStatus = async (payload) => {
  const api = getAgencyApi();
  if (!api?.updateActionSheetStatus) {
    return null;
  }
  return api.updateActionSheetStatus(payload);
};

export const archiveActionSheet = async (payload) => {
  const api = getAgencyApi();
  if (!api?.archiveActionSheet) {
    return null;
  }
  return api.archiveActionSheet(payload);
};

export const deleteActionSheet = async (payload) => {
  const api = getAgencyApi();
  if (!api?.deleteActionSheet) {
    return null;
  }
  return api.deleteActionSheet(payload);
};

export const updateActionSheetPlan = async (payload) => {
  const api = getAgencyApi();
  if (!api?.updateActionSheetPlan) {
    return null;
  }
  return api.updateActionSheetPlan(payload);
};

export const updateActionSheetPrompt = async (payload) => {
  const api = getAgencyApi();
  if (!api?.updateActionSheetPrompt) {
    return null;
  }
  return api.updateActionSheetPrompt(payload);
};

export const updateActionSheetChecks = async (payload) => {
  const api = getAgencyApi();
  if (!api?.updateActionSheetChecks) {
    return null;
  }
  return api.updateActionSheetChecks(payload);
};

export const runActionSheetChecks = async (payload) => {
  const api = getAgencyApi();
  if (!api?.runActionSheetChecks) {
    return null;
  }
  return api.runActionSheetChecks(payload);
};

export const startScreenshotCapture = async (payload) => {
  const api = getAgencyApi();
  if (!api?.startScreenshotCapture) {
    return null;
  }
  return api.startScreenshotCapture(payload);
};

export const saveCaptureAsset = async (payload) => {
  const api = getAgencyApi();
  if (!api?.saveCaptureAsset) {
    return null;
  }
  return api.saveCaptureAsset(payload);
};

export const copyCaptureToClipboard = async (payload) => {
  const api = getAgencyApi();
  if (!api?.copyCaptureToClipboard) {
    return null;
  }
  return api.copyCaptureToClipboard(payload);
};

export const getVoiceCaptureSupport = async () => {
  const api = getAgencyApi();
  if (!api?.getVoiceCaptureSupport) {
    return null;
  }
  return api.getVoiceCaptureSupport();
};

export const startVoiceCapture = async (payload) => {
  const api = getAgencyApi();
  if (!api?.startVoiceCapture) {
    return null;
  }
  return api.startVoiceCapture(payload);
};

export const stopVoiceCapture = async (payload) => {
  const api = getAgencyApi();
  if (!api?.stopVoiceCapture) {
    return null;
  }
  return api.stopVoiceCapture(payload);
};

export const saveVoiceCaptureAudio = async (payload) => {
  const api = getAgencyApi();
  if (!api?.saveVoiceCaptureAudio) {
    return null;
  }
  return api.saveVoiceCaptureAudio(payload);
};

export const discardVoiceCaptureAudio = async (payload) => {
  const api = getAgencyApi();
  if (!api?.discardVoiceCaptureAudio) {
    return null;
  }
  return api.discardVoiceCaptureAudio(payload);
};

export const onVoiceCaptureEvent = (handler) => {
  const api = getAgencyApi();
  if (!api?.onVoiceCaptureEvent) {
    return null;
  }
  return api.onVoiceCaptureEvent(handler);
};

export const materializeClipboard = async (payload) => {
  const api = getAgencyApi();
  if (!api?.materializeClipboard) {
    return null;
  }
  return api.materializeClipboard(payload);
};

export const getWorkbenchFileUrl = async (payload) => {
  const api = getAgencyApi();
  if (!api?.getWorkbenchFileUrl) {
    return null;
  }
  return api.getWorkbenchFileUrl(payload);
};

export const getFileSnippet = async (payload) => {
  const api = getAgencyApi();
  if (!api?.getFileSnippet) {
    return null;
  }
  return api.getFileSnippet(payload);
};

export const readWorkbenchEntry = async (payload) => {
  const api = getAgencyApi();
  if (!api?.readWorkbenchEntry) {
    return null;
  }
  return api.readWorkbenchEntry(payload);
};

export const selectProjectRoot = async () => {
  const api = getAgencyApi();
  if (!api?.selectProjectRoot) {
    return null;
  }
  return api.selectProjectRoot();
};

export const setProjectRoot = async (payload) => {
  const api = getAgencyApi();
  if (!api?.setProjectRoot) {
    return null;
  }
  return api.setProjectRoot(payload);
};

export const onProjectUpdated = (handler) => {
  const api = getAgencyApi();
  if (!api?.onProjectUpdated) {
    return null;
  }
  return api.onProjectUpdated(handler);
};

export const onRecentProjectsUpdated = (handler) => {
  const api = getAgencyApi();
  if (!api?.onRecentProjectsUpdated) {
    return null;
  }
  return api.onRecentProjectsUpdated(handler);
};

export const updateCellState = async (payload) => {
  const api = getAgencyApi();
  if (!api?.updateCellState) {
    return null;
  }
  return api.updateCellState(payload);
};

export const updateCellMeta = async (payload) => {
  const api = getAgencyApi();
  if (!api?.updateCellMeta) {
    return null;
  }
  return api.updateCellMeta(payload);
};

export const updateSessionMeta = async (payload) => {
  const api = getAgencyApi();
  if (!api?.updateSessionMeta) {
    return null;
  }
  return api.updateSessionMeta(payload);
};

export const setSessionMouse = async (payload) => {
  const api = getAgencyApi();
  if (!api?.setSessionMouse) {
    return null;
  }
  return api.setSessionMouse(payload);
};

export const createCell = async (payload) => {
  const api = getAgencyApi();
  if (!api?.createCell) {
    return null;
  }
  return api.createCell(payload);
};

export const openSystemPermissions = async (payload) => {
  const api = getAgencyApi();
  if (!api?.openSystemPermissions) {
    return null;
  }
  return api.openSystemPermissions(payload);
};
