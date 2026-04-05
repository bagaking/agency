import React from 'react';
import { FolderOpen, History, House, MoveRight, SquareTerminal } from 'lucide-react';

import { formatRelativeTime } from '../RecentProjectsList';
import { WindowHomeShellPane } from './WindowHomeShellPane';
import { resolveHomeShellActionLabel, resolveHomeShellStatusLabel } from './homeShellLabels';

function ProjectCard({
  project,
  featured = false,
  onOpen,
}: {
  project: any;
  featured?: boolean;
  onOpen?: (path: string) => void;
}) {
  const path = String(project?.path || '').trim();
  const title = String(project?.name || '').trim() || 'Workspace';
  const exists = project?.exists !== false;
  const lastOpened = formatRelativeTime(project?.lastOpenedAt);
  const accentClass = featured
    ? 'bg-[linear-gradient(160deg,rgba(32,193,255,0.14),rgba(255,255,255,0.04))] shadow-[0_24px_60px_-38px_rgba(17,24,39,0.72)]'
    : 'bg-white/[0.035] shadow-[0_18px_48px_-40px_rgba(15,23,42,0.68)]';

  return (
    <button
      type="button"
      disabled={!exists || !path}
      onClick={() => {
        if (exists && path) {
          onOpen?.(path);
        }
      }}
      className={`group flex min-h-[156px] w-full min-w-0 break-inside-avoid flex-col justify-between rounded-[24px] border border-white/[0.05] p-5 text-left transition-all ${
        exists
          ? `${accentClass} hover:-translate-y-0.5 hover:border-white/[0.1] hover:bg-white/[0.06]`
          : 'cursor-not-allowed bg-rose-500/[0.07] opacity-55'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/44">
            <FolderOpen size={11} className="opacity-72" />
            <span>
              {featured ? 'Resume First' : 'Recent Project'}
            </span>
          </div>
          <div className="mt-2 truncate text-[18px] font-semibold tracking-[-0.025em] text-white">
            {title}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="line-clamp-3 break-words text-[11px] leading-5 text-white/56">{path}</div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/38">
            <History size={11} />
            <span className="truncate">{lastOpened ? `${lastOpened} ago` : 'recently used'}</span>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/68">
            <span>{exists ? 'Open' : 'Offline'}</span>
            {exists ? <MoveRight size={12} /> : null}
          </div>
        </div>
      </div>
    </button>
  );
}

export function ProjectHomeView({
  homePath,
  recentProjects,
  projectError,
  onSelectProject,
  onOpenRecentProject,
  shellSummary,
  onOpenHomeShell,
  onCloseHomeShell,
  onHomeShellReady,
  onHomeShellExit,
  onHomeShellError,
}: any) {
  const projects = Array.isArray(recentProjects) ? recentProjects : [];
  const featuredProject = projects[0] || null;
  const secondaryProjects = featuredProject ? projects.slice(1) : projects;
  const shellLabel = resolveHomeShellStatusLabel(shellSummary);
  const shellActionLabel = resolveHomeShellActionLabel(shellSummary);
  const shellDetail = shellSummary?.cwd || homePath || 'Home directory';

  return (
    <main className="relative flex h-full flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_36%),linear-gradient(180deg,#0a0c10,#11151c)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:36px_36px] opacity-[0.18]" />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-8">
        <div className="mx-auto flex w-full max-w-[1360px] min-h-0 flex-1 flex-col gap-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
            <section className="rounded-[34px] border border-white/[0.06] bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-6 py-6 shadow-[0_34px_100px_-48px_rgba(15,23,42,0.92)]">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/54">
                  <House size={12} />
                  <span>Project Home</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <h1 className="text-[32px] font-semibold tracking-[-0.045em] text-white">
                    Choose a repository for this window.
                  </h1>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/62">
                    Window-owned
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-[14px] leading-7 text-white/62">
                  Until a repository is selected, this window stays outside project-backed Cell and
                  Session storage. The recovery path is explicit: open a repo, or use a clean home
                  shell scoped only to this window.
                </p>
                {projectError ? (
                  <div className="mt-4 inline-flex rounded-full border border-rose-300/20 bg-rose-500/10 px-4 py-2 text-[11px] text-rose-100">
                    {projectError}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onSelectProject}
                  className="flex min-w-[248px] items-center justify-between rounded-[24px] border border-cyan-300/12 bg-cyan-500/[0.14] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-cyan-500/[0.18]"
                >
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-50/72">
                      Primary Action
                    </div>
                    <div className="mt-2 text-[16px] font-semibold text-white">Open Project</div>
                  </div>
                  <FolderOpen size={18} className="shrink-0 text-cyan-50" />
                </button>

                <button
                  type="button"
                  onClick={shellSummary?.visible ? onCloseHomeShell : onOpenHomeShell}
                  className="flex min-w-[248px] items-center justify-between rounded-[24px] border border-white/[0.06] bg-white/[0.06] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-white/[0.085]"
                >
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/48">
                      Window Tool
                    </div>
                    <div className="mt-2 text-[16px] font-semibold text-white">{shellActionLabel}</div>
                  </div>
                  <SquareTerminal size={18} className="shrink-0 text-white/78" />
                </button>
              </div>
            </section>

            <section className="rounded-[34px] border border-white/[0.06] bg-black/[0.18] p-5 shadow-[0_30px_80px_-44px_rgba(15,23,42,0.88)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/44">
                Window Scope
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.035] px-4 py-3">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/44">
                    Mode
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-white">{shellLabel}</div>
                  {shellSummary?.error ? (
                    <div className="mt-2 text-[11px] leading-5 text-rose-200/88">{shellSummary.error}</div>
                  ) : null}
                </div>
                <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.035] px-4 py-3">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/44">
                    Working Directory
                  </div>
                  <div className="mt-1 break-all font-mono text-[12px] text-white/78">{shellDetail}</div>
                </div>
                <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.035] px-4 py-3 text-[11px] leading-6 text-white/56">
                  Home shell state is window-owned. It does not create repo-backed Project, Cell,
                  or Session records until you explicitly open a repository.
                </div>
              </div>
            </section>
          </div>

          {shellSummary?.visible ? (
            <section className="rounded-[30px] bg-black/[0.2] p-4 shadow-[0_34px_90px_-46px_rgba(15,23,42,0.88)]">
              <WindowHomeShellPane
                visible={shellSummary.visible}
                homePath={homePath}
                onClose={onCloseHomeShell}
                onReady={onHomeShellReady}
                onExit={onHomeShellExit}
                onError={onHomeShellError}
              />
            </section>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col">
            <section className="flex min-h-0 flex-1 flex-col rounded-[30px] bg-black/[0.16] p-5 shadow-[0_30px_90px_-36px_rgba(0,0,0,0.72)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    Recent Projects
                  </div>
                  <div className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-white">
                    Resume a repository directly into this window
                  </div>
                </div>
                <div className="text-[11px] text-white/44">{projects.length} tracked</div>
              </div>

              {projects.length ? (
                <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {featuredProject ? (
                    <div className="md:col-span-2 xl:col-span-3">
                      <ProjectCard
                        project={featuredProject}
                        featured={true}
                        onOpen={onOpenRecentProject}
                      />
                    </div>
                  ) : null}
                  {secondaryProjects.map((project: any) => (
                    <ProjectCard
                      key={project?.path || project?.name}
                      project={project}
                      onOpen={onOpenRecentProject}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-[24px] bg-white/[0.025] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                      No Recent Projects
                    </div>
                    <div className="mt-3 text-[14px] text-white/62">
                      Open a repository once and it will stay here as the fastest recovery path for this window.
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
