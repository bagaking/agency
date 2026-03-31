import React, { useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function SidebarDock({
  width,
  collapsed,
  minWidth = 240,
  maxWidth = 520,
  onResize,
  onResizeEnd,
  children,
}: any) {
  const dragStateRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerMove = (event) => {
    const state = dragStateRef.current;
    if (!state) return;
    const nextWidth = clamp(state.startWidth + (event.clientX - state.startX), minWidth, maxWidth);
    state.lastWidth = nextWidth;
    onResize?.(nextWidth);
  };

  const handlePointerUp = () => {
    const state = dragStateRef.current;
    if (!state) return;
    dragStateRef.current = null;
    setIsDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (state.lastWidth) {
      onResizeEnd?.(state.lastWidth);
    }
  };

  const handlePointerDown = (event) => {
    if (collapsed) return;
    dragStateRef.current = {
      startX: event.clientX,
      startWidth: width,
      lastWidth: width,
    };
    setIsDragging(true);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <aside
      className={`relative h-full shrink-0 border-r border-sidebar-border bg-sidebar ${
        collapsed ? 'border-r-0' : ''
      } ${isDragging ? '' : 'transition-[width] duration-300 ease-in-out'}`}
      style={{ width: collapsed ? 0 : width }}
    >
      <div className={`h-full w-full overflow-hidden ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </div>

      {/* Keep resize at the dock edge; shell-level collapse now lives in ActivityBar */}
      <div
        className={`absolute top-0 -right-[2px] z-20 h-full w-[4px] cursor-col-resize transition-colors duration-200 ${
          collapsed ? 'cursor-default pointer-events-none' : 'hover:bg-primary/40'
        }`}
        onPointerDown={handlePointerDown}
      />
    </aside>
  );
}
