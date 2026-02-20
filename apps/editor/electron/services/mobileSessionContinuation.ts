// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const { readRegistry } = require('./sessionRegistry');
const {
  ensureTmuxAvailable,
  hasSession,
  listAgencySessionsWithMetadata,
} = require('./tmux');
const { getRepoRoot } = require('./git');
const {
  issueMobileSessionProxyToken,
  maskMobileSessionProxyToken,
} = require('./mobileSessionProxy');

const execFileAsync = promisify(execFile);

const CONTINUE_MODES = Object.freeze({
  DIRECT: 'direct',
  HUB: 'hub',
  PROXY: 'proxy',
});

const DEFAULT_SSH_PORT = 22;
const SSH_PROBE_TIMEOUT_MS = 450;
const MAX_ENABLE_ATTEMPTS = 6;
const MAC_SSH_DAEMON_PLIST = '/System/Library/LaunchDaemons/ssh.plist';
const HUB_SESSION_PREFIX = 'agency-mobile-hub';
const HUB_ARTIFACTS_DIR = path.join('.agency', 'mobile');
const HUB_CATALOG_FILENAME = 'continue-on-mobile-hub-catalog.tsv';
const HUB_LAUNCHER_FILENAME = 'continue-on-mobile-hub.sh';

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
        // eslint-disable-next-line no-await-in-loop
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
      if (!isPrivateIpv4(address) || address.startsWith('169.254.')) {
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

function shellQuote(value) {
  const text = String(value ?? '');
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

function normalizeContinuationMode(mode) {
  const normalized = String(mode || '').trim().toLowerCase();
  if (normalized === CONTINUE_MODES.HUB) {
    return CONTINUE_MODES.HUB;
  }
  if (normalized === CONTINUE_MODES.PROXY) {
    return CONTINUE_MODES.PROXY;
  }
  return CONTINUE_MODES.DIRECT;
}

function normalizeSessionStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return 'active';
  }
  return normalized;
}

function isAttachableStatus(value) {
  const status = normalizeSessionStatus(value);
  return status !== 'closed' && status !== 'stale';
}

function sanitizeTabField(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\t/g, ' ')
    .trim();
}

function buildSshCommand({ user, host, port, remoteCommand }) {
  const normalizedPort = normalizePort(port);
  const normalizedUser = String(user || '').trim();
  const normalizedHost = String(host || '').trim();
  const remote = String(remoteCommand || '').trim();
  if (!normalizedUser || !normalizedHost || normalizedPort === null || !remote) {
    return '';
  }
  return `ssh -p ${normalizedPort} ${normalizedUser}@${normalizedHost} -t ${shellQuote(remote)}`;
}

function buildDirectAttachCommand({ user, host, port, tmuxSession }) {
  const target = validateTmuxTarget(tmuxSession);
  const remote = `tmux attach-session -t ${shellQuote(target)}`;
  return buildSshCommand({ user, host, port, remoteCommand: remote });
}

function buildHubSessionName(repoRoot) {
  const hash = crypto.createHash('sha1').update(String(repoRoot || '')).digest('hex').slice(0, 12);
  return `${HUB_SESSION_PREFIX}-${hash}`;
}

function buildHubAttachCommand({ user, host, port, hubSession, launcherPath }) {
  const target = validateTmuxTarget(hubSession);
  const launcher = path.resolve(String(launcherPath || '').trim());
  if (!launcher) {
    return '';
  }
  const launcherCommand = `bash ${shellQuote(launcher)}`;
  const remote = [
    `tmux has-session -t ${shellQuote(target)} 2>/dev/null`,
    `tmux new-session -d -s ${shellQuote(target)} ${shellQuote(launcherCommand)}`,
  ].join(' || ');
  return buildSshCommand({
    user,
    host,
    port,
    remoteCommand: `${remote}; tmux attach-session -t ${shellQuote(target)}`,
  });
}

