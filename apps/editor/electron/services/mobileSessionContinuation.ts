// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { execFile } = require('child_process');
const { promisify } = require('util');

const { readRegistry } = require('./sessionRegistry');
const { ensureTmuxAvailable, hasSession } = require('./tmux');

const execFileAsync = promisify(execFile);

const DEFAULT_SSH_PORT = 22;
const SSH_PROBE_TIMEOUT_MS = 450;
const MAX_ENABLE_ATTEMPTS = 6;
const MAC_SSH_DAEMON_PLIST = '/System/Library/LaunchDaemons/ssh.plist';

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

function ensureWorktreePath(worktreePath) {
  if (!worktreePath || !fs.existsSync(worktreePath)) {
    throw new Error('Worktree path is missing or invalid.');
  }
  return path.resolve(worktreePath);
}

function isIpv4(value) {
  const text = String(value || '').trim();
  if (!text) {
    return false;
  }
  const parts = text.split('.');
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) {
      return false;
    }
    const parsed = Number(part);
    return parsed >= 0 && parsed <= 255;
  });
}

function isPrivateIpv4(value) {
  const text = String(value || '').trim();
  if (!isIpv4(text)) {
    return false;
  }
  return PRIVATE_IPV4_RANGES.some((rule) => rule.test(text));
}

function uniqueStableList(values) {
  const next = [];
  const seen = new Set();
  (values || []).forEach((value) => {
    const key = String(value || '').trim();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    next.push(key);
  });
  return next;
}

function normalizePort(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return null;
  }
  return parsed;
}

function normalizeSshPortList(values) {
  const list = [];
  (values || []).forEach((value) => {
    const parsed = normalizePort(value);
    if (parsed !== null) {
      list.push(parsed);
    }
  });
  return uniqueStableList(list);
}

function parseSshConfigPorts(raw) {
  if (!raw) {
    return [];
  }
  const list = [];
  String(raw)
    .split(/\r?\n/)
    .forEach((line) => {
      const normalized = line.replace(/#.*/, '').trim();
      if (!normalized) {
        return;
      }
      const match = normalized.match(/^Port\s+(\d+)$/i);
      if (!match) {
        return;
      }
      const parsed = normalizePort(match[1]);
      if (parsed !== null) {
        list.push(parsed);
      }
    });
  return list;
}

async function readConfigFilePorts(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return parseSshConfigPorts(raw);
  } catch (_error) {
    return [];
  }
}

async function readSshConfigPortCandidates() {
  const values = [];
  const platform = process.platform;

  if (platform === 'win32') {
    return [DEFAULT_SSH_PORT];
  }

  values.push(...(await readConfigFilePorts('/etc/ssh/sshd_config')));

  const configDir = '/etc/ssh/sshd_config.d';
  if (fs.existsSync(configDir)) {
    try {
      const entries = await fs.promises.readdir(configDir, { withFileTypes: true });
      const configFiles = entries
        .filter((entry) => entry?.isFile?.() && entry.name.endsWith('.conf'))
        .map((entry) => path.join(configDir, entry.name))
        .sort();
      for (const configPath of configFiles) {
        values.push(...(await readConfigFilePorts(configPath)));
      }
    } catch (_error) {
      // best effort
    }
  }

  values.push(DEFAULT_SSH_PORT);
  return normalizeSshPortList(values);
}

function probePort(port, host = '127.0.0.1', timeoutMs = SSH_PROBE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));

    socket.setTimeout(timeoutMs);
    socket.connect(port, host);
  });
}

async function discoverListeningPort(candidatePorts) {
  for (const port of normalizeSshPortList(candidatePorts)) {
    // localhost reachability is enough to prove sshd listener availability.
    // remote-network reachability depends on firewall/routing outside Agency scope.
    // eslint-disable-next-line no-await-in-loop
    const ready = await probePort(port);
    if (ready) {
      return port;
    }
  }
  return null;
}

