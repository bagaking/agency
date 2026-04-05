import React from 'react';
import {
  FolderOpen,
  SquareTerminal,
  Link2,
  Box,
  Cpu,
  HardDrive,
  AlertCircle,
  ArrowRight,
  Command,
  MessageSquareText,
  ServerCog,
} from 'lucide-react';
import { RecentProjectsList } from './RecentProjectsList';

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
  onOpenHarnessProviders,
  onOpenAppShortcuts,
  onOpenReplyQuickPrompts,
  onOpenSoftlinks,
}: any) {
  const hasProject = Boolean(projectRoot);
  const projectName = hasProject ? basename(projectRoot) : 'No project selected';
  const tmuxLabel = tmuxStatus?.available ? tmuxStatus.version || 'tmux active' : 'tmux missing';
  const canAccessProjectConfig = Boolean(projectReady);
  const projectActionLabel = hasProject ? 'Switch Project' : 'Open Project';
  const workspaceHeadline = hasProject ? projectName : 'Workspace Settings';
  const workspaceSummary = hasProject
    ? 'Adjust repo-scoped runtime behavior, providers, and shared workspace controls.'
    : 'Open a repository to unlock repo-backed settings, worktree tools, and session configuration.';
  const workspaceModeLabel = hasProject ? 'Repository linked' : 'Project home only';
  const systemFacts = [
    {
      id: 'root',
      label: 'Repository Root',
      value: projectRoot || 'No repository selected',
      tone: 'text-foreground',
      muted: true,
    },
    {
      id: 'runtime',
      label: 'Runtime',
      value: tmuxLabel,
      tone: tmuxStatus?.available ? 'text-emerald-400' : 'text-amber-300',
      muted: false,
    },
    {
      id: 'scope',
      label: 'Config Scope',
      value: canAccessProjectConfig
        ? 'Project settings are writable in this window'
        : 'Select a repository to enable project-scoped controls',
      tone: canAccessProjectConfig ? 'text-blue-300' : 'text-muted-foreground',
      muted: false,
    },
  ];

  const configCards = [
    {
      id: 'actions',
      title: 'Terminus',
      description: 'Define custom scripts and automation entry points.',
      icon: SquareTerminal,
      onClick: onOpenActions,
      disabled: false,
      color: 'text-blue-400',
      bg: 'group-hover:bg-blue-500/10'
    },
    {
      id: 'harness-providers',
      title: 'Harness Providers',
      description: 'Configure the global Codex provider endpoint, model, and API key used by agent-backed runs.',
      icon: ServerCog,
      onClick: onOpenHarnessProviders,
      disabled: false,
      color: 'text-sky-400',
      bg: 'group-hover:bg-sky-500/10'
    },
    {
      id: 'app-shortcuts',
      title: 'App Shortcuts',
      description: 'Configure global shortcuts for capture and memo actions.',
      icon: Command,
      onClick: onOpenAppShortcuts,
      disabled: false,
      color: 'text-indigo-400',
      bg: 'group-hover:bg-indigo-500/10'
    },
    {
      id: 'reply-quick-prompts',
      title: 'Reply Quick Prompts',
      description: 'Define scoped prompt snippets for Session Reply composer.',
      icon: MessageSquareText,
      onClick: onOpenReplyQuickPrompts,
      disabled: false,
      color: 'text-cyan-400',
      bg: 'group-hover:bg-cyan-500/10'
    },
    {
      id: 'softlinks',
      title: 'Directory Softlinks',
      description: 'Sync untracked state directories across worktrees.',
      icon: Link2,
      onClick: onOpenSoftlinks,
      disabled: !canAccessProjectConfig,
      color: 'text-purple-400',
      bg: 'group-hover:bg-purple-500/10'
    },
  ];

  return (
    <main className="flex h-full flex-1 flex-col bg-background overflow-hidden select-none">
      <header className="flex min-h-[92px] shrink-0 items-center justify-between gap-6 border-b border-border/15 px-10 py-6">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/58">
            Workspace Settings
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <h1 className="truncate text-[28px] font-semibold tracking-[-0.05em] text-foreground">
              {workspaceHeadline}
            </h1>
            <span className="rounded-full border border-border/30 bg-muted/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/78">
              {workspaceModeLabel}
            </span>
          </div>
          <p className="mt-2 max-w-[44rem] text-[13px] leading-6 text-muted-foreground">
            {workspaceSummary}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenProject}
            className="group flex items-center gap-2 rounded-full border border-border/30 bg-foreground px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-background transition-colors hover:bg-primary hover:text-white active:scale-95"
          >
            <FolderOpen size={12} strokeWidth={3} />
            {projectActionLabel}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 custom-scrollbar">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.85fr)]">
          <div className="rounded-3xl border border-border/20 bg-card/35 p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.55)]">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/20 bg-muted/10 text-primary">
                  <Box size={26} strokeWidth={1.5} />
                </div>
                {projectReady ? (
                  <div className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-[3px] border-background bg-emerald-500" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="truncate text-[22px] font-semibold tracking-[-0.04em] text-foreground">
                    {projectName}
                  </h2>
                  <span className="rounded-full border border-border/25 bg-muted/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/76">
                    {workspaceModeLabel}
                  </span>
                </div>

                <p className="mt-2 max-w-[46rem] text-[13px] leading-6 text-muted-foreground">
                  {hasProject
                    ? 'This window is attached to one repository. Core runtime and workspace controls stay project-scoped here.'
                    : 'Pick a repository first. Once selected, the same window exposes repo-backed configuration and worktree management.'}
                </p>

                <div className="mt-5 rounded-2xl border border-border/20 bg-muted/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/56">
                    <HardDrive size={11} />
                    Repository Root
                  </div>
                  <div className="mt-2 truncate font-mono text-[12px] text-foreground/88">
                    {projectRoot || 'No repository selected'}
                  </div>
                </div>
              </div>
            </div>

            {projectError ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
                <AlertCircle size={13} />
                <span>{projectError}</span>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-border/20 bg-card/35 p-5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.55)]">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/58">
              System Status
            </div>
            <div className="mt-4 space-y-3">
              {systemFacts.map((fact) => (
                <div
                  key={fact.id}
                  className="rounded-2xl border border-border/15 bg-muted/10 px-4 py-3"
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/56">
                    {fact.label}
                  </div>
                  <div
                    className={`mt-1 text-[12px] leading-5 ${
                      fact.muted ? 'font-mono text-foreground/82' : `font-medium ${fact.tone}`
                    }`}
                  >
                    {fact.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4 px-1">
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 whitespace-nowrap">Core Controls</h4>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-border/20 to-transparent" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {configCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={card.onClick}
                  disabled={card.disabled}
                  data-testid={`settings-card-${card.id}`}
                  className={`group relative flex flex-col items-start p-5 rounded-2xl transition-all duration-300 text-left ${
                    card.disabled
                      ? 'opacity-40 grayscale cursor-not-allowed bg-muted/5'
                      : 'bg-card/40 hover:bg-card/80 border border-border/20 hover:border-border/40 hover:-translate-y-0.5 hover:shadow-lg'
                  }`}
                >
                  <div className={`mb-4 rounded-lg p-2.5 bg-muted/10 transition-all duration-300 ${card.bg}`}>
                    <Icon size={18} strokeWidth={1.5} className={`${card.color} group-hover:scale-110 transition-transform duration-300`} />
                  </div>
                  <div className="text-sm font-bold text-foreground mb-1 tracking-tight group-hover:text-primary transition-colors">{card.title}</div>
                  <p className="text-[11px] leading-snug text-muted-foreground/70 mb-4 line-clamp-2">
                    {card.description}
                  </p>
                  
                  {!card.disabled && (
                      <div className="mt-auto flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100 transition-all">
                          Manage <ArrowRight size={10} />
                      </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* History: Compact List */}
        <div className="pt-2">
            <RecentProjectsList
                projects={recentProjects}
                onOpen={onOpenRecent}
                title="Workspace History"
                emptyLabel="History Empty"
            />
        </div>
      </div>
    </main>
  );
}