function buildProxyAttachCommand({ host, port, token }) {
  const normalizedHost = String(host || '').trim();
  const normalizedPort = normalizePort(port);
  const normalizedToken = String(token || '').trim();
  if (!normalizedHost || normalizedPort === null || !normalizedToken) {
    return '';
  }
  const remote = [
    'if ! command -v nc >/dev/null 2>&1; then',
    "  echo 'nc (netcat) is required for proxy continuation.'",
    '  exit 1',
    'fi',
    `(printf '%s\\\\n' ${shellQuote(normalizedToken)}; cat) | nc ${shellQuote(normalizedHost)} ${normalizedPort}`,
  ].join('; ');
  return `bash -lc ${shellQuote(remote)}`;
}

function createProxyWarnings({ host, port, extraWarnings = [] }) {
  const warnings = [];
  if (!host) {
    warnings.push('No reachable host was discovered for proxy continuation.');
  }
  if (!normalizePort(port)) {
    warnings.push('Mobile proxy port is unavailable.');
  }
  warnings.push(
    'Proxy mode uses plain TCP + session token. Prefer trusted LAN/Tailscale networks for remote access.'
  );
  warnings.push(
    'If your mobile client runs shell input in line-buffered mode, keys are sent on Enter (session remains usable).'
  );
  extraWarnings.forEach((warning) => {
    const text = String(warning || '').trim();
    if (text) {
      warnings.push(text);
    }
  });
  return warnings;
}

function createWarnings({
  host,
  port,
  attemptedEnable,
  autoEnabled,
  manualEnableCommand,
  extraWarnings = [],
}) {
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
  extraWarnings.forEach((warning) => {
    const text = String(warning || '').trim();
    if (text) {
      warnings.push(text);
    }
  });
  return warnings;
}

async function resolveSshReadinessContext() {
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
  const hostContext = await resolveNetworkHostContext();
  const manualEnableCommand = resolveManualEnableCommand(process.platform);

  return {
    user,
    host: hostContext.host,
    hostCandidates: hostContext.hostCandidates,
    tailscaleIps: hostContext.tailscaleIps,
    lanIps: hostContext.lanIps,
    candidatePorts,
    readiness,
    manualEnableCommand,
  };
}

async function resolveNetworkHostContext() {
  const tailscaleIps = process.env.AGENCY_TEST_MODE === '1' ? [] : await discoverTailscaleIps();
  const lanIps = discoverLanIps();
  const { host, hostCandidates } = resolveHostSelection({ tailscaleIps, lanIps });
  return {
    host,
    hostCandidates,
    tailscaleIps,
    lanIps,
  };
}

async function resolveRepoContext(worktreePath) {
  const resolvedWorktree = path.resolve(worktreePath);
  try {
    const repoRoot = await getRepoRoot(resolvedWorktree);
    return {
      repoRoot,
      projectName: path.basename(repoRoot) || path.basename(resolvedWorktree),
    };
  } catch (_error) {
    return {
      repoRoot: resolvedWorktree,
      projectName: path.basename(resolvedWorktree),
    };
  }
}

function deriveCellIdFromTmuxSessionName(tmuxSession, sessionId) {
  const normalizedTmux = String(tmuxSession || '').trim();
  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedTmux || !normalizedSessionId) {
    return '';
  }
  const safeSession = normalizedSessionId.replace(/[^a-zA-Z0-9-_]/g, '-');
  if (!safeSession) {
    return '';
  }
  const prefix = 'agency-';
  const suffix = `-${safeSession}`;
  if (!normalizedTmux.startsWith(prefix) || !normalizedTmux.endsWith(suffix)) {
    return '';
  }
  return String(
    normalizedTmux.slice(prefix.length, normalizedTmux.length - suffix.length) || ''
  ).trim();
}

