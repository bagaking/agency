import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const DEFAULT_RENDERER_PORT = Number(process.env.AGENCY_RENDERER_PORT) || 5183;

export default defineConfig(({ command }) => ({
  root: path.join(__dirname, "renderer"),
  base: command === "serve" ? "/" : "./",
  plugins: [react()],
  assetsInclude: ["**/*.svg"],
  optimizeDeps: {
    exclude: ["@bagakit/open-agent-avatars"],
  },
  build: {
    outDir: path.join(__dirname, "dist/renderer"),
    emptyOutDir: true,
  },
  server: {
    port: DEFAULT_RENDERER_PORT,
    strictPort: false,
  },
}));
