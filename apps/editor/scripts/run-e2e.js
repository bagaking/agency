const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  resolveRendererPortFile,
  resolveBasePort,
  startRendererDevServer,
} = require('./rendererDevServer');

const portFile = resolveRendererPortFile();
const { runElectronBuild } = require('./electronBuild');

const cleanupPortFile = () => {
  if (!portFile) {
    return;
  }
  try {
    fs.rmSync(portFile, { force: true });
  } catch (error) {
    // Best-effort cleanup.
  }
};

const run = async () => {
  await runElectronBuild();
  const basePort = resolveBasePort();
  const { server, url } = await startRendererDevServer({ port: basePort, portFile });
  const env = {
    ...process.env,
    ELECTRON_RENDERER_URL: url,
  };
  const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['exec', 'playwright', 'test'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env,
  });
  child.on('exit', async (code) => {
    await server.close();
    cleanupPortFile();
    process.exit(code ?? 0);
  });
};

run().catch(async (error) => {
  console.error('Failed to run Playwright tests', error);
  cleanupPortFile();
  process.exit(1);
});
