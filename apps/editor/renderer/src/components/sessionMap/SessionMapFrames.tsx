import React from 'react';

export function PanelCorner({ position = 'top-left', color = 'currentColor' }: any) {
  const isTop = position.includes('top');
  const isLeft = position.includes('left');
  return (
    <div
      className={`absolute h-1.5 w-1.5 opacity-60 ${
        isTop ? 'top-0' : 'bottom-0'
      } ${isLeft ? 'left-0' : 'right-0'}`}
      style={{
        borderTop: isTop ? `1px solid ${color}` : undefined,
        borderBottom: !isTop ? `1px solid ${color}` : undefined,
        borderLeft: isLeft ? `1px solid ${color}` : undefined,
        borderRight: !isLeft ? `1px solid ${color}` : undefined,
      }}
    />
  );
}

export function TacticalFrame({ children, color, isHovered, title, subTitle, minHeight, actions }: any) {
  return (
    <div
      className={`group relative flex min-h-0 flex-col rounded-2xl transition-all duration-300 overflow-hidden ${
        isHovered
          ? 'bg-[linear-gradient(180deg,rgba(36,48,63,0.92),rgba(19,25,34,0.94))] shadow-[0_12px_28px_rgba(0,0,0,0.3)] z-10'
          : 'bg-[linear-gradient(180deg,rgba(19,25,34,0.9),rgba(12,16,22,0.94))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]'
      }`}
      style={{ minHeight }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{
          background: `linear-gradient(90deg, transparent, ${color || '#3b82f6'}66, transparent)`,
        }}
      />
      {/* Header */}
      <div
        className="relative z-10 flex items-center justify-between px-2.5 py-1.5 bg-black/18 backdrop-blur-sm"
      >
        <div
          className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full opacity-80"
          style={{ backgroundColor: color || '#3b82f6' }}
        />
        <div className="flex flex-col min-w-0 pl-1.5">
          <span className="truncate font-mono text-[9px] font-black text-white/92 tracking-[0.16em] leading-none">
            {title?.toUpperCase()}
          </span>
          {subTitle && (
            <span className="text-[6px] text-cyan-100/28 font-bold uppercase mt-0.5 tracking-[0.16em]">
              {subTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {actions}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-0 flex-wrap items-start content-start gap-2 p-2 flex-1">
        {children}
      </div>
    </div>
  );
}
