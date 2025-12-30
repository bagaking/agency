const { app } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { getRepoRoot } = require('./git');
const { logRuntime } = require('./runtimeLog');

const STAGES = ['draft', 'active', 'archived'];
const DEFAULT_GATES = {
  draft: [],
  active: [
    {
      id: 'spec-created',
      label: 'Spec created',
      commands: [
        "test -n \"$(find openspec/changes -mindepth 2 -maxdepth 2 -name proposal.md -not -path '*/archive/*' -print -quit)\"",
        "test -n \"$(find openspec/changes -mindepth 4 -maxdepth 6 -name spec.md -not -path '*/archive/*' -print -quit)\"",
      ],
    },
    {
      id: 'checklist-complete',
      label: 'Checklist completed',
      commands: [
        "test -n \"$(find openspec/changes -mindepth 2 -maxdepth 2 -name tasks.md -not -path '*/archive/*' -print -quit)\"",
        "if grep -R \"^[[:space:]]*-[[:space:]]*\\\\[[[:space:]]\\\\]\" -n openspec/changes/*/tasks.md >/dev/null; then exit 1; fi",
      ],
    },
    {
      id: 'merge-clean',
      label: 'No unresolved conflicts',
      commands: ["test -z \"$(git ls-files -u)\""],
    },
  ],
  archived: [
    {
      id: 'spec-created',
      label: 'Spec created',
      commands: [
        "test -n \"$(find openspec/changes -mindepth 2 -maxdepth 2 -name proposal.md -not -path '*/archive/*' -print -quit)\"",
        "test -n \"$(find openspec/changes -mindepth 4 -maxdepth 6 -name spec.md -not -path '*/archive/*' -print -quit)\"",
      ],
    },
    {
      id: 'checklist-complete',
      label: 'Checklist completed',
      commands: [
        "test -n \"$(find openspec/changes -mindepth 2 -maxdepth 2 -name tasks.md -not -path '*/archive/*' -print -quit)\"",
        "if grep -R \"^[[:space:]]*-[[:space:]]*\\\\[[[:space:]]\\\\]\" -n openspec/changes/*/tasks.md >/dev/null; then exit 1; fi",
      ],
    },
    {
      id: 'merge-clean',
      label: 'No unresolved conflicts',
      commands: ["test -z \"$(git ls-files -u)\""],
    },
  ],
};

const PROJECT_FILENAME = 'gates.yaml';
const AGENT_PREFIX = 'gates-';
const AGENT_EXT = '.yaml';
const GLOBAL_FILENAME = 'gates.yaml';
const LEGACY_GLOBAL_FILENAME = 'gates.json';

const fsp = fs.promises;

function getGlobalGatesPath() {
  return path.join(app.getPath('userData'), GLOBAL_FILENAME);
}

function getLegacyGlobalGatesPath() {
  return path.join(app.getPath('userData'), LEGACY_GLOBAL_FILENAME);
}

async function getProjectGatesPath(worktreePath) {
  try {
    const repoRoot = await getRepoRoot(worktreePath || process.cwd());
    return path.join(repoRoot, '.agency', PROJECT_FILENAME);
  } catch (error) {
    return null;
  }
}

function getAgentGatesPath(worktreePath) {
  if (!worktreePath) {
    return null;
  }
  const worktreeName = path.basename(worktreePath);
  return path.join(worktreePath, '.agency', `${AGENT_PREFIX}${worktreeName}${AGENT_EXT}`);
}

function normalizeId(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-');
}

function normalizeGateList(raw) {
  const used = new Set();
  return (Array.isArray(raw) ? raw : []).map((gate, index) => {
    const next = gate || {};
    const base = normalizeId(next.id) || normalizeId(next.label) || `gate-${index + 1}`;
    let id = base;
    let suffix = 1;
    while (!id || used.has(id)) {
      id = `${base || 'gate'}-${suffix}`;
      suffix += 1;
    }
    used.add(id);
    const { commands, ...rest } = next;
    return {
      ...rest,
      id,
      label: String(next.label || '').trim() || id,
      commands: Array.isArray(commands)
        ? commands.map((command) => String(command || '').trim()).filter(Boolean)
        : [],
    };
  });
}

