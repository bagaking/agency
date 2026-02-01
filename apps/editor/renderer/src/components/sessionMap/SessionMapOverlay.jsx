import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, CircleOff, Landmark, Map as MapIcon, MoreHorizontal, X } from 'lucide-react';
import { Terminal as XTerm } from '@xterm/xterm';
import { Tooltip } from '../ui/Tooltip.jsx';
import { getSessionMapPreview, isAgencyAvailable } from '../../services/agencyBridge.js';
import { getTerminalSnapshot } from '../../terminal/terminalManager.js';
import { AgentAvatar } from '../ui/AgentAvatar.jsx';
import { resolveAvatarId } from '../../utils/agentAvatar.js';

const PREVIEW_FONT_STACK =
  'Menlo, Monaco, "SF Mono", "Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Courier New", monospace';
const PREVIEW_FONT_SIZE = 13;
const PREVIEW_COLS = 120;
const PREVIEW_ROWS = 30;
const PREVIEW_TARGET_WIDTH = 320;
const PREVIEW_MAX_HEIGHT = Math.round(PREVIEW_TARGET_WIDTH * 1.618);
const PREVIEW_MIN_HEIGHT = Math.round(PREVIEW_TARGET_WIDTH * 0.55);
const PREVIEW_SCROLLBACK = 800;
const PREVIEW_BG = '#0b0d12';
const PREVIEW_FG = '#e2e8f0';
const PREVIEW_LINES = 90;
const PREVIEW_REFRESH_MS = 900;
const CARD_GAP = 10;
const CARD_MARGIN = 12;
const HOVER_OPEN_DELAY = 140;
const HOVER_CLOSE_DELAY = 120;
const ROW_TOP_TOLERANCE = 6;

const formatRelativeTime = (timestamp) => {
  if (!timestamp) {
    return '—';
  }
  const delta = Date.now() - timestamp;
  if (delta < 0) {
    return 'just now';
  }
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const resolveStatusColor = (status, offline) => {
  if (offline) {
    return 'bg-slate-400';
  }
  if (status === 'active') {
    return 'bg-emerald-400';
  }
  if (status === 'detached') {
    return 'bg-amber-400';
  }
  return 'bg-slate-400';
};

const resolveFactionFill = (color, alpha = 0.18) => {
  if (!color) {
    return '';
  }
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const hex = color.length === 4
      ? color
          .slice(1)
          .split('')
          .map((char) => char + char)
          .join('')
      : color.slice(1);
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].every((value) => Number.isFinite(value))) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return color;
};

const resolveOfflineReason = (session, cell) => {
  if (cell?.state === 'archived') {
    return 'Cell archived';
  }
  if (cell?.state === 'closed') {
    return 'Cell closed';
  }
  if (session?.status === 'closed') {
    return 'Session closed';
  }
  if (session?.status === 'stale') {
    return 'Session stale';
  }
  if (session?.status === 'archived') {
    return 'Session archived';
  }
  return 'Offline';
};


