import fs from "node:fs";

import { resolveBasePort, resolveRendererPortFile, startRendererDevServer } from "./rendererDevServer";

const portFile = resolveRendererPortFile();

function cleanup(): void {
  if (!portFile) {
    return;
  }

  try {
    fs.rmSync(portFile, { force: true });
  } catch {
    // Best-effort cleanup.
  }
}

async function start(): Promise<void> {
  const basePort = resolveBasePort();
  await startRendererDevServer({ port: basePort, portFile });
}

void start().catch((error) => {
  console.error("Renderer dev server failed to start", error);
  cleanup();
  process.exit(1);
});

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
