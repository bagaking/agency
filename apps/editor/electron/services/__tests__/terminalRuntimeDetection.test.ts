const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveTerminalForegroundProcess,
  detectTerminalRuntime,
} = require('../terminalRuntimeDetection');

test('resolveTerminalForegroundProcess prefers tty foreground process over shell parent', async () => {
  const processInfo = await resolveTerminalForegroundProcess({
    pane: {
      panePid: 100,
      paneTty: '/dev/ttys001',
      currentCommand: 'zsh',
    },
    processes: [
      { pid: 100, ppid: 1, pgid: 100, tpgid: 200, tty: 'ttys001', stat: 'Ss', command: 'zsh', args: 'zsh' },
      { pid: 200, ppid: 100, pgid: 200, tpgid: 200, tty: 'ttys001', stat: 'S+', command: 'codex', args: 'codex' },
    ],
  });

  assert.equal(processInfo.command, 'codex');
  assert.equal(processInfo.source, 'tty_foreground');
  assert.equal(processInfo.confidence, 'high');
});

test('detectTerminalRuntime identifies codex from actual foreground process even if stored profile is shell', async () => {
  const runtime = await detectTerminalRuntime({
    pane: {
      panePid: 100,
      paneTty: '/dev/ttys001',
      currentCommand: 'zsh',
      alternateOn: true,
      inMode: false,
    },
    profileId: 'shell',
    output: 'Codex ready',
    processes: [
      { pid: 100, ppid: 1, pgid: 100, tpgid: 200, tty: 'ttys001', stat: 'Ss', command: 'zsh', args: 'zsh' },
      { pid: 200, ppid: 100, pgid: 200, tpgid: 200, tty: 'ttys001', stat: 'S+', command: 'codex', args: 'codex --thread thr-1' },
    ],
  });

  assert.equal(runtime.tool, 'codex');
  assert.equal(runtime.mode, 'tui');
  assert.equal(runtime.process.command, 'codex');
  assert.equal(runtime.readyForFork, true);
});

export {};
