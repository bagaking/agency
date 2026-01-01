import React from 'react';
import { FolderOpen, RefreshCw } from 'lucide-react';
import { RecentProjectsList } from './RecentProjectsList.jsx';

const basename = (value) => value.split('/').filter(Boolean).pop() || value;

export function ProjectSettingsView({
  projectRoot,
  projectError,
  recentProjects,
  onOpenProject,
  onOpenRecent,
}) {
  const hasProject = Boolean(projectRoot);
  const projectName = hasProject ? basename(projectRoot) : 'No project selected';

  return (
    <main className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Settings</div>
          <div className="text-lg font-semibold">Project</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenProject}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
          >
            <FolderOpen size={12} />
            Open Project
          </button>
          {hasProject ? (
            <button
              type="button"
              onClick={onOpenProject}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <RefreshCw size={12} />
              Switch Project
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <section className="rounded-lg border border-border bg-muted/10 px-4 py-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Current Project
          </div>
          <div className="mt-2 text-sm font-semibold">{projectName}</div>
          {hasProject ? (
            <div className="mt-1 text-xs text-muted-foreground">{projectRoot}</div>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">
              Choose a repository to start working with Cells and Explorer.
            </div>
          )}
          {projectError ? (
            <div className="mt-2 text-xs text-rose-300">{projectError}</div>
          ) : null}
        </section>

        <RecentProjectsList
          projects={recentProjects}
          onOpen={onOpenRecent}
          title="Recent Projects"
          emptyLabel="No recent projects yet"
        />
      </div>
    </main>
  );
}
