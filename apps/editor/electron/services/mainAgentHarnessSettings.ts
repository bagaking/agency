// @ts-nocheck
const os = require('os');
const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

const DEFAULT_CODEX_CLI_PROVIDER_SETTINGS = Object.freeze({
  baseUrl: '',
  model: '',
  openAIApiKey: '',
  modelReasoningEffort: '',
  modelContextWindow: null,
  modelAutoCompactTokenLimit: null,
});

const DEFAULT_MAIN_AGENT_HARNESS_SETTINGS = Object.freeze({
  providers: {
    codex_cli: DEFAULT_CODEX_CLI_PROVIDER_SETTINGS,
  },
});

function getElectronApp() {
  try {
    const electron = require('electron');
    if (
      electron &&
      typeof electron === 'object' &&
      electron.app &&
      typeof electron.app.getPath === 'function'
    ) {
      return electron.app;
    }
  } catch (_error) {
    // ignore
  }
  return null;
}

function getFallbackUserDataPath() {
  const explicit = String(process.env.AGENCY_USER_DATA_PATH || '').trim();
  if (explicit) {
    return explicit;
  }
  const homePath = os.homedir() || process.cwd();
  if (process.platform === 'darwin') {
    return path.join(homePath, 'Library', 'Application Support', 'Agency');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(homePath, 'AppData', 'Roaming'), 'Agency');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(homePath, '.config'), 'Agency');
}

function getMainAgentHarnessSettingsPath() {
  const electronApp = getElectronApp();
  const userDataPath = electronApp ? electronApp.getPath('userData') : getFallbackUserDataPath();
  return path.join(userDataPath, 'main-agent-harness', 'settings.json');
}

function normalizeOptionalString(value) {
  return String(value || '').trim();
}

function normalizeOptionalInteger(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(1, Math.floor(parsed));
}

function normalizeCodexCliProviderSettings(value = {}) {
  return {
    baseUrl: normalizeOptionalString(value?.baseUrl),
    model: normalizeOptionalString(value?.model),
    openAIApiKey: normalizeOptionalString(value?.openAIApiKey),
    modelReasoningEffort: normalizeOptionalString(value?.modelReasoningEffort),
    modelContextWindow: normalizeOptionalInteger(value?.modelContextWindow),
    modelAutoCompactTokenLimit: normalizeOptionalInteger(value?.modelAutoCompactTokenLimit),
  };
}

function normalizeMainAgentHarnessSettings(settings = {}) {
  const providers = settings?.providers && typeof settings.providers === 'object'
    ? settings.providers
    : {};
  return {
    providers: {
      codex_cli: normalizeCodexCliProviderSettings(providers.codex_cli),
    },
  };
}

async function getMainAgentHarnessSettings() {
  const filePath = getMainAgentHarnessSettingsPath();
  if (!fs.existsSync(filePath)) {
    return normalizeMainAgentHarnessSettings(DEFAULT_MAIN_AGENT_HARNESS_SETTINGS);
  }
  try {
    const raw = await fsp.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return normalizeMainAgentHarnessSettings(parsed);
  } catch (_error) {
    return normalizeMainAgentHarnessSettings(DEFAULT_MAIN_AGENT_HARNESS_SETTINGS);
  }
}

async function setMainAgentHarnessSettings({ settings } = {}) {
  const filePath = getMainAgentHarnessSettingsPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeMainAgentHarnessSettings(settings || DEFAULT_MAIN_AGENT_HARNESS_SETTINGS);
  await fsp.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

module.exports = {
  DEFAULT_CODEX_CLI_PROVIDER_SETTINGS,
  DEFAULT_MAIN_AGENT_HARNESS_SETTINGS,
  getMainAgentHarnessSettingsPath,
  getMainAgentHarnessSettings,
  setMainAgentHarnessSettings,
  normalizeCodexCliProviderSettings,
  normalizeMainAgentHarnessSettings,
};
