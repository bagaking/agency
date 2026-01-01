import React, { useMemo } from 'react';
import { Folder, AlertTriangle } from 'lucide-react';

const formatRelativeTime = (value) => {
  if (!value) {
    return '';
  }
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return '';
  }
  const diffMs = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export function RecentProjectsList({
  projects,
  onOpen,
  title = 'Recent Projects',
  emptyLabel = 'No recent projects',
}) {
  const items = useMemo(() => (Array.isArray(projects) ? projects : []), [projects]);

  return (
    <div className="mt-4" data-testid="recent-projects">
      <div className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="mt-2 px-2 text-xs text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((project) => {
            const name = project?.name || 'Project';
            const path = project?.path || '';
            const missing = project?.exists === false;
            const lastOpened = formatRelativeTime(project?.lastOpenedAt);
            return (
              <button
                key={path || name}
                type="button"
                data-recent-project={path || name}
                disabled={missing}
                onClick={() => {
                  if (!missing && path) {
                    onOpen?.(path);
                  }
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  missing
                    ? 'cursor-not-allowed border-rose-500/20 bg-rose-500/5 text-rose-300/70'
                    : 'border-border bg-muted/20 text-foreground hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <Folder size={12} className={missing ? 'text-rose-300/70' : 'text-primary/80'} />
                    {name}
                  </span>
                  {lastOpened ? (
                    <span className="text-[10px] text-muted-foreground">{lastOpened}</span>
                  ) : null}
                </div>
                <div className="mt-1 truncate text-[10px] text-muted-foreground">{path}</div>
                {missing ? (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-300">
                    <AlertTriangle size={10} />
                    Missing on disk
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
