// @ts-nocheck
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const PREVIEW_MIN_LINES = 20;
const PREVIEW_MAX_LINES = 400;
const AGENCY_METADATA_FIELDS = [
  ['projectRoot', '@agency_project_root'],
  ['projectName', '@agency_project_name'],
  ['worktreePath', '@agency_worktree_path'],
  ['cellId', '@agency_cell_id'],
  ['cellName', '@agency_cell_name'],
  ['sessionId', '@agency_session_id'],
  ['sessionName', '@agency_session_name'],
  ['sessionStatus', '@agency_session_status'],
  ['lastActivityAt', '@agency_last_activity_at'],
];

function sanitizeTmuxOptionValue(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\t/g, ' ')
    .trim();
}

function normalizeTmuxOptionName(optionName) {
  const key = String(optionName || '').trim();
  if (!key) {
    return '';
  }
  return key.startsWith('@') ? key : `@${key}`;
}

async function setTmuxUserOption(sessionName, optionName, value) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return;
  }
  const target = String(sessionName || '').trim();
  const option = normalizeTmuxOptionName(optionName);
  if (!target || !option) {
    return;
  }
  const normalized = sanitizeTmuxOptionValue(value);
  try {
    if (!normalized) {
      await execFileAsync('tmux', ['set-option', '-q', '-u', '-t', target, option]);
      return;
    }
    await execFileAsync('tmux', ['set-option', '-q', '-t', target, option, normalized]);
  } catch (_error) {
    // Non-fatal: metadata sync should never block session operations.
  }
}

async function setAgencySessionMetadata(sessionName, metadata = {}) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return;
  }
  const target = String(sessionName || '').trim();
  if (!target || !metadata || typeof metadata !== 'object') {
    return;
  }
  for (const [fieldKey, optionName] of AGENCY_METADATA_FIELDS) {
    // eslint-disable-next-line no-await-in-loop
    await setTmuxUserOption(target, optionName, metadata[fieldKey]);
  }
}

function parseSessionAttached(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed > 0 ? 1 : 0;
}

async function listAgencySessionsWithMetadata() {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return [];
  }
  const formatParts = ['#{session_name}', '#{session_attached}'];
  AGENCY_METADATA_FIELDS.forEach(([, optionName]) => {
    formatParts.push(`#{${optionName}}`);
  });
  let output = '';
  try {
    const result = await execFileAsync('tmux', ['list-sessions', '-F', formatParts.join('\t')]);
    output = String(result?.stdout || '');
  } catch (_error) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .map((line) => {
      const columns = line.split('\t');
      const row = {
        tmuxSession: String(columns[0] || '').trim(),
        attached: parseSessionAttached(columns[1]),
      };
      AGENCY_METADATA_FIELDS.forEach(([fieldKey], index) => {
        row[fieldKey] = String(columns[index + 2] || '').trim();
      });
      return row;
    })
    .filter((row) => row.tmuxSession);
}

async function ensureTmuxAvailable() {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return;
  }
  try {
    await execFileAsync('tmux', ['-V']);
  } catch (error) {
    throw new Error('tmux is required. Install tmux and try again.');
  }
}

async function getTmuxStatus() {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return {
      available: true,
      version: 'tmux (test)',
    };
  }
  try {
    const result = await execFileAsync('tmux', ['-V']);
    return {
      available: true,
      version: result.stdout.trim(),
    };
  } catch (error) {
    return {
      available: false,
      error: 'tmux is required. Install tmux and try again.',
    };
  }
}

async function hasSession(sessionName) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return true;
  }
  try {
    await execFileAsync('tmux', ['has-session', '-t', sessionName]);
    return true;
  } catch (error) {
    return false;
  }
}

async function createSession(sessionName, cwd) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return;
  }
  try {
    await execFileAsync('tmux', ['new-session', '-d', '-s', sessionName, '-c', cwd]);
  } catch (error) {
    const stderr = String(error?.stderr || '');
    const message = String(error?.message || '');
    if (stderr.includes('duplicate session') || message.includes('duplicate session')) {
      return;
    }
    throw error;
  }
}

async function setMouse(sessionName, enabled = true) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return;
  }
  if (!sessionName) {
    return;
  }
  try {
    await execFileAsync('tmux', ['set', '-t', sessionName, 'mouse', enabled ? 'on' : 'off']);
  } catch (_error) {
    // Non-fatal: tmux may reject the option or session may be gone.
  }
}

