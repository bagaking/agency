const { desktopCapturer, screen } = require('electron');

const toDisplayId = (display) => String(display?.id ?? '');

async function getDisplaySource(displayId) {
  const display = screen.getAllDisplays().find((entry) => String(entry.id) === String(displayId));
  if (!display) {
    throw new Error('Display not found for capture.');
  }
  const scaleFactor = display.scaleFactor || 1;
  const size = display.size || { width: display.bounds.width, height: display.bounds.height };
  const thumbnailSize = {
    width: Math.round(size.width * scaleFactor),
    height: Math.round(size.height * scaleFactor),
  };
  const candidates = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize,
    fetchWindowIcons: false,
  });
  const match = candidates.find((source) => String(source.display_id) === toDisplayId(display));
  const source = match || candidates[0];
  if (!source) {
    throw new Error('Screen source not available.');
  }
  const image = source.thumbnail;
  const sizeInfo = image.getSize();
  if (!sizeInfo?.width || !sizeInfo?.height) {
    throw new Error('Screen source is empty. Check screen recording permission and try again.');
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