function normalizeConfig(raw) {
  const config = raw || {};
  return {
    draft: normalizeGateList(config.draft),
    active: normalizeGateList(config.active),
    archived: normalizeGateList(config.archived),
  };
}

async function readGlobalGates() {
  const filePath = getGlobalGatesPath();
  const legacyPath = getLegacyGlobalGatesPath();
  const targetPath = fs.existsSync(filePath)
    ? filePath
    : fs.existsSync(legacyPath)
      ? legacyPath
      : null;
  if (!targetPath) {
    return normalizeConfig(DEFAULT_GATES);
  }
  try {
    const raw = await fsp.readFile(targetPath, 'utf-8');
    const parsed = targetPath.endsWith('.json') ? JSON.parse(raw) : yaml.load(raw);
    return normalizeConfig(parsed);
  } catch (error) {
    logRuntime('warn', 'failed to parse global gates config', {
      path: targetPath,
      error: error?.message || String(error),
    });
    return normalizeConfig(DEFAULT_GATES);
  }
}

async function readProjectGates(worktreePath) {
  if (!worktreePath) {
    return normalizeConfig({});
  }
  const filePath = await getProjectGatesPath(worktreePath);
  if (!filePath || !fs.existsSync(filePath)) {
    return normalizeConfig({});
  }
  try {
    const raw = await fsp.readFile(filePath, 'utf-8');
    const parsed = yaml.load(raw);
    return normalizeConfig(parsed);
  } catch (error) {
    return normalizeConfig({});
  }
}

async function readAgentGates(worktreePath) {
  const filePath = getAgentGatesPath(worktreePath);
  if (!filePath || !fs.existsSync(filePath)) {
    return normalizeConfig({});
  }
  try {
    const raw = await fsp.readFile(filePath, 'utf-8');
    const parsed = yaml.load(raw);
    return normalizeConfig(parsed);
  } catch (error) {
    return normalizeConfig({});
  }
}

async function writeGlobalGates(config) {
  const filePath = getGlobalGatesPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeConfig(config);
  await fsp.writeFile(filePath, yaml.dump(normalized, { lineWidth: 120 }), 'utf-8');
  return normalized;
}

