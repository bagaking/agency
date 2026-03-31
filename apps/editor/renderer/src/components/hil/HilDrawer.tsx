import React from 'react';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { HIL_SURFACE_COPY, HilStatusBadge } from './hilSurfaceSystem';
import { IconButton } from '../ui/IconButton';
import { focusRing } from '../ui/focusRing';

const defaultPanels = [
  { id: 'comments', label: 'Comments' },
  { id: 'drafts', label: 'Drafts' },
];

export function HilDrawer({
  open,
  activePanel,
  onToggle,
  onSelectPanel,
  onOpenPromote,
  children,
  title,
  subtitle,
  panels = defaultPanels,
  contentClassName = '',
  contentScrollable = true,
  showToggleButton = true,
  collapsedWidth = 6,
}: any) {
  const drawerOpen = Boolean(open);
  const contentId = 'hil-drawer-content';
  const focusRingClass = focusRing.default;
  const handleToggle = () => {
    if (typeof onToggle === 'function') {
      onToggle(!drawerOpen);
    }
  };

  return (
    <aside
      className={`relative flex h-full flex-shrink-0 flex-col ${
        drawerOpen || collapsedWidth > 0 ? 'border-l border-border/20' : 'border-l-0'
      } bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(12,15,20,0.98))] backdrop-blur-2xl transition-[width] duration-300 ${drawerOpen ? 'w-[376px]' : ''}`}
      style={drawerOpen ? undefined : { width: `${collapsedWidth}px` }}
    >
      <header
        className={`shrink-0 min-h-[52px] items-center border-b border-white/[0.06] bg-white/[0.02] ${
          drawerOpen || showToggleButton ? 'flex' : 'hidden'
        } ${
          drawerOpen ? (showToggleButton ? 'px-3 gap-2.5' : 'px-3.5 gap-0') : 'px-0 justify-center'
        }`}
      >
        {showToggleButton ? (
          <IconButton
            label={drawerOpen ? 'Collapse memo drawer' : 'Expand memo drawer'}
            onClick={handleToggle}
            aria-expanded={drawerOpen}
            aria-controls={contentId}
            className="h-7 w-7 rounded-full border border-white/[0.08] bg-background/50 text-muted-foreground/65 shadow-sm transition-colors hover:text-foreground hover:border-primary/30"
          >
            {drawerOpen ? <ChevronRight size={13} aria-hidden="true" /> : <ChevronLeft size={13} aria-hidden="true" />}
          </IconButton>
        ) : null}
        {drawerOpen ? (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/46 truncate">
              {HIL_SURFACE_COPY.workspaceSubtitle}
            </span>
            <h2 className="mt-1 text-[15px] font-semibold tracking-[0.01em] text-foreground truncate">
              {title || HIL_SURFACE_COPY.workspaceTitle}
            </h2>
            {subtitle ? (
              <span className="mt-1 text-[10px] font-medium text-muted-foreground/58 truncate leading-none">
                {subtitle}
              </span>
            ) : null}
          </div>
        ) : null}
        {drawerOpen && onOpenPromote ? (
          <button
            type="button"
            onClick={onOpenPromote}
            className={`ml-auto flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary transition-colors hover:border-primary/45 hover:bg-primary/14 ${focusRingClass}`}
            title="Promote selected records"
          >
            <Target size={11} aria-hidden="true" />
            {HIL_SURFACE_COPY.promoteTitle}
          </button>
        ) : null}
      </header>

      <div
        id={contentId}
        className={`flex h-full flex-col ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}
      >
        {panels.length ? (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
            {panels.map((panel) => (
              <button
                key={panel.id}
                type="button"
                disabled={panel.disabled}
                onClick={() => onSelectPanel?.(panel.id)}
                aria-pressed={activePanel === panel.id}
                className={`rounded-full px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
                  panel.disabled
                    ? 'text-muted-foreground/30 cursor-not-allowed'
                    : activePanel === panel.id
                      ? 'bg-primary/12 text-primary border border-primary/20'
                      : 'text-muted-foreground/56 hover:text-foreground border border-transparent hover:border-white/[0.08]'
                }`}
              >
                {panel.label}
              </button>
            ))}
          </div>
        ) : null}

        <div
          className={`flex-1 ${contentScrollable ? 'overflow-y-auto' : 'overflow-hidden'} px-3 py-3 ${contentClassName}`}
        >
          {children}
        </div>
      </div>
    </aside>
  );
}
