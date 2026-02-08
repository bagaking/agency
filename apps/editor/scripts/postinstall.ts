import fs from "node:fs";
import path from "node:path";

function chmodIfExists(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.chmodSync(filePath, 0o755);
      return true;
    }
  } catch {
    // Ignore chmod errors; they surface when spawning the helper.
  }

  return false;
}

function findPackageRoot(): string | null {
  try {
    const resolved = require.resolve("node-pty");
    return path.dirname(path.dirname(resolved));
  } catch {
    return null;
  }
}

function main(): void {
  const root = findPackageRoot();

  if (!root) {
    return;
  }

  const prebuilds = path.join(root, "prebuilds");
  if (!fs.existsSync(prebuilds)) {
    return;
  }

  const entries = fs.readdirSync(prebuilds, { withFileTypes: true });
  entries.forEach((entry) => {
    if (!entry.isDirectory()) {
      return;
    }

    const helperPath = path.join(prebuilds, entry.name, "spawn-helper");
    chmodIfExists(helperPath);
  });
}

main();
