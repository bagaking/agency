import React from 'react';
import { GateList } from '../GateList';

export function LifecycleConfirmModal({ transition, error, loading, onCancel, onConfirm, onRefresh }: any) {
  const { cell, nextState, gates } = transition;
  const requiresGates = ['active', 'archived'].includes(nextState);
  const failedGates = (gates || []).filter((gate) => !gate.passed);
  const canProceed = !requiresGates || (failedGates.length === 0 && !error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Confirm Lifecycle Transition</h3>
            <p className="text-xs text-muted-foreground">
              {cell?.name} · {cell?.branch}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          Target state: <span className="font-semibold text-foreground">{nextState}</span>
          <span className="mx-2 text-muted-foreground/40">|</span>
          Lifecycle file will be updated after confirmation.
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gate Checks
            </h4>
            <button type="button" onClick={onRefresh} className="text-xs text-primary hover:underline">
              Recheck
            </button>
          </div>
          <div className="mt-3">
            <GateList gates={gates} emptyLabel="Gate status unavailable. Recheck to refresh." />
          </div>
          {!canProceed && requiresGates ? (
            <p className="mt-3 text-xs text-amber-300">
              Fix the failing gates before moving to {nextState}.
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={!canProceed || loading}
          >
            {loading ? 'Updating...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
