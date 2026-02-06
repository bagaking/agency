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

module.exports = {
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
};
