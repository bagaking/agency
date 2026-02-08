const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const outDir = path.join(projectRoot, '.electron-build');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function copyNativeAssets() {
  const nativeSource = path.join(projectRoot, 'electron', 'native');
  const nativeTarget = path.join(outDir, 'native');
  if (!fs.existsSync(nativeSource)) {
    return;
  }
  fs.cpSync(nativeSource, nativeTarget, { recursive: true });
}

function assertOutput() {
  const required = [
    path.join(outDir, 'main.js'),
    path.join(outDir, 'preload.js'),
  ];
  required.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing Electron build artifact: ${filePath}`);
    }
  });
}

function main() {
  fs.rmSync(outDir, { recursive: true, force: true });

  const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  run(pnpmCommand, ['exec', 'tsc', '-p', 'tsconfig.electron.json'], {
    cwd: projectRoot,
    env: process.env,
  });

  copyNativeAssets();
  assertOutput();
}

main();
