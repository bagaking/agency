const { app, systemPreferences } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { logRuntime } = require('./runtimeLog');
const { ensureVoiceCacheDir } = require('./voiceCache');

const helperRoot = path.join(__dirname, '..', 'native', 'speech-helper');
const helperSource = path.join(helperRoot, 'SpeechHelper.swift');
const helperInfoPlist = path.join(helperRoot, 'Info.plist');
const helperInfoPlistDev = path.join(helperRoot, 'Info.dev.plist');
const helperBundleName = 'AgencySpeechHelper.app';
const devHelperBundle = path.join(helperRoot, 'bin', helperBundleName);
const devHelperBin = path.join(devHelperBundle, 'Contents', 'MacOS', 'speech-helper');
const VOICE_EVENT_TYPES = {
  AUDIO: 'audio',
  FINAL: 'final',
  RESCORE_REQUEST: 'rescore-request',
};
const RESCORE_REASONS = {
  SUCCESS: 'rescore',
  FALLBACK: 'rescore-fallback',
};
const RESCORE_MODE = 'rescore';
const hostUsageDescriptions = {
  NSMicrophoneUsageDescription:
    'Voice input needs microphone access to capture speech for memos.',
  NSSpeechRecognitionUsageDescription:
    'Voice input uses speech recognition to transcribe memos.',
};
const devHostIdentity = {
  CFBundleDisplayName: 'Agency',
  CFBundleName: 'Agency',
  CFBundleIdentifier: 'com.agency.editor',
};

let activeCapture = null;
let hostUsagePatched = false;
let helperWarmupPromise = null;
const rescoreState = {
  queue: [],
  inFlight: null,
};

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

function resolveHelperBundlePath(helperPath) {
  if (!helperPath) {
    return '';
  }
  return path.resolve(path.dirname(helperPath), '..', '..');
}

