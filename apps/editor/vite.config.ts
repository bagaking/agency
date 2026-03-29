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
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");
          if (!normalizedId.includes("/node_modules/")) {
            return undefined;
          }
          if (
            normalizedId.includes("/@monaco-editor/react/") ||
            normalizedId.includes("/monaco-editor/")
          ) {
            return "vendor-monaco";
          }
          if (
            normalizedId.includes("/@xterm/xterm/") ||
            normalizedId.includes("/@xterm/addon-fit/")
          ) {
            return "vendor-terminal";
          }
          if (normalizedId.includes("/@bagakit/open-agent-avatars/")) {
            return "vendor-avatars";
          }
          if (normalizedId.includes("/@rive-app/react-canvas/")) {
            return "vendor-rive";
          }
          if (normalizedId.includes("/lucide-react/")) {
            return "vendor-icons";
          }
          if (
            normalizedId.includes("/react-dom/") ||
            normalizedId.includes("/react/")
          ) {
            return "vendor-react";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: DEFAULT_RENDERER_PORT,
    strictPort: false,
  },
}));
