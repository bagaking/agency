import {
  app,
  BrowserWindow,
  nativeImage,
  protocol,
  net,
  type BrowserWindow as BrowserWindowType,
  type NativeImage,
} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { applyAppMenu } from './main/appMenu';
import { setupMainIpcHandlers } from './main/ipcSetup';
import { createStartupTimeline, type StartupMeta } from './main/startupTimeline';

const { getRepoRoot } = require('./services/git');
const {
  getAppShortcuts,
  applyAppShortcuts,
  clearRegisteredShortcuts,
} = require('./services/appShortcuts');
const { resolveRendererUrl } = require('./services/rendererUrl');
const { warmupVoiceCapture } = require('./services/voiceCapture');
const {
  selectProjectRoot,
  setProjectRoot,
  setWindowProjectRoot,
  clearWindowProjectRoot,
} = require('./services/projectRoot');
const {
  createWindowStateId,
  getLastActiveWindowStateId,
  markLastActiveWindowState,
} = require('./services/uiState');
const {
  initRuntimeLogger,
  logRuntime,
  closeRuntimeLogger,
  getRuntimeLogInfo,
} = require('./services/runtimeLog');

type AgencyWindow = BrowserWindowType & {
  __agencyAllowStoredProjectRoot?: boolean;
  __agencyWindowStateId?: string;
};

type RendererInfo = {
  url?: string;
  source?: string;
};

let mainWindow: AgencyWindow | undefined;
let testUserDataPath: string | null = null;

app.setName('Agency');

function configureTestUserDataPath(): string | null {
  if (process.env.AGENCY_TEST_MODE !== '1') {
    return null;
  }
  const candidate = String(process.env.AGENCY_TEST_USER_DATA_PATH || '').trim();
  if (!candidate) {
    return null;
  }
  try {
    fs.mkdirSync(candidate, { recursive: true });
    app.setPath('userData', candidate);
    return candidate;
  } catch {
    return null;
  }
}

testUserDataPath = configureTestUserDataPath();

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

const startupTimeline = createStartupTimeline(({ stage, elapsedMs, meta }) => {
  logRuntime('info', 'startup stage', {
    stage,
    elapsedMs,
    ...meta,
  });
});

function recordStartup(stage: string, meta: StartupMeta = {}): void {
  startupTimeline.record(stage, meta);
}

recordStartup('process-start', {
  testUserDataPath,
});

function ensureDarwinPath(): {
  updated: boolean;
  path: string;
  additions: string[];
} {
  if (process.platform !== 'darwin') {
    return { updated: false, path: process.env.PATH || '', additions: [] };
  }

  const defaultPaths = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ];
  const existing = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const additions = defaultPaths.filter((entry) => !existing.includes(entry));
  if (additions.length === 0) {
    return {
      updated: false,
      path: existing.join(path.delimiter),
      additions: [],
    };
  }

  const nextPath = [...existing, ...additions].join(path.delimiter);
  process.env.PATH = nextPath;
  return {
    updated: true,
    path: nextPath,
    additions,
  };
}

function resolveIconPath(): string {
  const devIcon = path.join(__dirname, '../renderer/public/icon.png');
  if (fs.existsSync(devIcon)) {
    return devIcon;
  }

  const packagedIcon = path.join(process.resourcesPath, 'icon.png');
  if (fs.existsSync(packagedIcon)) {
    return packagedIcon;
  }

  return '';
}

function resolveIconImage(): NativeImage | null {
  const iconPath = resolveIconPath();
  if (!iconPath) {
    return null;
  }

  const image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    return null;
  }

  return image;
}

function loadRendererWindow(win: BrowserWindow): void {
  const rendererInfo = (resolveRendererUrl() || {}) as RendererInfo;
  const rendererUrl = rendererInfo.url || '';
  const useDevRenderer = Boolean(rendererUrl);

  if (useDevRenderer) {
    recordStartup('renderer-load-start', { url: rendererUrl, source: rendererInfo.source || null });
    void win.loadURL(rendererUrl);
    if (!process.env.AGENCY_TEST_MODE && !app.isPackaged) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
    return;
  }

  recordStartup('renderer-load-start', { url: 'file://dist/renderer/index.html' });
  void win.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
}