export function SessionMapToggle({ open, stats, onToggle, disabled }) {
  const summary = stats
    ? `Cells ${stats.cells} · Sessions ${stats.sessions} · Online ${stats.online} · Offline ${stats.offline}`
    : 'Session map';
  return (
    <Tooltip label={summary} side="top">
      <button
        type="button"
        className={`flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : open
              ? 'bg-primary/20 text-primary'
              : 'bg-white/5 text-status-bar-foreground hover:bg-white/10'
        }`}
        onClick={disabled ? undefined : onToggle}
        aria-pressed={open}
        aria-label={open ? 'Close session map' : 'Open session map'}
        disabled={disabled}
        data-session-map-toggle="true"
      >
        <MapIcon size={14} />
        <span>Session Map</span>
        {stats ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-status-bar-foreground/80">
            <span>{stats.cells}C</span>
            <span>•</span>
            <span>{stats.sessions}S</span>
            <span className="flex items-center gap-1 pl-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{stats.online}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>{stats.offline}</span>
            </span>
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}

function SessionMapTerminalPreview({ cell, session, isOffline, fontSize }) {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState(PREVIEW_MAX_HEIGHT);
  const lastSnapshotRef = useRef('');
  const lastSizeRef = useRef({ cols: PREVIEW_COLS, rows: PREVIEW_ROWS });
  const lastUserScrollRef = useRef(0);

  const measureScale = useCallback(() => {
    if (!containerRef.current) {
      return;
    }
    const screen = containerRef.current.querySelector('.xterm-screen');
    if (!screen) {
      return;
    }
    const width = screen.offsetWidth;
    const height = screen.offsetHeight;
    if (!width || !height) {
      return;
    }
    const nextScale = Math.min(
      1,
      Math.max(PREVIEW_TARGET_WIDTH / width, PREVIEW_MAX_HEIGHT / height)
    );
    setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    const measuredHeight = Math.round(height * nextScale);
    const nextHeight = Math.min(PREVIEW_MAX_HEIGHT, Math.max(PREVIEW_MIN_HEIGHT, measuredHeight));
    setPreviewHeight(nextHeight);
  }, []);

  const applyPreviewSize = useCallback(
    (cols, rows) => {
      if (!terminalRef.current) {
        return;
      }
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
      terminalRef.current.resize(clampedCols, clampedRows);
      requestAnimationFrame(() => {
        measureScale();
      });
    },
    [measureScale]
  );

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) {
      return undefined;
    }
    const terminal = new XTerm({
      fontFamily: PREVIEW_FONT_STACK,
      fontSize: Number.isFinite(fontSize) && fontSize > 0 ? fontSize : PREVIEW_FONT_SIZE,
      disableStdin: true,
      scrollback: PREVIEW_SCROLLBACK,
      cursorBlink: false,
      cols: lastSizeRef.current.cols,
      rows: lastSizeRef.current.rows,
      theme: {
        background: PREVIEW_BG,
        foreground: PREVIEW_FG,
      },
    });
    terminal.open(containerRef.current);
    terminal.resize(lastSizeRef.current.cols, lastSizeRef.current.rows);
    terminalRef.current = terminal;
    setReady(true);
    requestAnimationFrame(() => {
      measureScale();
    });
    return () => {
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [measureScale]);

  const handleWheel = useCallback(
    (event) => {
      const terminal = terminalRef.current;
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
    },
    []
  );

  useEffect(() => {
    if (!ready || !terminalRef.current) {
      return;
    }
    const nextFontSize =
      Number.isFinite(fontSize) && fontSize > 0 ? fontSize : PREVIEW_FONT_SIZE;
    if (terminalRef.current.options.fontSize !== nextFontSize) {
      terminalRef.current.options.fontSize = nextFontSize;
      terminalRef.current.refresh(0, terminalRef.current.rows - 1);
      requestAnimationFrame(() => {
        measureScale();
      });
    }
  }, [fontSize, measureScale, ready]);

  useEffect(() => {
    if (!ready || !terminalRef.current) {
      return;
    }
    lastSizeRef.current = { cols: PREVIEW_COLS, rows: PREVIEW_ROWS };
    terminalRef.current.resize(PREVIEW_COLS, PREVIEW_ROWS);
    requestAnimationFrame(() => {
      measureScale();
    });
    terminalRef.current.reset();
    lastSnapshotRef.current = '';
  }, [measureScale, ready, session?.id]);

  useEffect(() => {
    if (!ready || !cell || !session || isOffline) {
      return undefined;
    }
    if (!isAgencyAvailable()) {
      setError('Preview unavailable (IPC missing).');
      return undefined;
    }
    let active = true;
    setError('');
    const refreshPreview = async () => {
      try {
        const terminalInstance = terminalRef.current;
        const buffer = terminalInstance?.buffer?.active;
        const isScrolled =
          buffer && Number.isFinite(buffer.viewportY) && Number.isFinite(buffer.baseY)
            ? buffer.viewportY < buffer.baseY
            : false;
        if (isScrolled || Date.now() - lastUserScrollRef.current < 1200) {
          return;
        }
        const localSnapshot = getTerminalSnapshot({
          cellId: cell.id,
          sessionId: session.id,
          lines: PREVIEW_LINES,
        });
        if (localSnapshot?.data) {
          applyPreviewSize(localSnapshot.cols, localSnapshot.rows);
          if (lastSnapshotRef.current !== localSnapshot.data) {
            lastSnapshotRef.current = localSnapshot.data;
            terminalRef.current?.reset();
            terminalRef.current?.write(localSnapshot.data);
          }
          return;
        }
        const result = await getSessionMapPreview({
          worktreePath: cell.worktreePath,
          sessionId: session.id,
          lines: PREVIEW_LINES,
        });
        if (!active) {
          return;
        }
        applyPreviewSize(result?.cols, result?.rows);
        const nextData = result?.data || '';
        if (!nextData) {
          return;
        }
        if (lastSnapshotRef.current === nextData) {
          return;
        }
        lastSnapshotRef.current = nextData;
        terminalRef.current?.reset();
        terminalRef.current?.write(nextData);
      } catch (err) {
        if (active) {
          setError(err?.message || 'Preview unavailable.');
        }
      }
    };
    refreshPreview();
    const interval = setInterval(refreshPreview, PREVIEW_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [applyPreviewSize, ready, cell?.id, cell?.worktreePath, isOffline, session?.id]);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    const handle = () => measureScale();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [measureScale, ready]);

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
      className="relative overflow-hidden bg-black/60"
      onWheel={handleWheel}
      style={{ width: PREVIEW_TARGET_WIDTH, height: previewHeight }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
        <div ref={containerRef} />
      </div>
    </div>
  );
}

function SessionMapHoverCard({
  anchorRect,
  data,
  onEnter,
  onLeave,
  onSelectSession,
  cardRef,
  resolveFontSize,
}) {
  const localRef = useRef(null);
  const resolvedRef = cardRef || localRef;
  const [style, setStyle] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hint, setHint] = useState({ x: 0, y: 0, visible: false });

  useLayoutEffect(() => {
    if (!anchorRect || !resolvedRef.current) {
      return;
    }
    const tooltipRect = resolvedRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const fits = {
      top: anchorRect.top >= tooltipRect.height + CARD_GAP,
      bottom: viewportHeight - anchorRect.bottom >= tooltipRect.height + CARD_GAP,
      right: viewportWidth - anchorRect.right >= tooltipRect.width + CARD_GAP,
      left: anchorRect.left >= tooltipRect.width + CARD_GAP,
    };
    const order = ['top', 'bottom', 'right', 'left'];
    const placement = order.find((candidate) => fits[candidate]) || 'bottom';

    let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
    let top = anchorRect.bottom + CARD_GAP;
    if (placement === 'top') {
      top = anchorRect.top - tooltipRect.height - CARD_GAP;
    } else if (placement === 'right') {
      left = anchorRect.right + CARD_GAP;
      top = anchorRect.top + anchorRect.height / 2 - tooltipRect.height / 2;
    } else if (placement === 'left') {
      left = anchorRect.left - tooltipRect.width - CARD_GAP;
      top = anchorRect.top + anchorRect.height / 2 - tooltipRect.height / 2;
    }

    const boundedLeft = Math.max(CARD_MARGIN, Math.min(left, viewportWidth - tooltipRect.width - CARD_MARGIN));
    const boundedTop = Math.max(CARD_MARGIN, Math.min(top, viewportHeight - tooltipRect.height - CARD_MARGIN));
    setStyle({ left: boundedLeft, top: boundedTop });
  }, [anchorRect, data?.session?.id]);

  useEffect(() => {
    if (!anchorRect) {
      return undefined;
    }
    const handle = () => {
      if (cardRef.current) {
        setStyle(null);
      }
    };
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [anchorRect]);

  if (!data || !anchorRect) {
    return null;
  }

  const { cell, session, color } = data;
  const isOffline = session.isOffline;
  const statusLabel = session.status || 'unknown';
  const activityLabel = session.lastActivityAt ? formatRelativeTime(session.lastActivityAt) : '—';
  const offlineReason = isOffline ? resolveOfflineReason(session, cell) : '';
  const infoLabel = isOffline ? offlineReason : statusLabel.toUpperCase();

  const content = (
    <div
      ref={resolvedRef}
      data-session-map-hover-card="true"
      style={{ ...(style || { left: -9999, top: -9999 }), width: PREVIEW_TARGET_WIDTH }}
      className={`fixed z-[999] overflow-hidden rounded-xl border bg-popover/95 text-foreground shadow-xl backdrop-blur transition-shadow ${
        isHovered ? 'border-primary/60 shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_12px_40px_rgba(15,23,42,0.5)]' : 'border-border/60'
      }`}
      onMouseEnter={(event) => {
        setIsHovered(true);
        onEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setIsHovered(false);
        setHint((current) => ({ ...current, visible: false }));
        onLeave?.(event);
      }}
      onFocus={(event) => {
        setIsHovered(true);
        onEnter?.(event);
      }}
      onBlur={(event) => {
        setIsHovered(false);
        setHint((current) => ({ ...current, visible: false }));
        onLeave?.(event);
      }}
    >
      <button
        type="button"
        className="relative flex w-full cursor-pointer overflow-hidden bg-transparent text-left transition-colors hover:ring-1 hover:ring-primary/40"
        onClick={() => onSelectSession(cell.id, session.id)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setHint({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            visible: true,
          });
        }}
        onMouseLeave={() => setHint((current) => ({ ...current, visible: false }))}
      >
        <SessionMapTerminalPreview
          cell={cell}
          session={session}
          isOffline={isOffline}
          fontSize={resolveFontSize ? resolveFontSize(cell.id, session.id) : undefined}
        />
        {hint.visible ? (
          <div
            className="pointer-events-none absolute z-10 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[9px] text-white shadow"
            style={{ left: Math.min(hint.x + 12, PREVIEW_TARGET_WIDTH - 80), top: Math.max(8, hint.y - 18) }}
          >
            点击访问
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/55 px-2 py-1 text-[9px] text-slate-100 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate">{session.name || session.id}</span>
            <span className="text-slate-300">·</span>
            <span className="uppercase tracking-wide text-slate-200">{infoLabel}</span>
            <span className="ml-auto whitespace-nowrap text-slate-300">
              {activityLabel}
            </span>
          </div>
        </div>
      </button>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(content, document.body);
}

function SessionMapOfflineMenu({ isOpen, position, containerRef, sessions, cellId, onSelectSession }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-[70] w-56 rounded-lg border border-border bg-popover py-1 text-[11px] shadow-xl pointer-events-auto"
      style={{ top: position.y, left: position.x }}
    >
      <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
        Offline Sessions
      </div>
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => onSelectSession(cellId, session.id)}
          className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span className="truncate">{session.name || session.id}</span>
          <span className="text-[10px] uppercase text-muted-foreground/70">
            {session.status || 'offline'}
          </span>
        </button>
      ))}
    </div>
  );
}

