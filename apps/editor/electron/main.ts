import {
  app,
  BrowserWindow,
  nativeImage,
  protocol,
  net,
  screen,
  type BrowserWindow as BrowserWindowType,
  type NativeImage,
  type Rectangle,
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
  getExplicitProjectRootOverride,
  selectProjectRoot,
  setProjectRoot,
  setWindowProjectRoot,
  clearWindowProjectRoot,
} = require('./services/projectRoot');
const {
  createWindowStateId,
  getLastActiveWindowStateId,
  getOpenWindowStateIds,
  markLastActiveWindowState,
  readWindowUiState,
  setOpenWindowStateIds,
  updateWindowUiState,
} = require('./services/uiState');
const {
  initRuntimeLogger,
  logRuntime,
  closeRuntimeLogger,
  getRuntimeLogInfo,
} = require('./services/runtimeLog');
const {
  createControlBusService,
} = require('./services/controlBus');
const {
  createControlBusSocketServer,
} = require('./services/controlBusSocket');
const {
  broadcastWindowShellUpdated,
  collectEditorWindows,
  focusEditorWindow,
  orderEditorWindowsByStateId,
  resolveActivatedEditorWindow,
  syncWindowTitle,
} = require('./services/windowShell');

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
let isQuitting = false;
let controlBusSocketServer:
  | { socketPath: string; start: () => Promise<any>; close: () => Promise<void> }
  | null = null;
const pendingWindowStateWrites = new Map<number, ReturnType<typeof setTimeout>>();

const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 820;
const MIN_WINDOW_WIDTH = 1024;
const MIN_WINDOW_HEIGHT = 700;
const WINDOW_STATE_WRITE_DEBOUNCE_MS = 180;

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

const shouldUseSingleInstanceLock =
  process.env.AGENCY_TEST_MODE !== '1' || process.env.AGENCY_TEST_SINGLE_INSTANCE === '1';
const hasSingleInstanceLock = shouldUseSingleInstanceLock ? app.requestSingleInstanceLock() : true;
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

function normalizeWindowStateId(value: unknown): string {
  return String(value || '').trim();
}

function normalizeStoredProjectRoot(value: unknown): string {
  const normalized = String(value || '').trim();
  if (!normalized || !fs.existsSync(normalized)) {
    return '';
  }
  return normalized;
}

function clearPendingWindowStateWrite(windowId: number): void {
  const handle = pendingWindowStateWrites.get(windowId);
  if (!handle) {
    return;
  }
  clearTimeout(handle);
  pendingWindowStateWrites.delete(windowId);
}

async function syncOpenWindowStateIds(): Promise<void> {
  if (isQuitting) {
    return;
  }
  const openWindowStateIds = BrowserWindow.getAllWindows()
    .filter((window) => !window.isDestroyed?.())
    .map((window) => normalizeWindowStateId((window as AgencyWindow).__agencyWindowStateId))
    .filter(Boolean);
  await setOpenWindowStateIds(openWindowStateIds);
}

function sanitizeWindowBounds(bounds: unknown): Rectangle | null {
  if (!bounds || typeof bounds !== 'object') {
    return null;
  }

  const raw = bounds as Partial<Rectangle>;
  const width = Math.max(MIN_WINDOW_WIDTH, Math.round(Number(raw.width) || 0));
  const height = Math.max(MIN_WINDOW_HEIGHT, Math.round(Number(raw.height) || 0));
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  const fallback = {
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    x: undefined,
    y: undefined,
  };
  const candidate = {
    x: Number.isFinite(Number(raw.x)) ? Math.round(Number(raw.x)) : fallback.x,
    y: Number.isFinite(Number(raw.y)) ? Math.round(Number(raw.y)) : fallback.y,
    width,
    height,
  };
  const primaryDisplay = screen.getPrimaryDisplay();
  const display = screen.getDisplayMatching({
    x: candidate.x ?? primaryDisplay.workArea.x,
    y: candidate.y ?? primaryDisplay.workArea.y,
    width: candidate.width,
    height: candidate.height,
  });
  const workArea = display?.workArea || primaryDisplay.workArea;
  const nextWidth = Math.min(candidate.width, workArea.width);
  const nextHeight = Math.min(candidate.height, workArea.height);
  const centeredX = workArea.x + Math.max(0, Math.round((workArea.width - nextWidth) / 2));
  const centeredY = workArea.y + Math.max(0, Math.round((workArea.height - nextHeight) / 2));
  const maxX = workArea.x + Math.max(0, workArea.width - nextWidth);
  const maxY = workArea.y + Math.max(0, workArea.height - nextHeight);

  return {
    x:
      candidate.x === undefined
        ? centeredX
        : Math.min(Math.max(candidate.x, workArea.x), maxX),
    y:
      candidate.y === undefined
        ? centeredY
        : Math.min(Math.max(candidate.y, workArea.y), maxY),
    width: nextWidth,
    height: nextHeight,
  };
}

