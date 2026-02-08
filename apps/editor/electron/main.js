const { loadCompiledEntrypoint } = require('./bootstrap/loadCompiledEntrypoint');

try {
  loadCompiledEntrypoint('main.js');
} catch (error) {
  console.error('[agency] failed to load compiled main entry');
  console.error(error?.message || String(error));
  process.exit(1);
}