function attachWindowDiagnostics(win: BrowserWindow): void {
  win.webContents.on('did-finish-load', () => {
    const currentUrl = win.webContents.getURL();
    recordStartup('renderer-loaded', { url: currentUrl });
    logRuntime('info', 'renderer loaded', { url: currentUrl });
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logRuntime('error', 'renderer load failed', {
      errorCode,
      errorDescription,
      validatedURL,
    });

    const rendererInfo = (resolveRendererUrl() || {}) as RendererInfo;
    if (!app.isPackaged && rendererInfo.url) {
      return;
    }
    void win.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    logRuntime('error', 'renderer process gone', details || {});
  });
}

async function resolveLaunchProjectRoot(
  argv: string[] = [],
  workingDirectory = process.cwd()
): Promise<string> {
  const candidates = Array.isArray(argv) ? argv : [];
  for (const raw of candidates) {
    const value = String(raw || '').trim();
    if (!value || value.startsWith('-')) {
      continue;
    }
    const candidatePath = path.isAbsolute(value)
      ? value
      : path.resolve(workingDirectory || process.cwd(), value);
    let stats = null;
    try {
      stats = fs.statSync(candidatePath);
    } catch (_error) {
      stats = null;
    }
    if (!stats?.isDirectory()) {
      continue;
    }
    try {
      return await getRepoRoot(candidatePath);
    } catch (_error) {
      continue;
    }
  }
  return '';
}

async function createWindow({
  startEmpty = false,
  projectRoot = '',
}: {
  startEmpty?: boolean;
  projectRoot?: string;
} = {}): Promise<AgencyWindow> {
  const normalizedProjectRoot = String(projectRoot || '').trim();
  const allowStoredProjectRoot = !startEmpty && !normalizedProjectRoot;
  const preferredWindowStateId = allowStoredProjectRoot
    ? await getLastActiveWindowStateId()
    : '';
  const windowStateId = preferredWindowStateId || createWindowStateId();

  recordStartup('window-create-start', {
    startEmpty,
    hasProjectRoot: Boolean(normalizedProjectRoot),
    allowStoredProjectRoot,
    windowStateId,
  });

  const iconImage = resolveIconImage();
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#111318',
    autoHideMenuBar: true,
    ...(iconImage ? { icon: iconImage } : {}),
    title: 'Agency',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  }) as AgencyWindow;

  win.__agencyAllowStoredProjectRoot = allowStoredProjectRoot;
  win.__agencyWindowStateId = windowStateId;
  if (normalizedProjectRoot) {
    await setProjectRoot(normalizedProjectRoot, {
      windowId: win.id,
      windowStateId,
    });
  }
  win.on('focus', () => {
    mainWindow = win;
    if (win.__agencyWindowStateId) {
      void markLastActiveWindowState(win.__agencyWindowStateId);
    }
  });
  win.on('closed', () => {
    clearWindowProjectRoot(win.id);
  });
  recordStartup('window-created', { id: win.id });

  if (windowStateId) {
    await markLastActiveWindowState(windowStateId);
  }
  loadRendererWindow(win);
  attachWindowDiagnostics(win);
  mainWindow = win;
  return win;
}

function broadcastRecentProjects(recentProjects: unknown): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('project:recents', { recentProjects });
  });
}

function setupAssetProtocol(): void {
  protocol.handle('agency-asset', async (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname);
    const normalizedPath =
      process.platform === 'win32' && filePath.startsWith('/') ? filePath.slice(1) : filePath;

    try {
      return await net.fetch(pathToFileURL(normalizedPath).toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logRuntime('error', 'asset protocol fetch failed', {
        path: normalizedPath,
        error: message,
      });
      return new Response('Not Found', { status: 404 });
    }
  });
}