async function persistWindowShellState(win: AgencyWindow): Promise<void> {
  if (!win || win.isDestroyed?.()) {
    return;
  }
  const windowStateId = normalizeWindowStateId(win.__agencyWindowStateId);
  if (!windowStateId) {
    return;
  }
  const geometrySource = win.isMaximized() || win.isFullScreen() ? win.getNormalBounds() : win.getBounds();
  await updateWindowUiState(windowStateId, {
    windowBounds: {
      x: geometrySource.x,
      y: geometrySource.y,
      width: geometrySource.width,
      height: geometrySource.height,
    },
    windowMaximized: win.isMaximized(),
    windowFullScreen: win.isFullScreen(),
  });
}

function scheduleWindowShellStatePersist(win: AgencyWindow): void {
  if (!win || win.isDestroyed?.()) {
    return;
  }
  clearPendingWindowStateWrite(win.id);
  const handle = setTimeout(() => {
    pendingWindowStateWrites.delete(win.id);
    void persistWindowShellState(win).catch((error) => {
      logRuntime('warn', 'window state persist failed', {
        windowId: win.id,
        windowStateId: normalizeWindowStateId(win.__agencyWindowStateId),
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, WINDOW_STATE_WRITE_DEBOUNCE_MS);
  pendingWindowStateWrites.set(win.id, handle);
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
  const envProjectRoot = String(getExplicitProjectRootOverride() || '').trim();
  if (envProjectRoot) {
    try {
      return await getRepoRoot(envProjectRoot);
    } catch (_error) {
      return '';
    }
  }
  return '';
}

function registerWindowShellTracking(win: AgencyWindow): void {
  const markFocused = () => {
    mainWindow = win;
    if (win.__agencyWindowStateId) {
      void markLastActiveWindowState(win.__agencyWindowStateId);
    }
    syncWindowTitle(win);
    broadcastWindowShellUpdated();
  };

  win.on('focus', markFocused);
  win.on('move', () => scheduleWindowShellStatePersist(win));
  win.on('resize', () => scheduleWindowShellStatePersist(win));
  win.on('maximize', () => scheduleWindowShellStatePersist(win));
  win.on('unmaximize', () => scheduleWindowShellStatePersist(win));
  win.on('enter-full-screen', () => scheduleWindowShellStatePersist(win));
  win.on('leave-full-screen', () => scheduleWindowShellStatePersist(win));
  win.on('show', () => broadcastWindowShellUpdated());
  win.on('hide', () => broadcastWindowShellUpdated());
  win.on('closed', () => {
    clearPendingWindowStateWrite(win.id);
    clearWindowProjectRoot(win.id);
    if (mainWindow === win) {
      mainWindow = undefined;
    }
    if (!isQuitting) {
      void syncOpenWindowStateIds();
    }
    broadcastWindowShellUpdated();
  });
}

async function createWindow({
  startEmpty = false,
  projectRoot = '',
  windowStateId: requestedWindowStateId = '',
  allowStoredProjectRoot,
}: {
  startEmpty?: boolean;
  projectRoot?: string;
  windowStateId?: string;
  allowStoredProjectRoot?: boolean;
} = {}): Promise<AgencyWindow> {
  const normalizedProjectRoot = String(projectRoot || '').trim();
  const shouldAllowStoredProjectRoot =
    allowStoredProjectRoot ?? (!startEmpty && !normalizedProjectRoot);
  const normalizedRequestedWindowStateId = normalizeWindowStateId(requestedWindowStateId);
  const preferredWindowStateId = normalizedRequestedWindowStateId || (shouldAllowStoredProjectRoot
    ? await getLastActiveWindowStateId()
    : '');
  const windowStateId = preferredWindowStateId || createWindowStateId();
  const storedWindowState = await readWindowUiState(windowStateId);
  const storedProjectRoot = shouldAllowStoredProjectRoot
    ? normalizeStoredProjectRoot(storedWindowState?.projectRoot)
    : '';
  const restoredBounds = sanitizeWindowBounds(storedWindowState?.windowBounds);
  const shouldRestoreMaximized = Boolean(storedWindowState?.windowMaximized);
  const shouldRestoreFullScreen = Boolean(storedWindowState?.windowFullScreen);

  recordStartup('window-create-start', {
    startEmpty,
    hasProjectRoot: Boolean(normalizedProjectRoot),
    allowStoredProjectRoot: shouldAllowStoredProjectRoot,
    windowStateId,
  });

  const iconImage = resolveIconImage();
  const win = new BrowserWindow({
    width: restoredBounds?.width ?? DEFAULT_WINDOW_WIDTH,
    height: restoredBounds?.height ?? DEFAULT_WINDOW_HEIGHT,
    ...(restoredBounds ? { x: restoredBounds.x, y: restoredBounds.y } : {}),
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    backgroundColor: '#111318',
    autoHideMenuBar: true,
    ...(iconImage ? { icon: iconImage } : {}),
    title: 'Agency',
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset' as const,
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  }) as AgencyWindow;

  win.__agencyAllowStoredProjectRoot = shouldAllowStoredProjectRoot;
  win.__agencyWindowStateId = windowStateId;
  if (normalizedProjectRoot) {
    await setProjectRoot(normalizedProjectRoot, {
      windowId: win.id,
      windowStateId,
    });
  } else if (storedProjectRoot) {
    setWindowProjectRoot(win.id, storedProjectRoot);
  }
  syncWindowTitle(win);
  registerWindowShellTracking(win);
  recordStartup('window-created', { id: win.id });

  if (windowStateId) {
    await markLastActiveWindowState(windowStateId);
  }
  if (shouldRestoreMaximized) {
    win.maximize();
  }
  if (shouldRestoreFullScreen) {
    win.setFullScreen(true);
  }
  loadRendererWindow(win);
  attachWindowDiagnostics(win);
  mainWindow = win;
  await persistWindowShellState(win);
  await syncOpenWindowStateIds();
  broadcastWindowShellUpdated();
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
      syncWindowTitle(ownerWindow);
      ownerWindow.webContents.send('project:updated', result);
    }
    if (result?.recentProjects) {
      broadcastRecentProjects(result.recentProjects);
    }
    broadcastWindowShellUpdated();
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

async function restoreInitialWindows(launchProjectRoot: string): Promise<void> {
  if (launchProjectRoot) {
    await createWindow({
      projectRoot: launchProjectRoot,
    });
    return;
  }

  const openWindowStateIds = await getOpenWindowStateIds();
  const lastActiveWindowStateId = normalizeWindowStateId(await getLastActiveWindowStateId());
  const orderedWindowStateIds = [
    ...openWindowStateIds.filter((windowStateId: string) => windowStateId && windowStateId !== lastActiveWindowStateId),
    ...(lastActiveWindowStateId && openWindowStateIds.includes(lastActiveWindowStateId)
      ? [lastActiveWindowStateId]
      : []),
  ];

  if (orderedWindowStateIds.length === 0) {
    await createWindow({ startEmpty: true });
    return;
  }

  for (const windowStateId of orderedWindowStateIds) {
    await createWindow({
      windowStateId,
      allowStoredProjectRoot: true,
    });
  }
}

async function resolveEditorWindowsInCycleOrder(): Promise<AgencyWindow[]> {
  const openWindowStateIds = await getOpenWindowStateIds();
  const orderedRecords = orderEditorWindowsByStateId(collectEditorWindows(), openWindowStateIds);
  return orderedRecords.map((record) => record.window as AgencyWindow);
}

async function handleAppActivate(hasVisibleWindows: boolean): Promise<void> {
  const orderedEditorWindows = await resolveEditorWindowsInCycleOrder();
  if (orderedEditorWindows.length === 0) {
    await createWindow({ startEmpty: true });
    logRuntime('info', 'main window recreated');
    return;
  }

  const focusedWindow = BrowserWindow.getFocusedWindow() as AgencyWindow | undefined;
  const focusedWindowStateId = normalizeWindowStateId(focusedWindow?.__agencyWindowStateId);
  const targetWindow =
    resolveActivatedEditorWindow(
      orderedEditorWindows.map((window) => ({
        window,
        windowStateId: normalizeWindowStateId(window.__agencyWindowStateId),
      })),
      focusedWindowStateId,
      hasVisibleWindows
    )?.window || orderedEditorWindows[0];
  const currentIndex = focusedWindowStateId
    ? orderedEditorWindows.findIndex((window) => normalizeWindowStateId(window.__agencyWindowStateId) === focusedWindowStateId)
    : -1;

  logRuntime('info', 'app activate resolved editor window', {
    hasVisibleWindows,
    editorWindowCount: orderedEditorWindows.length,
    currentIndex,
    targetWindowId: targetWindow.id,
    targetWindowStateId: normalizeWindowStateId(targetWindow.__agencyWindowStateId),
  });
  focusEditorWindow(targetWindow);
}

function setupAppLifecycle(): void {
  app.on('activate', (_event, hasVisibleWindows) => {
    void handleAppActivate(Boolean(hasVisibleWindows));
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      closeRuntimeLogger();
      app.quit();
      return;
    }
    if (!isQuitting) {
      void setOpenWindowStateIds([]);
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    clearRegisteredShortcuts();
    if (controlBusSocketServer) {
      void controlBusSocketServer.close().catch((error: unknown) => {
        logRuntime('warn', 'control bus socket close failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
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
  setupMainIpcHandlers(() => mainWindow, createWindow);
  recordStartup('ipc-handlers-ready');

  const controlBus = createControlBusService({
    createEditorWindow: createWindow,
  });
  controlBusSocketServer = createControlBusSocketServer({
    dispatch: (request: Record<string, any>, context: Record<string, any>) =>
      controlBus.dispatch(request, context),
    logRuntime,
  });
  try {
    recordStartup('control-bus-socket-start');
    const controlBusInfo = await controlBusSocketServer.start();
    recordStartup('control-bus-socket-ready', {
      socketPath: controlBusInfo?.socketPath || null,
    });
  } catch (error) {
    logRuntime('error', 'control bus socket start failed', {
      error: error instanceof Error ? error.message : String(error),
      socketPath: controlBusSocketServer?.socketPath || null,
    });
  }

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
  await restoreInitialWindows(launchProjectRoot);
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
}
void app.whenReady().then(bootstrapApp);
setupProcessErrorHandlers();