async function setExtendedKeys(sessionName, enabled = true) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return;
  }
  if (!sessionName) {
    return;
  }
  const value = enabled ? 'on' : 'off';
  try {
    await execFileAsync('tmux', ['set', '-t', sessionName, 'xterm-keys', value]);
  } catch (_error) {
    // Non-fatal: older tmux versions may not support xterm-keys.
  }
  try {
    await execFileAsync('tmux', ['set', '-t', sessionName, 'extended-keys', value]);
  } catch (_error) {
    // Non-fatal: older tmux versions may not support extended-keys.
  }
}

async function killSession(sessionName) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return;
  }
  await execFileAsync('tmux', ['kill-session', '-t', sessionName]);
}

async function resolvePaneTarget(sessionName) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return sessionName;
  }
  if (!sessionName) {
    return sessionName;
  }
  try {
    const result = await execFileAsync('tmux', [
      'list-panes',
      '-t',
      sessionName,
      '-F',
      '#{pane_id}',
    ]);
    const paneId = String(result.stdout || '')
      .trim()
      .split(/\s+/)
      .find(Boolean);
    return paneId || sessionName;
  } catch (_error) {
    return sessionName;
  }
}

async function capturePane(
  sessionName,
  { lines = 160, joinWrapped = false, altScreen = false } = {}
) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return '';
  }
  if (!sessionName) {
    throw new Error('Session name is required.');
  }
  const target = await resolvePaneTarget(sessionName);
  const parsedLines = Number(lines);
  const clamped = Number.isFinite(parsedLines)
    ? Math.max(PREVIEW_MIN_LINES, Math.min(PREVIEW_MAX_LINES, parsedLines))
    : 160;
  const args = ['capture-pane', '-pt', target, '-e', '-S', `-${clamped}`];
  if (altScreen) {
    args.push('-a');
  }
  if (joinWrapped) {
    args.push('-J');
  }
  const result = await execFileAsync('tmux', args);
  const output = result.stdout || '';
  if (!altScreen && String(output).trim().length === 0) {
    return capturePane(sessionName, { lines: clamped, joinWrapped, altScreen: true });
  }
  return output;
}

async function getPaneSize(sessionName) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return { cols: null, rows: null };
  }
  if (!sessionName) {
    throw new Error('Session name is required.');
  }
  const target = await resolvePaneTarget(sessionName);
  const result = await execFileAsync('tmux', [
    'display-message',
    '-p',
    '-t',
    target,
    '#{pane_width} #{pane_height}',
  ]);
  const [cols, rows] = String(result.stdout || '')
    .trim()
    .split(/\s+/)
    .map((value) => Number(value));
  return {
    cols: Number.isFinite(cols) ? cols : null,
    rows: Number.isFinite(rows) ? rows : null,
  };
}

async function getLastPaneActivity(sessionName) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return null;
  }
  if (!sessionName) {
    return null;
  }
  try {
    const result = await execFileAsync('tmux', [
      'list-panes',
      '-t',
      sessionName,
      '-F',
      '#{pane_activity}',
    ]);
    const values = String(result.stdout || '')
      .trim()
      .split(/\s+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (!values.length) {
      return null;
    }
    const maxValue = Math.max(...values);
    return new Date(maxValue * 1000).toISOString();
  } catch (_error) {
    return null;
  }
}

async function sendKeys(sessionName, keys = [], { enter = false } = {}) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return;
  }
  if (!sessionName) {
    return;
  }
  const args = ['send-keys', '-t', sessionName];
  if (Array.isArray(keys)) {
    keys.forEach((key) => {
      if (key !== undefined && key !== null && String(key) !== '') {
        args.push(String(key));
      }
    });
  } else if (keys) {
    args.push(String(keys));
  }
  if (enter) {
    args.push('Enter');
  }
  if (args.length <= 3) {
    return;
  }
  await execFileAsync('tmux', args);
}

export {
  ensureTmuxAvailable,
  hasSession,
  createSession,
  setMouse,
  setExtendedKeys,
  killSession,
  getTmuxStatus,
  capturePane,
  getPaneSize,
  getLastPaneActivity,
  sendKeys,
  setAgencySessionMetadata,
  listAgencySessionsWithMetadata,
};
