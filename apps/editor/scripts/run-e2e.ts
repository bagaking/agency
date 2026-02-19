import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runElectronBuild } from "./electronBuild";
import { resolveBasePort, resolveRendererPortFile, startRendererDevServer } from "./rendererDevServer";

const portFile = resolveRendererPortFile();
const testUserDataPath = path.join(os.tmpdir(), "agency-editor-e2e-user-data");

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
  fs.rmSync(testUserDataPath, { recursive: true, force: true });
  await runElectronBuild();

  const basePort = resolveBasePort();
  const { server, url } = await startRendererDevServer({ port: basePort, portFile });

  const env = {
    ...process.env,
    ELECTRON_RENDERER_URL: url,
    AGENCY_TEST_USER_DATA_PATH: testUserDataPath,
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
