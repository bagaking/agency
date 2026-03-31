import React from 'react';
import { FolderOpen, Layers3 } from 'lucide-react';

import { Logo } from './Logo';

export function ProjectEmptyState({ title, description, error, onSelect }: any) {
  const resolvedTitle = String(title || 'No project selected').trim() || 'No project selected';
  const resolvedDescription =
    String(description || '').trim() ||
    'Select a repository to unlock project-backed files, Cells, sessions, and memo workflows.';

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_30%),linear-gradient(180deg,#0a0c10,#11151c)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:36px_36px] opacity-[0.18]" />
      <div className="relative flex flex-1 items-center justify-center px-8 py-10">
        <div className="w-full max-w-[720px] rounded-[30px] border border-white/[0.08] bg-black/20 p-8 shadow-[0_30px_90px_-32px_rgba(0,0,0,0.82)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-500/[0.08] text-cyan-100">
              <Logo size={22} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">
                Project Required
              </div>
              <div className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-white">
                {resolvedTitle}
              </div>
            </div>
          </div>

          <div className="mt-5 max-w-[560px] text-[14px] leading-7 text-white/62">
            {resolvedDescription}
          </div>

          {error ? (
            <div className="mt-5 inline-flex rounded-full border border-rose-300/20 bg-rose-500/10 px-4 py-2 text-[11px] text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSelect}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/[0.12] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-50 transition-colors hover:bg-cyan-500/[0.18]"
            >
              <FolderOpen size={14} />
              <span>Select Project</span>
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-white/46">
              <Layers3 size={12} />
              <span>Project Home remains the primary recovery surface</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
