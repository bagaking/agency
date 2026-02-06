import React, { useEffect, useMemo, useState } from 'react';
import { AgentAvatarBadge } from './AgentAvatarBadge.jsx';
import {
  AVATAR_IDS,
  getRecentAvatarIds,
  recordRecentAvatarId,
  resolveAvatarId,
} from '../../utils/agentAvatar.js';

const GRID_COLUMNS = 7;
const TILE_SIZE = 30;
const TILE_GAP = 8;
const VISIBLE_ROWS = 7;
const PANEL_WIDTH = 300;
const DIVIDER_HEIGHT = 14;

const buildTitle = (value) => value.replace(/_/g, ' ').toLowerCase();

export function AvatarPickerMenu({
  isOpen,
  position,
  containerRef,
  selectedId,
  onSelect,
  activeAvatarIds,
  title = 'Select Avatar',
}) {
  const [recents, setRecents] = useState([]);
  const activeSet = useMemo(
    () => (activeAvatarIds instanceof Set ? activeAvatarIds : new Set(activeAvatarIds || [])),
    [activeAvatarIds]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setRecents(getRecentAvatarIds());
  }, [isOpen]);

  const resolvedSelected = resolveAvatarId(selectedId || '');
  const recentRow = recents.slice(0, GRID_COLUMNS);
  const recentSet = new Set(recentRow);
  const remaining = AVATAR_IDS.filter((id) => !recentSet.has(id));
  const tileStyle = { width: `${TILE_SIZE}px`, height: `${TILE_SIZE}px` };
  const gridHeight =
    TILE_SIZE * VISIBLE_ROWS + TILE_GAP * (VISIBLE_ROWS - 1) + DIVIDER_HEIGHT;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-[1200] rounded-xl border border-white/15 bg-[#1a1d23]/98 p-3 text-[11px] shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl ring-1 ring-white/10"
      style={{ top: position.y, left: position.x, width: `${PANEL_WIDTH}px` }}
    >
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">
          {title}
        </div>
        <div className="text-[9px] font-mono text-white/30">
          {AVATAR_IDS.length} OPTIONS
        </div>
      </div>
      <div
        className="overflow-y-auto no-scrollbar"
        style={{ maxHeight: `${gridHeight}px` }}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`, gap: `${TILE_GAP}px` }}>
          {Array.from({ length: GRID_COLUMNS }).map((_, index) => {
            const id = recentRow[index];
            const isActive = id === resolvedSelected;
            const isInUse = id && activeSet.has(id);
            return (
              <button
                key={`recent-${id || index}`}
                type="button"
                onClick={() => {
                  if (!id) {
                    return;
                  }
                  const next = recordRecentAvatarId(id);
                  setRecents(next);
                  onSelect?.(id);
                }}
                className={`relative flex items-center justify-center rounded-sm border transition-all duration-200 group/item ${
                  id
                    ? isActive
                      ? 'border-primary bg-primary/20 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
                    : 'border-white/5 bg-white/[0.01] opacity-40 cursor-default'
                }`}
                style={tileStyle}
                title={id ? buildTitle(id) : 'No recent selection'}
                disabled={!id}
              >
                {isInUse ? (
                  <span
                    className="absolute inset-0 rounded-sm opacity-45 pointer-events-none"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(135deg, rgba(250, 204, 21, 0.35) 0px, rgba(250, 204, 21, 0.35) 6px, rgba(15, 23, 42, 0.35) 6px, rgba(15, 23, 42, 0.35) 12px)',
                    }}
                  />
                ) : null}
                {id ? (
                  <AgentAvatarBadge avatarId={id} size={24} showRing={false} className="relative z-10" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="my-2 h-px bg-white/10" />
        <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`, gap: `${TILE_GAP}px` }}>
          {remaining.map((id) => {
            const isActive = id === resolvedSelected;
            const isInUse = activeSet.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  const next = recordRecentAvatarId(id);
                  setRecents(next);
                  onSelect?.(id);
                }}
                className={`relative flex items-center justify-center rounded-sm border transition-all duration-200 group/item ${
                  isActive
                    ? 'border-primary bg-primary/20 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
                }`}
                style={tileStyle}
                title={buildTitle(id)}
              >
                {isInUse ? (
                  <span
                    className="absolute inset-0 rounded-sm opacity-45 pointer-events-none"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(135deg, rgba(250, 204, 21, 0.35) 0px, rgba(250, 204, 21, 0.35) 6px, rgba(15, 23, 42, 0.35) 6px, rgba(15, 23, 42, 0.35) 12px)',
                    }}
                  />
                ) : null}
                <AgentAvatarBadge avatarId={id} size={24} showRing={false} className="relative z-10" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
