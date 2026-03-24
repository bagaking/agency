// @ts-nocheck
function createClaudeCliProvider() {
  return {
    id: 'claude_cli',
    title: 'Claude CLI Provider',
    async decideStep() {
      const error = new Error('claude_cli provider is not implemented yet.');
      error.code = 'PROVIDER_NOT_IMPLEMENTED';
      throw error;
    },
  };
}

module.exports = {
  createClaudeCliProvider,
};
