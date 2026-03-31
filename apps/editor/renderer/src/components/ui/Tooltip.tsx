import React, {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const GAP = 6;
const MARGIN = 8;
const MAX_WIDTH = 260;
const ORDER = {
  top: ['top', 'bottom', 'right', 'left'],
  bottom: ['bottom', 'top', 'right', 'left'],
  left: ['left', 'right', 'top', 'bottom'],
  right: ['right', 'left', 'top', 'bottom'],
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function Tooltip({ label, side = 'top', children }: any) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [style, setStyle] = useState(null);
  const [placement, setPlacement] = useState(side);
  const tooltipId = useId();
  const anchorRef = useRef(null);
  const tooltipRef = useRef(null);

  const open = hovered || focused;

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

    const maxLeft = Math.max(MARGIN, viewportWidth - tooltipRect.width - MARGIN);
    const maxTop = Math.max(MARGIN, viewportHeight - tooltipRect.height - MARGIN);
    const boundedLeft = clamp(left, MARGIN, maxLeft);
    const boundedTop = clamp(top, MARGIN, maxTop);

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
  const describedChildren =
    isValidElement(children)
      ? cloneElement(children as React.ReactElement<any>, {
          'aria-describedby':
            open && label
              ? [(children as any).props?.['aria-describedby'], tooltipId]
                  .filter(Boolean)
                  .join(' ')
              : (children as any).props?.['aria-describedby'],
        })
      : children;

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {describedChildren}
      {open && label && typeof document !== 'undefined'
        ? createPortal(
            <span
              id={tooltipId}
              ref={tooltipRef}
              role="tooltip"
              data-side={placement}
              style={{ ...tooltipStyle, maxWidth: `${MAX_WIDTH}px` }}
              className="pointer-events-none fixed z-[10050] rounded-md border border-border/60 bg-popover px-2 py-1 text-[10px] font-medium leading-snug text-foreground shadow-lg opacity-100 whitespace-normal break-words"
            >
              {label}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
