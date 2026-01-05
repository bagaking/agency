const { app } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { logRuntime } = require('./runtimeLog');

const helperRoot = path.join(__dirname, '..', 'native', 'speech-helper');
const helperSource = path.join(helperRoot, 'SpeechHelper.swift');
const helperInfoPlist = path.join(helperRoot, 'Info.plist');
const helperBundleName = 'SpeechHelper.app';
const devHelperBundle = path.join(helperRoot, 'bin', helperBundleName);
const devHelperBin = path.join(devHelperBundle, 'Contents', 'MacOS', 'speech-helper');

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
    return path.join(
      process.resourcesPath,
      'speech-helper',
      helperBundleName,
      'Contents',
      'MacOS',
      'speech-helper'
    );
  }
  return devHelperBin;
}

function resolveHelperInfoPath() {
  const helperPath = resolveHelperPath();
  return path.join(path.dirname(helperPath), '..', 'Info.plist');
}

async function pathExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.X_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function isHelperStale(helperPath, infoPath) {
  try {
    const [helperStat, sourceStat, infoStat] = await Promise.all([
      fs.promises.stat(helperPath),
      fs.promises.stat(helperSource),
      fs.promises.stat(infoPath),
    ]);
    return (
      sourceStat.mtimeMs > helperStat.mtimeMs ||
      infoStat.mtimeMs > helperStat.mtimeMs
    );
  } catch (error) {
    return true;
  }
}

async function ensureHelperBinary() {
  if (process.platform !== 'darwin') {
    return { ok: false, reason: 'unsupported-platform' };
  }
  const helperPath = resolveHelperPath();
  const infoPath = resolveHelperInfoPath();
  if ((await pathExists(helperPath)) && (await fileExists(infoPath))) {
    const stale = await isHelperStale(helperPath, infoPath);
    if (!stale) {
      return { ok: true, helperPath, built: false };
    }
    logRuntime('info', 'speech helper rebuild required', { helperPath });
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
      '-framework',
      'AppKit',
      helperSource,
      '-o',
      helperPath,
    ]);
    await fs.promises.chmod(helperPath, 0o755);
    if (!(await fileExists(helperInfoPlist))) {
      return { ok: false, reason: 'missing-infoplist' };
    }
    await fs.promises.mkdir(path.dirname(infoPath), { recursive: true });
    await fs.promises.copyFile(helperInfoPlist, infoPath);
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
  const helperPath = resolveHelperPath();
  const infoPath = resolveHelperInfoPath();
  const helperReady = (await pathExists(helperPath)) && (await fileExists(infoPath));
  if (app.isPackaged) {
    return { supported: helperReady, reason: helperReady ? null : 'missing-helper' };
  }
  if (helperReady) {
    return { supported: true, reason: null };
  }
  return { supported: true, reason: 'build-on-demand' };
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

function sendError(message) {
  sendEvent({ type: 'error', message });
}

function clearActiveCapture() {
  if (!activeCapture) {
    return;
  }
  activeCapture = null;
}

async function stopVoiceCapture({ captureId, source } = {}) {
  if (!activeCapture) {
    return { stopped: false, reason: 'no-active-capture' };
  }
  if (captureId && captureId !== activeCapture.id) {
    return { stopped: false, reason: 'capture-mismatch' };
  }
  logRuntime('info', 'speech helper stop requested', {
    captureId: activeCapture.id,
    source: source || null,
  });
  sendEvent({ type: 'status', status: 'stopping' });
  const child = activeCapture.process;
  activeCapture.stopRequested = true;
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
  logRuntime('info', 'speech helper start requested', {
    language,
  });
  const helper = await ensureHelperBinary();
  if (!helper.ok) {
    logRuntime('warn', 'speech helper unavailable', {
      reason: helper.reason || 'helper-unavailable',
    });
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
    stopRequested: false,
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
    if (!activeCapture?.stopRequested) {
      const reason = signal || (Number.isFinite(code) ? `code ${code}` : null);
      if (reason && (code !== 0 || signal)) {
        sendError(`Speech helper exited (${reason}).`);
      } else if (code === 0) {
        sendError('Speech helper exited unexpectedly.');
      }
    }
    sendEvent({ type: 'status', status: 'stopped', code, signal });
    logRuntime('warn', 'speech helper exited', {
      captureId,
      code,
      signal,
      stopRequested: activeCapture?.stopRequested || false,
    });
    const captureSnapshot = activeCapture;
    setTimeout(() => {
      if (activeCapture === captureSnapshot) {
        clearActiveCapture();
      }
    }, 200);
  });

  child.on('error', (error) => {
    logRuntime('warn', 'speech helper process error', {
      error: error?.message || String(error),
    });
    sendError(error?.message || 'Speech helper failed to start.');
  });

  return { supported: true, captureId, backend: 'native' };
}

module.exports = {
  getVoiceCaptureSupport,
  startVoiceCapture,
  stopVoiceCapture,
};
