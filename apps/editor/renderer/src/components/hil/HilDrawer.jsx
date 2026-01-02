import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const panels = [
  { id: 'comments', label: 'Comments' },
  { id: 'drafts', label: 'Drafts', disabled: true },
];

export function HilDrawer({
  open,
  activePanel,
  onToggle,
  onSelectPanel,
  children,
  title,
  subtitle,
}) {
  const drawerOpen = Boolean(open);
  const handleToggle = () => {
    if (typeof onToggle === 'function') {
      onToggle(!drawerOpen);
    }
  };

  return (
    <aside
      className={`relative flex h-full flex-shrink-0 flex-col border-l border-white/[0.03] bg-[#111318]/90 backdrop-blur-2xl transition-all duration-300 ${
        drawerOpen ? 'w-[360px]' : 'w-6'
      }`}
    >
      <header
        className={`shrink-0 h-11 flex items-center gap-2 border-b border-white/[0.02] bg-white/[0.01] ${
          drawerOpen ? 'px-2' : 'px-0 justify-center'
        }`}
      >
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#111318]/90 text-muted-foreground/60 shadow hover:text-foreground"
          title={drawerOpen ? 'Collapse HIL drawer' : 'Expand HIL drawer'}
        >
          {drawerOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className={`flex min-w-0 flex-col ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-white/80 truncate">
            {title || 'HIL'}
          </h2>
          {subtitle ? (
            <span className="text-[9px] font-bold text-muted-foreground/30 truncate uppercase tracking-tighter">
              {subtitle}
            </span>
          ) : null}
        </div>
      </header>

      <div className={`flex h-full flex-col ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
          {panels.map((panel) => (
            <button
              key={panel.id}
              type="button"
              disabled={panel.disabled}
              onClick={() => onSelectPanel?.(panel.id)}
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                panel.disabled
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : activePanel === panel.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground/50 hover:text-foreground'
              }`}
            >
              {panel.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </aside>
  );
}