function buildRegistryFallbackMap({ registry, worktreePath, repoRoot, projectName }) {
  const map = new Map();
  (registry?.sessions || []).forEach((session) => {
    const tmuxSession = String(session?.tmuxSession || '').trim();
    if (!tmuxSession) {
      return;
    }
    const status = normalizeSessionStatus(session?.status);
    const sessionId = String(session?.id || '').trim() || tmuxSession;
    const sessionName = String(session?.name || '').trim() || sessionId;
    const cellId = String(session?.cellId || '').trim() || deriveCellIdFromTmuxSessionName(tmuxSession, sessionId);
    const cellName = String(session?.cellName || '').trim() || cellId;
    map.set(tmuxSession, {
      projectRoot: repoRoot,
      projectName,
      worktreePath,
      cellId,
      cellName,
      sessionId,
      sessionName,
      tmuxSession,
      status,
      lastActivityAt: String(session?.lastActivityAt || '').trim(),
      attached: status === 'active' ? 1 : 0,
    });
  });
  return map;
}

function buildCatalogEntry(raw) {
  return {
    projectRoot: sanitizeTabField(raw?.projectRoot),
    projectName: sanitizeTabField(raw?.projectName) || 'Unknown Project',
    worktreePath: sanitizeTabField(raw?.worktreePath),
    cellId: sanitizeTabField(raw?.cellId),
    cellName: sanitizeTabField(raw?.cellName) || sanitizeTabField(raw?.cellId) || 'unknown-cell',
    sessionId: sanitizeTabField(raw?.sessionId) || sanitizeTabField(raw?.tmuxSession),
    sessionName:
      sanitizeTabField(raw?.sessionName) ||
      sanitizeTabField(raw?.sessionId) ||
      sanitizeTabField(raw?.tmuxSession),
    tmuxSession: sanitizeTabField(raw?.tmuxSession),
    status: normalizeSessionStatus(raw?.status),
    lastActivityAt: sanitizeTabField(raw?.lastActivityAt),
    attached: Number(raw?.attached) > 0 ? 1 : 0,
  };
}

function compareCatalogEntries(left, right) {
  const fields = [
    String(left?.projectName || '').toLowerCase(),
    String(left?.cellName || '').toLowerCase(),
    String(left?.sessionName || '').toLowerCase(),
    String(left?.tmuxSession || '').toLowerCase(),
  ];
  const rightFields = [
    String(right?.projectName || '').toLowerCase(),
    String(right?.cellName || '').toLowerCase(),
    String(right?.sessionName || '').toLowerCase(),
    String(right?.tmuxSession || '').toLowerCase(),
  ];
  for (let index = 0; index < fields.length; index += 1) {
    const cmp = fields[index].localeCompare(rightFields[index]);
    if (cmp !== 0) {
      return cmp;
    }
  }
  return 0;
}

async function collectHubCatalogEntries({
  registry,
  worktreePath,
  repoRoot,
  projectName,
  hubSessionName,
}) {
  const entries = [];
  let hiddenSessions = 0;
  const tmuxSessions = await listAgencySessionsWithMetadata();
  const fallbackByTmux = buildRegistryFallbackMap({
    registry,
    worktreePath,
    repoRoot,
    projectName,
  });
  const seenTmuxNames = new Set();

  for (const tmuxRow of tmuxSessions) {
    const tmuxSession = String(tmuxRow?.tmuxSession || '').trim();
    if (!tmuxSession || tmuxSession === hubSessionName || tmuxSession.startsWith(HUB_SESSION_PREFIX)) {
      continue;
    }
    const hasAgencyIdentity =
      tmuxSession.startsWith('agency-') ||
      String(tmuxRow?.sessionId || '').trim().length > 0 ||
      String(tmuxRow?.projectRoot || '').trim().length > 0;
    if (!hasAgencyIdentity) {
      continue;
    }

    seenTmuxNames.add(tmuxSession);
    const fallback = fallbackByTmux.get(tmuxSession);
    const status = normalizeSessionStatus(tmuxRow?.sessionStatus || fallback?.status || 'active');
    if (!isAttachableStatus(status)) {
      hiddenSessions += 1;
      continue;
    }
    const entry = buildCatalogEntry({
      projectRoot: tmuxRow?.projectRoot || fallback?.projectRoot || repoRoot,
      projectName: tmuxRow?.projectName || fallback?.projectName || projectName,
      worktreePath: tmuxRow?.worktreePath || fallback?.worktreePath || worktreePath,
      cellId: tmuxRow?.cellId || fallback?.cellId || '',
      cellName: tmuxRow?.cellName || fallback?.cellName || '',
      sessionId: tmuxRow?.sessionId || fallback?.sessionId || tmuxSession,
      sessionName: tmuxRow?.sessionName || fallback?.sessionName || tmuxSession,
      tmuxSession,
      status,
      lastActivityAt: tmuxRow?.lastActivityAt || fallback?.lastActivityAt || '',
      attached: tmuxRow?.attached ?? fallback?.attached ?? 0,
    });
    if (entry.tmuxSession) {
      entries.push(entry);
    }
  }

  for (const fallback of fallbackByTmux.values()) {
    if (seenTmuxNames.has(fallback.tmuxSession)) {
      continue;
    }
    if (!isAttachableStatus(fallback.status)) {
      hiddenSessions += 1;
      continue;
    }
    // Non-test mode checks liveness to avoid surfacing stale registry remnants.
    if (process.env.AGENCY_TEST_MODE !== '1') {
      // eslint-disable-next-line no-await-in-loop
      const alive = await hasSession(fallback.tmuxSession);
      if (!alive) {
        hiddenSessions += 1;
        continue;
      }
    }
    const entry = buildCatalogEntry(fallback);
    if (entry.tmuxSession) {
      entries.push(entry);
    }
  }

  entries.sort(compareCatalogEntries);
  return { entries, hiddenSessions };
}

