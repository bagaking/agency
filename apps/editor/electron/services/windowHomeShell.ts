import { BrowserWindow, app } from 'electron';
import fs from 'node:fs';

const pty = require('node-pty');

const { logRuntime } = require('./runtimeLog');

type HomeShellRecord = {
  windowStateId: string;
  windowId: number;
  shellPath: string;
  cwd: string;
  ptyProcess: any;
};

const homeShellsByWindowStateId = new Map<string, HomeShellRecord>();

function normalizeWindowStateId(value: unknown): string {
  return String(value || '').trim();
}

function normalizeShellPath(candidate: unknown): string {
  const normalized = String(candidate || '').trim();
  if (normalized && fs.existsSync(normalized)) {
    return normalized;
  }
  return '/bin/zsh';
}

function resolveShellPath(): string {
  return normalizeShellPath(process.env.SHELL);
}

function resolveHomeShellCwd(value: unknown): string {
  const normalized = String(value || '').trim();
  if (normalized && fs.existsSync(normalized)) {
    return normalized;
  }
  const homePath = app.getPath('home');
  if (homePath && fs.existsSync(homePath)) {
    return homePath;
  }
  return process.cwd();
}

function buildHomeShellEnv(): NodeJS.ProcessEnv {
  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    TERM: 'xterm-256color',
  };
  const locale = baseEnv.LC_ALL || baseEnv.LC_CTYPE || baseEnv.LANG || '';
  if (!locale || locale === 'C' || locale === 'POSIX') {
    baseEnv.LANG = 'en_US.UTF-8';
    baseEnv.LC_ALL = 'en_US.UTF-8';
    baseEnv.LC_CTYPE = 'en_US.UTF-8';
  }
  return baseEnv;
}

function emitToWindow(windowId: number, channel: string, payload: Record<string, unknown>): void {
  const targetWindow = BrowserWindow.fromId(windowId);
  if (!targetWindow || targetWindow.isDestroyed?.()) {
    return;
  }
  targetWindow.webContents.send(channel, payload);
}

export function startWindowHomeShell({
  windowStateId,
  windowId,
  cwd,
}: {
  windowStateId: string;
  windowId: number;
  cwd?: string;
}) {
  const normalizedWindowStateId = normalizeWindowStateId(windowStateId);
  if (!normalizedWindowStateId) {
    throw new Error('windowStateId is required.');
  }
  if (!Number.isFinite(windowId) || windowId <= 0) {
    throw new Error('windowId is required.');
  }

  const existing = homeShellsByWindowStateId.get(normalizedWindowStateId);
  if (existing) {
    return {
      ok: true,
      cwd: existing.cwd,
      shellPath: existing.shellPath,
      reused: true,
    };
  }

  try {
    const shellPath = resolveShellPath();
    const resolvedCwd = resolveHomeShellCwd(cwd);
    const ptyProcess = pty.spawn(shellPath, ['-l'], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: resolvedCwd,
      env: buildHomeShellEnv(),
    });

    const record: HomeShellRecord = {
      windowStateId: normalizedWindowStateId,
      windowId,
      shellPath,
      cwd: resolvedCwd,
      ptyProcess,
    };
    homeShellsByWindowStateId.set(normalizedWindowStateId, record);

    ptyProcess.onData((data: string) => {
      emitToWindow(windowId, 'window-home-shell:data', {
        windowStateId: normalizedWindowStateId,
        data,
      });
    });

    ptyProcess.onExit((event: { exitCode?: number; signal?: number }) => {
      homeShellsByWindowStateId.delete(normalizedWindowStateId);
      emitToWindow(windowId, 'window-home-shell:exit', {
        windowStateId: normalizedWindowStateId,
        exitCode: Number(event?.exitCode || 0),
        signal: Number(event?.signal || 0),
      });
    });

    logRuntime('info', 'window home shell started', {
      windowStateId: normalizedWindowStateId,
      windowId,
      cwd: resolvedCwd,
      shellPath,
    });

    return {
      ok: true,
      cwd: resolvedCwd,
      shellPath,
      reused: false,
    };
  } catch (error: any) {
    const message = error?.message || 'Window home shell failed to start.';
    emitToWindow(windowId, 'window-home-shell:error', {
      windowStateId: normalizedWindowStateId,
      message,
    });
    logRuntime('error', 'window home shell start failed', {
      windowStateId: normalizedWindowStateId,
      windowId,
      error: message,
    });
    throw error;
  }
}

export function writeWindowHomeShell({
  windowStateId,
  data,
}: {
  windowStateId: string;
  data: string;
}): void {
  const normalizedWindowStateId = normalizeWindowStateId(windowStateId);
  const record = homeShellsByWindowStateId.get(normalizedWindowStateId);
  if (!record) {
    return;
  }
  record.ptyProcess.write(String(data || ''));
}

export function resizeWindowHomeShell({
  windowStateId,
  cols,
  rows,
}: {
  windowStateId: string;
  cols: number;
  rows: number;
}): void {
  const normalizedWindowStateId = normalizeWindowStateId(windowStateId);
  const record = homeShellsByWindowStateId.get(normalizedWindowStateId);
  if (!record) {
    return;
  }
  const nextCols = Math.max(2, Math.floor(Number(cols) || 0));
  const nextRows = Math.max(2, Math.floor(Number(rows) || 0));
  record.ptyProcess.resize(nextCols, nextRows);
}

export function disposeWindowHomeShell(windowStateId: string): void {
  const normalizedWindowStateId = normalizeWindowStateId(windowStateId);
  const record = homeShellsByWindowStateId.get(normalizedWindowStateId);
  if (!record) {
    return;
  }
  homeShellsByWindowStateId.delete(normalizedWindowStateId);
  try {
    record.ptyProcess.kill();
  } catch (_error) {
    // Best-effort cleanup only.
  }
  logRuntime('info', 'window home shell disposed', {
    windowStateId: normalizedWindowStateId,
    windowId: record.windowId,
  });
}

export function disposeWindowHomeShellForWindow(windowStateId: string): void {
  disposeWindowHomeShell(windowStateId);
}
