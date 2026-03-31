import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { isAgencyAvailable, logRuntime } from '../../services/agencyBridge';
import {
  getCachedSessionMapPreview,
  primeSessionMapPreview,
  setCachedSessionMapPreview,
} from '../../services/sessionMapPreviewCache';
import { getTerminalSnapshot } from '../../terminal/terminalManager';
import { DEBUG_FLAGS, getDebugFlag } from '../../utils/debugFlags';
import {
  PREVIEW_BG,
  PREVIEW_COLS,
  PREVIEW_ATTACH_DELAY_MS,
  PREVIEW_FG,
  PREVIEW_FONT_SIZE,
  PREVIEW_FONT_STACK,
  PREVIEW_LINES,
  PREVIEW_MAX_HEIGHT,
  PREVIEW_REFRESH_MS,
  PREVIEW_ROWS,
  PREVIEW_SCROLLBACK,
  PREVIEW_TARGET_WIDTH,
} from './sessionMapConstants';
import { normalizeLineEndingsToCrlf } from '../../utils/lineEndings';

const USE_LOCAL_SNAPSHOT = false;

export function SessionMapTerminalPreview({
  cell,
  session,
  isOffline,
  fontSize,
  maxHeight,
  enabled = true,
  onPreviewReady,
  onPreviewMetrics,
}: any) {
  const previewRef = useRef(null);
  const primaryContainerRef = useRef(null);
  const secondaryContainerRef = useRef(null);
  const terminalsRef = useRef([null, null]);
  const activeIndexRef = useRef(0);
  const swapPendingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState(PREVIEW_MAX_HEIGHT);
  const [offsetY, setOffsetY] = useState(0);
  const [ipcActive, setIpcActive] = useState(false);
  const lastSnapshotRef = useRef('');
  const hasRenderedRef = useRef(false);
  const lastLogRef = useRef(null);
  const lastSizeRef = useRef({ cols: PREVIEW_COLS, rows: PREVIEW_ROWS });
  const lastUserScrollRef = useRef(0);
  const lastMetricsRef = useRef({ height: null, scale: null });
  const initDoneRef = useRef(false);
  const ipcDelayRef = useRef(null);
  const isDebugEnabled = useCallback(() => getDebugFlag(DEBUG_FLAGS.sessionMapPreview), []);
  const logDebug = useCallback(
    (label, payload = {}) => {
      if (!isDebugEnabled()) {
        return;
      }
      console.log(`[SessionMapPreview] ${label}`, payload);
      logRuntime({
        level: 'info',
        message: `SessionMapPreview:${label}`,
        meta: payload,
      });
    },
    [isDebugEnabled]
  );
  const resolveContainer = useCallback(
    (index) =>
      index === 0 ? primaryContainerRef.current : secondaryContainerRef.current,
    []
  );

  const resolveScreenMetrics = useCallback(() => {
    const containers = [primaryContainerRef.current, secondaryContainerRef.current];
    let best = null;
    containers.forEach((container) => {
      if (!container) {
        return;
      }
      const screen = container.querySelector('.xterm-screen');
      if (!screen) {
        return;
      }
      const width = screen.offsetWidth;
      const height = screen.offsetHeight;
      if (!width || !height) {
        return;
      }
      if (!best || height > best.height || width > best.width) {
        best = { width, height };
      }
    });
    return best;
  }, []);

  const measureScale = useCallback(() => {
    const metrics = resolveScreenMetrics();
    if (!metrics) {
      return;
    }
    const { width, height } = metrics;
    if (!width || !height) {
      return;
    }
    const scaleForWidth = PREVIEW_TARGET_WIDTH / width;
    let nextScale = Math.min(1, scaleForWidth);
    const resolvedMaxHeight =
      Number.isFinite(maxHeight) && maxHeight > 0 ? maxHeight : PREVIEW_MAX_HEIGHT;
    const maxScaleForHeight = resolvedMaxHeight / height;
    if (nextScale > maxScaleForHeight) {
      nextScale = maxScaleForHeight;
    }
    const resolvedScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
    setScale(resolvedScale);
    const measuredHeight = Math.round(height * resolvedScale);
    const nextHeight = Math.min(resolvedMaxHeight, measuredHeight);
    setPreviewHeight(nextHeight);
    setOffsetY(Math.max(0, nextHeight - measuredHeight));
    if (
      lastMetricsRef.current.height !== nextHeight ||
      lastMetricsRef.current.scale !== resolvedScale
    ) {
      lastMetricsRef.current = { height: nextHeight, scale: resolvedScale };
      onPreviewMetrics?.({
        height: nextHeight,
        scale: resolvedScale,
        cols: lastSizeRef.current.cols,
        rows: lastSizeRef.current.rows,
      });
    }
  }, [maxHeight, onPreviewMetrics, resolveScreenMetrics]);

  const getActiveTerminal = useCallback(
    () => terminalsRef.current[activeIndexRef.current],
    []
  );
  const getInactiveTerminal = useCallback(
    () => terminalsRef.current[1 - activeIndexRef.current],
    []
  );
  const swapActiveTerminal = useCallback(() => {
    activeIndexRef.current = 1 - activeIndexRef.current;
    setActiveIndex(activeIndexRef.current);
    requestAnimationFrame(() => {
      measureScale();
    });
  }, [measureScale]);

  const writePreviewData = useCallback(
    (data) => {
      if (swapPendingRef.current) {
        return;
      }
      const terminal = getInactiveTerminal();
      if (!terminal) {
        return;
      }
      swapPendingRef.current = true;
      terminal.reset();
      terminal.write(data, () => {
        terminal.scrollToBottom();
        swapPendingRef.current = false;
        swapActiveTerminal();
        if (!hasRenderedRef.current) {
          hasRenderedRef.current = true;
          onPreviewReady?.(true);
        }
      });
    },
    [getInactiveTerminal, onPreviewReady, swapActiveTerminal]
  );

  const applyPreviewSize = useCallback(
    (cols, rows) => {
      const nextCols = Number(cols);
      const nextRows = Number(rows);
      if (!Number.isFinite(nextCols) || !Number.isFinite(nextRows)) {
        return;
      }
      const clampedCols = Math.max(2, Math.floor(nextCols));
      const clampedRows = Math.max(2, Math.floor(nextRows));
      const current = lastSizeRef.current;
      if (current.cols === clampedCols && current.rows === clampedRows) {
        return;
      }
      lastSizeRef.current = { cols: clampedCols, rows: clampedRows };
      terminalsRef.current.forEach((terminal) => {
        if (terminal) {
          terminal.resize(clampedCols, clampedRows);
        }
      });
      requestAnimationFrame(() => {
        measureScale();
      });
    },
    [measureScale]
  );

  const applyPreviewPayload = useCallback(
    (payload) => {
      if (!payload) {
        return false;
      }
      const normalized = normalizeLineEndingsToCrlf(payload.data);
      if (!normalized) {
        return false;
      }
      const nextCols = Number.isFinite(Number(payload.cols)) ? Number(payload.cols) : null;
      const nextRows = Number.isFinite(Number(payload.rows)) ? Number(payload.rows) : null;
      if (Number.isFinite(nextCols) && Number.isFinite(nextRows)) {
        applyPreviewSize(nextCols, nextRows);
      }
      if (lastSnapshotRef.current === normalized && hasRenderedRef.current) {
        return false;
      }
      lastSnapshotRef.current = normalized;
      writePreviewData(normalized);
      const attachedWorktreePath = cell?.attachedWorktreePath || '';
      setCachedSessionMapPreview({
        worktreePath: attachedWorktreePath,
        cellId: cell?.id,
        sessionId: session?.id,
        preview: {
          data: normalized,
          cols: nextCols,
          rows: nextRows,
          cachePath: payload.cachePath || null,
        },
      });
      return true;
    },
    [applyPreviewSize, cell?.id, cell?.attachedWorktreePath, session?.id, writePreviewData]
  );

  useEffect(() => {
    if (initDoneRef.current) {
      return undefined;
    }
    if (!primaryContainerRef.current || !secondaryContainerRef.current) {
      return undefined;
    }
    initDoneRef.current = true;
    const createTerminal = () =>
      new XTerm({
        fontFamily: PREVIEW_FONT_STACK,
        fontSize: Number.isFinite(fontSize) && fontSize > 0 ? fontSize : PREVIEW_FONT_SIZE,
        disableStdin: true,
        convertEol: true,
        scrollback: PREVIEW_SCROLLBACK,
        cursorBlink: false,
        cols: lastSizeRef.current.cols,
        rows: lastSizeRef.current.rows,
        theme: {
          background: PREVIEW_BG,
          foreground: PREVIEW_FG,
        },
      });
    const primary = createTerminal();
    const secondary = createTerminal();
    primary.open(primaryContainerRef.current);
    secondary.open(secondaryContainerRef.current);
    primary.resize(lastSizeRef.current.cols, lastSizeRef.current.rows);
    secondary.resize(lastSizeRef.current.cols, lastSizeRef.current.rows);
    terminalsRef.current = [primary, secondary];
    setReady(true);
    requestAnimationFrame(() => {
      measureScale();
    });
    logDebug('init', {
      cellId: cell?.id,
      sessionId: session?.id,
      fontSize,
      enabled: isDebugEnabled(),
    });
    return () => {
      initDoneRef.current = false;
      terminalsRef.current.forEach((terminal) => terminal?.dispose());
      terminalsRef.current = [null, null];
    };
  }, []);

  const handleWheel = useCallback((event) => {
    const terminal = getActiveTerminal();
    if (!terminal) {
      return;
    }
    if (event.ctrlKey) {
      return;
    }
    const delta = event.deltaY;
    if (!delta) {
      return;
    }
    const direction = delta > 0 ? 1 : -1;
    let lines = 0;
    if (event.deltaMode === 1) {
      lines = delta;
    } else {
      const base = Math.round(Math.abs(delta) / 40);
      lines = (base === 0 ? 1 : base) * direction;
    }
    if (!lines) {
      return;
    }
    terminal.scrollLines(lines);
    lastUserScrollRef.current = Date.now();
    event.preventDefault();
    event.stopPropagation();
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const nextFontSize =
      Number.isFinite(fontSize) && fontSize > 0 ? fontSize : PREVIEW_FONT_SIZE;
    terminalsRef.current.forEach((terminal) => {
      if (terminal && terminal.options.fontSize !== nextFontSize) {
        terminal.options.fontSize = nextFontSize;
        terminal.refresh(0, terminal.rows - 1);
      }
    });
    requestAnimationFrame(() => {
      measureScale();
    });
  }, [fontSize, measureScale, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    requestAnimationFrame(() => {
      measureScale();
    });
  }, [maxHeight, measureScale, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    setError('');
    lastSizeRef.current = { cols: PREVIEW_COLS, rows: PREVIEW_ROWS };
    terminalsRef.current.forEach((terminal) => {
      if (terminal) {
        terminal.resize(PREVIEW_COLS, PREVIEW_ROWS);
        terminal.reset();
      }
    });
    lastSnapshotRef.current = '';
    hasRenderedRef.current = false;
    onPreviewReady?.(false);
    activeIndexRef.current = 0;
    setActiveIndex(0);
    requestAnimationFrame(() => {
      measureScale();
    });
  }, [measureScale, onPreviewReady, ready, session?.id]);

  useEffect(() => {
    const attachedWorktreePath = cell?.attachedWorktreePath || '';
    if (!ready || !cell?.id || !session?.id || isOffline || !attachedWorktreePath) {
      return;
    }
    const cached = getCachedSessionMapPreview({
      worktreePath: attachedWorktreePath,
      cellId: cell.id,
      sessionId: session.id,
    });
    if (!cached?.data) {
      return;
    }
    applyPreviewPayload({
      data: cached.data,
      cols: cached.cols,
      rows: cached.rows,
      cachePath: cached.cachePath || null,
    });
  }, [applyPreviewPayload, cell?.id, cell?.attachedWorktreePath, isOffline, ready, session?.id]);

  useEffect(() => {
    if (!enabled) {
      onPreviewReady?.(false);
    }
  }, [enabled, onPreviewReady]);

  useEffect(() => {
    if (ipcDelayRef.current) {
      clearTimeout(ipcDelayRef.current);
      ipcDelayRef.current = null;
    }
    if (!enabled || !session?.id) {
      setIpcActive(false);
      return undefined;
    }
    setIpcActive(false);
    ipcDelayRef.current = setTimeout(() => {
      setIpcActive(true);
      ipcDelayRef.current = null;
    }, PREVIEW_ATTACH_DELAY_MS);
    return () => {
      if (ipcDelayRef.current) {
        clearTimeout(ipcDelayRef.current);
        ipcDelayRef.current = null;
      }
    };
  }, [enabled, session?.id]);

  useEffect(() => {
    if (!ready || !cell || !session || isOffline || !enabled || !ipcActive) {
      return undefined;
    }
    if (!isAgencyAvailable()) {
      setError('Preview unavailable (IPC missing).');
      logDebug('ipc-missing', { cellId: cell.id, sessionId: session.id });
      return undefined;
    }
    const attachedWorktreePath = cell?.attachedWorktreePath || '';
    if (!ready || !cell?.id || !session?.id || isOffline || !attachedWorktreePath) {
      return undefined;
    }
    let active = true;
    setError('');
    const refreshPreview = async () => {
      try {
        const terminalInstance = getActiveTerminal();
        const buffer = terminalInstance?.buffer?.active;
        const isScrolled =
          buffer && Number.isFinite(buffer.viewportY) && Number.isFinite(buffer.baseY)
            ? buffer.viewportY < buffer.baseY
            : false;
        if (isScrolled || Date.now() - lastUserScrollRef.current < 1200) {
          logDebug('skip-scroll', { cellId: cell.id, sessionId: session.id });
          return;
        }
        const localSnapshot = getTerminalSnapshot({
          cellId: cell.id,
          sessionId: session.id,
          lines: PREVIEW_LINES,
        });
        if (USE_LOCAL_SNAPSHOT && localSnapshot?.data) {
          const hasMeaningfulOutput = /\S/.test(localSnapshot.data);
          logDebug('local-snapshot', {
            cellId: cell.id,
            sessionId: session.id,
            cols: localSnapshot.cols,
            rows: localSnapshot.rows,
            length: localSnapshot.data.length,
            meaningful: hasMeaningfulOutput,
          });
          if (hasMeaningfulOutput) {
            applyPreviewSize(localSnapshot.cols, localSnapshot.rows);
            if (lastSnapshotRef.current !== localSnapshot.data) {
              lastSnapshotRef.current = localSnapshot.data;
              writePreviewData(localSnapshot.data);
            }
            return;
          }
          logDebug('local-snapshot-empty', {
            cellId: cell.id,
            sessionId: session.id,
          });
        }
        const result = await primeSessionMapPreview({
          cellId: cell.id,
          worktreePath: attachedWorktreePath,
          sessionId: session.id,
          startCommand: session.startCommand,
          lines: PREVIEW_LINES,
        });
        if (!active) {
          return;
        }
        const nextData = normalizeLineEndingsToCrlf(result?.data);
        if (!nextData) {
          logDebug('ipc-preview-empty', { cellId: cell.id, sessionId: session.id });
          return;
        }
        const nextCols = Number.isFinite(Number(result?.cols)) ? Number(result?.cols) : null;
        const nextRows = Number.isFinite(Number(result?.rows)) ? Number(result?.rows) : null;
        const nextLog = {
          cols: nextCols,
          rows: nextRows,
          length: nextData.length,
          unchanged: Boolean(result?.unchanged),
          cachePath: result?.cachePath || null,
        };
        const sizeChanged =
          Number.isFinite(nextCols) &&
          Number.isFinite(nextRows) &&
          (lastSizeRef.current.cols !== Math.floor(nextCols) ||
            lastSizeRef.current.rows !== Math.floor(nextRows));
        const isInitialRender = !hasRenderedRef.current;
        const lastLog = lastLogRef.current;
        const logChanged =
          !lastLog ||
          lastLog.cols !== nextLog.cols ||
          lastLog.rows !== nextLog.rows ||
          lastLog.length !== nextLog.length ||
          lastLog.unchanged !== nextLog.unchanged ||
          lastLog.cachePath !== nextLog.cachePath;
        if (logChanged) {
          logDebug('ipc-preview-result', {
            cellId: cell.id,
            sessionId: session.id,
            ...nextLog,
          });
          lastLogRef.current = nextLog;
        }
        if (result?.unchanged && !isInitialRender && !sizeChanged) {
          return;
        }
        if (!sizeChanged && lastSnapshotRef.current === nextData && !isInitialRender) {
          return;
        }
        if (sizeChanged) {
          applyPreviewSize(nextCols, nextRows);
        }
        lastSnapshotRef.current = nextData;
        writePreviewData(nextData);
        setCachedSessionMapPreview({
          worktreePath: attachedWorktreePath,
          cellId: cell.id,
          sessionId: session.id,
          preview: {
            data: nextData,
            cols: nextCols,
            rows: nextRows,
            cachePath: result?.cachePath || null,
          },
        });
      } catch (err) {
        if (active) {
          setError(err?.message || 'Preview unavailable.');
          logDebug('ipc-preview-error', {
            cellId: cell?.id,
            sessionId: session?.id,
            error: err?.message || String(err),
          });
        }
      }
    };
    refreshPreview();
    const interval = setInterval(refreshPreview, PREVIEW_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    applyPreviewSize,
    ipcActive,
    ready,
    cell?.id,
    cell?.attachedWorktreePath,
    isOffline,
    session?.id,
    session?.startCommand,
    enabled,
    writePreviewData,
  ]);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    const handle = () => measureScale();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [measureScale, ready]);

  useEffect(() => {
    const target = previewRef.current;
    if (!target) {
      return undefined;
    }
    target.addEventListener('wheel', handleWheel, { passive: false });
    return () => target.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  if (isOffline) {
    return (
      <div
        className="flex items-center justify-center bg-black/40 text-[10px] text-muted-foreground"
        style={{ width: PREVIEW_TARGET_WIDTH, height: previewHeight }}
      >
        Offline session (closed / stale / archived)
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-black/40 text-[10px] text-rose-300"
        style={{ width: PREVIEW_TARGET_WIDTH, height: previewHeight }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={previewRef}
      className="relative overflow-hidden bg-black/60"
      style={{ width: PREVIEW_TARGET_WIDTH, height: previewHeight }}
    >
      <div
        className={`absolute left-0 origin-top-left transition-opacity duration-150 ${
          activeIndex === 0 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: `scale(${scale})`, top: offsetY }}
      >
        <div ref={primaryContainerRef} />
      </div>
      <div
        className={`absolute left-0 origin-top-left transition-opacity duration-150 ${
          activeIndex === 1 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: `scale(${scale})`, top: offsetY }}
      >
        <div ref={secondaryContainerRef} />
      </div>
    </div>
  );
}