function buildCatalogSummary(entries, { hiddenSessions = 0 } = {}) {
  const projectKeys = new Set();
  const cellKeys = new Set();
  entries.forEach((entry) => {
    const projectKey = `${entry.projectRoot || ''}::${entry.projectName || ''}`;
    const cellKey = `${projectKey}::${entry.cellId || entry.cellName || ''}`;
    projectKeys.add(projectKey);
    cellKeys.add(cellKey);
  });
  return {
    projects: projectKeys.size,
    cells: cellKeys.size,
    sessions: entries.length,
    hiddenSessions: Math.max(0, Number(hiddenSessions) || 0),
  };
}

function buildHubCatalogContent(entries) {
  const header = [
    'project_root',
    'project_name',
    'worktree_path',
    'cell_id',
    'cell_name',
    'session_id',
    'session_name',
    'tmux_session',
    'status',
    'last_activity_at',
    'attached',
  ];
  const rows = entries.map((entry) =>
    [
      entry.projectRoot,
      entry.projectName,
      entry.worktreePath,
      entry.cellId,
      entry.cellName,
      entry.sessionId,
      entry.sessionName,
      entry.tmuxSession,
      entry.status,
      entry.lastActivityAt,
      String(entry.attached || 0),
    ].join('\t')
  );
  return [header.join('\t'), ...rows].join('\n');
}

