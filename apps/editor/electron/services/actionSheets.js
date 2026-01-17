const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { getRepoRoot } = require('./git');
const { logRuntime } = require('./runtimeLog');

const fsp = fs.promises;
const ACTION_SHEETS_DIR = 'action-sheets';
const PLAN_FILENAME = 'plan.md';
const PROMPT_FILENAME = 'prompt.json';
const CHECKS_FILENAME = 'checks.json';
const STATUS_FILENAME = 'status.json';

const buildId = () =>
  `action-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

const normalizeId = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function resolveActionSheetsRoot(worktreePath) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  try {
    const repoRoot = await getRepoRoot(worktreePath);
    return path.join(repoRoot, '.agency', ACTION_SHEETS_DIR);
  } catch (error) {
    return path.join(worktreePath, '.agency', ACTION_SHEETS_DIR);
  }
}

async function ensureActionSheetsRoot(worktreePath) {
  const root = await resolveActionSheetsRoot(worktreePath);
  await fsp.mkdir(root, { recursive: true });
  return root;
}

async function resolveActionSheetDir(worktreePath, id) {
  const root = await ensureActionSheetsRoot(worktreePath);
  return path.join(root, id);
}

async function requireActionSheetDir(worktreePath, id) {
  const dir = await resolveActionSheetDir(worktreePath, id);
  const exists = await fsp
    .stat(dir)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
  if (!exists) {
    throw new Error('Action Sheet not found.');
  }
  return dir;
}

async function readJson(filePath, fallback = null) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

async function writeJson(filePath, payload) {
  await fsp.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function normalizePrompt(prompt = {}) {
  return {
    requirements: String(prompt.requirements || ''),
    context: String(prompt.context || ''),
    checks: String(prompt.checks || ''),
    done: String(prompt.done || ''),
  };
}

function normalizeChecks(list = [], previous = []) {
  const used = new Set();
  const previousById = new Map((previous || []).map((item) => [item.id, item]));
  return (Array.isArray(list) ? list : []).map((item, index) => {
    const baseId = normalizeId(item.id || item.label || `check-${index + 1}`) || `check-${index + 1}`;
    let id = baseId;
    let suffix = 1;
    while (used.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    used.add(id);
    const prior = previousById.get(id);
    return {
      id,
      label: String(item.label || '').trim() || id,
      commands: Array.isArray(item.commands)
        ? item.commands.map((command) => String(command || '').trim()).filter(Boolean)
        : [],
      status: item.status || prior?.status || 'pending',
      detail: item.detail || prior?.detail || '',
      checkedAt: item.checkedAt || prior?.checkedAt || null,
    };
  });
}

function resolveTitleFromPlan(plan = '') {
  const line = String(plan || '')
    .split('\n')
    .find((entry) => entry.trim().startsWith('#'));
  if (!line) {
    return '';
  }
  return line.replace(/^#+\s*/, '').trim();
}

function buildStatus(payload = {}) {
  const timestamp = new Date().toISOString();
  return {
    id: payload.id,
    title: payload.title || 'Action Sheet',
    state: payload.state || 'queued',
    sessionId: payload.sessionId || '',
    cellId: payload.cellId || '',
    gateStatus: payload.gateStatus || 'idle',
    attempts: payload.attempts || 0,
    nextRunAt: payload.nextRunAt || null,
    createdAt: payload.createdAt || timestamp,
    updatedAt: payload.updatedAt || timestamp,
    archived: Boolean(payload.archived),
    archivedAt: payload.archivedAt || null,
    lastRunAt: payload.lastRunAt || null,
    lastGateAt: payload.lastGateAt || null,
    lastError: payload.lastError || '',
    conditional: payload.conditional || {
      enabled: true,
      when: 'checks.all_passed',
      repeat: { maxAttempts: 3, cooldownMs: 60000 },
      followupPrompt: '',
    },
  };
}

async function listActionSheets({ worktreePath, includeArchived = false }) {
  const root = await resolveActionSheetsRoot(worktreePath);
  let entries = [];
  try {
    entries = await fsp.readdir(root, { withFileTypes: true });
  } catch (error) {
    return [];
  }
  const sheets = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const id = entry.name;
    const statusPath = path.join(root, id, STATUS_FILENAME);
    const status = await readJson(statusPath, null);
    if (status) {
      const normalized = buildStatus({ ...status, id });
      if (!includeArchived && normalized.archived) {
        continue;
      }
      sheets.push(normalized);
    }
  }
  return sheets.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

async function readActionSheet({ worktreePath, id }) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const dir = await resolveActionSheetDir(worktreePath, id);
  const dirExists = await fsp
    .stat(dir)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
  if (!dirExists) {
    return null;
  }
  const [plan, prompt, checks, status] = await Promise.all([
    fsp.readFile(path.join(dir, PLAN_FILENAME), 'utf8').catch(() => ''),
    readJson(path.join(dir, PROMPT_FILENAME), normalizePrompt()),
    readJson(path.join(dir, CHECKS_FILENAME), { checks: [] }),
    readJson(path.join(dir, STATUS_FILENAME), null),
  ]);
  let resolvedStatus = status;
  if (!resolvedStatus) {
    resolvedStatus = buildStatus({
      id,
      title: resolveTitleFromPlan(plan) || 'Action Sheet',
    });
    await writeJson(path.join(dir, STATUS_FILENAME), resolvedStatus);
  }
  return {
    id,
    plan,
    prompt: normalizePrompt(prompt),
    checks: normalizeChecks(checks.checks || []),
    status: buildStatus({ ...resolvedStatus, id }),
  };
}

async function createActionSheet({ worktreePath, payload = {} }) {
  const root = await ensureActionSheetsRoot(worktreePath);
  const id = buildId();
  const dir = path.join(root, id);
  await fsp.mkdir(dir, { recursive: true });
  const title = String(payload.title || 'Action Sheet');
  const plan = payload.plan
    ? String(payload.plan)
    : `# ${title}\n\n## Checklist\n- [ ] Define requirements\n- [ ] Confirm checks\n- [ ] Run in session\n`;
  const prompt = normalizePrompt(payload.prompt || {});
  const checks = normalizeChecks(payload.checks || []);
  const status = buildStatus({ id, title, conditional: payload.conditional });
  await Promise.all([
    fsp.writeFile(path.join(dir, PLAN_FILENAME), plan, 'utf8'),
    writeJson(path.join(dir, PROMPT_FILENAME), prompt),
    writeJson(path.join(dir, CHECKS_FILENAME), { checks, updatedAt: status.updatedAt }),
    writeJson(path.join(dir, STATUS_FILENAME), status),
  ]);
  logRuntime('info', 'action sheet created', { id, worktreePath });
  return readActionSheet({ worktreePath, id });
}

