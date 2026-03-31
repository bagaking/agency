import React, { useMemo } from 'react';
import { Folder, AlertTriangle, Clock, ChevronRight, Hash } from 'lucide-react';

export const formatRelativeTime = (value) => {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diffMs = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export function RecentProjectsList({
  projects,
  onOpen,
  title = 'Recent Projects',
  emptyLabel = 'History Empty',
}: any) {
  const items = useMemo(() => (Array.isArray(projects) ? projects : []), [projects]);

  return (
    <div className="space-y-4" data-testid="recent-projects">
      <div className="flex items-center gap-3 px-1">
        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/20 whitespace-nowrap">{title}</h4>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-white/5 to-transparent" />
      </div>
      
      {items.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-muted-foreground/10">
            <p className="text-[9px] uppercase font-bold tracking-widest">{emptyLabel}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-0.5">
          {items.map((project, index) => {
            const name = project?.name || 'Workspace';
            const path = project?.path || '';
            const missing = project?.exists === false;
            const lastOpened = formatRelativeTime(project?.lastOpenedAt);
            
            return (
              <button
                key={path || name}
                type="button"
                disabled={missing}
                onClick={() => !missing && path && onOpen?.(path)}
                className={`group flex items-center gap-4 px-4 py-2.5 transition-all duration-300 rounded-xl text-left ${
                  missing
                    ? 'opacity-20 grayscale cursor-not-allowed'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="text-[9px] font-mono text-muted-foreground/10 w-4 font-bold tracking-tighter shrink-0">
                    {String(index + 1).padStart(2, '0')}
                </div>

                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-500 ${
                    missing ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                }`}>
                  <Folder size={14} strokeWidth={1.5} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-tight text-white/80 truncate group-hover:text-white transition-colors">
                      {name}
                    </span>
                    {lastOpened && !missing && (
                      <span className="text-[8px] font-bold text-muted-foreground/20 uppercase tracking-tighter shrink-0">{lastOpened}</span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[9px] text-muted-foreground/30 font-mono italic">{path}</div>
                </div>

                <div className="flex items-center gap-3">
                    {missing && (
                        <div className="text-[8px] font-bold uppercase text-rose-500/40">Offline</div>
                    )}
                    <ChevronRight size={12} className="text-white/5 group-hover:text-primary transition-all shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
