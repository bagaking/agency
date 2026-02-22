const { desktopCapturer, screen, systemPreferences } = require('electron');

const toDisplayId = (display) => String(display?.id ?? '');

function getScreenAccessStatus() {
  if (process.platform !== 'darwin') {
    return '';
  }
  try {
    return systemPreferences?.getMediaAccessStatus?.('screen') || '';
  } catch {
    return '';
  }
}

function getScreenPermissionHint(status = getScreenAccessStatus()) {
  if (process.platform !== 'darwin') {
    return '';
  }
  if (!status || status === 'granted') {
    return '';
  }
  if (status === 'not-determined') {
    return ' macOS Screen Recording permission is "not-determined". Grant access when prompted, then restart Agency.';
  }
  return ` macOS Screen Recording permission is "${status}". Enable Agency in System Settings > Privacy & Security > Screen Recording, then restart Agency.`;
}

function buildThumbnailSizes(display) {
  const scaleFactor = display.scaleFactor || 1;
  const size = display.size || { width: display.bounds.width, height: display.bounds.height };
  const physicalSize = {
    width: Math.max(1, Math.round(size.width * scaleFactor)),
    height: Math.max(1, Math.round(size.height * scaleFactor)),
  };
  const dipSize = {
    width: Math.max(1, Math.round(size.width)),
    height: Math.max(1, Math.round(size.height)),
  };
  const hdSize = {
    width: Math.max(1, Math.min(dipSize.width, 1920)),
    height: Math.max(1, Math.min(dipSize.height, 1080)),
  };
  const keyed = new Set();
  return [physicalSize, dipSize, hdSize].filter((entry) => {
    const key = `${entry.width}x${entry.height}`;
    if (keyed.has(key)) {
      return false;
    }
    keyed.add(key);
    return true;
  });
}

async function getScreenSourcesWithRetry(display, statusHint = '') {
  const sizes = buildThumbnailSizes(display);
  let lastError = null;
  for (const thumbnailSize of sizes) {
    try {
      return await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize,
        fetchWindowIcons: false,
      });
    } catch (error) {
      lastError = error;
    }
  }
  const reason = lastError?.message || 'Failed to get sources.';
  const status = getScreenAccessStatus() || statusHint;
  throw new Error(`${reason}${getScreenPermissionHint(status)}`);
}

async function getDisplaySource(displayId) {
  const display = screen.getAllDisplays().find((entry) => String(entry.id) === String(displayId));
  if (!display) {
    throw new Error('Display not found for capture.');
  }
  const screenStatus = getScreenAccessStatus();
  if (screenStatus === 'denied' || screenStatus === 'restricted') {
    throw new Error(`Screen recording permission is required before capture.${getScreenPermissionHint(screenStatus)}`);
  }
  const scaleFactor = display.scaleFactor || 1;
  const candidates = await getScreenSourcesWithRetry(display, screenStatus);
  const match = candidates.find((source) => String(source.display_id) === toDisplayId(display));
  const source = match || candidates[0];
  if (!source) {
    throw new Error(`Screen source not available.${getScreenPermissionHint(screenStatus)}`);
  }
  const image = source.thumbnail;
  const sizeInfo = image.getSize();
  if (!sizeInfo?.width || !sizeInfo?.height) {
    throw new Error(`Screen source is empty.${getScreenPermissionHint(screenStatus)}`);
  }
  return {
    display,
    displayId: toDisplayId(display),
    dataUrl: image.toDataURL(),
    width: sizeInfo.width,
    height: sizeInfo.height,
    scaleFactor,
  };
}

export {
  getDisplaySource,
};
