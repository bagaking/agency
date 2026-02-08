const path = require('path');
const { spawn } = require('child_process');

const buildElectronScriptPath = path.join(__dirname, 'build-electron.js');

function runElectronBuild({ env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [buildElectronScriptPath], {
      stdio: 'inherit',
      env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`build-electron exited with code ${code}`));
    });
  });
}

module.exports = {
  runElectronBuild,
};
