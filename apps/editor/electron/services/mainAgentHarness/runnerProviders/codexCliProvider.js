// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildSkillPackPrompt } = require('./shared/promptBuilder');
const { extractProviderDecision, parseJsonlOutput } = require('./shared/eventParser');
const { runJsonProviderProcess } = require('./shared/providerProcess');

function resolveRealHome(baseEnv = process.env) {
  const candidates = [
    baseEnv.AGENCY_REAL_HOME,
    baseEnv.ORIGINAL_HOME,
    baseEnv.HOME,
    os.homedir(),
  ];
  return candidates.map((item) => String(item || '').trim()).find(Boolean) || os.homedir();
}

function buildCodexCliEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  const realHome = resolveRealHome(baseEnv);
  const isolatedHome = String(baseEnv.AGENCY_HARNESS_PROVIDER_HOME || '').trim() ||
    path.join(os.tmpdir(), 'agency-main-agent-harness', 'provider-home', 'codex-cli');
  fs.mkdirSync(isolatedHome, { recursive: true });
  const codexHome =
    String(baseEnv.AGENCY_CODEX_HOME || baseEnv.CODEX_HOME || '').trim() ||
    path.join(realHome, '.codex');

  env.AGENCY_REAL_HOME = realHome;
  env.HOME = isolatedHome;
  env.CODEX_HOME = codexHome;
  return env;
}

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
      const env = buildCodexCliEnv(process.env);
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
        env,
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
  buildCodexCliEnv,
  createCodexCliProvider,
};
