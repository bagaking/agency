const { app } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { getRepoRoot } = require('./git');
const { logRuntime } = require('./runtimeLog');
const {
  resolveAgentScopeConfigPaths,
  resolveProjectScopeConfigPaths,
} = require('./shared/scopedConfigStorage');

const STAGES = ['draft', 'active', 'archived'];
const DEFAULT_GATES = {
  draft: [],
  active: [],
  archived: [],
};

const PROJECT_FILENAME = 'gates.yaml';
const AGENT_PREFIX = 'gates-';
const AGENT_EXT = '.yaml';
const AGENT_FILENAME = 'gates.yaml';
const GLOBAL_FILENAME = 'gates.yaml';
const LEGACY_GLOBAL_FILENAME = 'gates.json';

const fsp = fs.promises;

function getGlobalGatesPath() {
  return path.join(app.getPath('userData'), GLOBAL_FILENAME);
}

function getLegacyGlobalGatesPath() {
  return path.join(app.getPath('userData'), LEGACY_GLOBAL_FILENAME);
}

async function resolveProjectGatesPaths(params: any = {}) {
  return resolveProjectScopeConfigPaths({
    projectRoot: params.projectRoot,
    worktreePath: params.worktreePath,
    filenames: [PROJECT_FILENAME],
  });
}

async function resolveAgentGatesPaths(params: any = {}) {
  return resolveAgentScopeConfigPaths({
    projectRoot: params.projectRoot,
    worktreePath: params.worktreePath,
    cellId: params.cellId,
    filename: AGENT_FILENAME,
    legacyPrefix: AGENT_PREFIX,
    legacyExt: AGENT_EXT,
  });
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

async function readProjectGates(params: any = {}) {
  const { readPath } = await resolveProjectGatesPaths(params);
  if (!readPath || !fs.existsSync(readPath)) {
    return normalizeConfig({});
  }
  try {
    const raw = await fsp.readFile(readPath, 'utf-8');
    const parsed = yaml.load(raw);
    return normalizeConfig(parsed);
  } catch (error) {
    return normalizeConfig({});
  }
}

async function readAgentGates(params: any = {}) {
  const { readPath } = await resolveAgentGatesPaths(params);
  if (!readPath || !fs.existsSync(readPath)) {
    return normalizeConfig({});
  }
  try {
    const raw = await fsp.readFile(readPath, 'utf-8');
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

async function writeProjectGates(params: any = {}, config) {
  const { canonicalPath, repoRoot } = await resolveProjectGatesPaths(params);
  if (!canonicalPath || !repoRoot) {
    throw new Error('projectRoot is required for project gates.');
  }
  await fsp.mkdir(path.dirname(canonicalPath), { recursive: true });
  const normalized = normalizeConfig(config);
  await fsp.writeFile(canonicalPath, yaml.dump(normalized, { lineWidth: 120 }), 'utf-8');
  return normalized;
}

async function writeAgentGates(params: any = {}, config) {
  const { canonicalPath, repoRoot } = await resolveAgentGatesPaths(params);
  if (!canonicalPath || !repoRoot) {
    throw new Error('projectRoot and cellId are required for agent gates.');
  }
  await fsp.mkdir(path.dirname(canonicalPath), { recursive: true });
  const normalized = normalizeConfig(config);
  await fsp.writeFile(canonicalPath, yaml.dump(normalized, { lineWidth: 120 }), 'utf-8');
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

async function getGates(params: any = {}) {
  const { scope = 'resolved' } = params || {};
  if (scope === 'global') {
    return readGlobalGates();
  }
  if (scope === 'project') {
    return readProjectGates(params);
  }
  if (scope === 'agent') {
    return readAgentGates(params);
  }
  const globalGates = await readGlobalGates();
  const projectGates = await readProjectGates(params);
  const agentGates = await readAgentGates(params);
  const merged = {};
  STAGES.forEach((stage) => {
    merged[stage] = mergeGates(globalGates[stage], projectGates[stage], agentGates[stage]);
  });
  return merged;
}

async function setGates(params: any = {}) {
  const { scope = 'global', gates } = params || {};
  if (scope === 'project') {
    return writeProjectGates(params, gates);
  }
  if (scope === 'agent') {
    return writeAgentGates(params, gates);
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

type GateCommandResult = { code: number; stdout: string; stderr: string };

function runCommand(command, cwd, envOverrides): Promise<GateCommandResult> {
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

async function checkGates({ worktreePath, stage, cellName }) {
  const result = await evaluateGates({ worktreePath, stage, cellName });
  return result.gates;
}

export {
  STAGES,
  DEFAULT_GATES,
  getGlobalGatesPath,
  getGates,
  setGates,
  evaluateGates,
  checkGates,
  normalizeConfig,
};
