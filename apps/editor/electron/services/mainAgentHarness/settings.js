// @ts-nocheck
const DEFAULT_RUNNER_ADAPTER_ID = 'agent_backed';
const TEST_ONLY_RUNNER_ADAPTER_ID = 'reference';
const DEFAULT_AGENT_PROVIDER_ID = 'codex_cli';
const DEFAULT_PROVIDER_HINTS_BY_SKILL_PACK = {
  'session.tool-native-fork': DEFAULT_AGENT_PROVIDER_ID,
};

function normalizeId(value, fallback = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || fallback;
}

function createDefaultHarnessSettings(overrides = {}) {
  return {
    defaultRunnerAdapterId: normalizeId(
      overrides?.defaultRunnerAdapterId || process.env.AGENCY_MAIN_AGENT_HARNESS_DEFAULT_RUNNER,
      DEFAULT_RUNNER_ADAPTER_ID
    ),
    defaultAgentProviderId: normalizeId(
      overrides?.defaultAgentProviderId || process.env.AGENCY_MAIN_AGENT_HARNESS_DEFAULT_PROVIDER,
      DEFAULT_AGENT_PROVIDER_ID
    ),
    testOnlyRunnerAdapterId: normalizeId(
      overrides?.testOnlyRunnerAdapterId,
      TEST_ONLY_RUNNER_ADAPTER_ID
    ),
  };
}

function resolveRunnerAdapterId(value, settings = createDefaultHarnessSettings()) {
  return normalizeId(value, settings.defaultRunnerAdapterId || DEFAULT_RUNNER_ADAPTER_ID);
}

function resolveRunnerProviderId({
  requestedProviderId,
  adapterId,
  skillPackId,
  settings = createDefaultHarnessSettings(),
} = {}) {
  const normalizedAdapterId = resolveRunnerAdapterId(valueOrEmpty(adapterId), settings);
  if (normalizedAdapterId !== DEFAULT_RUNNER_ADAPTER_ID) {
    return '';
  }
  const explicit = normalizeId(requestedProviderId);
  if (explicit) {
    return explicit;
  }
  const hinted = normalizeId(DEFAULT_PROVIDER_HINTS_BY_SKILL_PACK[normalizeId(skillPackId)]);
  if (hinted) {
    return hinted;
  }
  return normalizeId(settings.defaultAgentProviderId, DEFAULT_AGENT_PROVIDER_ID);
}

function valueOrEmpty(value) {
  return value === undefined || value === null ? '' : value;
}

module.exports = {
  DEFAULT_RUNNER_ADAPTER_ID,
  DEFAULT_AGENT_PROVIDER_ID,
  TEST_ONLY_RUNNER_ADAPTER_ID,
  createDefaultHarnessSettings,
  resolveRunnerAdapterId,
  resolveRunnerProviderId,
};
