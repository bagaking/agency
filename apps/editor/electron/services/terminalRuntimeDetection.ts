// @ts-nocheck
const { execFile } = require('child_process');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function basenameCommand(command) {
  const value = String(command || '').trim();
  if (!value) {
    return '';
  }
  return path.basename(value).toLowerCase();
}

function normalizeTty(value) {
  const tty = String(value || '').trim();
  if (!tty) {
    return '';
  }
  return tty.startsWith('/dev/') ? tty.slice('/dev/'.length) : tty;
}

function parseProcessListOutput(output = '') {
  return String(output || '')
    .split(/\r?\n/)
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/, 8);
      if (parts.length < 8) {
        return null;
      }
      const [pid, ppid, pgid, tpgid, tty, stat, command, args] = parts;
      const parseNumeric = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };
      return {
        pid: parseNumeric(pid),
        ppid: parseNumeric(ppid),
        pgid: parseNumeric(pgid),
        tpgid: parseNumeric(tpgid),
        tty: normalizeTty(tty),
        stat: String(stat || '').trim(),
        command: basenameCommand(command),
        args: String(args || '').trim(),
      };
    })
    .filter(Boolean);
}

async function listSystemProcesses() {
  if (process.env.AGENCY_TEST_MODE === '1') {
    return [];
  }
  const result = await execFileAsync('ps', [
    '-axo',
    'pid=,ppid=,pgid=,tpgid=,tty=,stat=,comm=,args=',
  ]);
  return parseProcessListOutput(String(result.stdout || ''));
}

function buildProcessMaps(processes = []) {
  const byPid = new Map();
  const childrenByParent = new Map();
  (processes || []).forEach((processInfo) => {
    if (!processInfo?.pid) {
      return;
    }
    byPid.set(processInfo.pid, processInfo);
    const parentId = processInfo.ppid;
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push(processInfo);
  });
  return { byPid, childrenByParent };
}

function collectDescendants(rootPid, maps) {
  const descendants = [];
  const queue = [rootPid];
  const seen = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    const children = maps.childrenByParent.get(current) || [];
    children.forEach((child) => {
      descendants.push(child);
      if (child?.pid) {
        queue.push(child.pid);
      }
    });
  }
  return descendants;
}

function pickBestProcess(candidates = [], preferredCommand = '') {
  const normalizedPreferred = basenameCommand(preferredCommand);
  const withPriority = (processInfo) => {
    let score = 0;
    if (normalizedPreferred && processInfo.command === normalizedPreferred) {
      score += 30;
    }
    if (String(processInfo.stat || '').includes('+')) {
      score += 20;
    }
    if (processInfo.command && processInfo.command !== 'zsh' && processInfo.command !== 'bash' && processInfo.command !== 'sh') {
      score += 10;
    }
    if (processInfo.args && normalizedPreferred && processInfo.args.toLowerCase().includes(normalizedPreferred)) {
      score += 5;
    }
    return { processInfo, score };
  };
  return candidates
    .map(withPriority)
    .sort((left, right) => right.score - left.score || (right.processInfo.pid || 0) - (left.processInfo.pid || 0))[0]?.processInfo || null;
}

