const fs = require('fs');
const os = require('os');
const path = require('path');
const { createServer } = require('vite');

const DEFAULT_RENDERER_PORT = 5183;
const DEFAULT_PORT_FILE = path.join(os.tmpdir(), 'agency-editor-renderer.json');

const resolveRendererPortFile = () => process.env.AGENCY_RENDERER_PORT_FILE || DEFAULT_PORT_FILE;

const resolveBasePort = () => {
  const raw = process.env.AGENCY_RENDERER_PORT;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_RENDERER_PORT;
};

const writeRendererPortFile = (portFile, payload) => {
  if (!portFile) {
    return;
  }
  fs.mkdirSync(path.dirname(portFile), { recursive: true });
  fs.writeFileSync(portFile, JSON.stringify(payload, null, 2));
};

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

const startRendererDevServer = async ({ port, portFile, logUrls = true } = {}) => {
  const basePort = Number(port) > 0 ? Number(port) : resolveBasePort();
  const server = await createServer({
    configFile: path.join(__dirname, '..', 'vite.config.js'),
    root: path.join(__dirname, '..', 'renderer'),
    server: {
      port: basePort,
      strictPort: false,
    },
  });
  await server.listen();
  const actualPort = server.config.server.port;
  const url = `http://localhost:${actualPort}`;
  writeRendererPortFile(portFile, {
    port: actualPort,
    url,
    pid: process.pid,
    updatedAt: new Date().toISOString(),
  });
  if (logUrls && server.printUrls) {
    server.printUrls();
  } else if (logUrls) {
    console.log(`Renderer dev server running at ${url}`);
  }
  return { server, port: actualPort, url, portFile };
};

module.exports = {
  DEFAULT_RENDERER_PORT,
  resolveRendererPortFile,
  resolveBasePort,
  writeRendererPortFile,
  readRendererPortFile,
  startRendererDevServer,
};
