const path = require('path');
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

const DEFAULT_RENDERER_PORT = Number(process.env.AGENCY_RENDERER_PORT) || 5183;

module.exports = defineConfig(({ command }) => ({
  root: path.join(__dirname, 'renderer'),
  base: command === 'serve' ? '/' : './',
  plugins: [react()],
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: DEFAULT_RENDERER_PORT,
    strictPort: false,
  },
}));
