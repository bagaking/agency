const { app } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { logRuntime } = require('./runtimeLog');

const helperRoot = path.join(__dirname, '..', 'native', 'speech-helper');
const helperSource = path.join(helperRoot, 'SpeechHelper.swift');
const devHelperBin = path.join(helperRoot, 'bin', 'speech-helper');

let activeCapture = null;

function execFileAsync(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function resolveHelperPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'speech-helper', 'speech-helper');
  }
  return devHelperBin;
}

async function pathExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.X_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function ensureHelperBinary() {
  if (process.platform !== 'darwin') {
    return { ok: false, reason: 'unsupported-platform' };
  }
  const helperPath = resolveHelperPath();
  if (await pathExists(helperPath)) {
    return { ok: true, helperPath, built: false };
  }
  if (app.isPackaged) {
    return { ok: false, reason: 'missing-helper' };
  }
  try {
    await fs.promises.mkdir(path.dirname(helperPath), { recursive: true });
    await execFileAsync('xcrun', [
      'swiftc',
      '-O',
      '-framework',
      'Speech',
      '-framework',
      'AVFoundation',
      helperSource,
      '-o',
      helperPath,
    ]);
    await fs.promises.chmod(helperPath, 0o755);
    return { ok: true, helperPath, built: true };
  } catch (error) {
    logRuntime('warn', 'speech helper build failed', {
      error: error?.stderr || error?.message || String(error),
    });
    return { ok: false, reason: 'build-failed' };
  }
}

async function getVoiceCaptureSupport() {
  if (process.platform !== 'darwin') {
    return { supported: false, reason: 'unsupported-platform' };
  }
  if (app.isPackaged) {
    const helperPath = resolveHelperPath();
    const exists = await pathExists(helperPath);
    return { supported: exists, reason: exists ? null : 'missing-helper' };
  }
  const exists = await pathExists(resolveHelperPath());
  return { supported: true, reason: exists ? null : 'build-on-demand' };
}

function sendEvent(payload) {
  if (!activeCapture?.sender || activeCapture.sender.isDestroyed()) {
    return;
  }
  activeCapture.sender.send('voice:capture:event', {
    captureId: activeCapture.id,
    ...payload,
  });
}

function clearActiveCapture() {
  if (!activeCapture) {
    return;
  }
  activeCapture = null;
}

async function stopVoiceCapture({ captureId } = {}) {
  if (!activeCapture) {
    return { stopped: false, reason: 'no-active-capture' };
  }
  if (captureId && captureId !== activeCapture.id) {
    return { stopped: false, reason: 'capture-mismatch' };
  }
  sendEvent({ type: 'status', status: 'stopping' });
  const child = activeCapture.process;
  if (child?.stdin && !child.stdin.destroyed) {
    try {
      child.stdin.write('stop\n');
    } catch (error) {
      logRuntime('warn', 'speech helper stop failed', {
        error: error?.message || String(error),
      });
    }
  }
  setTimeout(() => {
    if (activeCapture?.process === child && !child.killed) {
      child.kill('SIGTERM');
    }
  }, 2000);
  return { stopped: true };
}

async function startVoiceCapture({ language } = {}, sender) {
  if (process.platform !== 'darwin') {
    return { supported: false, reason: 'unsupported-platform' };
  }
  if (activeCapture) {
    await stopVoiceCapture({ captureId: activeCapture.id });
  }
  const helper = await ensureHelperBinary();
  if (!helper.ok) {
    return { supported: false, reason: helper.reason || 'helper-unavailable' };
  }
  const captureId = `speech-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const args = [];
  if (language) {
    args.push('--lang', language);
  }
  const child = spawn(helper.helperPath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  activeCapture = {
    id: captureId,
    process: child,
    sender,
    buffer: '',
  };

  sendEvent({ type: 'status', status: 'starting' });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    const next = `${activeCapture?.buffer || ''}${chunk}`;
    const lines = next.split('\n');
    const remainder = lines.pop() || '';
    if (activeCapture) {
      activeCapture.buffer = remainder;
    }
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const event = JSON.parse(trimmed);
        if (event && typeof event === 'object') {
          sendEvent(event);
        }
      } catch (error) {
        logRuntime('warn', 'speech helper output parse failed', {
          error: error?.message || String(error),
          line: trimmed,
        });
      }
    }
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    logRuntime('warn', 'speech helper stderr', { captureId, stderr: chunk });
  });

  child.on('exit', (code, signal) => {
    sendEvent({ type: 'status', status: 'stopped', code, signal });
    clearActiveCapture();
  });

  child.on('error', (error) => {
    logRuntime('warn', 'speech helper process error', {
      error: error?.message || String(error),
    });
  });

  return { supported: true, captureId, backend: 'native' };
}

module.exports = {
  getVoiceCaptureSupport,
  startVoiceCapture,
  stopVoiceCapture,
};
