const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

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

module.exports = {
  ensureTmuxAvailable,
  hasSession,
  createSession,
  setMouse,
  killSession,
  getTmuxStatus,
};