async function updateActionSheetStatus({ worktreePath, id, patch = {} }) {
  const dir = await requireActionSheetDir(worktreePath, id);
  const statusPath = path.join(dir, STATUS_FILENAME);
  const current = await readJson(statusPath, buildStatus({ id }));
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(statusPath, next);
  if (patch.state) {
    logRuntime('info', 'action sheet status updated', {
      id,
      worktreePath,
      state: patch.state,
    });
  }
  return next;
}

async function archiveActionSheet({ worktreePath, id }) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const dir = await requireActionSheetDir(worktreePath, id);
  const statusPath = path.join(dir, STATUS_FILENAME);
  const current = await readJson(statusPath, buildStatus({ id }));
  const archivedAt = current.archivedAt || new Date().toISOString();
  const next = await updateActionSheetStatus({
    worktreePath,
    id,
    patch: { archived: true, archivedAt },
  });
  logRuntime('info', 'action sheet archived', { id, worktreePath });
  return next;
}

async function deleteActionSheet({ worktreePath, id }) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const dir = await resolveActionSheetDir(worktreePath, id);
  await fsp.rm(dir, { recursive: true, force: true });
  logRuntime('info', 'action sheet deleted', { id, worktreePath });
  return { id, deleted: true };
}

async function updateActionSheetPlan({ worktreePath, id, plan }) {
  const dir = await requireActionSheetDir(worktreePath, id);
  await fsp.writeFile(path.join(dir, PLAN_FILENAME), String(plan || ''), 'utf8');
  return readActionSheet({ worktreePath, id });
}

async function updateActionSheetPrompt({ worktreePath, id, prompt }) {
  const dir = await requireActionSheetDir(worktreePath, id);
  const normalized = normalizePrompt(prompt || {});
  await writeJson(path.join(dir, PROMPT_FILENAME), normalized);
  return readActionSheet({ worktreePath, id });
}

async function updateActionSheetChecks({ worktreePath, id, checks }) {
  const dir = await requireActionSheetDir(worktreePath, id);
  const current = await readJson(path.join(dir, CHECKS_FILENAME), { checks: [] });
  const normalized = normalizeChecks(checks || [], current.checks || []);
  await writeJson(path.join(dir, CHECKS_FILENAME), {
    checks: normalized,
    updatedAt: new Date().toISOString(),
  });
  return readActionSheet({ worktreePath, id });
}

