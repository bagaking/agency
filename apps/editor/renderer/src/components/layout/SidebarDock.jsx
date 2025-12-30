import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function SidebarDock({
  width,
  collapsed,
  minWidth = 240,
  maxWidth = 520,
  onResize,
  onResizeEnd,
  onToggleCollapse,
  children,
}) {
  const dragStateRef = useRef(null);

  const handlePointerMove = (event) => {
    const state = dragStateRef.current;
    if (!state) {
      return;
    }
    const nextWidth = clamp(state.startWidth + (event.clientX - state.startX), minWidth, maxWidth);
    state.lastWidth = nextWidth;
    onResize?.(nextWidth);
  };

  const handlePointerUp = () => {
    const state = dragStateRef.current;
    if (!state) {
      return;
    }
    dragStateRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (state.lastWidth) {
      onResizeEnd?.(state.lastWidth);
    }
  };

  const handlePointerDown = (event) => {
    if (collapsed) {
      return;
    }
    dragStateRef.current = {
      startX: event.clientX,
      startWidth: width,
      lastWidth: width,
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleStyle = collapsed ? { left: 6 } : { right: 6 };

  return (
    <aside
      className="relative h-full shrink-0 overflow-visible border-r border-sidebar-border bg-sidebar"
      style={{ width: collapsed ? 0 : width }}
    >
      <div className={collapsed ? 'hidden' : 'flex h-full'}>
        {children}
      </div>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="absolute top-2 z-10 rounded border border-border bg-popover p-1 text-muted-foreground hover:text-foreground shadow-sm"
        style={toggleStyle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={handlePointerDown}
          onDoubleClick={onToggleCollapse}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent"
        />
      )}
    </aside>
  );
}
