// @ts-nocheck
const { buildSkillPackPrompt } = require('./shared/promptBuilder');
const { extractProviderDecision, parseJsonlOutput } = require('./shared/eventParser');
const { runJsonProviderProcess } = require('./shared/providerProcess');

function createCodexCliProvider({
  runProcess = runJsonProviderProcess,
} = {}) {
  return {
    id: 'codex_cli',
    title: 'Codex CLI Provider',
    async decideStep({ run, step, skillPack, preparedContext, abortSignal }) {
      const schema = skillPack.buildDecisionSchema({
        run,
        step,
        preparedContext,
      });
      const prompt = buildSkillPackPrompt({
        run,
        step,
        skillPack,
        preparedContext,
        providerId: 'codex_cli',
      });
      const cwd = skillPack.resolveWorkingDirectory
        ? skillPack.resolveWorkingDirectory({ run, step, preparedContext })
        : process.cwd();
      const processResult = await runProcess({
        command: 'codex',
        args: [
          '-a',
          'never',
          '-s',
          'read-only',
          'exec',
          '--skip-git-repo-check',
          '-C',
          cwd,
        ],
        schema,
        input: prompt,
        cwd,
        abortSignal,
        parseJsonlOutput,
      });
      const extracted = extractProviderDecision(processResult.events);
      if (typeof skillPack.validateDecision === 'function') {
        skillPack.validateDecision(extracted.decision, {
          run,
          step,
          preparedContext,
        });
      }
      return {
        providerId: 'codex_cli',
        threadId: extracted.threadId,
        decision: extracted.decision,
        rawText: extracted.rawText,
        events: processResult.events,
        stderr: processResult.stderr,
      };
    },
  };
}

module.exports = {
  createCodexCliProvider,
};
