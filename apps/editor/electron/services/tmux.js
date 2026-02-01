const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const PREVIEW_MIN_LINES = 20;
const PREVIEW_MAX_LINES = 400;

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

async function killSession(sessionName) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return;
  }
  await execFileAsync('tmux', ['kill-session', '-t', sessionName]);
}

async function capturePane(sessionName, { lines = 160, joinWrapped = false } = {}) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return '';
  }
  if (!sessionName) {
    throw new Error('Session name is required.');
  }
  const parsedLines = Number(lines);
  const clamped = Number.isFinite(parsedLines)
    ? Math.max(PREVIEW_MIN_LINES, Math.min(PREVIEW_MAX_LINES, parsedLines))
    : 160;
  const args = ['capture-pane', '-pt', sessionName, '-e', '-S', `-${clamped}`];
  if (joinWrapped) {
    args.push('-J');
  }
  const result = await execFileAsync('tmux', args);
  return result.stdout || '';
}

async function getPaneSize(sessionName) {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return { cols: null, rows: null };
  }
  if (!sessionName) {
    throw new Error('Session name is required.');
  }
  const result = await execFileAsync('tmux', [
    'display-message',
    '-p',
    '-t',
    sessionName,
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

module.exports = {
  ensureTmuxAvailable,
  hasSession,
  createSession,
  setMouse,
  killSession,
  getTmuxStatus,
  capturePane,
  getPaneSize,
};
