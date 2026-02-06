import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 6;
const MARGIN = 8;
const ORDER = {
  top: ['top', 'bottom', 'right', 'left'],
  bottom: ['bottom', 'top', 'right', 'left'],
  left: ['left', 'right', 'top', 'bottom'],
  right: ['right', 'left', 'top', 'bottom'],
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function Tooltip({ label, side = 'top', children }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);
  const [placement, setPlacement] = useState(side);
  const anchorRef = useRef(null);
  const tooltipRef = useRef(null);

  const fallbackOrder = useMemo(() => ORDER[side] || ORDER.top, [side]);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current || !tooltipRef.current) {
      return;
    }
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const fits = {
      top: anchorRect.top >= tooltipRect.height + GAP,
      bottom: viewportHeight - anchorRect.bottom >= tooltipRect.height + GAP,
      left: anchorRect.left >= tooltipRect.width + GAP,
      right: viewportWidth - anchorRect.right >= tooltipRect.width + GAP,
    };
    const nextPlacement = fallbackOrder.find((candidate) => fits[candidate]) || side;

    let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
    let top = anchorRect.top - tooltipRect.height - GAP;

    if (nextPlacement === 'bottom') {
      top = anchorRect.bottom + GAP;
    } else if (nextPlacement === 'left') {
      left = anchorRect.left - tooltipRect.width - GAP;
      top = anchorRect.top + anchorRect.height / 2 - tooltipRect.height / 2;
    } else if (nextPlacement === 'right') {
      left = anchorRect.right + GAP;
      top = anchorRect.top + anchorRect.height / 2 - tooltipRect.height / 2;
    }

    const boundedLeft = clamp(left, MARGIN, viewportWidth - tooltipRect.width - MARGIN);
    const boundedTop = clamp(top, MARGIN, viewportHeight - tooltipRect.height - MARGIN);

    setPlacement(nextPlacement);
    setStyle({ left: boundedLeft, top: boundedTop });
  }, [fallbackOrder, side]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const handle = () => updatePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open, updatePosition]);

  const tooltipStyle = style || { left: -9999, top: -9999 };

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && label && typeof document !== 'undefined'
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              data-side={placement}
              style={tooltipStyle}
              className="pointer-events-none fixed z-[999] whitespace-nowrap rounded-md border border-border/60 bg-popover px-2 py-1 text-[10px] font-medium text-foreground shadow-lg opacity-100"
            >
              {label}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
