export const RESIZE_ACTIVITY_SUPPRESS_MS = 1500;

export function shouldSkipTerminalResize({
  isActive,
  isVisible,
}: {
  isActive: boolean;
  isVisible: boolean;
}): boolean {
  return !isActive || !isVisible;
}

export function markSyntheticActivityWindow(
  activitySuppressUntilRef: { current?: number } | null | undefined,
  durationMs: number,
  now = Date.now()
) {
  if (!activitySuppressUntilRef) {
    return;
  }
  activitySuppressUntilRef.current = Math.max(
    Number(activitySuppressUntilRef.current || 0),
    now + durationMs
  );
}

export const attachTerminalResizeController = ({
  cellId,
  sessionId,
  mode,
  containerRef,
  terminalRef,
  fitRef,
  lastOutputAtRef,
  lastResizeRef,
  deferredResizeRef,
  resizeLogRef,
  resizeAttemptsRef,
  resizeHandlerRef,
  focusHandlerRef,
  isActiveRef,
  isVisibleRef,
  activitySuppressUntilRef,
  resizeTerminal,
  logRuntime,
}: any) => {
  let resizeFrame: number | null = null;
  const MIN_COLS = 20;
  const MIN_ROWS = 5;
  const OUTPUT_SUPPRESS_MS = 220;
  const LOG_THROTTLE_MS = 1200;

  const logResizeSkip = (reason: string, meta: Record<string, unknown>) => {
    const now = Date.now();
    const last = resizeLogRef.current[reason] || 0;
    if (now - last < LOG_THROTTLE_MS) {
      return;
    }
    resizeLogRef.current[reason] = now;
    logRuntime({
      level: 'warn',
      message: `terminal resize skipped: ${reason}`,
      meta: {
        cellId,
        sessionId,
        mode,
        ...meta,
      },
    });
  };

  const scheduleDeferredResize = (delay: number, reason: string) => {
    if (resizeAttemptsRef.current >= 6) {
      return;
    }
    resizeAttemptsRef.current += 1;
    if (deferredResizeRef.current) {
      return;
    }
    deferredResizeRef.current = setTimeout(() => {
      deferredResizeRef.current = null;
      scheduleResize(true, reason);
    }, delay);
  };

  const scheduleResize = (force = false, reason = 'auto') => {
    if (!terminalRef.current || !fitRef.current || !containerRef.current) {
      return;
    }
    const now = Date.now();
    if (
      shouldSkipTerminalResize({
        isActive: Boolean(isActiveRef.current),
        isVisible: Boolean(isVisibleRef?.current),
      })
    ) {
      logResizeSkip('inactive-or-hidden', { reason });
      return;
    }
    if (!force && now - lastOutputAtRef.current < OUTPUT_SUPPRESS_MS) {
      logResizeSkip('output-throttle', { reason });
      scheduleDeferredResize(250, 'deferred-output');
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (!width || !height) {
      logResizeSkip('zero-dimensions', { width, height, reason });
      scheduleDeferredResize(120, 'deferred-zero');
      return;
    }
    if (!force && width === lastResizeRef.current.width && height === lastResizeRef.current.height) {
      return;
    }
    const proposed = fitRef.current.proposeDimensions?.();
    if (!proposed || !proposed.cols || !proposed.rows) {
      logResizeSkip('missing-dimensions', { width, height, reason });
      scheduleDeferredResize(140, 'deferred-missing');
      return;
    }
    if (proposed.cols < MIN_COLS || proposed.rows < MIN_ROWS) {
      logResizeSkip('below-minimum', {
        width,
        height,
        cols: proposed.cols,
        rows: proposed.rows,
        reason,
      });
      return;
    }
    if (resizeFrame) {
      cancelAnimationFrame(resizeFrame);
    }
    markSyntheticActivityWindow(
      activitySuppressUntilRef,
      RESIZE_ACTIVITY_SUPPRESS_MS,
      now
    );
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      if (!terminalRef.current || !fitRef.current || !containerRef.current) {
        return;
      }
      fitRef.current.fit();
      const { cols, rows } = terminalRef.current;
      if (cols < MIN_COLS || rows < MIN_ROWS) {
        logResizeSkip('below-minimum', { cols, rows, reason });
        return;
      }
      if (!force && cols === lastResizeRef.current.cols && rows === lastResizeRef.current.rows) {
        lastResizeRef.current = { width, height, cols, rows };
        return;
      }
      resizeAttemptsRef.current = 0;
      lastResizeRef.current = { width, height, cols, rows };
      resizeTerminal({
        cellId,
        sessionId,
        cols,
        rows,
      });
    });
  };

  const canAutoFocusTerminal = () => {
    if (!isActiveRef.current || !isVisibleRef?.current || !terminalRef.current || !containerRef.current) {
      return false;
    }
    const computedStyle = window.getComputedStyle(containerRef.current);
    if (computedStyle.visibility === 'hidden') {
      return false;
    }
    const activeElement = document.activeElement as HTMLElement | null;
    if (!activeElement || activeElement === document.body) {
      return true;
    }
    if (containerRef.current.contains(activeElement)) {
      return true;
    }
    // Avoid background terminals stealing focus from another active terminal/input.
    return false;
  };

  resizeHandlerRef.current = scheduleResize;
  focusHandlerRef.current = () => {
    if (!canAutoFocusTerminal()) {
      return;
    }
    terminalRef.current?.focus();
  };

  const resizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => scheduleResize(false, 'resize-observer'))
      : null;
  if (resizeObserver && containerRef.current) {
    resizeObserver.observe(containerRef.current);
  }

  scheduleResize(true, 'init');
  if (document.fonts?.ready) {
    document.fonts.ready
      .then(() => scheduleResize(true, 'fonts-ready'))
      .catch(() => {});
  }
  if (canAutoFocusTerminal()) {
    terminalRef.current?.focus();
  }

  const handleWindowResize = () => scheduleResize(false, 'window-resize');
  window.addEventListener('resize', handleWindowResize);

  return () => {
    window.removeEventListener('resize', handleWindowResize);
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (resizeFrame) {
      cancelAnimationFrame(resizeFrame);
    }
    if (deferredResizeRef.current) {
      clearTimeout(deferredResizeRef.current);
      deferredResizeRef.current = null;
    }
  };
};