function buildHubLauncherScript({ catalogPath, hubSessionName }) {
  const catalogLiteral = JSON.stringify(path.resolve(catalogPath));
  const hubSessionLiteral = JSON.stringify(String(hubSessionName || '').trim());
  return `#!/usr/bin/env bash
set -u

CATALOG_PATH=${catalogLiteral}
HUB_SESSION=${hubSessionLiteral}

render_menu() {
  local map_file="$1"
  : > "$map_file"
  local current_project=""
  local current_cell=""
  local idx=1

  if [[ ! -f "$CATALOG_PATH" ]]; then
    echo "Catalog not found: $CATALOG_PATH"
    return
  fi

  while IFS=$'\\t' read -r project_root project_name worktree_path cell_id cell_name session_id session_name tmux_session status last_activity_at attached; do
    [[ -z "\${tmux_session:-}" ]] && continue
    if [[ "$project_name" != "$current_project" ]]; then
      echo "Project: \${project_name:-Unknown Project}"
      current_project="$project_name"
      current_cell=""
    fi
    if [[ "$cell_name" != "$current_cell" ]]; then
      echo "  Cell: \${cell_name:-\${cell_id:-unknown-cell}}"
      current_cell="$cell_name"
    fi
    printf '    [%d] %s  [%s]\\n' "$idx" "\${session_name:-\${session_id:-$tmux_session}}" "\${status:-active}"
    printf '%s\\t%s\\n' "$idx" "$tmux_session" >> "$map_file"
    idx=$((idx + 1))
  done < <(tail -n +2 "$CATALOG_PATH")

  if [[ $idx -eq 1 ]]; then
    echo "  (no attachable sessions)"
  fi

  echo
  echo "[r] refresh  [t] tmux tree  [q] quit"
}

MAP_FILE="\${TMPDIR:-/tmp}/agency-mobile-hub-map.$$"
trap 'rm -f "$MAP_FILE"' EXIT

while true; do
  printf '\\033c'
  echo "Agency Mobile Hub"
  echo "Hub Session: $HUB_SESSION"
  echo "Catalog: $CATALOG_PATH"
  echo
  render_menu "$MAP_FILE"
  echo
  printf 'Select session index: '
  if ! IFS= read -r choice; then
    echo
    exit 0
  fi
  case "$choice" in
    ''|r|R)
      continue
      ;;
    q|Q)
      exit 0
      ;;
    t|T)
      tmux choose-tree -Zw || true
      continue
      ;;
  esac

  if [[ ! "$choice" =~ ^[0-9]+$ ]]; then
    echo "Invalid selection: $choice"
    printf 'Press Enter to continue...'
    IFS= read -r _
    continue
  fi

  target="$(awk -F '\\t' -v idx="$choice" '$1 == idx { print $2; exit }' "$MAP_FILE")"
  if [[ -z "$target" ]]; then
    echo "No session mapped to index: $choice"
    printf 'Press Enter to continue...'
    IFS= read -r _
    continue
  fi

  if ! tmux switch-client -t "$target"; then
    echo "Failed to switch to session: $target"
    printf 'Press Enter to continue...'
    IFS= read -r _
  fi
done
`;
}

async function writeHubArtifacts({ repoRoot, hubSessionName, entries, hiddenSessions }) {
  const artifactsDir = path.join(repoRoot, HUB_ARTIFACTS_DIR);
  await fs.promises.mkdir(artifactsDir, { recursive: true });
  const catalogPath = path.join(artifactsDir, HUB_CATALOG_FILENAME);
  const launcherPath = path.join(artifactsDir, HUB_LAUNCHER_FILENAME);
  await fs.promises.writeFile(catalogPath, buildHubCatalogContent(entries), 'utf-8');
  await fs.promises.writeFile(
    launcherPath,
    buildHubLauncherScript({ catalogPath, hubSessionName }),
    'utf-8'
  );
  try {
    await fs.promises.chmod(launcherPath, 0o755);
  } catch (_error) {
    // Non-fatal: some filesystems may not support chmod.
  }
  return {
    launcherPath,
    catalogPath,
    catalogSummary: buildCatalogSummary(entries, { hiddenSessions }),
  };
}

