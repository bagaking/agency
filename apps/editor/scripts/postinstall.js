const fs = require('fs');
const path = require('path');

function chmodIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.chmodSync(filePath, 0o755);
      return true;
    }
  } catch (error) {
    // Ignore chmod errors; will be surfaced when spawning.
  }
  return false;
}

function findPackageRoot() {
  try {
    const resolved = require.resolve('node-pty');
    return path.dirname(path.dirname(resolved));
  } catch (error) {
    return null;
  }
}

function main() {
  const root = findPackageRoot();
  if (!root) {
    return;
  }
  const prebuilds = path.join(root, 'prebuilds');
  if (!fs.existsSync(prebuilds)) {
    return;
  }

  const entries = fs.readdirSync(prebuilds, { withFileTypes: true });
  entries.forEach((entry) => {
    if (!entry.isDirectory()) {
      return;
    }
    const helperPath = path.join(prebuilds, entry.name, 'spawn-helper');
    chmodIfExists(helperPath);
  });
}

main();
