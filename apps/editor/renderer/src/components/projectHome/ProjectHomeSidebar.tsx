import React from 'react';
import { FolderOpen, House, SquareTerminal } from 'lucide-react';

import { RecentProjectsList } from '../RecentProjectsList';

export function ProjectHomeSidebar({
  projectError,
  recentProjects,
  onSelectProject,
  onOpenRecentProject,
  onOpenHomeShell,
  onCloseHomeShell,
  shellSummary,
}: any) {
  const shellVisible = Boolean(shellSummary?.visible);
  const shellActionLabel = shellVisible
    ? 'Close Home Shell'
    : shellSummary?.status === 'ready'
      ? 'Home Shell Ready'
      : shellSummary?.status === 'starting'
        ? 'Starting Home Shell'
        : shellSummary?.status === 'exited'
          ? 'Restart Home Shell'
          : 'Start Home Shell';

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-[linear-gradient(180deg,#10151d,#0c1016)] text-sidebar-foreground">
      <div className="border-b border-white/[0.06] px-4 py-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/52">
          <House size={12} />
          <span>Project Home</span>
        </div>
        <div className="mt-3 text-[16px] font-semibold tracking-[-0.02em] text-white">
          Open a repository or start a scratch shell for this window.
        </div>
        <div className="mt-2 text-[11px] text-white/52">No project selected</div>
        {projectError ? (
          <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
            {projectError}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={onSelectProject}
            className="flex items-center justify-between rounded-[20px] border border-cyan-300/20 bg-cyan-500/[0.1] px-3.5 py-3.5 text-left transition-colors hover:bg-cyan-500/[0.14]"
          >
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Primary Action
              </div>
              <div className="mt-1 text-[12px] font-semibold text-white">Select Project</div>
            </div>
            <FolderOpen size={16} className="text-cyan-100" />
          </button>
          <button
            type="button"
            onClick={shellVisible ? onCloseHomeShell : onOpenHomeShell}
            className="flex items-center justify-between rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-3.5 text-left transition-colors hover:bg-white/[0.07]"
          >
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/44">
                Window Tool
              </div>
              <div className="mt-1 text-[12px] font-semibold text-white">{shellActionLabel}</div>
            </div>
            <SquareTerminal size={16} className="text-white/76" />
          </button>
        </div>

        <div className="rounded-[22px] border border-white/[0.06] bg-black/[0.16] px-3.5 py-3.5">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/42">
            Window Scope
          </div>
          <div className="mt-2 text-[11px] text-white/82">{shellSummary?.cwd || 'Home directory'}</div>
          <div className="mt-1 text-[10px] text-white/44">
            Window-owned shell. Not attached to any Project, Cell, or Session.
          </div>
        </div>

        <div className="rounded-[22px] border border-white/[0.04] bg-black/[0.08] px-2.5 py-3">
          <RecentProjectsList
            projects={recentProjects}
            onOpen={onOpenRecentProject}
            title="Recent Projects"
            emptyLabel="No recent projects yet"
          />
        </div>
      </div>
    </aside>
  );
}
