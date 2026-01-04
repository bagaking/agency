const getAgencyApi = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.agency || null;
};

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

export const promoteHilItem = async (payload) => {
  const api = getAgencyApi();
  if (!api?.promoteHilItem) {
    return null;
  }
  return api.promoteHilItem(payload);
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

export const createCell = async (payload) => {
  const api = getAgencyApi();
  if (!api?.createCell) {
    return null;
  }
  return api.createCell(payload);
};
