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

const DEFAULT_RETRYABLE_PROVIDER_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 400;

function resolveRealHome(baseEnv = process.env) {
  const candidates = [
    baseEnv.AGENCY_REAL_HOME,
    baseEnv.ORIGINAL_HOME,
    baseEnv.HOME,
    os.homedir(),
  ];
  return candidates.map((item) => String(item || '').trim()).find(Boolean) || os.homedir();
}

function resolveCodexHome(baseEnv = process.env, { isolatedHome = '', workingDirectory = '' } = {}) {
  const explicit = String(baseEnv.AGENCY_CODEX_HOME || baseEnv.CODEX_HOME || '').trim();
  if (explicit) {
    return explicit;
  }

  const normalizedWorkingDirectory = String(workingDirectory || '').trim();
  if (normalizedWorkingDirectory) {
    const localCodexHome = path.join(normalizedWorkingDirectory, '.codex');
    if (fs.existsSync(localCodexHome)) {
      return localCodexHome;
    }
  }

  return path.join(String(isolatedHome || '').trim() || os.tmpdir(), '.codex');
}

function buildCodexCliEnv(baseEnv = process.env, options = {}) {
  const env = { ...baseEnv };
  const realHome = resolveRealHome(baseEnv);
  const isolatedHome = String(baseEnv.AGENCY_HARNESS_PROVIDER_HOME || '').trim() ||
    path.join(os.tmpdir(), 'agency-main-agent-harness', 'provider-home', 'codex-cli');
  fs.mkdirSync(isolatedHome, { recursive: true });
  const codexHome = resolveCodexHome(baseEnv, {
    isolatedHome,
    workingDirectory: options?.workingDirectory,
  });
  fs.mkdirSync(codexHome, { recursive: true });

  env.AGENCY_REAL_HOME = realHome;
  env.HOME = isolatedHome;
  env.CODEX_HOME = codexHome;
  return env;
}

function quoteTomlString(value) {
  return JSON.stringify(String(value || ''));
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
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

function getCodexProviderRetryConfig(baseEnv = process.env) {
  return {
    maxAttempts: normalizePositiveInteger(
      baseEnv.AGENCY_HARNESS_PROVIDER_MAX_ATTEMPTS,
      DEFAULT_RETRYABLE_PROVIDER_ATTEMPTS
    ),
    baseDelayMs: normalizePositiveInteger(
      baseEnv.AGENCY_HARNESS_PROVIDER_RETRY_BASE_DELAY_MS,
      DEFAULT_RETRY_BASE_DELAY_MS
    ),
  };
}

function collectProviderErrorText(error) {
  const parts = [
    error?.message,
    error?.data?.stderr,
    error?.data?.stdout,
  ];
  return parts
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('\n');
}

function isRetryableCodexProviderError(error) {
  const text = collectProviderErrorText(error);
  if (!text) {
    return false;
  }
  if (
    /INVALID_API_KEY/i.test(text) ||
    /\b401 Unauthorized\b/i.test(text) ||
    /PROVIDER_CONFIG_(INVALID|MISSING)/i.test(text)
  ) {
    return false;
  }
  return (
    /\b502 Bad Gateway\b/i.test(text) ||
    /\b503 Service Unavailable\b/i.test(text) ||
    /\b504 Gateway Timeout\b/i.test(text) ||
    /Upstream request failed/i.test(text) ||
    /stream disconnected before completion/i.test(text) ||
    /websocket closed by server before response\.completed/i.test(text)
  );
}

async function sleepWithAbort(ms, abortSignal) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return;
  }
  if (abortSignal?.aborted) {
    const error = new Error('Provider execution was cancelled.');
    error.code = 'RUN_CANCELLED';
    throw error;
  }
  await new Promise((resolve, reject) => {
    const handle = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      const error = new Error('Provider execution was cancelled.');
      error.code = 'RUN_CANCELLED';
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(handle);
      abortSignal?.removeEventListener?.('abort', onAbort);
    };
    abortSignal?.addEventListener?.('abort', onAbort, { once: true });
  });
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
        ...buildCodexCliEnv(process.env, {
          workingDirectory: cwd,
        }),
        ...overrides.env,
      };
      const retryConfig = getCodexProviderRetryConfig(process.env);
      let finalDecision = null;
      for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt += 1) {
        try {
          const processResult = await runProcess({
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
          const extracted = extractProviderDecision(processResult.events);
          finalDecision = {
            providerId: 'codex_cli',
            threadId: extracted.threadId,
            decision: extracted.decision,
            rawText: extracted.rawText,
            events: processResult.events,
            stderr: processResult.stderr,
            fallbackUsed: false,
            fallbackReason: '',
          };
          break;
        } catch (error) {
          const wrapped = wrapCodexProviderError(error);
          const canRetry =
            attempt < retryConfig.maxAttempts && isRetryableCodexProviderError(wrapped);
          if (!canRetry) {
            const canFallback =
              isRetryableCodexProviderError(wrapped) &&
              typeof skillPack.buildDeterministicDecision === 'function';
            if (!canFallback) {
              throw wrapped;
            }
            finalDecision = {
              providerId: 'codex_cli',
              threadId: '',
              decision: skillPack.buildDeterministicDecision({
                run,
                step,
                preparedContext,
              }),
              rawText: '',
              events: [],
              stderr: collectProviderErrorText(wrapped),
              fallbackUsed: true,
              fallbackReason: wrapped.message || 'retryable-provider-failure',
            };
            break;
          }
          await sleepWithAbort(retryConfig.baseDelayMs * attempt, abortSignal);
        }
      }
      if (!finalDecision?.decision) {
        const error = new Error('Provider did not produce a decision.');
        error.code = 'PROVIDER_NO_RESULT';
        throw error;
      }
      if (typeof skillPack.validateDecision === 'function') {
        skillPack.validateDecision(finalDecision.decision, {
          run,
          step,
          preparedContext,
        });
      }
      return finalDecision;
    },
  };
}

module.exports = {
  buildCodexCliEnv,
  buildCodexCliConfigArgs,
  createCodexCliProvider,
  getCodexProviderRetryConfig,
  isRetryableCodexProviderError,
  resolveCodexHome,
};