function runCommand(command, cwd, env) {
  return new Promise((resolve) => {
    const child = spawn('/bin/zsh', ['-lc', command], {
      cwd,
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('error', (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function isRgMissing(stderr = '') {
  return /command not found: rg|rg: command not found/.test(String(stderr));
}

function parseRgCommand(command) {
  const trimmed = String(command || '').trim();
  const match = trimmed.match(/^rg\s+-n\s+(['"])(.+?)\1\s+(.+)$/);
  if (!match) {
    return null;
  }
  let file = match[3].trim();
  const quote = file[0];
  if ((quote === '"' || quote === "'") && file.endsWith(quote)) {
    file = file.slice(1, -1);
  }
  return { pattern: match[2], file };
}

async function runRgFallbackCheck(command, repoRoot) {
  const parsed = parseRgCommand(command);
  if (!parsed) {
    return null;
  }
  const filePath = path.isAbsolute(parsed.file)
    ? parsed.file
    : path.join(repoRoot, parsed.file);
  let contents = '';
  try {
    contents = await fsp.readFile(filePath, 'utf8');
  } catch (error) {
    return { passed: false, detail: `File not found: ${parsed.file}` };
  }
  let regex;
  try {
    regex = new RegExp(parsed.pattern);
  } catch (error) {
    return { passed: false, detail: `Invalid pattern: ${error?.message || 'regex parse failed'}` };
  }
  const passed = contents.split(/\r?\n/).some((line) => regex.test(line));
  if (passed) {
    return { passed: true, detail: '' };
  }
  return { passed: false, detail: `Pattern not found in ${parsed.file}` };
}

function formatCheckFailure({ command, code, stderr, stdout }) {
  const parts = [`Command failed (exit ${code}): ${command}`];
  const output = [stderr, stdout].filter(Boolean).join('\n').trim();
  if (output) {
    parts.push(output.split('\n').slice(0, 5).join('\n'));
  }
  return parts.join('\n');
}

async function runActionSheetChecks({ worktreePath, id }) {
  const sheet = await readActionSheet({ worktreePath, id });
  if (!sheet) {
    throw new Error('Action Sheet not found.');
  }
  let repoRoot = worktreePath;
  try {
    repoRoot = await getRepoRoot(worktreePath);
  } catch (error) {
    repoRoot = worktreePath;
  }
  const checks = [];
  for (const check of sheet.checks) {
    const commands = Array.isArray(check.commands) ? check.commands : [];
    if (!commands.length) {
      checks.push({ ...check });
      continue;
    }
    let passed = true;
    let detail = '';
    for (const command of commands) {
      if (!command.trim()) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const result = await runCommand(command, repoRoot, {
        ACTION_SHEET_ID: sheet.id,
        ACTION_SHEET_CHECK: check.id,
      });
      if (result.code !== 0 && isRgMissing(result.stderr)) {
        // eslint-disable-next-line no-await-in-loop
        const fallback = await runRgFallbackCheck(command, repoRoot);
        if (fallback) {
          if (!fallback.passed) {
            passed = false;
            detail = fallback.detail;
            break;
          }
          continue;
        }
      }
      if (result.code !== 0) {
        passed = false;
        detail = formatCheckFailure({
          command,
          code: result.code,
          stderr: result.stderr,
          stdout: result.stdout,
        });
        break;
      }
    }
    checks.push({
      ...check,
      status: passed ? 'passed' : 'failed',
      detail,
      checkedAt: new Date().toISOString(),
    });
  }
  await updateActionSheetChecks({ worktreePath, id, checks });
  const statuses = checks.map((item) => item.status);
  const allPassed = statuses.length > 0 && statuses.every((status) => status === 'passed');
  const anyFailed = statuses.some((status) => status === 'failed');
  const gateStatus = allPassed ? 'passed' : anyFailed ? 'failed' : 'waiting';
  await updateActionSheetStatus({
    worktreePath,
    id,
    patch: {
      gateStatus,
      lastGateAt: new Date().toISOString(),
    },
  });
  return { checks, gateStatus, allPassed, anyFailed };
}

module.exports = {
  listActionSheets,
  readActionSheet,
  createActionSheet,
  updateActionSheetStatus,
  archiveActionSheet,
  deleteActionSheet,
  updateActionSheetPlan,
  updateActionSheetPrompt,
  updateActionSheetChecks,
  runActionSheetChecks,
};
