import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const fsp = fs.promises;

const ACTION_SHEETS_DIR = 'action-sheets';
const PLAN_FILENAME = 'plan.md';
const PROMPT_FILENAME = 'prompt.json';
const CHECKS_FILENAME = 'checks.json';
const STATUS_FILENAME = 'status.json';

type AnyRecord = Record<string, any>;

export type ActionSheetContext = {
  worktreePath: string;
  /**
   * Optional repo root override. When provided, Action Sheets are stored under
   * `<repoRootPath>/.agency/action-sheets` to preserve existing behavior.
   */
  repoRootPath?: string;
};

export type ActionSheetStatus = {
  id: string;
  title: string;
  state: string;
  sessionId: string;
  cellId: string;
  gateStatus: string;
  attempts: number;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  archivedAt: string | null;
  lastRunAt: string | null;
  lastGateAt: string | null;
  lastError: string;
  conditional: AnyRecord;
};

export type ActionSheetPrompt = {
  requirements: string;
  context: string;
  checks: string;
  done: string;
};

export type ActionSheetCheck = {
  id: string;
  label: string;
  commands: string[];
  status: string;
  detail: string;
  checkedAt: string | null;
};

export type ActionSheetDocument = {
  id: string;
  plan: string;
  prompt: ActionSheetPrompt;
  checks: ActionSheetCheck[];
  status: ActionSheetStatus;
};

const DEFAULT_CONDITIONAL = {
  enabled: true,
  when: 'checks.all_passed',
  repeat: { maxAttempts: 3, cooldownMs: 60000 },
  followupPrompt: '',
};

