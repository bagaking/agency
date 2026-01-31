const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { resolveProjectRoot } = require('./projectRoot');

const CONFIG_DIR = '.agency';
const CONFIG_FILE = 'session-map.yaml';

const DEFAULT_CONFIG = {
  version: 1,
  autoOpenSeen: false,
  typeColors: {},
  cellColors: {},
};

function getConfigPath(repoRoot) {
  return path.join(repoRoot, CONFIG_DIR, CONFIG_FILE);
}

function normalizeColor(value) {
  if (!value) {
    return '';
  }
  const raw = String(value).trim();
  if (!raw) {
    return '';
  }
  return raw;
}

function normalizeMap(config) {
  const raw = config || {};
  const typeColors = raw.typeColors && typeof raw.typeColors === 'object' ? raw.typeColors : {};
  const cellColors = raw.cellColors && typeof raw.cellColors === 'object' ? raw.cellColors : {};
  const normalizePalette = (palette) => {
    const next = {};
    Object.entries(palette || {}).forEach(([key, value]) => {
      const trimmedKey = String(key || '').trim();
      const normalized = normalizeColor(value);
      if (trimmedKey && normalized) {
        next[trimmedKey] = normalized;
      }
    });
    return next;
  };
  return {
    version: 1,
    autoOpenSeen: Boolean(raw.autoOpenSeen),
    typeColors: normalizePalette(typeColors),
    cellColors: normalizePalette(cellColors),
  };
}

async function readSessionMap({ rootPath } = {}) {
  const repoRoot = await resolveProjectRoot({ rootPath });
  if (!repoRoot) {
    return { ...DEFAULT_CONFIG, repoRoot: '' };
  }
  const configPath = getConfigPath(repoRoot);
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG, repoRoot, configPath };
  }
  try {
    const raw = await fs.promises.readFile(configPath, 'utf-8');
    const parsed = yaml.load(raw) || {};
    return { ...normalizeMap(parsed), repoRoot, configPath };
  } catch (_error) {
    return { ...DEFAULT_CONFIG, repoRoot, configPath };
  }
}

async function writeSessionMap({ rootPath, config } = {}) {
  const repoRoot = await resolveProjectRoot({ rootPath });
  if (!repoRoot) {
    throw new Error('Project root is not configured.');
  }
  const configPath = getConfigPath(repoRoot);
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
  const normalized = normalizeMap(config);
  const payload = yaml.dump(normalized, { lineWidth: 120 });
  await fs.promises.writeFile(configPath, payload, 'utf-8');
  return { ...normalized, repoRoot, configPath };
}

module.exports = {
  readSessionMap,
  writeSessionMap,
};
