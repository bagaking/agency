import React from 'react';
import { FolderOpen, RefreshCw, ShieldCheck, SquareTerminal, Link2 } from 'lucide-react';
import { RecentProjectsList } from './RecentProjectsList.jsx';

const basename = (value) => value.split('/').filter(Boolean).pop() || value;

export function ProjectSettingsView({
  projectRoot,
  projectError,
  projectReady,
  recentProjects,
  tmuxStatus,
  onOpenProject,
  onOpenRecent,
  onOpenActions,
  onOpenGates,
  onOpenSoftlinks,
}) {
  const hasProject = Boolean(projectRoot);
  const projectName = hasProject ? basename(projectRoot) : 'No project selected';
  const tmuxLabel = tmuxStatus?.available ? tmuxStatus.version || 'tmux' : 'tmux missing';
  const tmuxTone = tmuxStatus?.available ? 'text-emerald-300' : 'text-amber-300';
  const canAccessProjectConfig = Boolean(projectReady);

  const configCards = [
    {
      id: 'actions',
      title: 'Actions',
      description: 'Configure quick commands and CLI entry points.',
      icon: SquareTerminal,
      onClick: onOpenActions,
      disabled: false,
    },
    {
      id: 'gates',
      title: 'Gates',
      description: 'Define lifecycle gate checks for draft, active, and archived.',
      icon: ShieldCheck,
      onClick: onOpenGates,
      disabled: !canAccessProjectConfig,
    },
    {
      id: 'softlinks',
      title: 'Softlinks',
      description: 'Manage local directory links for new worktrees.',
      icon: Link2,
      onClick: onOpenSoftlinks,
      disabled: !canAccessProjectConfig,
    },
  ];

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
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="rounded-full border border-border px-2 py-0.5">
              {projectReady ? 'Project Ready' : 'Project Not Ready'}
            </span>
            <span className={`rounded-full border border-border px-2 py-0.5 ${tmuxTone}`}>
              {tmuxLabel}
            </span>
          </div>
        </section>

        <section className="mt-6">
          <div className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Configuration
          </div>
          <div className="mt-3 grid gap-3">
            {configCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  data-testid={`settings-card-${card.id}`}
                  onClick={card.onClick}
                  disabled={card.disabled}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-xs transition-colors ${
                    card.disabled
                      ? 'cursor-not-allowed border-border/60 bg-muted/10 text-muted-foreground/60'
                      : 'border-border bg-muted/20 text-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className="mt-0.5 rounded-md border border-border/60 bg-background/60 p-2">
                    <Icon size={14} className={card.disabled ? 'opacity-50' : 'text-primary'} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{card.title}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {card.description}
                    </div>
                    {card.disabled ? (
                      <div className="mt-1 text-[10px] text-amber-200/70">
                        Select a project to configure this area.
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
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
