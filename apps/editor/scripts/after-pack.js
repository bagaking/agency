const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function execFileAsync(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function resolveSigningIdentity() {
  if (process.env.CSC_NAME) {
    return process.env.CSC_NAME;
  }
  try {
    const { stdout } = await execFileAsync('/usr/bin/security', [
      'find-identity',
      '-v',
      '-p',
      'codesigning',
    ]);
    const lines = String(stdout || '').split('\n');
    for (const line of lines) {
      const match = line.match(/\"(.+?)\"/);
      if (!match) {
        continue;
      }
      const name = match[1];
      if (name.startsWith('Apple Development') || name.startsWith('Developer ID Application')) {
        return name;
      }
    }
  } catch (error) {
    // Fall through to null identity.
  }
  return null;
}

async function signHelperApp({ appOutDir, appName }) {
  const helperPath = path.join(
    appOutDir,
    `${appName}.app`,
    'Contents',
    'Resources',
    'speech-helper',
    'SpeechHelper.app'
  );
  if (!fs.existsSync(helperPath)) {
    return;
  }
  const entitlementsPath = path.join(__dirname, '..', 'entitlements.mac.plist');
  const identity = await resolveSigningIdentity();
  if (!identity) {
    console.warn('[after-pack] codesign identity not found; skipping speech helper signing');
    return;
  }
  const args = [
    '--force',
    '--deep',
    '--options',
    'runtime',
    '--sign',
    identity,
  ];
  if (fs.existsSync(entitlementsPath)) {
    args.push('--entitlements', entitlementsPath);
  }
  args.push(helperPath);
  await execFileAsync('/usr/bin/codesign', args);
}

exports.default = async function afterPack(context) {
  if (process.platform !== 'darwin') {
    return;
  }
  const appName = context?.packager?.appInfo?.productFilename;
  if (!appName) {
    return;
  }
  await signHelperApp({ appOutDir: context.appOutDir, appName });
};