async function prepareSessionContinueOnMobile({ worktreePath, sessionId, mode }) {
  const resolvedWorktree = ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const registry = await readRegistry(resolvedWorktree);
  const session = (registry?.sessions || []).find((item) => item?.id === sessionId);
  if (!session) {
    throw new Error('Session not found.');
  }
  if (!isAttachableStatus(session.status)) {
    throw new Error('Session is not attachable. Create or restore a live session first.');
  }

  const resolvedMode = normalizeContinuationMode(mode);
  const modeNeedsLiveSession =
    resolvedMode === CONTINUE_MODES.DIRECT || resolvedMode === CONTINUE_MODES.PROXY;
  let tmuxSession = '';
  if (modeNeedsLiveSession) {
    tmuxSession = String(session.tmuxSession || '').trim();
    if (!tmuxSession) {
      throw new Error('Session is missing tmux target.');
    }
    const alive = await hasSession(tmuxSession);
    if (!alive) {
      throw new Error('Session is stale. Create or restore a live session first.');
    }
  }

  if (resolvedMode === CONTINUE_MODES.PROXY) {
    const hostContext = await resolveNetworkHostContext();
    const tokenLease = await issueMobileSessionProxyToken({
      worktreePath: resolvedWorktree,
      sessionId: session.id,
      sessionName: session.name || session.id,
      tmuxSession,
    });
    const command = buildProxyAttachCommand({
      host: hostContext.host,
      port: tokenLease?.endpoint?.port,
      token: tokenLease.token,
    });
    const warnings = createProxyWarnings({
      host: hostContext.host,
      port: tokenLease?.endpoint?.port,
      extraWarnings: ['Proxy command expects `nc` (netcat) in the mobile terminal client shell.'],
    });
    return {
      mode: resolvedMode,
      sessionId: session.id,
      sessionName: session.name || session.id,
      tmuxSession,
      generatedAt: new Date().toISOString(),
      command,
      proxy: {
        ready: Boolean(command),
        host: hostContext.host,
        hostCandidates: hostContext.hostCandidates,
        tailscaleIps: hostContext.tailscaleIps,
        lanIps: hostContext.lanIps,
        port: tokenLease?.endpoint?.port || null,
        token: tokenLease.token,
        tokenMasked: maskMobileSessionProxyToken(tokenLease.token),
        reusedToken: Boolean(tokenLease.reused),
        issuedAt: tokenLease.issuedAt,
        warnings,
      },
    };
  }

  const sshContext = await resolveSshReadinessContext();
  const {
    user,
    host,
    hostCandidates,
    tailscaleIps,
    lanIps,
    candidatePorts,
    readiness,
    manualEnableCommand,
  } = sshContext;

  let command = '';
  let hubDetails = null;
  const extraWarnings = [];

  if (resolvedMode === CONTINUE_MODES.DIRECT) {
    command = buildDirectAttachCommand({
      user,
      host,
      port: readiness.port,
      tmuxSession,
    });
  } else {
    const repoContext = await resolveRepoContext(resolvedWorktree);
    const hubSessionName = buildHubSessionName(repoContext.repoRoot);
    const hubCatalog = await collectHubCatalogEntries({
      registry,
      worktreePath: resolvedWorktree,
      repoRoot: repoContext.repoRoot,
      projectName: repoContext.projectName,
      hubSessionName,
    });
    const artifacts = await writeHubArtifacts({
      repoRoot: repoContext.repoRoot,
      hubSessionName,
      entries: hubCatalog.entries,
      hiddenSessions: hubCatalog.hiddenSessions,
    });
    hubDetails = {
      tmuxSession: hubSessionName,
      launcherPath: artifacts.launcherPath,
      catalogPath: artifacts.catalogPath,
      catalogSummary: artifacts.catalogSummary,
      projectRoot: repoContext.repoRoot,
      projectName: repoContext.projectName,
    };
    if (!artifacts.catalogSummary.sessions) {
      extraWarnings.push('Hub catalog has no attachable sessions. Start or restore a live session first.');
    }
    if (artifacts.catalogSummary.hiddenSessions > 0) {
      extraWarnings.push(
        `${artifacts.catalogSummary.hiddenSessions} stale/closed session(s) are hidden from Hub attach list.`
      );
    }
    command = buildHubAttachCommand({
      user,
      host,
      port: readiness.port,
      hubSession: hubSessionName,
      launcherPath: artifacts.launcherPath,
    });
  }

  const warnings = createWarnings({
    host,
    port: readiness.port,
    attemptedEnable: readiness.attemptedEnable,
    autoEnabled: readiness.autoEnabled,
    manualEnableCommand,
    extraWarnings,
  });

  return {
    mode: resolvedMode,
    sessionId: session.id,
    sessionName: session.name || session.id,
    ...(resolvedMode === CONTINUE_MODES.DIRECT ? { tmuxSession } : {}),
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
    ...(hubDetails ? { hub: hubDetails } : {}),
  };
}

export {
  prepareSessionContinueOnMobile,
};