async function ensureHelperSignature(helperPath) {
  if (process.platform !== 'darwin' || app.isPackaged) {
    return;
  }
  const bundlePath = resolveHelperBundlePath(helperPath);
  if (!bundlePath.endsWith('.app')) {
    return;
  }
  try {
    await execFileAsync('/usr/bin/codesign', [
      '--verify',
      '--deep',
      '--strict',
      '--verbose=2',
      bundlePath,
    ]);
    return;
  } catch (error) {
    logRuntime('info', 'speech helper codesign verify failed', {
      bundlePath,
      error: error?.stderr || error?.message || String(error),
    });
  }
  try {
    await execFileAsync('/usr/bin/codesign', [
      '--force',
      '--deep',
      '--sign',
      '-',
      '--timestamp=none',
      bundlePath,
    ]);
    logRuntime('info', 'speech helper codesigned', { bundlePath });
  } catch (error) {
    logRuntime('warn', 'speech helper codesign failed', {
      bundlePath,
      error: error?.stderr || error?.message || String(error),
    });
  }
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

function resolveHelperInfoSource() {
  if (app.isPackaged) {
    return helperInfoPlist;
  }
  if (fs.existsSync(helperInfoPlistDev)) {
    return helperInfoPlistDev;
  }
  return helperInfoPlist;
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

async function syncHelperInfoPlist(infoSource, infoTarget) {
  if (!infoSource || !infoTarget) {
    return;
  }
  try {
    const [source, target] = await Promise.all([
      fs.promises.readFile(infoSource),
      fs.promises.readFile(infoTarget),
    ]);
    if (Buffer.compare(source, target) === 0) {
      return;
    }
  } catch (error) {
    // Fall through to copy if target missing or read fails.
  }
  try {
    await fs.promises.copyFile(infoSource, infoTarget);
    logRuntime('info', 'speech helper Info.plist synced', {
      source: infoSource,
      target: infoTarget,
    });
  } catch (error) {
    logRuntime('warn', 'speech helper Info.plist sync failed', {
      error: error?.message || String(error),
      source: infoSource,
      target: infoTarget,
    });
  }
}

function resolveHostInfoPlistPath() {
  if (process.platform !== 'darwin') {
    return null;
  }
  const execDir = path.dirname(process.execPath);
  return path.join(execDir, '..', 'Info.plist');
}

async function ensureHostUsageDescriptions() {
  if (process.platform !== 'darwin' || app.isPackaged || hostUsagePatched) {
    return;
  }
  const infoPath = resolveHostInfoPlistPath();
  if (!infoPath || !(await fileExists(infoPath))) {
    logRuntime('warn', 'speech helper host Info.plist missing', { infoPath });
    return;
  }
  const updates = Object.entries({
    ...hostUsageDescriptions,
    ...devHostIdentity,
  });
  for (const [key, value] of updates) {
    try {
      await execFileAsync('/usr/bin/plutil', ['-replace', key, '-string', value, infoPath]);
    } catch (error) {
      logRuntime('warn', 'speech helper host Info.plist update failed', {
        key,
        error: error?.stderr || error?.message || String(error),
      });
    }
  }
  hostUsagePatched = true;
  logRuntime('info', 'speech helper host Info.plist updated', { infoPath });
}

async function ensureDevMicrophoneAccess() {
  if (process.platform !== 'darwin' || app.isPackaged) {
    return;
  }
  if (!systemPreferences?.getMediaAccessStatus || !systemPreferences?.askForMediaAccess) {
    return;
  }
  const status = systemPreferences.getMediaAccessStatus('microphone');
  logRuntime('info', 'speech helper dev mic access status', { status });
  if (status === 'not-determined') {
    const granted = await systemPreferences.askForMediaAccess('microphone');
    logRuntime('info', 'speech helper dev mic access requested', { granted });
  }
}

async function isHelperStale(helperPath, infoSource) {
  try {
    const infoPath = infoSource || helperInfoPlist;
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
  const infoSource = resolveHelperInfoSource();
  const helperReady = (await pathExists(helperPath)) && (await fileExists(infoPath));
  if (app.isPackaged) {
    return helperReady ? { ok: true, helperPath, built: false } : { ok: false, reason: 'missing-helper' };
  }
  if (helperReady) {
    await syncHelperInfoPlist(infoSource, infoPath);
    const stale = await isHelperStale(helperPath, infoSource);
    if (!stale) {
      await ensureHelperSignature(helperPath);
      return { ok: true, helperPath, built: false };
    }
    logRuntime('info', 'speech helper rebuild required', { helperPath });
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
      'NaturalLanguage',
      helperSource,
      '-o',
      helperPath,
    ]);
    await fs.promises.chmod(helperPath, 0o755);
    if (!(await fileExists(infoSource))) {
      return { ok: false, reason: 'missing-infoplist' };
    }
    await fs.promises.mkdir(path.dirname(infoPath), { recursive: true });
    await fs.promises.copyFile(infoSource, infoPath);
    await ensureHelperSignature(helperPath);
    return { ok: true, helperPath, built: true };
  } catch (error) {
    logRuntime('warn', 'speech helper build failed', {
      error: error?.stderr || error?.message || String(error),
    });
    return { ok: false, reason: 'build-failed' };
  }
}

async function warmupVoiceCapture({ source, reason } = {}) {
  if (process.platform !== 'darwin') {
    return { ok: false, reason: 'unsupported-platform' };
  }
  if (helperWarmupPromise) {
    return helperWarmupPromise;
  }
  const startedAt = Date.now();
  logRuntime('info', 'speech helper warmup start', {
    source: source || null,
    reason: reason || null,
  });
  helperWarmupPromise = (async () => {
    await ensureHostUsageDescriptions();
    const helper = await ensureHelperBinary();
    logRuntime('info', 'speech helper warmup done', {
      source: source || null,
      ok: helper.ok,
      built: helper.built || false,
      reason: helper.reason || null,
      elapsedMs: Date.now() - startedAt,
    });
    return helper;
  })()
    .catch((error) => {
      logRuntime('warn', 'speech helper warmup failed', {
        source: source || null,
        error: error?.message || String(error),
      });
      return { ok: false, reason: 'warmup-failed' };
    })
    .finally(() => {
      helperWarmupPromise = null;
    });
  return helperWarmupPromise;
}

async function getVoiceCaptureSupport() {
  if (process.platform !== 'darwin') {
    return { supported: false, reason: 'unsupported-platform' };
  }
  const helperPath = resolveHelperPath();
  const infoPath = resolveHelperInfoPath();
  const infoSource = resolveHelperInfoSource();
  const helperReady = (await pathExists(helperPath)) && (await fileExists(infoPath));
  if (app.isPackaged) {
    return { supported: helperReady, reason: helperReady ? null : 'missing-helper' };
  }
  if (!helperReady) {
    warmupVoiceCapture({ source: 'support-check', reason: 'missing-helper' }).catch(() => {});
    return { supported: true, reason: 'build-on-demand' };
  }
  const stale = await isHelperStale(helperPath, infoSource);
  if (stale) {
    warmupVoiceCapture({ source: 'support-check', reason: 'stale-helper' }).catch(() => {});
    return { supported: true, reason: 'rebuild-pending' };
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

function hasPendingRescore() {
  return Boolean(rescoreState.inFlight || rescoreState.queue.length);
}

function maybeClearActiveCapture() {
  if (!activeCapture) {
    return;
  }
  if (!activeCapture.ended || hasPendingRescore()) {
    return;
  }
  clearActiveCapture();
}

function resetRescoreState(reason) {
  if (rescoreState.inFlight?.process && !rescoreState.inFlight.process.killed) {
    try {
      rescoreState.inFlight.process.kill('SIGTERM');
    } catch (error) {
      logRuntime('warn', 'speech rescore helper kill failed', {
        error: error?.message || String(error),
      });
    }
  }
  rescoreState.inFlight = null;
  rescoreState.queue = [];
  if (reason) {
    logRuntime('info', 'speech rescore reset', { reason });
  }
}

function cleanupRescoreAudio(audioPath) {
  if (!audioPath) {
    return;
  }
  fs.promises.unlink(audioPath).catch(() => {});
}

function sendRescoreStatus({ stage, segmentId, candidates, fallback, locale, error }) {
  sendEvent({
    type: 'debug',
    data: {
      stage,
      segmentId: segmentId || null,
      candidates: candidates || null,
      fallback: typeof fallback === 'boolean' ? fallback : null,
      locale: locale || null,
      error: error || null,
    },
  });
}

function finalizeRescoreJob(job, { fallback, locale, error, textOverride } = {}) {
  if (!job || job.resolved) {
    return;
  }
  job.resolved = true;
  const resolvedLocale = locale || job.language || null;
  if (job.captureId && activeCapture?.id !== job.captureId) {
    cleanupRescoreAudio(job.audioPath);
  } else {
    const text = textOverride || job.draftText || '';
    if (text) {
      sendEvent({
        type: VOICE_EVENT_TYPES.FINAL,
        text,
        reason: fallback ? RESCORE_REASONS.FALLBACK : RESCORE_REASONS.SUCCESS,
        language: resolvedLocale,
        segmentId: job.segmentId || null,
      });
    }
    cleanupRescoreAudio(job.audioPath);
  }
  sendRescoreStatus({
    stage: 'rescore-done',
    segmentId: job.segmentId,
    fallback: Boolean(fallback),
    locale: resolvedLocale,
    error,
  });
  rescoreState.inFlight = null;
  startNextRescoreJob();
  if (!hasPendingRescore()) {
    if (activeCapture?.ended && (!job.captureId || activeCapture.id === job.captureId)) {
      sendEvent({ type: 'status', status: 'stopped' });
    }
    maybeClearActiveCapture();
  }
}

function startNextRescoreJob() {
  if (rescoreState.inFlight || rescoreState.queue.length === 0) {
    return;
  }
  const job = rescoreState.queue.shift();
  if (!job) {
    return;
  }
  rescoreState.inFlight = job;
  sendRescoreStatus({
    stage: 'rescore-start',
    segmentId: job.segmentId,
    candidates: job.candidates,
    locale: job.language || null,
  });
  logRuntime('info', 'speech rescore start', {
    captureId: job.captureId || null,
    segmentId: job.segmentId || null,
    candidates: job.candidates || [],
  });

  const args = ['--mode', RESCORE_MODE, '--audio', job.audioPath];
  if (job.segmentId) {
    args.push('--segment', job.segmentId);
  }
  if (job.candidates?.length) {
    args.push('--candidates', job.candidates.join(','));
  }
  if (job.draftText) {
    args.push('--draft', job.draftText);
  }

  const child = spawn(job.helperPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  job.process = child;
  job.buffer = '';
  let resolved = false;

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    const next = `${job.buffer || ''}${chunk}`;
    const lines = next.split('\n');
    job.buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const event = JSON.parse(trimmed);
        if (event?.type === VOICE_EVENT_TYPES.FINAL && !resolved) {
          resolved = true;
          finalizeRescoreJob(job, {
            fallback: event.reason === RESCORE_REASONS.FALLBACK,
            locale: event.language || null,
            textOverride: event.text || '',
          });
        }
      } catch (error) {
        logRuntime('warn', 'speech rescore output parse failed', {
          error: error?.message || String(error),
          line: trimmed,
        });
      }
    }
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    logRuntime('warn', 'speech rescore stderr', {
      segmentId: job.segmentId || null,
      stderr: chunk,
    });
  });

  child.on('exit', (code, signal) => {
    if (!resolved) {
      finalizeRescoreJob(job, {
        fallback: true,
        locale: job.language || null,
        error: signal || (Number.isFinite(code) ? `code ${code}` : null),
      });
    }
    logRuntime('info', 'speech rescore exited', {
      segmentId: job.segmentId || null,
      code,
      signal,
    });
  });

  child.on('error', (error) => {
    logRuntime('warn', 'speech rescore process error', {
      error: error?.message || String(error),
    });
    finalizeRescoreJob(job, {
      fallback: true,
      locale: job.language || null,
      error: error?.message || String(error),
    });
  });
}

