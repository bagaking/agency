const {
  getMainAgentHarnessSettings,
} = require('./mainAgentHarnessSettings') as {
  getMainAgentHarnessSettings: () => Promise<any>;
};
const {
  resolveProviderCommand,
} = require('./mainAgentHarness/runnerProviders/shared/providerProcess') as {
  resolveProviderCommand: (command: string, overrides?: Record<string, any>) => Promise<string>;
};

const DEFAULT_PROBE_TIMEOUT_MS = 3500;
const STATUS_CACHE_TTL_MS = 15000;

const statusCache = new Map<
  string,
  {
    expiresAt: number;
    result: Record<string, any>;
  }
>();

function normalizeString(value: unknown): string {
  return String(value || '').trim();
}

function buildFailure(result: Record<string, any>) {
  return {
    ready: false,
    configured: false,
    commandAvailable: false,
    connected: false,
    reason: '',
    providerId: 'codex_cli',
    checkedAt: new Date().toISOString(),
    ...result,
  };
}

function normalizeBaseUrl(value: unknown): string {
  return normalizeString(value).replace(/\/+$/, '');
}

function buildCacheKey(providerSettings: Record<string, any> = {}, worktreePath = ''): string {
  return JSON.stringify({
    baseUrl: normalizeBaseUrl(providerSettings?.baseUrl),
    model: normalizeString(providerSettings?.model),
    openAIApiKey: normalizeString(providerSettings?.openAIApiKey),
    worktreePath: normalizeString(worktreePath),
  });
}

async function probeOpenAICompatibleProvider({
  baseUrl,
  openAIApiKey,
  timeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
}: {
  baseUrl: string;
  openAIApiKey: string;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  const modelsUrl = `${normalizeBaseUrl(baseUrl)}/models`;
  try {
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    const bodyText = await response.text();
    let parsedBody: any = null;
    try {
      parsedBody = bodyText ? JSON.parse(bodyText) : null;
    } catch (_error) {
      parsedBody = null;
    }

    if (!response.ok) {
      const errorMessage =
        normalizeString(parsedBody?.error?.message) ||
        normalizeString(parsedBody?.message) ||
        `${response.status} ${response.statusText}`;
      return {
        connected: false,
        reason: `Provider probe failed: ${errorMessage}`,
      };
    }

    if (!parsedBody || !Array.isArray(parsedBody?.data)) {
      return {
        connected: false,
        reason: 'Provider probe failed: /models did not return an OpenAI-compatible JSON payload.',
      };
    }

    return {
      connected: true,
      reason: '',
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return {
        connected: false,
        reason: `Provider probe timed out after ${timeoutMs}ms.`,
      };
    }
    return {
      connected: false,
      reason: `Provider probe failed: ${error?.message || String(error)}`,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function getCommanderStatus(
  {
    worktreePath = '',
    forceRefresh = false,
  }: {
    worktreePath?: string;
    forceRefresh?: boolean;
  } = {}
) {
  const settings = await getMainAgentHarnessSettings();
  const providerSettings = settings?.providers?.codex_cli || {};
  const baseUrl = normalizeBaseUrl(providerSettings?.baseUrl);
  const model = normalizeString(providerSettings?.model);
  const openAIApiKey = normalizeString(providerSettings?.openAIApiKey);
  const missingRequired = [
    !baseUrl ? 'base_url' : '',
    !model ? 'model' : '',
    !openAIApiKey ? 'OPENAI_API_KEY' : '',
  ].filter(Boolean);
  const cacheKey = buildCacheKey(providerSettings, worktreePath);
  const now = Date.now();

  if (!forceRefresh) {
    const cached = statusCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.result;
    }
  }

  if (missingRequired.length > 0) {
    const result = buildFailure({
      configured: false,
      reason: `Missing required Harness provider settings: ${missingRequired.join(', ')}.`,
      missingRequired,
    });
    statusCache.set(cacheKey, {
      expiresAt: now + STATUS_CACHE_TTL_MS,
      result,
    });
    return result;
  }

  const resolvedCommand = await resolveProviderCommand('codex', {
    env: process.env,
  });
  if (!resolvedCommand) {
    const result = buildFailure({
      configured: true,
      reason: 'Commander provider is configured, but the `codex` command is not available.',
      missingRequired: [],
    });
    statusCache.set(cacheKey, {
      expiresAt: now + STATUS_CACHE_TTL_MS,
      result,
    });
    return result;
  }

  const probe = await probeOpenAICompatibleProvider({
    baseUrl,
    openAIApiKey,
  });
  const result = {
    ready: Boolean(probe.connected),
    configured: true,
    commandAvailable: true,
    connected: Boolean(probe.connected),
    reason: probe.reason || '',
    missingRequired: [],
    providerId: 'codex_cli',
    checkedAt: new Date().toISOString(),
  };
  statusCache.set(cacheKey, {
    expiresAt: now + STATUS_CACHE_TTL_MS,
    result,
  });
  return result;
}

export {
  getCommanderStatus,
  probeOpenAICompatibleProvider,
};
