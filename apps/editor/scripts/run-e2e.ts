import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { runElectronBuild } from "./electronBuild";
import { resolveBasePort, resolveRendererPortFile, startRendererDevServer } from "./rendererDevServer";

const portFile = resolveRendererPortFile();

function cleanupPortFile(): void {
  if (!portFile) {
    return;
  }

  try {
    fs.rmSync(portFile, { force: true });
  } catch {
    // Best-effort cleanup.
  }
}

async function run(): Promise<void> {
  await runElectronBuild();

  const basePort = resolveBasePort();
  const { server, url } = await startRendererDevServer({ port: basePort, portFile });

  const env = {
    ...process.env,
    ELECTRON_RENDERER_URL: url,
  };

  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const child = spawn(pnpmCommand, ["exec", "playwright", "test"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    env,
  });

  child.on("exit", async (code) => {
    await server.close();
    cleanupPortFile();
    process.exit(code ?? 0);
  });
}

void run().catch((error) => {
  console.error("Failed to run Playwright tests", error);
  cleanupPortFile();
  process.exit(1);
});
