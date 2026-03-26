// @ts-nocheck
const { createClaudeCliProvider } = require('./claudeCliProvider');
const { createCodexCliProvider } = require('./codexCliProvider');

function createRunnerProviderRegistry({
  providers = [createCodexCliProvider(), createClaudeCliProvider()],
} = {}) {
  const providerMap = new Map(
    (Array.isArray(providers) ? providers : [])
      .filter(Boolean)
      .map((provider) => [String(provider.id || '').trim().toLowerCase(), provider])
  );

  return {
    get(providerId) {
      const normalized = String(providerId || '').trim().toLowerCase();
      if (!normalized) {
        return null;
      }
      return providerMap.get(normalized) || null;
    },
    list() {
      return Array.from(providerMap.values()).map((provider) => ({
        id: provider.id,
        title: provider.title,
      }));
    },
  };
}

module.exports = {
  createRunnerProviderRegistry,
};