function buildId(): string {
  return `action-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeId(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeStorageRootPath(input: ActionSheetContext): string {
  const repoRootPath = String(input.repoRootPath || '').trim();
  return repoRootPath || input.worktreePath;
}

function resolveActionSheetsRoot(input: ActionSheetContext): string {
  if (!input.worktreePath) {
    throw new Error('worktreePath is required.');
  }
  return path.join(normalizeStorageRootPath(input), '.agency', ACTION_SHEETS_DIR);
}

async function ensureActionSheetsRoot(input: ActionSheetContext): Promise<string> {
  const root = resolveActionSheetsRoot(input);
  await fsp.mkdir(root, { recursive: true });
  return root;
}

async function resolveActionSheetDir(input: ActionSheetContext, id: string): Promise<string> {
  const root = await ensureActionSheetsRoot(input);
  return path.join(root, id);
}

async function requireActionSheetDir(input: ActionSheetContext, id: string): Promise<string> {
  const dir = await resolveActionSheetDir(input, id);
  const exists = await fsp
    .stat(dir)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
  if (!exists) {
    throw new Error('Action Sheet not found.');
  }
  return dir;
}

async function readJson(filePath: string, fallback: AnyRecord | null = null): Promise<any> {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await fsp.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function normalizePrompt(prompt: AnyRecord = {}): ActionSheetPrompt {
  return {
    requirements: String(prompt.requirements || ''),
    context: String(prompt.context || ''),
    checks: String(prompt.checks || ''),
    done: String(prompt.done || ''),
  };
}

function normalizeChecks(list: AnyRecord[] = [], previous: AnyRecord[] = []): ActionSheetCheck[] {
  const used = new Set<string>();
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
        ? item.commands.map((command: unknown) => String(command || '').trim()).filter(Boolean)
        : [],
      status: item.status || prior?.status || 'pending',
      detail: item.detail || prior?.detail || '',
      checkedAt: item.checkedAt || prior?.checkedAt || null,
    };
  });
}

function resolveTitleFromPlan(plan = ''): string {
  const line = String(plan || '')
    .split('\n')
    .find((entry) => entry.trim().startsWith('#'));
  if (!line) {
    return '';
  }
  return line.replace(/^#+\s*/, '').trim();
}

function buildStatus(payload: AnyRecord = {}): ActionSheetStatus {
  const timestamp = new Date().toISOString();
  return {
    id: String(payload.id || '').trim(),
    title: String(payload.title || 'Action Sheet'),
    state: String(payload.state || 'queued'),
    sessionId: String(payload.sessionId || ''),
    cellId: String(payload.cellId || ''),
    gateStatus: String(payload.gateStatus || 'idle'),
    attempts: Number.isFinite(Number(payload.attempts)) ? Number(payload.attempts) : 0,
    nextRunAt: payload.nextRunAt || null,
    createdAt: payload.createdAt || timestamp,
    updatedAt: payload.updatedAt || timestamp,
    archived: Boolean(payload.archived),
    archivedAt: payload.archivedAt || null,
    lastRunAt: payload.lastRunAt || null,
    lastGateAt: payload.lastGateAt || null,
    lastError: String(payload.lastError || ''),
    conditional: payload.conditional || DEFAULT_CONDITIONAL,
  };
}

export async function listActionSheets(
  input: ActionSheetContext & { includeArchived?: boolean }
): Promise<ActionSheetStatus[]> {
  const includeArchived = Boolean(input?.includeArchived);
  const root = resolveActionSheetsRoot(input);
  let entries: fs.Dirent[] = [];
  try {
    entries = await fsp.readdir(root, { withFileTypes: true });
  } catch (_error) {
    return [];
  }
  const sheets: ActionSheetStatus[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const id = entry.name;
    const statusPath = path.join(root, id, STATUS_FILENAME);
    const status = await readJson(statusPath, null);
    if (!status) {
      continue;
    }
    const normalized = buildStatus({ ...status, id });
    if (!includeArchived && normalized.archived) {
      continue;
    }
    sheets.push(normalized);
  }
  return sheets.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export async function readActionSheet(
  input: ActionSheetContext & { id: string }
): Promise<ActionSheetDocument | null> {
  const id = String(input?.id || '').trim();
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const dir = await resolveActionSheetDir(input, id);
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

export async function createActionSheet(
  input: ActionSheetContext & { payload?: AnyRecord }
): Promise<ActionSheetDocument> {
  const payload = input?.payload || {};
  const root = await ensureActionSheetsRoot(input);
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
  return (await readActionSheet({ ...input, id })) as ActionSheetDocument;
}

export async function updateActionSheetStatus(
  input: ActionSheetContext & { id: string; patch?: AnyRecord }
): Promise<ActionSheetStatus> {
  const patch = input?.patch || {};
  const id = String(input?.id || '').trim();
  const dir = await requireActionSheetDir(input, id);
  const statusPath = path.join(dir, STATUS_FILENAME);
  const current = await readJson(statusPath, buildStatus({ id }));
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(statusPath, next);
  return buildStatus(next);
}

export async function archiveActionSheet(input: ActionSheetContext & { id: string }): Promise<ActionSheetStatus> {
  const id = String(input?.id || '').trim();
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const dir = await requireActionSheetDir(input, id);
  const statusPath = path.join(dir, STATUS_FILENAME);
  const current = await readJson(statusPath, buildStatus({ id }));
  const archivedAt = current.archivedAt || new Date().toISOString();
  return updateActionSheetStatus({
    ...input,
    id,
    patch: { archived: true, archivedAt },
  });
}

export async function deleteActionSheet(
  input: ActionSheetContext & { id: string }
): Promise<{ id: string; deleted: true }> {
  const id = String(input?.id || '').trim();
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const dir = await resolveActionSheetDir(input, id);
  await fsp.rm(dir, { recursive: true, force: true });
  return { id, deleted: true };
}

export async function updateActionSheetPlan(
  input: ActionSheetContext & { id: string; plan: string }
): Promise<ActionSheetDocument | null> {
  const id = String(input?.id || '').trim();
  const dir = await requireActionSheetDir(input, id);
  await fsp.writeFile(path.join(dir, PLAN_FILENAME), String(input.plan || ''), 'utf8');
  return readActionSheet({ ...input, id });
}

export async function updateActionSheetPrompt(
  input: ActionSheetContext & { id: string; prompt: AnyRecord }
): Promise<ActionSheetDocument | null> {
  const id = String(input?.id || '').trim();
  const dir = await requireActionSheetDir(input, id);
  const normalized = normalizePrompt(input.prompt || {});
  await writeJson(path.join(dir, PROMPT_FILENAME), normalized);
  return readActionSheet({ ...input, id });
}

export async function updateActionSheetChecks(
  input: ActionSheetContext & { id: string; checks: AnyRecord[] }
): Promise<ActionSheetDocument | null> {
  const id = String(input?.id || '').trim();
  const dir = await requireActionSheetDir(input, id);
  const current = await readJson(path.join(dir, CHECKS_FILENAME), { checks: [] });
  const normalized = normalizeChecks(input.checks || [], current.checks || []);
  await writeJson(path.join(dir, CHECKS_FILENAME), {
    checks: normalized,
    updatedAt: new Date().toISOString(),
  });
  return readActionSheet({ ...input, id });
}

function runCommand(command: string, cwd: string, env: Record<string, string>): Promise<AnyRecord> {
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

function isRgMissing(stderr = ''): boolean {
  return /command not found: rg|rg: command not found/.test(String(stderr));
}

function parseRgCommand(command: string): { pattern: string; file: string } | null {
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

async function runRgFallbackCheck(command: string, repoRoot: string): Promise<AnyRecord | null> {
  const parsed = parseRgCommand(command);
  if (!parsed) {
    return null;
  }
  const filePath = path.isAbsolute(parsed.file) ? parsed.file : path.join(repoRoot, parsed.file);
  let contents = '';
  try {
    contents = await fsp.readFile(filePath, 'utf8');
  } catch (_error) {
    return { passed: false, detail: `File not found: ${parsed.file}` };
  }
  let regex: RegExp;
  try {
    regex = new RegExp(parsed.pattern);
  } catch (error: any) {
    return { passed: false, detail: `Invalid pattern: ${error?.message || 'regex parse failed'}` };
  }
  const passed = contents.split(/\r?\n/).some((line) => regex.test(line));
  if (passed) {
    return { passed: true, detail: '' };
  }
  return { passed: false, detail: `Pattern not found in ${parsed.file}` };
}

function formatCheckFailure({ command, code, stderr, stdout }: AnyRecord): string {
  const parts = [`Command failed (exit ${code}): ${command}`];
  const output = [stderr, stdout].filter(Boolean).join('\n').trim();
  if (output) {
    parts.push(output.split('\n').slice(0, 5).join('\n'));
  }
  return parts.join('\n');
}

export async function runActionSheetChecks(
  input: ActionSheetContext & { id: string }
): Promise<AnyRecord> {
  const sheet = await readActionSheet(input);
  if (!sheet) {
    throw new Error('Action Sheet not found.');
  }
  const repoRoot = normalizeStorageRootPath(input);
  const checks: ActionSheetCheck[] = [];
  for (const check of sheet.checks) {
    const commands = Array.isArray(check.commands) ? check.commands : [];
    if (!commands.length) {
      checks.push({ ...check });
      continue;
    }
    let passed = true;
    let detail = '';
    for (const command of commands) {
      if (!String(command || '').trim()) {
        continue;
      }
      const result = await runCommand(String(command), repoRoot, {
        ACTION_SHEET_ID: sheet.id,
        ACTION_SHEET_CHECK: check.id,
      });
      if (result.code !== 0 && isRgMissing(result.stderr)) {
        const fallback = await runRgFallbackCheck(String(command), repoRoot);
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
  await updateActionSheetChecks({ ...input, id: sheet.id, checks });
  const statuses = checks.map((item) => item.status);
  const allPassed = statuses.length > 0 && statuses.every((status) => status === 'passed');
  const anyFailed = statuses.some((status) => status === 'failed');
  const gateStatus = allPassed ? 'passed' : anyFailed ? 'failed' : 'waiting';
  await updateActionSheetStatus({
    ...input,
    id: sheet.id,
    patch: {
      gateStatus,
      lastGateAt: new Date().toISOString(),
    },
  });
  return { checks, gateStatus, allPassed, anyFailed };
}

export function getActionSheetStoragePath(input: ActionSheetContext): string {
  const worktreeName = path.basename(String(input.worktreePath || '').trim());
  return path.join(resolveActionSheetsRoot(input), `index-${worktreeName}.json`);
}

