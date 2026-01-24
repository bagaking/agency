import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';

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
  const [isHoveringBorder, setIsHoveringBorder] = useState(false);
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

      {/* Modern Resizer & Toggle Handle */}
      <div
        className={`absolute top-0 -right-[2px] z-50 h-full w-[4px] cursor-col-resize transition-colors duration-200 group ${
          collapsed ? 'cursor-default pointer-events-none' : 'hover:bg-primary/40'
        }`}
        onPointerDown={handlePointerDown}
        onMouseEnter={() => setIsHoveringBorder(true)}
        onMouseLeave={() => setIsHoveringBorder(false)}
      >
        {/* The Toggle Trigger: A slim, elegant vertical handle */}
        {!collapsed && (
          <div 
            className={`absolute top-1/2 -translate-y-1/2 -left-1 flex flex-col items-center gap-4 transition-opacity transition-transform duration-300 ${
              isHoveringBorder ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
            }`}
          >
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
                className="group/btn flex h-16 w-3 items-center justify-center rounded-full bg-primary/80 text-white shadow-lg backdrop-blur-md hover:bg-primary hover:w-4 transition-colors transition-[width] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
            >
                <ChevronLeft size={10} strokeWidth={3} className="group-hover/btn:scale-125 transition-transform" aria-hidden="true" />
            </button>
            <div className="h-8 w-[2px] bg-primary/20 rounded-full" />
            <GripVertical size={12} className="text-primary/40" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Expand Trigger when collapsed: An ultra-slim floating line at the edge */}
      {collapsed && (
        <div 
            className="absolute top-0 left-0 z-[60] h-full w-1.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
            onClick={onToggleCollapse}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onToggleCollapse?.();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Expand sidebar"
        >
            <div className="absolute inset-y-0 left-0 w-[2px] bg-primary/0 group-hover:bg-primary/40 transition-colors" />
            <div className="absolute top-1/2 -translate-y-1/2 left-0 h-24 w-[4px] rounded-r-full bg-primary/0 group-hover:bg-primary/80 transition-colors flex items-center justify-center overflow-hidden">
                <ChevronRight size={10} strokeWidth={3} className="text-white opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-opacity transition-transform" aria-hidden="true" />
            </div>
        </div>
      )}
    </aside>
  );
}
