export const DEFAULT_RUNNER_ADAPTER_ID = 'agent_backed';
export const TEST_ONLY_RUNNER_ADAPTER_ID = 'reference';
export const DEFAULT_AGENT_PROVIDER_ID = 'codex_cli';
const DEFAULT_PROVIDER_HINTS_BY_SKILL_PACK: Record<string, string> = {
  'session.tool-native-fork': DEFAULT_AGENT_PROVIDER_ID,
};

export type HarnessSettings = {
  defaultRunnerAdapterId: string;
  defaultAgentProviderId: string;
  testOnlyRunnerAdapterId: string;
};

type RunnerProviderResolutionInput = {
  requestedProviderId?: unknown;
  adapterId?: unknown;
  skillPackId?: unknown;
  settings?: HarnessSettings;
};

function normalizeId(value: unknown, fallback = ''): string {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || fallback;
}

function valueOrEmpty(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

export function createDefaultHarnessSettings(
  overrides: Partial<HarnessSettings> = {}
): HarnessSettings {
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

export function resolveRunnerAdapterId(
  value: unknown,
  settings = createDefaultHarnessSettings()
): string {
  return normalizeId(value, settings.defaultRunnerAdapterId || DEFAULT_RUNNER_ADAPTER_ID);
}

export function resolveRunnerProviderId({
  requestedProviderId,
  adapterId,
  skillPackId,
  settings = createDefaultHarnessSettings(),
}: RunnerProviderResolutionInput = {}): string {
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
