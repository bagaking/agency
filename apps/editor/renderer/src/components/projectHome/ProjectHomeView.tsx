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
    ? 'bg-[linear-gradient(160deg,rgba(32,193,255,0.18),rgba(255,255,255,0.045))] shadow-[0_26px_70px_-34px_rgba(17,24,39,0.72)]'
    : 'bg-white/[0.045] shadow-[0_24px_70px_-40px_rgba(15,23,42,0.72)]';

  return (
    <button
      type="button"
      disabled={!exists || !path}
      onClick={() => {
        if (exists && path) {
          onOpen?.(path);
        }
      }}
      className={`group flex min-h-[180px] w-full min-w-0 break-inside-avoid flex-col justify-between rounded-[26px] p-5 text-left transition-all ${
        exists
          ? `${accentClass} hover:-translate-y-0.5 hover:bg-white/[0.06]`
          : 'cursor-not-allowed bg-rose-500/[0.07] opacity-55'
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
        <div className="rounded-full bg-black/20 p-2 text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <FolderOpen size={15} />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="line-clamp-3 break-words text-[11px] leading-5 text-white/54">{path}</div>
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

  return (
    <main className="relative flex h-full flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_36%),linear-gradient(180deg,#0a0c10,#11151c)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:36px_36px] opacity-[0.18]" />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-8">
        <div className="mx-auto flex w-full max-w-[1360px] min-h-0 flex-1 flex-col gap-6">
          <div className="rounded-[34px] bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-6 py-6 shadow-[0_34px_100px_-48px_rgba(15,23,42,0.92)]">
            <div className="flex flex-col gap-5">
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

              <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <button
                  type="button"
                  onClick={onSelectProject}
                  className="flex items-center justify-between rounded-[24px] bg-cyan-500/[0.14] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-cyan-500/[0.18]"
                >
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-50/72">
                      Primary Action
                    </div>
                    <div className="mt-2 text-[16px] font-semibold text-white">Select Project</div>
                  </div>
                  <FolderOpen size={18} className="shrink-0 text-cyan-50" />
                </button>

                <button
                  type="button"
                  onClick={shellSummary?.visible ? onCloseHomeShell : onOpenHomeShell}
                  className="flex items-center justify-between rounded-[24px] bg-white/[0.06] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-white/[0.085]"
                >
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/48">
                      Window Tool
                    </div>
                    <div className="mt-2 text-[16px] font-semibold text-white">
                      {shellSummary?.visible ? 'Close Home Shell' : 'Start Home Shell'}
                    </div>
                  </div>
                  <SquareTerminal size={18} className="shrink-0 text-white/78" />
                </button>

                <div className="rounded-[24px] bg-black/[0.16] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    Window Scope
                  </div>
                  <div className="mt-2 text-[13px] font-medium text-white/82">{shellSummary?.cwd || homePath}</div>
                  <div className="mt-2 text-[11px] leading-6 text-white/52">
                    Window-owned shell. Not attached to any Project, Cell, or Session.
                  </div>
                  {shellSummary?.error ? (
                    <div className="mt-3 text-[11px] text-rose-100">{shellSummary.error}</div>
                  ) : null}
                </div>
              </div>
            </div>
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
                  <div className="mt-1 text-[15px] font-semibold text-white">
                    Fast resume path for this window
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
          </div>
        </div>
      </div>
    </main>
  );
}
