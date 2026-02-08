import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { runElectronBuild } from "./electronBuild";
import { readRendererPortFile, resolveRendererPortFile } from "./rendererDevServer";

const electronPath = require("electron") as string;
const mainPath = path.join(__dirname, "..", ".electron-build", "main.js");
const portFile = resolveRendererPortFile();
const WAIT_TIMEOUT_MS = 20_000;
const WAIT_INTERVAL_MS = 250;

function resolveRendererUrlFromPortFile(): string {
  const info = readRendererPortFile(portFile);

  if (!info) {
    return "";
  }
  if (info.url) {
    return info.url;
  }
  if (info.port) {
    return `http://localhost:${info.port}`;
  }

  return "";
}

async function waitForRendererUrl(): Promise<string> {
  const explicitUrl = process.env.AGENCY_RENDERER_URL || process.env.ELECTRON_RENDERER_URL;

  if (explicitUrl) {
    return explicitUrl;
  }

  const start = Date.now();
  while (Date.now() - start < WAIT_TIMEOUT_MS) {
    const url = resolveRendererUrlFromPortFile();
    if (url) {
      return url;
    }

    await new Promise((resolve) => setTimeout(resolve, WAIT_INTERVAL_MS));
  }

  throw new Error(`Renderer port file not found: ${portFile}`);
}

async function run(): Promise<void> {
  const rendererUrl = await waitForRendererUrl();
  await runElectronBuild();

  const env = {
    ...process.env,
    ELECTRON_RENDERER_URL: rendererUrl,
    AGENCY_HELPER_IDENTITY: process.env.AGENCY_HELPER_IDENTITY || "release",
  };

  const child = spawn(electronPath, [mainPath], {
    stdio: "inherit",
    env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

void run().catch((error) => {
  console.error("Failed to launch Electron main process", error);

  if (!fs.existsSync(portFile)) {
    console.error("Renderer port file missing:", portFile);
  }

  process.exit(1);
});
