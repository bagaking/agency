const { loadCompiledEntrypoint } = require('./bootstrap/loadCompiledEntrypoint');

try {
  loadCompiledEntrypoint('preload.js');
} catch (error) {
  console.error('[agency] failed to load compiled preload entry');
  console.error(error?.message || String(error));
  process.exit(1);
}
