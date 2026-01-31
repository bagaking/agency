import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  CircleOff,
  Landmark,
  Map as MapIcon,
  Terminal,
  X,
} from 'lucide-react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Tooltip } from '../ui/Tooltip.jsx';
import {
  isAgencyAvailable,
  onTerminalData,
  onTerminalError,
  startTerminal,
} from '../../services/agencyBridge.js';

const PREVIEW_FONT_STACK =
  'Menlo, Monaco, "SF Mono", "Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Courier New", monospace';
const PREVIEW_FONT_SIZE = 10;
const PREVIEW_SCROLLBACK = 800;
const PREVIEW_BG = '#0b0d12';
const PREVIEW_FG = '#e2e8f0';
const CARD_GAP = 10;
const CARD_MARGIN = 12;

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

function SessionMapTerminalPreview({ cell, session, isOffline }) {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) {
      return undefined;
    }
    const terminal = new XTerm({
      fontFamily: PREVIEW_FONT_STACK,
      fontSize: PREVIEW_FONT_SIZE,
      disableStdin: true,
      scrollback: PREVIEW_SCROLLBACK,
      cursorBlink: false,
      theme: {
        background: PREVIEW_BG,
        foreground: PREVIEW_FG,
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();
    terminalRef.current = terminal;
    fitRef.current = fitAddon;
    setReady(true);
    return () => {
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !terminalRef.current) {
      return;
    }
    terminalRef.current.reset();
  }, [ready, session?.id]);

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
    startTerminal({
        cellId: cell.id,
        sessionId: session.id,
        worktreePath: cell.worktreePath,
        mode: 'shell',
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || 'Preview unavailable.');
        }
      });
    const unsubscribe = onTerminalData?.((payload) => {
      if (payload?.cellId === cell.id && payload?.sessionId === session.id) {
        terminalRef.current?.write(payload.data);
      }
    });
    const unsubscribeError = onTerminalError?.((payload) => {
      if (payload?.cellId === cell.id && payload?.sessionId === session.id) {
        setError(payload.message || 'Preview unavailable.');
      }
    });
    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
      if (unsubscribeError) {
        unsubscribeError();
      }
    };
  }, [ready, cell?.id, cell?.worktreePath, isOffline, session?.id]);

  useEffect(() => {
    if (!ready || !containerRef.current || !fitRef.current) {
      return undefined;
    }
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      fitRef.current?.fit();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [ready]);

  if (isOffline) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border border-border/40 bg-black/40 text-[11px] text-muted-foreground">
        Offline session (closed / stale / archived)
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border border-border/40 bg-black/40 text-[11px] text-rose-300">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-24 w-full rounded-md border border-border/40 bg-black/60"
    />
  );
}

function SessionMapHoverCard({ anchorRect, data, onEnter, onLeave, onSelectSession }) {
  const cardRef = useRef(null);
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!anchorRect || !cardRef.current) {
      return;
    }
    const tooltipRect = cardRef.current.getBoundingClientRect();
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

  const content = (
    <div
      ref={cardRef}
      style={style || { left: -9999, top: -9999 }}
      className="fixed z-[999] w-[360px] rounded-xl border border-border/60 bg-popover/95 p-3 text-foreground shadow-xl backdrop-blur"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-semibold">
              {session.name || session.id}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {cell.name} · {data.typeLabel}
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            isOffline ? 'bg-slate-500/20 text-slate-200' : 'bg-emerald-500/15 text-emerald-200'
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Activity size={12} />
        <span>Last activity: {activityLabel}</span>
      </div>
      <button
        type="button"
        className="mt-3 w-full cursor-pointer rounded-lg border border-border/50 bg-background/60 p-2 text-left transition-colors hover:border-primary/40"
        onClick={() => onSelectSession(cell.id, session.id)}
      >
        <SessionMapTerminalPreview cell={cell} session={session} isOffline={isOffline} />
      </button>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Click preview to jump to this session.
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(content, document.body);
}

export function SessionMapOverlay({ open, model, onSelectSession, onClose }) {
  const [hovered, setHovered] = useState(null);
  const hoverLockRef = useRef(false);
  const clearTimerRef = useRef(null);

  const clearHover = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    clearTimerRef.current = null;
    setHovered(null);
  }, []);

  const scheduleClear = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    clearTimerRef.current = setTimeout(() => {
      if (!hoverLockRef.current) {
        setHovered(null);
      }
    }, 100);
  }, []);

  useEffect(() => () => clearHover(), [clearHover]);

  const handleTokenEnter = useCallback((event, payload) => {
    if (!event?.currentTarget) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    setHovered({ ...payload, anchorRect: rect });
  }, []);

  const handleTokenLeave = useCallback(() => {
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

  if (!open || !model) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-40 w-[min(980px,92vw)] -translate-x-1/2">
      <div className="pointer-events-auto rounded-2xl border border-border/60 bg-popover/90 px-4 py-3 shadow-2xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapIcon size={14} />
            <span>Agent Session Map</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Online {model.stats.online}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Offline {model.stats.offline}
            </span>
            <span>Cells {model.stats.cells}</span>
            <span>Sessions {model.stats.sessions}</span>
          </div>
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

        <div className="mt-3 grid max-h-[260px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {model.clusters.length ? (
            model.clusters.map((cluster) => {
              const headerFill = resolveFactionFill(cluster.color);
              return (
                <div
                  key={cluster.cell.id}
                  className={`rounded-xl border border-border/60 bg-card/40 p-3 ${
                    cluster.isOffline ? 'opacity-70' : ''
                  }`}
                  style={{ borderColor: cluster.color, backgroundColor: headerFill || undefined }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Landmark size={14} />
                      <span className="truncate">{cluster.cell.name}</span>
                    </div>
                    <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {cluster.typeLabel}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {cluster.sessions.length ? (
                      cluster.sessions.map((session) => {
                        const statusColor = resolveStatusColor(session.status, session.isOffline);
                        return (
                          <button
                            key={session.id}
                            type="button"
                            className={`group relative flex h-10 w-10 items-center justify-center rounded-full border text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                              session.isActive
                                ? 'border-primary/80 bg-primary/15'
                                : 'border-border/60 bg-black/20 hover:border-primary/50'
                            } ${session.isOffline ? 'opacity-60' : ''}`}
                            onClick={() => onSelectSession(cluster.cell.id, session.id)}
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
                              handleTokenEnter(event, {
                                cell: cluster.cell,
                                session,
                                color: cluster.color,
                                typeLabel: cluster.typeLabel,
                              })
                            }
                            onBlur={handleTokenLeave}
                            aria-label={`Session ${session.name || session.id}`}
                          >
                            <Terminal size={14} className="text-current" />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-popover ${statusColor}`}
                            />
                          </button>
                        );
                      })
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

      {hovered ? (
        <SessionMapHoverCard
          anchorRect={hovered.anchorRect}
          data={hovered}
          onEnter={handleCardEnter}
          onLeave={handleCardLeave}
          onSelectSession={onSelectSession}
        />
      ) : null}
    </div>
  );
}
