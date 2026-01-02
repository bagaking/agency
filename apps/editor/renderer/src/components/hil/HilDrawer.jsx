import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const panels = [
  { id: 'comments', label: 'Comments' },
  { id: 'drafts', label: 'Drafts', disabled: true },
];

export function HilDrawer({ open, activePanel, onToggle, onSelectPanel, children }) {
  return (
    <aside
      className={`relative flex h-full flex-col border-l border-white/[0.04] bg-[#0f131a] transition-all duration-300 ${
        open ? 'w-80' : 'w-8'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(!open)}
        className="absolute -left-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#0f131a] text-muted-foreground/60 shadow hover:text-foreground"
        title={open ? 'Collapse HIL drawer' : 'Expand HIL drawer'}
      >
        {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`flex h-full flex-col ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
            HIL
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
          {panels.map((panel) => (
            <button
              key={panel.id}
              type="button"
              disabled={panel.disabled}
              onClick={() => onSelectPanel(panel.id)}
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
