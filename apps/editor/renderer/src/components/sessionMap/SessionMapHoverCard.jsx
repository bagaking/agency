import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { SessionMapTerminalPreview } from './SessionMapTerminalPreview.jsx';
import { formatRelativeTime } from '../../utils/timeFormat';
import { resolveOfflineReason } from './sessionMapUtils';
import { DEBUG_FLAGS, getDebugFlag } from '../../utils/debugFlags';
import { PreviewLoading } from '../ui/PreviewLoading.jsx';
import {
  CARD_GAP,
  CARD_MARGIN,
  HOVER_INFO_HEIGHT,
  PREVIEW_MAX_HEIGHT,
  PREVIEW_MIN_HEIGHT,
  PREVIEW_TARGET_WIDTH,
} from './sessionMapConstants';

export function SessionMapHoverCard({
  anchorRect,
  anchorEl,
  data,
  isOpen = false,
  onEnter,
  onLeave,
  onSelectSession,
  onRenameSession,
  onOpenAvatarMenu,
  cardRef,
  resolveFontSize,
}) {
  const localRef = useRef(null);
  const resolvedRef = cardRef || localRef;
  const [style, setStyle] = useState(null);
  const [hasPosition, setHasPosition] = useState(false);
  const [maxPreviewHeight, setMaxPreviewHeight] = useState(PREVIEW_MAX_HEIGHT);
  const [placementState, setPlacementState] = useState('bottom');
  const [isHovered, setIsHovered] = useState(false);
  const [hint, setHint] = useState({ x: 0, y: 0, visible: false });
  const [layoutTick, setLayoutTick] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [pendingPreview, setPendingPreview] = useState(false);
  const hasPreviewRef = useRef(false);
  const [metricsReady, setMetricsReady] = useState(false);
  const [previewHeight, setPreviewHeight] = useState(PREVIEW_MIN_HEIGHT);
  const placementRef = useRef(null);
  const lastDebugRef = useRef('');
  const lastMetricsKeyRef = useRef(null);
  const pendingMetricsRef = useRef(null);
  const heightLockedRef = useRef(false);
  const heightCacheRef = useRef(new Map());
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);

  const resolveAnchorRect = useCallback(() => {
    if (anchorEl?.getBoundingClientRect) {
      return anchorEl.getBoundingClientRect();
    }
    return anchorRect;
  }, [anchorEl, anchorRect]);

  const isDebugEnabled = useCallback(() => getDebugFlag(DEBUG_FLAGS.sessionMapPreview), []);
  const logDebug = useCallback(
    (label, payload = {}) => {
      if (!isDebugEnabled()) {
        return;
      }
      console.log(`[SessionMapHoverCard] ${label}`, payload);
    },
    [isDebugEnabled]
  );

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    const nextAnchor = resolveAnchorRect();
    if (!nextAnchor) {
      return;
    }
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const totalMinHeight = PREVIEW_MIN_HEIGHT + HOVER_INFO_HEIGHT;
    const spaces = {
      top: nextAnchor.top - CARD_GAP - CARD_MARGIN,
      bottom: viewportHeight - nextAnchor.bottom - CARD_GAP - CARD_MARGIN,
      left: nextAnchor.left - CARD_GAP - CARD_MARGIN,
      right: viewportWidth - nextAnchor.right - CARD_GAP - CARD_MARGIN,
    };
    const pickPlacement = () => {
      if (spaces.top >= totalMinHeight) return 'top';
      if (spaces.bottom >= totalMinHeight) return 'bottom';
      if (spaces.right >= PREVIEW_TARGET_WIDTH + CARD_GAP) return 'right';
      if (spaces.left >= PREVIEW_TARGET_WIDTH + CARD_GAP) return 'left';
      return spaces.top >= spaces.bottom ? 'top' : 'bottom';
    };
    let placement = placementRef.current;
    const placementSpace =
      placement === 'top'
        ? spaces.top
        : placement === 'bottom'
          ? spaces.bottom
          : viewportHeight - CARD_MARGIN * 2;
    const needsFlip = !placement || placementSpace < totalMinHeight * 0.65;
    if (needsFlip) {
      placement = pickPlacement();
      placementRef.current = placement;
    }
    if (placementState !== placement) {
      setPlacementState(placement);
    }
    const nextMaxPreviewHeight = Math.max(
      PREVIEW_MIN_HEIGHT,
      Math.min(
        PREVIEW_MAX_HEIGHT,
        (placement === 'top'
          ? spaces.top
          : placement === 'bottom'
            ? spaces.bottom
            : viewportHeight - CARD_MARGIN * 2) - HOVER_INFO_HEIGHT
      )
    );
    const recommendedHeight = PREVIEW_MIN_HEIGHT;
    const targetPreviewHeight = previewVisible ? previewHeight : recommendedHeight;
    const effectivePreviewHeight = Math.min(targetPreviewHeight, nextMaxPreviewHeight);
    const totalHeight = effectivePreviewHeight + HOVER_INFO_HEIGHT;
    let left = nextAnchor.left + nextAnchor.width / 2 - PREVIEW_TARGET_WIDTH / 2;
    let top = nextAnchor.bottom + CARD_GAP;
    if (placement === 'top') {
      top = nextAnchor.top - CARD_GAP - totalHeight;
    } else if (placement === 'right') {
      left = nextAnchor.right + CARD_GAP;
      top = nextAnchor.top + nextAnchor.height / 2 - totalHeight / 2;
    } else if (placement === 'left') {
      left = nextAnchor.left - CARD_GAP - PREVIEW_TARGET_WIDTH;
      top = nextAnchor.top + nextAnchor.height / 2 - totalHeight / 2;
    }
    const boundedLeft = Math.max(
      CARD_MARGIN,
      Math.min(left, viewportWidth - PREVIEW_TARGET_WIDTH - CARD_MARGIN)
    );
    let boundedTop = top;
    if (placement === 'left' || placement === 'right') {
      boundedTop = Math.max(
        CARD_MARGIN,
        Math.min(top, viewportHeight - totalHeight - CARD_MARGIN)
      );
    }
    const anchorBottom = viewportHeight - (nextAnchor.top - CARD_GAP);
    const nextDebug = {
      placement,
      top: Math.round(top),
      boundedTop: Math.round(boundedTop),
      bottom: placement === 'top' ? Math.round(anchorBottom) : null,
      height: Math.round(totalHeight),
      previewHeight: Math.round(effectivePreviewHeight),
      maxPreviewHeight: Math.round(nextMaxPreviewHeight),
    };
    const nextDebugKey = JSON.stringify(nextDebug);
    if (nextDebugKey !== lastDebugRef.current) {
      logDebug('layout', nextDebug);
      lastDebugRef.current = nextDebugKey;
    }
    const nextStyle =
      placement === 'top'
        ? { left: boundedLeft, bottom: anchorBottom, height: totalHeight }
        : { left: boundedLeft, top: boundedTop, height: totalHeight };
    if (style) {
      const currentAxis = Number.isFinite(style.top) ? style.top : style.bottom;
      const nextAxis = Number.isFinite(nextStyle.top) ? nextStyle.top : nextStyle.bottom;
      const deltaLeft = Math.abs(style.left - nextStyle.left);
      const deltaAxis = Math.abs((currentAxis ?? 0) - (nextAxis ?? 0));
      const deltaHeight = Math.abs((style.height ?? 0) - (nextStyle.height ?? 0));
      if (deltaLeft < 0.5 && deltaAxis < 0.5 && deltaHeight < 0.5) {
        return;
      }
    }
    setStyle(nextStyle);
    setHasPosition(true);
    setMaxPreviewHeight(nextMaxPreviewHeight);
  }, [
    data?.session?.id,
    resolveAnchorRect,
    layoutTick,
    isOpen,
    placementState,
    previewHeight,
    previewVisible,
    style,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handle = () => setLayoutTick((value) => value + 1);
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      placementRef.current = null;
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    const nextName = data?.session?.name || data?.session?.id || '';
    setDraftName(nextName);
    setEditingName(false);
    setMenuOpen(false);
    setPreviewVisible(false);
    setPendingPreview(false);
    hasPreviewRef.current = false;
    heightLockedRef.current = false;
    setMetricsReady(false);
    pendingMetricsRef.current = null;
    lastMetricsKeyRef.current = null;
    setStyle(null);
    setHasPosition(false);
    placementRef.current = null;
    setPlacementState('bottom');
    const cachedEntry = data?.session?.id
      ? heightCacheRef.current.get(data.session.id)
      : null;
    setPreviewHeight(
      cachedEntry?.stable && Number.isFinite(cachedEntry?.height) && cachedEntry.height > 0
        ? cachedEntry.height
        : PREVIEW_MIN_HEIGHT
    );
    setMaxPreviewHeight(PREVIEW_MAX_HEIGHT);
  }, [data?.session?.id, data?.session?.name]);

  useEffect(() => {
    if (!isOpen) {
      setPreviewVisible(false);
      setPendingPreview(false);
      return;
    }
    if (previewVisible) {
      heightLockedRef.current = true;
      if (data?.session?.id && Number.isFinite(previewHeight) && previewHeight > 0) {
        heightCacheRef.current.set(data.session.id, { height: previewHeight, stable: true });
      }
    }
  }, [data?.session?.id, isOpen, previewHeight, previewVisible]);

  useEffect(() => {
    if (!pendingPreview || !isOpen) {
      return;
    }
    const handle = requestAnimationFrame(() => {
      setPreviewVisible(true);
      setPendingPreview(false);
    });
    return () => cancelAnimationFrame(handle);
  }, [isOpen, pendingPreview, previewHeight]);

  const handlePreviewReady = useCallback((ready) => {
    if (!ready) {
      return;
    }
    hasPreviewRef.current = true;
    const pending = pendingMetricsRef.current;
    if (pending?.height) {
      setPreviewHeight(pending.height);
      lastMetricsKeyRef.current = pending.key || null;
      if (!metricsReady) {
        setMetricsReady(true);
      }
      setPendingPreview(true);
      return;
    }
    if (metricsReady) {
      setPendingPreview(true);
    }
  }, [metricsReady]);

  const handlePreviewMetrics = useCallback((metrics) => {
    const nextHeight = Number(metrics?.height);
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
      return;
    }
    const cols = Number(metrics?.cols);
    const rows = Number(metrics?.rows);
    const metricsKey = `${Number.isFinite(cols) ? cols : 'x'}:${Number.isFinite(rows) ? rows : 'x'}`;
    pendingMetricsRef.current = { height: nextHeight, key: metricsKey };
    const shouldMarkReady = !metricsReady;
    if (shouldMarkReady) {
      setMetricsReady(true);
    }
    if (!hasPreviewRef.current) {
      return;
    }
    if (shouldMarkReady) {
      setPendingPreview(true);
    }
    if (heightLockedRef.current && previewVisible) {
      return;
    }
    const keySame = lastMetricsKeyRef.current === metricsKey;
    if (!keySame) {
      lastMetricsKeyRef.current = metricsKey;
    }
    const delta = nextHeight - previewHeight;
    if (Math.abs(delta) < 0.5) {
      return;
    }
    if (!previewVisible) {
      setPreviewHeight(nextHeight);
      return;
    }
    if (!keySame && Math.abs(delta) >= 6) {
      setPreviewHeight(nextHeight);
    }
  }, [metricsReady, previewHeight, previewVisible]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }
    const handlePointer = (event) => {
      if (menuRef.current?.contains(event.target)) {
        return;
      }
      if (menuButtonRef.current?.contains(event.target)) {
        return;
      }
      setMenuOpen(false);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [menuOpen]);

  if (!data) {
    return null;
  }
  if (!anchorRect && !anchorEl) {
    return null;
  }

  const { cell, session, color } = data;
  const isOffline = session.isOffline;
  const statusLabel = session.status || 'unknown';
  const idleLabel = session.lastActivityAt
    ? `Idle ${formatRelativeTime(session.lastActivityAt)}`
    : 'Idle —';
  const visitedLabel = session.lastVisitedAt
    ? `Visited ${formatRelativeTime(session.lastVisitedAt)}`
    : '';
  const offlineReason = isOffline ? resolveOfflineReason(session, cell) : '';
  const infoLabel = isOffline ? offlineReason : statusLabel.toUpperCase();
  const currentName = session.name || session.id || 'UNTITLED';
  const commitRename = () => {
    const nextName = draftName.trim();
    if (!nextName) {
      setDraftName(currentName);
      setEditingName(false);
      return;
    }
    if (nextName !== currentName) {
      onRenameSession?.(session.id, nextName, cell.id);
    }
    setEditingName(false);
  };

  const enterOffset =
    placementState === 'top'
      ? { x: 0, y: 10 }
      : placementState === 'bottom'
        ? { x: 0, y: -10 }
        : placementState === 'left'
          ? { x: 10, y: 0 }
          : { x: -10, y: 0 };
  const baseTransform = isOpen
    ? 'translate3d(0,0,0) scale(1)'
    : `translate3d(${enterOffset.x}px, ${enterOffset.y}px, 0) scale(0.98)`;

  return (
    <div
      ref={resolvedRef}
      data-session-map-hover-card="true"
      style={{
        ...(style || { left: -9999, top: -9999 }),
        width: PREVIEW_TARGET_WIDTH,
        transform: baseTransform,
      }}
      className={`fixed z-[999] overflow-hidden rounded-xl border bg-popover/95 text-foreground shadow-xl backdrop-blur ${
        previewVisible ? 'transition-[opacity,transform,box-shadow,height]' : 'transition-[opacity,transform,box-shadow]'
      } duration-200 ease-out will-change-transform motion-reduce:transition-none ${
        isHovered ? 'border-primary/60 shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_12px_40px_rgba(15,23,42,0.5)]' : 'border-border/60'
      } ${isOpen && hasPosition ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
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
      <div className="flex h-full flex-col">
        <button
          type="button"
          className="relative flex w-full flex-1 min-h-0 cursor-pointer overflow-hidden bg-transparent text-left transition-opacity duration-200 hover:opacity-[0.85] hover:ring-1 hover:ring-primary/40"
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
          <div
            className={`relative flex h-full w-full items-end transition-[opacity,transform] duration-200 ease-out will-change-transform ${
              previewVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <SessionMapTerminalPreview
              cell={cell}
              session={session}
              isOffline={isOffline}
              enabled={isOpen}
              onPreviewReady={handlePreviewReady}
              onPreviewMetrics={handlePreviewMetrics}
              maxHeight={maxPreviewHeight}
              fontSize={resolveFontSize ? resolveFontSize(cell.id, session.id) : undefined}
            />
          </div>
          {!previewVisible ? (
            <PreviewLoading className="absolute inset-0" />
          ) : null}
          {hint.visible ? (
            <div
              className="pointer-events-none absolute z-10 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[9px] text-white shadow"
              style={{ left: Math.min(hint.x + 12, PREVIEW_TARGET_WIDTH - 80), top: Math.max(8, hint.y - 18) }}
            >
              点击访问
            </div>
          ) : null}
        </button>
        <div
          className="relative flex items-center border-t border-white/10 bg-black/55 px-2 text-[9px] text-slate-100 backdrop-blur flex-none"
          style={{ height: HOVER_INFO_HEIGHT }}
        >
          <div className="flex w-full items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {editingName ? (
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitRename();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setDraftName(currentName);
                    setEditingName(false);
                  }
                }}
                className="min-w-0 flex-1 rounded border border-white/20 bg-black/40 px-1 py-0.5 text-[9px] text-white focus:border-primary focus:outline-none"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!onRenameSession) {
                    return;
                  }
                  setDraftName(currentName);
                  setEditingName(true);
                }}
                className="min-w-0 flex-1 truncate text-left hover:text-white"
                title="Rename session"
              >
                {currentName}
              </button>
            )}
            <span className="text-slate-300">·</span>
            <span className="uppercase tracking-wide text-slate-200">{infoLabel}</span>
            <span className="ml-auto whitespace-nowrap text-slate-300">
              {idleLabel}
            </span>
            {visitedLabel ? (
              <span className="ml-2 whitespace-nowrap text-slate-400">
                {visitedLabel}
              </span>
            ) : null}
            {onOpenAvatarMenu ? (
              <div className="relative ml-1 flex items-center">
                <button
                  type="button"
                  ref={menuButtonRef}
                  onClick={() => setMenuOpen((value) => !value)}
                  className="flex h-5 w-5 items-center justify-center rounded border border-white/10 bg-black/30 text-white/60 hover:bg-white/10 hover:text-white"
                  title="Session actions"
                  data-session-avatar-anchor="true"
                >
                  <MoreHorizontal size={12} />
                </button>
                {menuOpen ? (
                  <div
                    ref={menuRef}
                    className="absolute right-0 bottom-full mb-1 w-32 rounded-md border border-white/15 bg-[#0f1116]/95 py-1 text-[10px] shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        if (!menuButtonRef.current) {
                          return;
                        }
                        onOpenAvatarMenu(menuButtonRef.current, cell, session);
                      }}
                      className="w-full px-3 py-1 text-left text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      Change avatar
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