async function handleProjectSelection(): Promise<void> {
  try {
    const ownerWindow = (BrowserWindow.getFocusedWindow() || mainWindow) as AgencyWindow | undefined;
    const result = await selectProjectRoot({
      ownerWindow,
      windowStateId: ownerWindow?.__agencyWindowStateId,
    });
    if (result?.projectRoot && ownerWindow) {
      setWindowProjectRoot(ownerWindow.id, result.projectRoot);
      ownerWindow.webContents.send('project:updated', result);
    }
    if (result?.recentProjects) {
      broadcastRecentProjects(result.recentProjects);
    }
  } catch (error) {
    logRuntime('error', 'project selection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleSecondaryLaunch(argv: string[] = [], workingDirectory = process.cwd()): Promise<void> {
  const projectRoot = await resolveLaunchProjectRoot(argv, workingDirectory);
  const win = await createWindow({
    startEmpty: !projectRoot,
    projectRoot,
  });
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
}

function setupAppLifecycle(): void {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
      logRuntime('info', 'main window recreated');
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      closeRuntimeLogger();
      app.quit();
    }
  });

  app.on('before-quit', () => {
    clearRegisteredShortcuts();
    closeRuntimeLogger();
  });
}

function setupProcessErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    logRuntime('error', 'uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
  });

  process.on('unhandledRejection', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logRuntime('error', 'unhandled rejection', { error: message, stack });
  });
}

async function bootstrapApp(): Promise<void> {
  recordStartup('app-when-ready');
  await initRuntimeLogger();
  recordStartup('runtime-logger-ready');

  const pathUpdate = ensureDarwinPath();
  if (pathUpdate.updated) {
    logRuntime('info', 'process PATH updated', { additions: pathUpdate.additions });
  }

  startupTimeline.flush();

  const runtimeInfo = getRuntimeLogInfo();
  logRuntime('info', 'app ready', {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    runtimeInfo,
  });

  recordStartup('ipc-handlers-setup-start');
  setupMainIpcHandlers(() => mainWindow);
  recordStartup('ipc-handlers-ready');

  recordStartup('asset-protocol-setup');
  setupAssetProtocol();

  if (process.platform === 'darwin') {
    try {
      const iconImage = resolveIconImage();
      if (iconImage) {
        app.dock.setIcon(iconImage);
      } else {
        logRuntime('warn', 'dock icon missing');
      }

      const rendererInfo = (resolveRendererUrl() || {}) as RendererInfo;
      if (rendererInfo.url && !app.isPackaged) {
        app.dock.setBadge('DEV');
      }
    } catch (error) {
      logRuntime('warn', 'dock icon set failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  applyAppMenu({
    onSelectProject: () => {
      void handleProjectSelection();
    },
    onNewWindow: () => {
      void createWindow({ startEmpty: true });
    },
  });
  recordStartup('menu-built');

  const launchProjectRoot = await resolveLaunchProjectRoot(process.argv);
  await createWindow({
    projectRoot: launchProjectRoot,
  });
  recordStartup('window-create-requested');

  recordStartup('voice-helper-warmup-start');
  void warmupVoiceCapture({ source: 'app-ready' })
    .then((result: any) => {
      recordStartup('voice-helper-warmup-done', {
        ok: result?.ok ?? false,
        built: result?.built || false,
        reason: result?.reason || null,
      });
    })
    .catch((error: unknown) => {
      recordStartup('voice-helper-warmup-failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

  void getAppShortcuts({ scope: 'global' })
    .then((actions: unknown) => applyAppShortcuts({ actions }))
    .then(() => recordStartup('app-shortcuts-registered'))
    .catch((error: unknown) => {
      logRuntime('warn', 'app shortcuts register failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

  logRuntime('info', 'main window created');
  setupAppLifecycle();
}

if (hasSingleInstanceLock) {
  app.on('second-instance', (_event, argv, workingDirectory) => {
    void handleSecondaryLaunch(argv, workingDirectory);
  });
  void app.whenReady().then(bootstrapApp);
}
setupProcessErrorHandlers();