async function resolveTerminalForegroundProcess({
  pane = {},
  processes,
} = {}) {
  const normalizedPane = pane || {};
  const panePid = Number(normalizedPane.panePid);
  const paneTty = normalizeTty(normalizedPane.paneTty);
  const currentCommand = basenameCommand(normalizedPane.currentCommand);
  const processList = Array.isArray(processes) ? processes : await listSystemProcesses();
  const maps = buildProcessMaps(processList);
  const ttyProcesses = paneTty
    ? processList.filter((processInfo) => processInfo.tty === paneTty)
    : [];

  let selected = null;
  let source = '';
  let confidence = 'low';

  const ttyForegroundGroup = ttyProcesses.find(
    (processInfo) =>
      processInfo.tpgid &&
      processInfo.pgid &&
      processInfo.tpgid === processInfo.pgid &&
      String(processInfo.stat || '').includes('+')
  );
  if (ttyForegroundGroup) {
    selected = ttyForegroundGroup;
    source = 'tty_foreground';
    confidence = 'high';
  }

  if (!selected && Number.isFinite(panePid) && panePid > 0) {
    const descendants = collectDescendants(panePid, maps).filter(
      (processInfo) => !paneTty || processInfo.tty === paneTty
    );
    const bestDescendant = pickBestProcess(descendants, currentCommand);
    if (bestDescendant) {
      selected = bestDescendant;
      source = 'process_tree';
      confidence = 'medium';
    }
  }

  if (!selected && currentCommand) {
    selected = {
      pid: Number.isFinite(panePid) && panePid > 0 ? panePid : null,
      ppid: null,
      pgid: null,
      tpgid: null,
      tty: paneTty,
      stat: '',
      command: currentCommand,
      args: currentCommand,
    };
    source = 'pane_current_command';
    confidence = 'low';
  }

  return {
    pid: selected?.pid || null,
    command: selected?.command || '',
    args: selected?.args ? String(selected.args).split(/\s+/).filter(Boolean) : [],
    tty: selected?.tty || paneTty,
    stat: selected?.stat || '',
    source,
    confidence,
  };
}

function detectCodexRuntime({ pane = {}, output = '', foregroundProcess = null, profileId = '' } = {}) {
  const evidence = [];
  const processCommand = basenameCommand(foregroundProcess?.command);
  const paneCommand = basenameCommand(pane?.currentCommand);
  const text = String(output || '');
  const processLooksCodex =
    processCommand === 'codex' ||
    paneCommand === 'codex' ||
    String(foregroundProcess?.args || []).toLowerCase().includes('codex');

  if (processCommand === 'codex') {
    evidence.push('foreground-process=codex');
  }
  if (paneCommand === 'codex') {
    evidence.push('pane-current-command=codex');
  }
  if (/thread forked from/i.test(text)) {
    evidence.push('snapshot=fork-ack');
  }
  if (/\bcodex\b/i.test(text)) {
    evidence.push('snapshot=codex');
  }

  if (!processLooksCodex && evidence.length === 0) {
    return null;
  }

  const busy = /\b(working|thinking|processing|generating)\b/i.test(text);
  return {
    tool: 'codex',
    mode: pane?.alternateOn || pane?.inMode || processLooksCodex ? 'tui' : 'shell',
    busy,
    readyForFork: !busy,
    confidence: foregroundProcess?.confidence === 'high' || paneCommand === 'codex' ? 'high' : 'medium',
    evidence,
    process: foregroundProcess,
  };
}

async function detectTerminalRuntime({
  pane = {},
  output = '',
  profileId = '',
  processes,
} = {}) {
  const foregroundProcess = await resolveTerminalForegroundProcess({ pane, processes });
  const codexRuntime = detectCodexRuntime({
    pane,
    output,
    foregroundProcess,
    profileId,
  });
  if (codexRuntime) {
    return codexRuntime;
  }
  return {
    tool: basenameCommand(foregroundProcess?.command) || 'unknown',
    mode: pane?.alternateOn || pane?.inMode ? 'tui' : 'shell',
    busy: false,
    readyForFork: false,
    confidence: foregroundProcess?.confidence || 'low',
    evidence: [
      ...(foregroundProcess?.command ? [`foreground-process=${foregroundProcess.command}`] : []),
      ...(basenameCommand(profileId) ? [`profile-hint=${basenameCommand(profileId)}`] : []),
    ],
    process: foregroundProcess,
  };
}

export {
  normalizeTty,
  parseProcessListOutput,
  listSystemProcesses,
  resolveTerminalForegroundProcess,
  detectTerminalRuntime,
};
