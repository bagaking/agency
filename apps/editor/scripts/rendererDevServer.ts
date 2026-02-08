import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createServer } from "vite";

const DEFAULT_RENDERER_PORT = 5183;
const DEFAULT_PORT_FILE = path.join(os.tmpdir(), "agency-editor-renderer.json");

type RendererPortInfo = {
  port?: number;
  url?: string;
  pid?: number;
  updatedAt?: string;
};

type StartRendererDevServerOptions = {
  port?: number;
  portFile?: string;
  logUrls?: boolean;
};

function resolveRendererPortFile(): string {
  return process.env.AGENCY_RENDERER_PORT_FILE || DEFAULT_PORT_FILE;
}

function resolveBasePort(): number {
  const raw = process.env.AGENCY_RENDERER_PORT;
  const parsed = Number(raw);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_RENDERER_PORT;
}

function writeRendererPortFile(portFile: string | undefined, payload: RendererPortInfo): void {
  if (!portFile) {
    return;
  }

  fs.mkdirSync(path.dirname(portFile), { recursive: true });
  fs.writeFileSync(portFile, JSON.stringify(payload, null, 2));
}

function readRendererPortFile(portFile: string | undefined): RendererPortInfo | null {
  if (!portFile || !fs.existsSync(portFile)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(portFile, "utf8");
    return JSON.parse(raw) as RendererPortInfo;
  } catch {
    return null;
  }
}

async function startRendererDevServer({
  port,
  portFile,
  logUrls = true,
}: StartRendererDevServerOptions = {}): Promise<{
  server: Awaited<ReturnType<typeof createServer>>;
  port: number;
  url: string;
  portFile?: string;
}> {
  const basePort = Number(port) > 0 ? Number(port) : resolveBasePort();
  const server = await createServer({
    configFile: path.join(__dirname, "..", "vite.config.ts"),
    root: path.join(__dirname, "..", "renderer"),
    server: {
      port: basePort,
      strictPort: false,
    },
  });

  await server.listen();

  const actualPort = Number(server.config.server.port) || basePort;
  const url = `http://localhost:${actualPort}`;

  writeRendererPortFile(portFile, {
    port: actualPort,
    url,
    pid: process.pid,
    updatedAt: new Date().toISOString(),
  });

  if (logUrls && server.printUrls) {
    server.printUrls();
  } else if (logUrls) {
    console.log(`Renderer dev server running at ${url}`);
  }

  return { server, port: actualPort, url, portFile };
}

export {
  DEFAULT_RENDERER_PORT,
  readRendererPortFile,
  resolveBasePort,
  resolveRendererPortFile,
  startRendererDevServer,
  writeRendererPortFile,
};
