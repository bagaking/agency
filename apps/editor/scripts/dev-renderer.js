const fs = require('fs');
const {
  resolveRendererPortFile,
  resolveBasePort,
  startRendererDevServer,
} = require('./rendererDevServer');

const portFile = resolveRendererPortFile();

const cleanup = () => {
  if (!portFile) {
    return;
  }
  try {
    fs.rmSync(portFile, { force: true });
  } catch (error) {
    // Best-effort cleanup.
  }
};

const start = async () => {
  const basePort = resolveBasePort();
  await startRendererDevServer({ port: basePort, portFile });
};

start().catch((error) => {
  console.error('Renderer dev server failed to start', error);
  cleanup();
  process.exit(1);
});

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});
