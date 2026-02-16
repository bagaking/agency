import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.join(__dirname, "..");
const outDir = path.join(projectRoot, ".electron-build");

function run(command: string, args: string[], options: SpawnSyncOptions = {}): void {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function copyNativeAssets(): void {
  const nativeSource = path.join(projectRoot, "electron", "native");
  const nativeTarget = path.join(outDir, "native");

  if (!fs.existsSync(nativeSource)) {
    return;
  }

  fs.cpSync(nativeSource, nativeTarget, { recursive: true });
}

function assertOutput(): void {
  const requiredFiles = [path.join(outDir, "main.js"), path.join(outDir, "preload.js")];

  requiredFiles.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing Electron build artifact: ${filePath}`);
    }
  });
}

function main(): void {
  fs.rmSync(outDir, { recursive: true, force: true });

  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  run(pnpmCommand, ["--filter", "@agency/agency-data", "run", "build"], {
    cwd: projectRoot,
    env: process.env,
  });
  run(pnpmCommand, ["exec", "tsc", "-p", "tsconfig.electron.json"], {
    cwd: projectRoot,
    env: process.env,
  });

  copyNativeAssets();
  assertOutput();
}

main();
