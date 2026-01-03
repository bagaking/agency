import React from 'react';

const POSITIONS = {
  top: 'bottom-full mb-1',
  bottom: 'top-full mt-1',
  left: 'right-full mr-1',
  right: 'left-full ml-1',
};

export function Tooltip({ label, side = 'top', children }) {
  if (!label) {
    return children;
  }
  const position = POSITIONS[side] || POSITIONS.top;
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${position} left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-popover px-2 py-1 text-[10px] font-medium text-foreground shadow-lg opacity-0 translate-y-1 transition-all group-hover:opacity-100 group-hover:translate-y-0`}
      >
        {label}
      </span>
    </span>
  );
}
