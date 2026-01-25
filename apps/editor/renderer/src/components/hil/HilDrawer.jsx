import React from 'react';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { IconButton } from '../ui/IconButton.jsx';
import { focusRing } from '../ui/focusRing.js';

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
}) {
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
      className={`relative flex h-full flex-shrink-0 flex-col border-l border-border/20 bg-muted/5 backdrop-blur-2xl transition-[width] duration-300 ${
        drawerOpen ? 'w-[360px]' : 'w-6'
      }`}
    >
      <header
        className={`shrink-0 h-11 flex items-center border-b border-border/10 bg-muted/10 ${
          drawerOpen ? 'px-2 gap-2' : 'px-0 justify-center'
        }`}
      >
        <IconButton
          label={drawerOpen ? 'Collapse HIL drawer' : 'Expand HIL drawer'}
          onClick={handleToggle}
          aria-expanded={drawerOpen}
          aria-controls={contentId}
          className="h-6 w-6 rounded-full border border-border/30 bg-background/60 text-muted-foreground/60 shadow-sm transition-colors hover:text-foreground hover:border-primary/30"
        >
          {drawerOpen ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </IconButton>
        {drawerOpen ? (
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 truncate">
              {title || 'HIL'}
            </h2>
            {subtitle ? (
              <span className="text-[9px] font-medium text-muted-foreground/50 truncate uppercase tracking-tighter">
                {subtitle}
              </span>
            ) : null}
          </div>
        ) : null}
        {drawerOpen && onOpenPromote ? (
          <button
            type="button"
            onClick={onOpenPromote}
            className={`ml-auto flex items-center gap-1 rounded-full border border-border/30 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 transition-colors hover:text-foreground hover:border-primary/30 ${focusRingClass}`}
            title="Promote items to draft"
          >
            <Target size={12} aria-hidden="true" />
            Promote
          </button>
        ) : null}
      </header>

      <div
        id={contentId}
        className={`flex h-full flex-col ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}
      >
        {panels.length ? (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/10">
            {panels.map((panel) => (
              <button
                key={panel.id}
                type="button"
                disabled={panel.disabled}
                onClick={() => onSelectPanel?.(panel.id)}
                aria-pressed={activePanel === panel.id}
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${focusRingClass} ${
                  panel.disabled
                    ? 'text-muted-foreground/30 cursor-not-allowed'
                    : activePanel === panel.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground/60 hover:text-foreground'
                }`}
              >
                {panel.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </aside>
  );
}
