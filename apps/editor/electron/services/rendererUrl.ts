// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_PORT_FILE = path.join(os.tmpdir(), 'agency-editor-renderer.json');

const resolveRendererPortFile = () => process.env.AGENCY_RENDERER_PORT_FILE || DEFAULT_PORT_FILE;

const readRendererPortFile = (portFile) => {
  if (!portFile || !fs.existsSync(portFile)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(portFile, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const resolveRendererUrl = () => {
  const envUrl = process.env.AGENCY_RENDERER_URL || process.env.ELECTRON_RENDERER_URL;
  if (envUrl) {
    return { url: envUrl, source: 'env' };
  }
  const portFile = resolveRendererPortFile();
  const portInfo = readRendererPortFile(portFile);
  if (portInfo?.url) {
    return { url: portInfo.url, source: 'port-file', portFile };
  }
  if (portInfo?.port) {
    return {
      url: `http://localhost:${portInfo.port}`,
      source: 'port-file',
      portFile,
    };
  }
  return { url: '', source: 'none', portFile };
};

export {
  resolveRendererPortFile,
  readRendererPortFile,
  resolveRendererUrl,
};