export function SessionMapOverlay({
  open,
  model,
  onSelectSession,
  onClose,
  resolveFontSize,
  mode = 'popover',
}) {
  const [hovered, setHovered] = useState(null);
  const [offlineMenu, setOfflineMenu] = useState(null);
  const [dockExpanded, setDockExpanded] = useState(false);
  const hoverLockRef = useRef(false);
  const clearTimerRef = useRef(null);
  const openTimerRef = useRef(null);
  const overlayRef = useRef(null);
  const hoverCardRef = useRef(null);
  const offlineMenuRef = useRef(null);
  const isDocked = mode === 'dock';

  const clearHover = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
    }
    clearTimerRef.current = null;
    openTimerRef.current = null;
    setHovered(null);
  }, []);

  const scheduleClear = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    clearTimerRef.current = setTimeout(() => {
      if (!hoverLockRef.current) {
        setHovered(null);
      }
    }, HOVER_CLOSE_DELAY);
  }, []);

  useEffect(() => () => clearHover(), [clearHover]);
  useEffect(() => {
    if (!open) {
      setOfflineMenu(null);
      setDockExpanded(false);
    }
  }, [open]);

  useEffect(() => {
    if (!offlineMenu) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (offlineMenuRef.current?.contains(event.target)) {
        return;
      }
      if (event.target.closest?.('[data-session-map-offline-trigger="true"]')) {
        return;
      }
      setOfflineMenu(null);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [offlineMenu]);

  const handleTokenEnter = useCallback((event, payload, { immediate = false } = {}) => {
    if (!event?.currentTarget) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
    }
    const next = { ...payload, anchorRect: rect };
    if (immediate) {
      setHovered(next);
      return;
    }
    openTimerRef.current = setTimeout(() => {
      setHovered(next);
      openTimerRef.current = null;
    }, HOVER_OPEN_DELAY);
  }, []);

  const handleTokenLeave = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (!hoverLockRef.current) {
      scheduleClear();
    }
  }, [scheduleClear]);

  const handleCardEnter = useCallback(() => {
    hoverLockRef.current = true;
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
  }, []);

  const handleCardLeave = useCallback(() => {
    hoverLockRef.current = false;
    clearHover();
  }, [clearHover]);

  const handleSelectAndClose = useCallback(
    (cellId, sessionId) => {
      onSelectSession?.(cellId, sessionId);
      onClose?.();
    },
    [onClose, onSelectSession]
  );

  useEffect(() => {
    if (!open || !onClose || isDocked) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      const target = event.target;
      if (overlayRef.current?.contains(target)) {
        return;
      }
      if (hoverCardRef.current?.contains(target)) {
        return;
      }
      if (target?.closest?.('[data-session-map-toggle="true"]')) {
        return;
      }
      onClose();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isDocked, onClose, open]);

  useEffect(() => {
    if (!open || !onClose) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        return;
      }
      const activeElement = document.activeElement;
      if (
        !overlayRef.current?.contains(activeElement) &&
        !hoverCardRef.current?.contains(activeElement)
      ) {
        return;
      }
      const container = overlayRef.current;
      if (!container) {
        return;
      }
      const tokens = Array.from(container.querySelectorAll('[data-session-token="true"]'));
      if (!tokens.length) {
        return;
      }
      const activeIndex = tokens.indexOf(document.activeElement);
      if (event.key === 'Home') {
        event.preventDefault();
        tokens[0]?.focus();
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        tokens[tokens.length - 1]?.focus();
        return;
      }
      const resolvedIndex = activeIndex === -1 ? 0 : activeIndex;
      const rects = tokens.map((node) => ({
        node,
        rect: node.getBoundingClientRect(),
      }));
      const rows = [];
      rects.forEach((item) => {
        const top = Math.round(item.rect.top);
        const existing = rows.find((row) => Math.abs(row.top - top) <= ROW_TOP_TOLERANCE);
        if (existing) {
          existing.items.push(item);
        } else {
          rows.push({ top, items: [item] });
        }
      });
      rows.sort((a, b) => a.top - b.top);
      rows.forEach((row) => row.items.sort((a, b) => a.rect.left - b.rect.left));

      const activeNode = tokens[resolvedIndex];
      const activeRect = rects[resolvedIndex]?.rect;
      const rowIndex = rows.findIndex((row) => row.items.some((item) => item.node === activeNode));
      const currentRow = rowIndex >= 0 ? rows[rowIndex] : null;

      const focusNode = (node) => {
        if (node?.focus) {
          node.focus();
        }
      };

      const moveHorizontal = (delta) => {
        const nextIndex = Math.max(0, Math.min(tokens.length - 1, resolvedIndex + delta));
        focusNode(tokens[nextIndex]);
      };

      const moveVertical = (deltaRow) => {
        if (!currentRow || !activeRect) {
          moveHorizontal(deltaRow > 0 ? 1 : -1);
          return;
        }
        const targetRow = rows[rowIndex + deltaRow];
        if (!targetRow) {
          return;
        }
        const targetX = activeRect.left + activeRect.width / 2;
        let closest = targetRow.items[0];
        let minDelta = Math.abs(closest.rect.left + closest.rect.width / 2 - targetX);
        targetRow.items.forEach((item) => {
          const center = item.rect.left + item.rect.width / 2;
          const delta = Math.abs(center - targetX);
          if (delta < minDelta) {
            minDelta = delta;
            closest = item;
          }
        });
        focusNode(closest?.node);
      };

      event.preventDefault();
      if (event.key === 'ArrowLeft') {
        moveHorizontal(-1);
      } else if (event.key === 'ArrowRight') {
        moveHorizontal(1);
      } else if (event.key === 'ArrowUp') {
        moveVertical(-1);
      } else if (event.key === 'ArrowDown') {
        moveVertical(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open || !model) {
    return null;
  }

  const dockHeightStyle = isDocked
    ? {
        height: dockExpanded ? 'calc(100vh - 24px)' : '40vh',
        minHeight: dockExpanded ? '480px' : '240px',
        maxHeight: dockExpanded ? 'calc(100vh - 24px)' : '460px',
      }
    : undefined;

  return (
    <div
      className={`${
        isDocked
          ? 'relative z-40 w-full'
          : 'pointer-events-none absolute bottom-6 left-1/2 z-40 w-[min(980px,92vw)] -translate-x-1/2'
      }`}
      style={dockHeightStyle}
      role="dialog"
      aria-label="Session map"
    >
      <div
        ref={overlayRef}
        className={`pointer-events-auto border border-border/60 bg-popover/90 px-3 py-2 shadow-2xl backdrop-blur ${
          isDocked ? 'flex h-full flex-col rounded-none border-x-0 border-b-0' : 'rounded-2xl'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapIcon size={14} />
            <span>Agent Session Map</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Online {model.stats.online}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Offline {model.stats.offline}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Detached
            </span>
            <span>Cells {model.stats.cells}</span>
            <span>Sessions {model.stats.sessions}</span>
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground/70">
              Esc to close
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isDocked ? (
              <button
                type="button"
                className="flex h-6 items-center gap-1 rounded-full border border-border/50 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                onClick={() => setDockExpanded((value) => !value)}
                aria-pressed={dockExpanded}
                aria-label={dockExpanded ? 'Collapse session map' : 'Expand session map'}
              >
                {dockExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                <span>{dockExpanded ? 'Collapse' : 'Expand'}</span>
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                aria-label="Close session map"
                onClick={onClose}
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={`mt-2 grid gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3 ${
            isDocked ? 'flex-1 min-h-0' : 'max-h-[260px]'
          }`}
        >
          {model.clusters.length ? (
            model.clusters.map((cluster) => {
              const headerFill = resolveFactionFill(cluster.color);
              return (
                <div
                  key={cluster.cell.id}
                  className={`rounded-xl border border-border/60 bg-card/40 p-2 ${
                    cluster.isOffline ? 'opacity-70' : ''
                  }`}
                  style={{ borderColor: cluster.color, backgroundColor: headerFill || undefined }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[12px] font-semibold">
                      <Landmark size={14} />
                      <span className="truncate">{cluster.cell.name}</span>
                    </div>
                    <span className="rounded-full bg-black/30 px-2 py-0.5 text-[9px] text-muted-foreground">
                      {cluster.typeLabel}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {cluster.sessions.length ? (
                      (() => {
                        const activeSessions = cluster.sessions.filter((session) => !session.isOffline);
                        const offlineSessions = cluster.sessions.filter((session) => session.isOffline);
                        const hasActive = activeSessions.length > 0;
                        return (
                          <>
                            {hasActive ? (
                              activeSessions.map((session) => {
                                const statusColor = resolveStatusColor(session.status, session.isOffline);
                                const avatarId = resolveAvatarId({
                                  avatar: session.avatar || cluster.cell.avatar,
                                  id: session.id,
                                  name: session.name,
                                });
                                return (
                                  <button
                                    key={session.id}
                                    type="button"
                                    className={`group relative flex h-10 w-10 items-center justify-center rounded-full border text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                                      session.isActive
                                        ? 'border-primary/80 bg-primary/15'
                                        : 'border-border/60 bg-black/20 hover:border-primary/50'
                                    } ${session.isOffline ? 'opacity-60' : ''}`}
                            onClick={() => handleSelectAndClose(cluster.cell.id, session.id)}
                                    onMouseEnter={(event) =>
                                      handleTokenEnter(event, {
                                        cell: cluster.cell,
                                        session,
                                        color: cluster.color,
                                        typeLabel: cluster.typeLabel,
                                      })
                                    }
                                    onMouseLeave={handleTokenLeave}
                                    onFocus={(event) =>
                                      handleTokenEnter(
                                        event,
                                        {
                                          cell: cluster.cell,
                                          session,
                                          color: cluster.color,
                                          typeLabel: cluster.typeLabel,
                                        },
                                        { immediate: true }
                                      )
                                    }
                                    onBlur={handleTokenLeave}
                                    aria-label={`Session ${session.name || session.id}`}
                                    data-session-token="true"
                                  >
                                    <AgentAvatar avatarId={avatarId} size={18} />
                                    <span
                                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-popover ${statusColor}`}
                                    />
                                  </button>
                                );
                              })
                            ) : (
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <CircleOff size={12} />
                                <span>No active sessions</span>
                              </div>
                            )}
                            {offlineSessions.length ? (
                              <button
                                type="button"
                                data-session-map-offline-trigger="true"
                                className="flex h-10 items-center gap-1 rounded-full border border-dashed border-border/60 bg-black/20 px-2 text-[10px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                                onClick={(event) => {
                                  const rect = event.currentTarget.getBoundingClientRect();
                                  setOfflineMenu((current) =>
                                    current?.cellId === cluster.cell.id
                                      ? null
                                      : {
                                          cellId: cluster.cell.id,
                                          sessions: offlineSessions,
                                          x: rect.left,
                                          y: rect.bottom + 6,
                                        }
                                  );
                                }}
                                aria-label={`Show ${offlineSessions.length} offline sessions`}
                              >
                                <MoreHorizontal size={12} />
                                <span>{offlineSessions.length}</span>
                              </button>
                            ) : null}
                          </>
                        );
                      })()
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <CircleOff size={12} />
                        <span>No sessions yet</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-border/60 bg-card/20 p-6 text-center text-sm text-muted-foreground">
              No cells available yet. Create a Cell to populate the session map.
            </div>
          )}
        </div>
      </div>

      <SessionMapOfflineMenu
        isOpen={Boolean(offlineMenu)}
        position={offlineMenu ? { x: offlineMenu.x, y: offlineMenu.y } : { x: 0, y: 0 }}
        containerRef={offlineMenuRef}
        sessions={offlineMenu?.sessions || []}
        cellId={offlineMenu?.cellId}
        onSelectSession={(cellId, sessionId) => {
          setOfflineMenu(null);
          handleSelectAndClose(cellId, sessionId);
        }}
      />

      {hovered ? (
        <SessionMapHoverCard
          anchorRect={hovered.anchorRect}
          data={hovered}
          onEnter={handleCardEnter}
          onLeave={handleCardLeave}
          onSelectSession={handleSelectAndClose}
          cardRef={hoverCardRef}
          resolveFontSize={resolveFontSize}
        />
      ) : null}
    </div>
  );
}