async function writeProjectGates(worktreePath, config) {
  if (!worktreePath) {
    throw new Error('worktreePath is required for project gates.');
  }
  const filePath = await getProjectGatesPath(worktreePath);
  if (!filePath) {
    throw new Error('Unable to resolve project gates path.');
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeConfig(config);
  await fsp.writeFile(filePath, yaml.dump(normalized, { lineWidth: 120 }), 'utf-8');
  return normalized;
}

async function writeAgentGates(worktreePath, config) {
  if (!worktreePath) {
    throw new Error('worktreePath is required for agent gates.');
  }
  const filePath = getAgentGatesPath(worktreePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeConfig(config);
  await fsp.writeFile(filePath, yaml.dump(normalized, { lineWidth: 120 }), 'utf-8');
  return normalized;
}

function mergeGates(...scopes) {
  const merged = [];
  const indexById = new Map();
  scopes.flat().forEach((gate, index) => {
    if (!gate) {
      return;
    }
    const id = gate?.id || `gate-${index}`;
    const normalized = { ...gate, id };
    if (indexById.has(id)) {
      merged[indexById.get(id)] = { ...merged[indexById.get(id)], ...normalized };
    } else {
      indexById.set(id, merged.length);
      merged.push(normalized);
    }
  });
  return merged;
}

async function getGates({ scope = 'resolved', worktreePath } = {}) {
  if (scope === 'global') {
    return readGlobalGates();
  }
  if (scope === 'project') {
    return readProjectGates(worktreePath);
  }
  if (scope === 'agent') {
    return readAgentGates(worktreePath);
  }
  const globalGates = await readGlobalGates();
  const projectGates = await readProjectGates(worktreePath);
  const agentGates = await readAgentGates(worktreePath);
  const merged = {};
  STAGES.forEach((stage) => {
    merged[stage] = mergeGates(globalGates[stage], projectGates[stage], agentGates[stage]);
  });
  return merged;
}

async function setGates({ scope = 'global', worktreePath, gates }) {
  if (scope === 'project') {
    return writeProjectGates(worktreePath, gates);
  }
  if (scope === 'agent') {
    return writeAgentGates(worktreePath, gates);
  }
  return writeGlobalGates(gates);
}

function buildGateEnv({ cellName, worktreePath, stage }) {
  return {
    AGENCY_CELL_NAME: cellName || '',
    AGENCY_WORKTREE_PATH: worktreePath || '',
    AGENCY_LIFECYCLE_TARGET: stage || '',
  };
}

function runCommand(command, cwd, envOverrides) {
  return new Promise((resolve) => {
    if (!command) {
      resolve({ code: 0, stdout: '', stderr: '' });
      return;
    }
    const child = spawn('/bin/zsh', ['-lc', command], {
      cwd,
      env: {
        ...process.env,
        ...(envOverrides || {}),
      },
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function formatFailureDetail({ command, code, stderr, stdout }) {
  const parts = [`Command failed (exit ${code}): ${command}`];
  const output = [stderr, stdout].filter(Boolean).join('\n').trim();
  if (output) {
    parts.push(output.split('\n').slice(0, 5).join('\n'));
  }
  return parts.join('\n');
}

async function evaluateGate({ gate, cwd, env }) {
  const commands = Array.isArray(gate.commands) ? gate.commands : [];
  if (commands.length === 0) {
    return { ...gate, passed: true, detail: 'No commands configured.' };
  }
  for (const command of commands) {
    const trimmed = String(command || '').trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const result = await runCommand(trimmed, cwd, env);
    if (result.code !== 0) {
      return {
        ...gate,
        passed: false,
        detail: formatFailureDetail({
          command: trimmed,
          code: result.code,
          stderr: result.stderr,
          stdout: result.stdout,
        }),
      };
    }
  }
  return { ...gate, passed: true, detail: 'All commands passed.' };
}

async function evaluateGates({ worktreePath, stage, cellName }) {
  if (!worktreePath) {
    throw new Error('worktreePath is required to evaluate gates.');
  }
  if (!STAGES.includes(stage)) {
    throw new Error(`Unsupported gate stage: ${stage}`);
  }
  const resolved = await getGates({ scope: 'resolved', worktreePath });
  const gates = resolved[stage] || [];
  let repoRoot = worktreePath;
  try {
    repoRoot = await getRepoRoot(worktreePath);
  } catch (error) {
    repoRoot = worktreePath;
  }
  const env = buildGateEnv({
    cellName: cellName || path.basename(worktreePath),
    worktreePath,
    stage,
  });
  const results = [];
  for (const gate of gates) {
    // eslint-disable-next-line no-await-in-loop
    const result = await evaluateGate({ gate, cwd: repoRoot, env });
    results.push(result);
    if (!result.passed) {
      logRuntime('warn', 'gate check failed', {
        stage,
        gateId: gate.id,
        worktreePath,
        detail: result.detail,
      });
    }
  }
  return { stage, gates: results };
}

module.exports = {
  STAGES,
  DEFAULT_GATES,
  getGlobalGatesPath,
  getProjectGatesPath,
  getAgentGatesPath,
  getGates,
  setGates,
  evaluateGates,
  checkGates: async ({ worktreePath, stage, cellName }) => {
    const result = await evaluateGates({ worktreePath, stage, cellName });
    return result.gates;
  },
  normalizeConfig,
};
