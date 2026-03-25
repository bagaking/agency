// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  getMainAgentHarnessSettings,
} = require('../../mainAgentHarnessSettings');
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

function quoteTomlString(value) {
  return JSON.stringify(String(value || ''));
}

function buildCodexCliConfigArgs(providerSettings = {}) {
  const baseUrl = String(providerSettings?.baseUrl || '').trim();
  const model = String(providerSettings?.model || '').trim();
  const openAIApiKey = String(providerSettings?.openAIApiKey || '').trim();
  const modelReasoningEffort = String(providerSettings?.modelReasoningEffort || '').trim();
  const modelContextWindow = Number(providerSettings?.modelContextWindow);
  const modelAutoCompactTokenLimit = Number(providerSettings?.modelAutoCompactTokenLimit);
  const anyConfigured = Boolean(
    baseUrl ||
      model ||
      openAIApiKey ||
      modelReasoningEffort ||
      Number.isFinite(modelContextWindow) ||
      Number.isFinite(modelAutoCompactTokenLimit)
  );

  if (!anyConfigured) {
    return {
      args: [],
      env: {},
    };
  }

  const missing = [];
  if (!baseUrl) {
    missing.push('base_url');
  }
  if (!model) {
    missing.push('model');
  }
  if (!openAIApiKey) {
    missing.push('OPENAI_API_KEY');
  }
  if (missing.length > 0) {
    const error = new Error(
      `Harness Codex provider settings are incomplete. Missing: ${missing.join(', ')}. Configure Hierarchy -> Harness Providers.`
    );
    error.code = 'PROVIDER_CONFIG_INVALID';
    throw error;
  }

  const args = [
    '-c',
    `model_provider=${quoteTomlString('openai')}`,
    '-c',
    `openai_base_url=${quoteTomlString(baseUrl)}`,
    '-c',
    `model=${quoteTomlString(model)}`,
  ];
  if (modelReasoningEffort) {
    args.push('-c', `model_reasoning_effort=${quoteTomlString(modelReasoningEffort)}`);
  }
  if (Number.isFinite(modelContextWindow) && modelContextWindow > 0) {
    args.push('-c', `model_context_window=${Math.floor(modelContextWindow)}`);
  }
  if (
    Number.isFinite(modelAutoCompactTokenLimit) &&
    modelAutoCompactTokenLimit > 0
  ) {
    args.push(
      '-c',
      `model_auto_compact_token_limit=${Math.floor(modelAutoCompactTokenLimit)}`
    );
  }
  return {
    args,
    env: {
      OPENAI_API_KEY: openAIApiKey,
    },
  };
}

function wrapCodexProviderError(error) {
  const message = String(error?.message || '').trim();
  if (
    /Missing environment variable/i.test(message) ||
    /\bPP_CODEX\b/i.test(message)
  ) {
    const nextError = new Error(
      'Harness Codex provider is not configured for Agency. Configure base_url, model, and OPENAI_API_KEY in Hierarchy -> Harness Providers.'
    );
    nextError.code = 'PROVIDER_CONFIG_MISSING';
    nextError.data = {
      cause: message,
    };
    return nextError;
  }
  return error;
}

function createCodexCliProvider({
  getSettings = getMainAgentHarnessSettings,
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
      const settings = await getSettings();
      const providerSettings = settings?.providers?.codex_cli || {};
      const overrides = buildCodexCliConfigArgs(providerSettings);
      const env = {
        ...buildCodexCliEnv(process.env),
        ...overrides.env,
      };
      let processResult;
      try {
        processResult = await runProcess({
          command: 'codex',
          args: [
            ...overrides.args,
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
      } catch (error) {
        throw wrapCodexProviderError(error);
      }
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
  buildCodexCliConfigArgs,
  createCodexCliProvider,
};
