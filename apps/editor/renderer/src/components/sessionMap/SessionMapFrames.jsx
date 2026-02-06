import React from 'react';

export function PanelCorner({ position = 'top-left', color = 'currentColor' }) {
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

export function TacticalFrame({ children, color, isHovered, title, subTitle, minHeight, actions }) {
  return (
    <div
      className={`group relative flex flex-col rounded border transition-all duration-500 overflow-hidden ${
        isHovered
          ? 'bg-white/[0.08] shadow-[0_0_25px_rgba(255,255,255,0.05)] z-10'
          : 'border-white/10 bg-black/40'
      }`}
      style={{ minHeight, borderColor: isHovered ? color : undefined }}
    >
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)',
        backgroundSize: '4px 4px'
      }} />
      
      {/* Header */}
      <div
        className="relative z-10 flex items-center justify-between border-b border-white/10 px-2 py-1 bg-black/40 backdrop-blur-sm"
        style={{ borderLeft: `3px solid ${color || '#3b82f6'}` }}
      >
        <div className="flex flex-col min-w-0">
          <span className="truncate font-mono text-[9px] font-black text-white tracking-widest leading-none">
            {title?.toUpperCase()}
          </span>
          {subTitle && (
            <span className="text-[6px] text-white/30 font-bold uppercase mt-0.5 tracking-tighter">
              {subTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {actions}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-wrap items-start content-start gap-2 p-2 flex-1">
        {children}
      </div>

      {/* Footer / Corner Tech Elements */}
      <div className="absolute bottom-0 right-0 p-0.5 pointer-events-none opacity-20 group-hover:opacity-50 transition-opacity">
        <div className="border-r border-b border-white h-1 w-1" />
      </div>
      <div className="absolute top-0 right-0 p-0.5 pointer-events-none opacity-20">
        <div className="border-r border-t border-white h-1 w-1" />
      </div>
    </div>
  );
}
