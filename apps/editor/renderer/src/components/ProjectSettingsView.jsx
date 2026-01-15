import React from 'react';
import { FolderOpen, RefreshCw, ShieldCheck, SquareTerminal, Link2, Box, Cpu, HardDrive, AlertCircle, ArrowRight } from 'lucide-react';
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
  const projectName = hasProject ? basename(projectRoot) : 'No Workspace';
  const tmuxLabel = tmuxStatus?.available ? tmuxStatus.version || 'tmux active' : 'tmux missing';
  const canAccessProjectConfig = Boolean(projectReady);

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
      id: 'gates',
      title: 'Lifecycle Gates',
      description: 'Enforce compliance checks for agent state transitions.',
      icon: ShieldCheck,
      onClick: onOpenGates,
      disabled: !canAccessProjectConfig,
      color: 'text-emerald-400',
      bg: 'group-hover:bg-emerald-500/10'
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
      {/* Tightened Header */}
      <header className="flex h-20 shrink-0 items-center justify-between px-10 border-b border-border/10">
        <div className="flex flex-col">
          <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/40 mb-1">System Console</h2>
          <div className="text-2xl font-bold text-foreground tracking-tighter italic leading-none">Settings_</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenProject}
            className="group flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all hover:bg-primary hover:text-white active:scale-95 shadow-xl"
          >
            <FolderOpen size={12} strokeWidth={3} />
            Initialize
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 custom-scrollbar">
        {/* Compact Hero Section */}
        <section className="relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent rounded-2xl blur-lg opacity-50" />
            <div className="relative z-10 bg-card/40 backdrop-blur-xl rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden border border-border/30 shadow-sm">
                <Box size={160} className="absolute -right-12 -bottom-12 text-foreground/[0.02] -rotate-12 pointer-events-none" />
                
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/10 text-primary shadow-xl ring-1 ring-border/10">
                            <Box size={28} strokeWidth={1.5} />
                        </div>
                        {projectReady && <div className="absolute -top-0.5 -right-1.5 h-3 w-3 bg-emerald-500 rounded-full border-[3px] border-background animate-pulse" />}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                        <h3 className="text-xl font-black tracking-tighter text-foreground mb-1 truncate uppercase">{projectName}</h3>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-muted/10 px-2 py-0.5 rounded-md border border-border/10">
                                <HardDrive size={10} className="text-muted-foreground/50" />
                                <span className="truncate max-w-[200px]">{projectRoot || 'Root Unmapped'}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-muted/10 border border-border/10 ${tmuxStatus?.available ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>
                                <Cpu size={10} />
                                {tmuxLabel}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {projectError && (
                <div className="mt-2 mx-4 flex items-center gap-2 text-rose-400 text-[10px] font-medium bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 animate-slide-down">
                    <AlertCircle size={12} />
                    {projectError}
                </div>
            )}
        </section>

        {/* Action Grid: More Dense */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-1">
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 whitespace-nowrap">Core Automations</h4>
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
