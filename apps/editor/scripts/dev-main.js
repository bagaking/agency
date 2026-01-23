const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  readRendererPortFile,
  resolveRendererPortFile,
} = require('./rendererDevServer');

const electronPath = require('electron');
const mainPath = path.join(__dirname, '..', 'electron', 'main.js');
const portFile = resolveRendererPortFile();
const WAIT_TIMEOUT_MS = 20000;
const WAIT_INTERVAL_MS = 250;

const resolveRendererUrlFromPortFile = () => {
  const info = readRendererPortFile(portFile);
  if (!info) {
    return '';
  }
  if (info.url) {
    return info.url;
  }
  if (info.port) {
    return `http://localhost:${info.port}`;
  }
  return '';
};

const waitForRendererUrl = async () => {
  const explicitUrl = process.env.AGENCY_RENDERER_URL || process.env.ELECTRON_RENDERER_URL;
  if (explicitUrl) {
    return explicitUrl;
  }
  const start = Date.now();
  while (Date.now() - start < WAIT_TIMEOUT_MS) {
    const url = resolveRendererUrlFromPortFile();
    if (url) {
      return url;
    }
    await new Promise((resolve) => setTimeout(resolve, WAIT_INTERVAL_MS));
  }
  throw new Error(`Renderer port file not found: ${portFile}`);
};

const run = async () => {
  const rendererUrl = await waitForRendererUrl();
  const env = {
    ...process.env,
    ELECTRON_RENDERER_URL: rendererUrl,
  };
  const child = spawn(electronPath, [mainPath], {
    stdio: 'inherit',
    env,
  });
  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
};

run().catch((error) => {
  console.error('Failed to launch Electron main process', error);
  if (!fs.existsSync(portFile)) {
    console.error('Renderer port file missing:', portFile);
  }
  process.exit(1);
});