async function runCommandAttempt(command, args) {
  try {
    const result = await execFileAsync(command, args, {
      timeout: 5000,
      windowsHide: true,
      env: process.env,
    });
    return {
      ok: true,
      command,
      args,
      stdout: String(result?.stdout || '').trim(),
      stderr: String(result?.stderr || '').trim(),
    };
  } catch (error) {
    return {
      ok: false,
      command,
      args,
      stdout: String(error?.stdout || '').trim(),
      stderr: String(error?.stderr || error?.message || '').trim(),
      code: error?.code ?? null,
    };
  }
}

function buildEnableAttemptList(platform) {
  if (platform === 'darwin') {
    return [
      ['launchctl', ['load', '-w', MAC_SSH_DAEMON_PLIST]],
      ['launchctl', ['bootstrap', 'system', MAC_SSH_DAEMON_PLIST]],
      ['sudo', ['-n', 'launchctl', 'load', '-w', MAC_SSH_DAEMON_PLIST]],
      ['sudo', ['-n', 'launchctl', 'bootstrap', 'system', MAC_SSH_DAEMON_PLIST]],
      ['sudo', ['-n', 'systemsetup', '-setremotelogin', 'on']],
    ];
  }
  if (platform === 'linux') {
    return [
      ['systemctl', ['start', 'ssh']],
      ['systemctl', ['start', 'sshd']],
      ['sudo', ['-n', 'systemctl', 'start', 'ssh']],
      ['sudo', ['-n', 'systemctl', 'start', 'sshd']],
      ['sudo', ['-n', 'service', 'ssh', 'start']],
      ['sudo', ['-n', 'service', 'sshd', 'start']],
    ];
  }
  return [];
}

async function ensureSshChannelOpen({ candidatePorts }) {
  const beforePort = await discoverListeningPort(candidatePorts);
  if (beforePort !== null) {
    return {
      port: beforePort,
      autoEnabled: false,
      attemptedEnable: false,
      attempts: [],
    };
  }

  const platform = process.platform;
  const attempts = [];
  const plan = buildEnableAttemptList(platform).slice(0, MAX_ENABLE_ATTEMPTS);
  for (const [command, args] of plan) {
    // eslint-disable-next-line no-await-in-loop
    const attempt = await runCommandAttempt(command, args);
    attempts.push(attempt);
    // eslint-disable-next-line no-await-in-loop
    const nextPort = await discoverListeningPort(candidatePorts);
    if (nextPort !== null) {
      return {
        port: nextPort,
        autoEnabled: true,
        attemptedEnable: true,
        attempts,
      };
    }
  }

  return {
    port: null,
    autoEnabled: false,
    attemptedEnable: attempts.length > 0,
    attempts,
  };
}

async function discoverTailscaleIps() {
  try {
    const result = await execFileAsync('tailscale', ['ip', '-4'], {
      timeout: 2500,
      windowsHide: true,
      env: process.env,
    });
    const ips = String(result?.stdout || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => isIpv4(line));
    return uniqueStableList(ips);
  } catch (_error) {
    return [];
  }
}

function discoverLanIps() {
  const interfaces = os.networkInterfaces ? os.networkInterfaces() : {};
  const candidates = [];

  Object.values(interfaces || {}).forEach((records) => {
    (records || []).forEach((record) => {
      if (!record || record.internal) {
        return;
      }
      const family = String(record.family || '').toLowerCase();
      if (family !== 'ipv4' && family !== '4') {
        return;
      }
      const address = String(record.address || '').trim();
      if (!isPrivateIpv4(address)) {
        return;
      }
      if (address.startsWith('169.254.')) {
        return;
      }
      candidates.push(address);
    });
  });

  return uniqueStableList(candidates);
}

function resolveHostSelection({ tailscaleIps, lanIps }) {
  const hostCandidates = uniqueStableList([...(tailscaleIps || []), ...(lanIps || [])]);
  if (hostCandidates.length > 0) {
    return {
      host: hostCandidates[0],
      hostCandidates,
    };
  }

  const hostname = String(os.hostname() || '').trim();
  if (hostname) {
    return {
      host: hostname,
      hostCandidates: [hostname],
    };
  }

  return {
    host: '',
    hostCandidates: [],
  };
}

