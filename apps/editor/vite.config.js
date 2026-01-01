const path = require('path');
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig(({ command }) => ({
  root: path.join(__dirname, 'renderer'),
  base: command === 'serve' ? '/' : './',
  plugins: [react()],
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}));
