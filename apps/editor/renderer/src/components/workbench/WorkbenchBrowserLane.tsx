import React from 'react';

import { focusRing } from '../ui/focusRing';

type BrowserSurfaceState = {
  title?: string;
  phase?: 'hidden' | 'loading' | 'ready' | 'error' | 'crashed' | 'disposed';
  error?: string;
};

type BrowserSurfaceHandle = {
  browserSurfaceAvailable: boolean;
  surfaceState: BrowserSurfaceState;
} | null;

type WorkbenchBrowserLaneProps = {
  browserSurface: BrowserSurfaceHandle;
  slotRef?: React.MutableRefObject<HTMLDivElement | null>;
  suspended?: boolean;
  onReload: () => void;
  onOpenReader: () => void;
  onOpenInBrowser: () => void;
};

const focusRingClass = focusRing.dark;

export function WorkbenchBrowserLane({
  browserSurface,
  slotRef,
  suspended = false,
  onReload,
  onOpenReader,
  onOpenInBrowser,
}: WorkbenchBrowserLaneProps) {
  const surface = browserSurface?.surfaceState || {};
  const browserSurfaceAvailable = Boolean(browserSurface?.browserSurfaceAvailable);
  const liveSurfaceFailed = surface.phase === 'error' || surface.phase === 'crashed';

  if (suspended) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-white px-8 text-center text-slate-700">
        <div className="max-w-lg space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            View Paused
          </div>
          <div className="text-sm font-medium text-slate-900">
            Browser view is temporarily hidden while Agency finishes the current action.
          </div>
        </div>
      </div>
    );
  }

  if (!browserSurfaceAvailable) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-white px-8 text-center text-slate-700">
        <div className="max-w-lg space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Browser Surface Unavailable
          </div>
          <div className="text-sm font-medium text-slate-900">
            This build does not currently expose the native browser host.
          </div>
          <div className="text-sm text-slate-600">
            Use Reader or open the page in the system browser until the browser surface is available.
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenReader}
            className={`rounded-full border border-slate-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 ${focusRingClass}`}
          >
            Open Reader
          </button>
          <button
            type="button"
            onClick={onOpenInBrowser}
            className={`rounded-full border border-slate-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 ${focusRingClass}`}
          >
            Open in Browser
          </button>
        </div>
      </div>
    );
  }

  if (liveSurfaceFailed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-white px-8 text-center text-slate-700">
        <div className="max-w-lg space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            View Failed
          </div>
          <div className="text-sm font-medium text-slate-900">
            The native browser surface could not load this page.
          </div>
          <div className="text-sm text-slate-600">
            {surface.error || 'Switch to Reader, open it in the system browser, or try another URL.'}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onReload}
            className={`rounded-full border border-slate-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 ${focusRingClass}`}
          >
            Retry View
          </button>
          <button
            type="button"
            onClick={onOpenInBrowser}
            className={`rounded-full border border-slate-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 ${focusRingClass}`}
          >
            Open in Browser
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={slotRef || null} className="absolute inset-0 overflow-hidden bg-white">
      <div
        data-testid="workbench-browser-surface-host"
        className="absolute inset-0"
      />
      {surface.phase === 'loading' ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-black/10 bg-white/88 px-2.5 py-1 text-[10px] font-medium text-slate-600 shadow-sm">
          Loading page
        </div>
      ) : null}
    </div>
  );
}