function resolveManualEnableCommand(platform) {
  if (platform === 'darwin') {
    return `sudo launchctl load -w ${MAC_SSH_DAEMON_PLIST}`;
  }
  if (platform === 'linux') {
    return 'sudo systemctl enable --now ssh';
  }
  if (platform === 'win32') {
    return 'powershell -Command "Start-Service sshd"';
  }
  return '';
}

function resolveSshUser() {
  try {
    const userInfo = os.userInfo?.();
    const byUserInfo = String(userInfo?.username || '').trim();
    if (byUserInfo) {
      return byUserInfo;
    }
  } catch (_error) {
    // fallback to environment variables
  }
  const fromEnv = String(process.env.USER || process.env.USERNAME || '').trim();
  if (fromEnv) {
    return fromEnv;
  }
  return 'user';
}

function validateTmuxTarget(value) {
  const target = String(value || '').trim();
  if (!target) {
    throw new Error('Session is missing tmux target.');
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(target)) {
    throw new Error('Session tmux target contains unsupported characters.');
  }
  return target;
}

function buildSshAttachCommand({ user, host, port, tmuxSession }) {
  const target = validateTmuxTarget(tmuxSession);
  const normalizedPort = normalizePort(port);
  if (!user || !host || normalizedPort === null) {
    return '';
  }
  const remote = `tmux attach-session -t ${target}`;
  return `ssh -p ${normalizedPort} ${user}@${host} -t '${remote}'`;
}

function createWarnings({ host, port, attemptedEnable, autoEnabled, manualEnableCommand }) {
  const warnings = [];
  if (!host) {
    warnings.push('No reachable host was discovered for remote SSH access.');
  }
  if (!port) {
    warnings.push('No listening SSH port was detected on this machine.');
  }
  if (attemptedEnable && !autoEnabled) {
    warnings.push('Automatic SSH enablement did not succeed. Manual setup is required.');
  }
  if (manualEnableCommand && !port) {
    warnings.push(`Run once: ${manualEnableCommand}`);
  }
  return warnings;
}

async function prepareSessionContinueOnMobile({ worktreePath, sessionId }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();

  const registry = await readRegistry(worktreePath);
  const session = (registry?.sessions || []).find((item) => item?.id === sessionId);
  if (!session) {
    throw new Error('Session not found.');
  }

  const tmuxSession = String(session.tmuxSession || '').trim();
  if (!tmuxSession) {
    throw new Error('Session is missing tmux target.');
  }

  const alive = await hasSession(tmuxSession);
  if (!alive) {
    throw new Error('Session is stale. Create or restore a live session first.');
  }

  const user = resolveSshUser();
  const candidatePorts = await readSshConfigPortCandidates();

  let readiness;
  if (process.env.AGENCY_TEST_MODE === '1') {
    readiness = {
      port: DEFAULT_SSH_PORT,
      autoEnabled: false,
      attemptedEnable: false,
      attempts: [],
    };
  } else {
    readiness = await ensureSshChannelOpen({ candidatePorts });
  }

  const tailscaleIps = process.env.AGENCY_TEST_MODE === '1' ? [] : await discoverTailscaleIps();
  const lanIps = discoverLanIps();
  const { host, hostCandidates } = resolveHostSelection({ tailscaleIps, lanIps });
  const manualEnableCommand = resolveManualEnableCommand(process.platform);
  const command = buildSshAttachCommand({
    user,
    host,
    port: readiness.port,
    tmuxSession,
  });

  const warnings = createWarnings({
    host,
    port: readiness.port,
    attemptedEnable: readiness.attemptedEnable,
    autoEnabled: readiness.autoEnabled,
    manualEnableCommand,
  });

  return {
    sessionId: session.id,
    sessionName: session.name || session.id,
    tmuxSession,
    generatedAt: new Date().toISOString(),
    command,
    ssh: {
      ready: Boolean(command),
      user,
      host,
      hostCandidates,
      tailscaleIps,
      lanIps,
      port: readiness.port,
      candidatePorts,
      attemptedEnable: readiness.attemptedEnable,
      autoEnabled: readiness.autoEnabled,
      attempts: readiness.attempts,
      manualEnableCommand,
      warnings,
    },
  };
}

export {
  prepareSessionContinueOnMobile,
};