function enqueueRescoreJob(job) {
  if (!job?.audioPath) {
    return;
  }
  rescoreState.queue.push(job);
  startNextRescoreJob();
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
  await ensureHostUsageDescriptions();
  await ensureDevMicrophoneAccess();
  if (helperWarmupPromise) {
    await helperWarmupPromise;
  }
  if (activeCapture) {
    await stopVoiceCapture({ captureId: activeCapture.id });
  }
  resetRescoreState('start-new-capture');
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
  const args = ['--mode', 'capture'];
  if (language) {
    args.push('--lang', language);
  }
  let audioPath = '';
  try {
    const cacheDir = await ensureVoiceCacheDir();
    audioPath = path.join(cacheDir, `voice-${captureId}.wav`);
    args.push('--audio', audioPath);
  } catch (error) {
    logRuntime('warn', 'speech helper audio path failed', {
      error: error?.message || String(error),
    });
  }
  const child = spawn(helper.helperPath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  activeCapture = {
    id: captureId,
    process: child,
    sender,
    audioPath,
    helperPath: helper.helperPath,
    buffer: '',
    stopRequested: false,
    ended: false,
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
          if (event.type === VOICE_EVENT_TYPES.RESCORE_REQUEST) {
            enqueueRescoreJob({
              captureId,
              helperPath: helper.helperPath,
              segmentId: event.segmentId || null,
              audioPath: event.audioPath || '',
              draftText: event.text || '',
              language: event.language || null,
              candidates: Array.isArray(event.candidates) ? event.candidates : [],
            });
            continue;
          }
          if (event.type === 'status' && event.status === 'stopped' && hasPendingRescore()) {
            sendEvent({ type: 'status', status: 'rescoring' });
            continue;
          }
          if (event.type === VOICE_EVENT_TYPES.AUDIO) {
            logRuntime('info', 'speech helper audio ready', {
              captureId,
              path: event.path || null,
              durationMs: event.durationMs ?? null,
              mime: event.mime || null,
            });
          }
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
    logRuntime('warn', 'speech helper exited', {
      captureId,
      code,
      signal,
      stopRequested: activeCapture?.stopRequested || false,
    });
    if (activeCapture) {
      activeCapture.ended = true;
    }
    if (!hasPendingRescore()) {
      sendEvent({ type: 'status', status: 'stopped', code, signal });
    }
    const captureSnapshot = activeCapture;
    setTimeout(() => {
      if (activeCapture === captureSnapshot) {
        maybeClearActiveCapture();
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
  warmupVoiceCapture,
};
