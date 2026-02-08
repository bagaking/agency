const fs = require('fs');
const path = require('path');

function resolveCompiledPath(relativeEntrypoint) {
  return path.join(__dirname, '..', '..', '.electron-build', relativeEntrypoint);
}

function loadCompiledEntrypoint(relativeEntrypoint) {
  const compiledPath = resolveCompiledPath(relativeEntrypoint);
  if (!fs.existsSync(compiledPath)) {
    const command = 'pnpm -C apps/editor run build:electron';
    throw new Error(
      [
        `Missing compiled Electron entry: ${compiledPath}`,
        `Run \`${command}\` before launching Electron runtime.`,
      ].join('\n')
    );
  }

  return require(compiledPath);
}

module.exports = {
  loadCompiledEntrypoint,
};
