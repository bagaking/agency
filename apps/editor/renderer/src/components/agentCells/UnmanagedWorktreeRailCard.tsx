import React from 'react';
import { GitBranch } from 'lucide-react';

import {
  buildAgentCellsBadgeClass,
  buildAgentCellsGhostControlClass,
  buildAgentCellsIconWellClass,
  buildAgentCellsPrimaryActionClass,
  buildAgentCellsWorkspacePanelClass,
} from './surfaceTokens';
import { pathBaseName } from './unmanagedWorktreePresentation';
import type { UnmanagedWorktreeRailModel } from './railModels';

type UnmanagedWorktreeRailCardProps = {
  model: UnmanagedWorktreeRailModel;
  onBind?: (worktree: any) => void;
  onCreate?: (worktree: any) => void;
  onIgnore?: (worktreePath: string) => void;
};

export function UnmanagedWorktreeRailCard({
  model,
  onBind,
  onCreate,
  onIgnore,
}: UnmanagedWorktreeRailCardProps) {
  const { worktree, display } = model;
  return (
    <div
      data-testid={`unmanaged-worktree-${pathBaseName(worktree.path)}`}
      className={`${buildAgentCellsWorkspacePanelClass({
        selected: false,
        tone: 'unmanaged',
      })} px-3 py-2.5`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] ${buildAgentCellsIconWellClass(
            'unmanaged'
          )}`}
        >
          <GitBranch size={14} strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-[12px] font-semibold text-foreground">{display.title}</div>
            <span
              className={buildAgentCellsBadgeClass(
                display.detachedHeadLabel ? 'detached' : 'unmanaged'
              )}
            >
              {display.detachedHeadLabel || display.branchLabel}
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground/72">{worktree.path}</div>
          {display.helperText ? (
            <div className="mt-1 text-[10px] leading-4 text-muted-foreground/72">{display.helperText}</div>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {display.primaryAction === 'bind' ? (
              <button
                type="button"
                onClick={() => onBind?.(worktree)}
                className={buildAgentCellsPrimaryActionClass('sky')}
              >
                {display.primaryLabel}
              </button>
            ) : null}
            {display.primaryAction === 'create' ? (
              <button
                type="button"
                onClick={() => onCreate?.(worktree)}
                className={buildAgentCellsPrimaryActionClass('sky')}
              >
                {display.primaryLabel}
              </button>
            ) : null}
            {display.secondaryCreateLabel ? (
              <button
                type="button"
                onClick={() => onCreate?.(worktree)}
                className={buildAgentCellsGhostControlClass()}
              >
                {display.secondaryCreateLabel}
              </button>
            ) : null}
            {display.availabilityLabel ? (
              <span className={buildAgentCellsBadgeClass('detached')}>
                {display.availabilityLabel}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onIgnore?.(worktree.path)}
              className={buildAgentCellsGhostControlClass()}
            >
              Ignore For Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
