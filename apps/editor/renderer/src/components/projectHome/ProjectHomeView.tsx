import React from 'react';
import { FolderOpen, History, House, MoveRight, SquareTerminal } from 'lucide-react';

import { formatRelativeTime } from '../RecentProjectsList';
import { WindowHomeShellPane } from './WindowHomeShellPane';

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
    ? 'border-cyan-300/22 bg-[linear-gradient(160deg,rgba(32,193,255,0.12),rgba(255,255,255,0.03))]'
    : 'border-white/[0.08] bg-white/[0.035]';

  return (
    <button
      type="button"
      disabled={!exists || !path}
      onClick={() => {
        if (exists && path) {
          onOpen?.(path);
        }
      }}
      className={`group flex min-h-[160px] w-full break-inside-avoid flex-col justify-between rounded-[24px] border p-5 text-left transition-all ${
        exists
          ? `${accentClass} hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.06]`
          : 'cursor-not-allowed border-rose-300/14 bg-rose-500/[0.06] opacity-55'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/42">
            {featured ? 'Resume Fast' : 'Recent Project'}
          </div>
          <div className="mt-2 truncate text-[19px] font-semibold tracking-[-0.02em] text-white">
            {title}
          </div>
        </div>
        <div className="rounded-full border border-white/[0.08] bg-white/[0.05] p-2 text-white/72">
          <FolderOpen size={15} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="line-clamp-2 text-[11px] leading-5 text-white/54">{path}</div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/38">
            <History size={11} />
            <span>{lastOpened ? `${lastOpened} ago` : 'recently used'}</span>
          </div>
          <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/68">
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

  return (
    <main className="relative flex h-full flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_36%),linear-gradient(180deg,#0a0c10,#11151c)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:36px_36px] opacity-[0.18]" />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-8">
        <div className="mx-auto flex w-full max-w-[1360px] min-h-0 flex-1 flex-col gap-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/54">
                <House size={12} />
                <span>Project Home</span>
              </div>
              <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] text-white">
                Pick up a repository fast, or open one clean scratch shell for this window.
              </h1>
              <div className="mt-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/48">
                No project selected
              </div>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-white/62">
                No fake Cells, no fake Sessions. Until a project is selected, this window stays in
                a window-owned home state with clear recovery paths.
              </p>
              {projectError ? (
                <div className="mt-4 inline-flex rounded-full border border-rose-300/20 bg-rose-500/10 px-4 py-2 text-[11px] text-rose-100">
                  {projectError}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onSelectProject}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/[0.12] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-50 transition-colors hover:bg-cyan-500/[0.18]"
              >
                <FolderOpen size={14} />
                <span>Select Project</span>
              </button>
              <button
                type="button"
                onClick={shellSummary?.visible ? onCloseHomeShell : onOpenHomeShell}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82 transition-colors hover:bg-white/[0.08]"
              >
                <SquareTerminal size={14} />
                <span>{shellSummary?.visible ? 'Close Home Shell' : 'Start Home Shell'}</span>
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
            <section className="flex min-h-0 flex-col rounded-[30px] border border-white/[0.08] bg-black/18 p-5 shadow-[0_30px_90px_-28px_rgba(0,0,0,0.7)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    Recent Projects
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-white">
                    Fast resume path for this window
                  </div>
                </div>
                <div className="text-[11px] text-white/44">{projects.length} tracked</div>
              </div>

              {projects.length ? (
                <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-2">
                  {featuredProject ? (
                    <div className="md:col-span-2">
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
                <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-[24px] border border-dashed border-white/[0.08] bg-white/[0.02] text-center">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                      No Recent Projects
                    </div>
                    <div className="mt-3 text-[14px] text-white/62">
                      Open a repository once and it will land here for fast recovery.
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="flex min-h-0 flex-col gap-4">
              <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                  Window Shell
                </div>
                <div className="mt-2 text-[16px] font-semibold text-white">
                  {shellSummary?.isRunning ? 'Scratch shell ready' : 'Optional shell before project selection'}
                </div>
                <div className="mt-3 text-[12px] leading-6 text-white/58">
                  The shell runs from your home directory and stays window-owned. It never creates
                  repo-backed Cell or Session records.
                </div>
                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/16 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                    Scope
                  </div>
                  <div className="mt-2 text-[12px] text-white/78">{shellSummary?.cwd || homePath}</div>
                  {shellSummary?.error ? (
                    <div className="mt-3 text-[11px] text-rose-100">{shellSummary.error}</div>
                  ) : null}
                </div>
              </div>

              {shellSummary?.visible ? (
                <WindowHomeShellPane
                  visible={shellSummary.visible}
                  homePath={homePath}
                  onClose={onCloseHomeShell}
                  onReady={onHomeShellReady}
                  onExit={onHomeShellExit}
                  onError={onHomeShellError}
                />
              ) : (
                <button
                  type="button"
                  onClick={onOpenHomeShell}
                  className="flex min-h-[320px] flex-1 flex-col items-center justify-center rounded-[28px] border border-dashed border-white/[0.08] bg-white/[0.02] text-center transition-colors hover:bg-white/[0.04]"
                >
                  <div className="rounded-full border border-white/[0.08] bg-white/[0.04] p-4 text-white/72">
                    <SquareTerminal size={22} />
                  </div>
                  <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    Home Shell
                  </div>
                  <div className="mt-2 text-[14px] text-white/64">
                    Start a scratch shell without inventing a fake Cell.
                  </div>
                </button>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
