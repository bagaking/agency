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

const withAlpha = (hexColor = '#3b82f6', alphaHex = '22') => {
  const normalized = String(hexColor || '#3b82f6').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return `${normalized}${alphaHex}`;
  }
  return normalized;
};

export function TacticalFrame({
  children,
  color,
  isHovered,
  title,
  subTitle,
  minHeight,
  actions,
  className = '',
}: any) {
  const accentColor = color || '#3b82f6';

  return (
    <div
      className={`group relative flex min-h-0 flex-col rounded-2xl transition-all duration-300 overflow-hidden ${
        isHovered
          ? 'z-10 bg-[linear-gradient(180deg,rgba(36,48,63,0.92),rgba(19,25,34,0.94))] shadow-[0_12px_28px_rgba(0,0,0,0.3)]'
          : 'bg-[linear-gradient(180deg,rgba(19,25,34,0.9),rgba(12,16,22,0.94))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]'
      } ${className}`}
      style={{ minHeight }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{
          background: `linear-gradient(90deg, transparent, ${withAlpha(accentColor, '66')}, transparent)`,
        }}
      />
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-2 bg-black/16 px-2.5 py-1.5 backdrop-blur-sm">
        <div
          className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full opacity-80"
          style={{ backgroundColor: accentColor }}
        />
        <div className="flex min-w-0 items-center gap-1.5 pl-1.5">
          <span className="truncate font-mono text-[8px] font-black leading-none tracking-[0.14em] text-white/92">
            {title}
          </span>
          {subTitle ? (
            <span
              className="shrink-0 rounded-full border px-1.5 py-[2px] text-[6px] font-bold uppercase tracking-[0.16em]"
              style={{
                borderColor: withAlpha(accentColor, '44'),
                backgroundColor: withAlpha(accentColor, '1a'),
                color: withAlpha('#e2f8ff', 'ff'),
              }}
            >
              {subTitle}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-wrap items-start content-start gap-1.5 p-1.5">
        {children}
      </div>
    </div>
  );
}
