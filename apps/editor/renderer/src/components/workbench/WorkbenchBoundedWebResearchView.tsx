import React from 'react';
import {
  ExternalLink,
  FileDown,
  Globe2,
  Quote,
  RefreshCw,
  ScanText,
} from 'lucide-react';

import { useModal } from '../modals/ModalSystem';
import { focusRing } from '../ui/focusRing';
import { useWorkbenchBoundedWebResearch } from './useWorkbenchBoundedWebResearch';

const focusRingClass = focusRing.dark;

export function WorkbenchBoundedWebResearchView({
  rootPath,
  url,
}: {
  rootPath: string;
  url: string;
}) {
  const modal = useModal();
  const {
    note,
    setNote,
    preview,
    fetching,
    savingMarkdown,
    creatingMemo,
    error,
    browserUrl,
    suggestedPath,
    savedArtifact,
    memoArtifact,
    preferredMode,
    setPreferredMode,
    liveFrameKey,
    reload,
    openInBrowser,
    saveMarkdown,
    createCitationMemo,
  } = useWorkbenchBoundedWebResearch({
    rootPath,
    url,
    promptForPath: async (defaultValue) => {
      return (
        (await modal?.prompt?.({
          title: 'Save Research Capture',
          description:
            'Choose a workspace-relative Markdown path. Bounded web research stays attached to repo workflows.',
          inputLabel: 'target_path',
          defaultValue,
          normalizeValue: (value: string) => value.trim(),
          validateValue: (value: string) => {
            if (!String(value || '').trim()) {
              return 'Target path is required.';
            }
            if (String(value).includes('..')) {
              return 'Target path must stay inside the project root.';
            }
            return '';
          },
        })) ?? null
      );
    },
  });

  const previewText =
    preview?.summary || preview?.excerpt || preview?.text || 'No readable preview extracted.';

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#0b0d11] text-white">
      <div className="border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300/60">
              Web Research
            </div>
            <div className="mt-1 flex items-center gap-2 text-[12px] font-semibold text-white/90">
              <Globe2 size={13} className="shrink-0 text-cyan-300/70" />
              <span className="truncate">{url}</span>
            </div>
            <div className="mt-1 text-[10px] leading-5 text-white/45">
              Explorer launches this bounded tab; primary research actions stay here, while full
              browsing still escapes to the system browser.
            </div>
          </div>
          <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5">
            <ModePill
              active={preferredMode === 'live'}
              label="Live"
              onClick={() => setPreferredMode('live')}
            />
            <ModePill
              active={preferredMode === 'reader'}
              label="Reader"
              onClick={() => setPreferredMode('reader')}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ActionButton
            icon={RefreshCw}
            label={fetching ? 'Reloading…' : 'Reload'}
            onClick={() => void reload()}
            disabled={fetching}
            tone="primary"
          />
          <ActionButton
            icon={ExternalLink}
            label="Open in Browser"
            onClick={() => void openInBrowser()}
            disabled={!browserUrl}
          />
          <ActionButton
            icon={FileDown}
            label={savingMarkdown ? 'Saving…' : 'Save Markdown'}
            onClick={() => void saveMarkdown()}
            disabled={!preview || savingMarkdown}
          />
          <ActionButton
            icon={Quote}
            label={creatingMemo ? 'Citing…' : 'Cite'}
            onClick={() => void createCitationMemo()}
            disabled={!preview || creatingMemo}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">
          <span className="rounded-full border border-white/[0.08] px-2 py-1">Bounded host</span>
          <span className="rounded-full border border-white/[0.08] px-2 py-1">No browser-global tabs</span>
          <span className="rounded-full border border-white/[0.08] px-2 py-1">No cookies UI</span>
        </div>
      </div>

      {error ? (
        <div className="border-b border-rose-500/15 bg-rose-500/8 px-4 py-2 text-[11px] text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {preferredMode === 'live' ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-white/[0.05] px-4 py-2 text-[10px] text-white/42">
              Some sites may refuse embedding in bounded mode. Use <span className="text-white/65">Open in Browser</span> if the live page is unavailable.
            </div>
            <iframe
              key={`${browserUrl}:${liveFrameKey}`}
              title="Bounded web research page"
              src={browserUrl}
              className="h-full w-full bg-white"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300/55">
                    Reader Preview
                  </div>
                  <div className="mt-1 truncate text-[14px] font-semibold text-white/90">
                    {preview?.title || url}
                  </div>
                  <div className="mt-1 text-[10px] text-white/42">
                    {preview?.siteName || 'Unknown source'}
                    {preview?.byline ? ` · ${preview.byline}` : ''}
                    {preview?.wordCount ? ` · ${preview.wordCount} words` : ''}
                    {preview?.truncated ? ' · truncated' : ''}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  <ScanText size={10} />
                  Reader
                </div>
              </div>
              <div className="mt-4 whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-[12px] leading-6 text-white/78">
                {previewText}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                Workspace Handoff
              </div>
              <div className="mt-1 text-[11px] leading-5 text-white/56">
                Save the current research result into repo-owned Markdown or cite it into HIL/Memo
                without leaving the hosted tab.
              </div>
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">
                  Target Markdown Path
                </div>
                <div className="mt-1 font-mono text-[11px] text-white/86">{suggestedPath}</div>
              </div>
              <div className="mt-3">
                <label className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">
                  Handoff Note
                </label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Why this page matters, what should be saved, or how it should be used next…"
                  className={`mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-[11px] leading-5 text-white outline-none placeholder:text-white/25 ${focusRingClass}`}
                />
              </div>
            </div>

            {savedArtifact ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/16 bg-emerald-500/8 px-4 py-3 text-[11px] text-emerald-100">
                Saved to <span className="font-mono text-emerald-50">{savedArtifact.path}</span>
              </div>
            ) : null}

            {memoArtifact ? (
              <div className="mt-3 rounded-2xl border border-cyan-400/14 bg-cyan-500/8 px-4 py-3 text-[11px] text-cyan-100">
                Memo citation created{memoArtifact.id ? `: ${memoArtifact.id}` : ''}.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function ModePill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
        active ? 'bg-cyan-400/15 text-cyan-200' : 'text-white/48 hover:text-white/78'
      }`}
    >
      {label}
    </button>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  tone = 'default',
}: {
  icon: any;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary';
}) {
  const activeClass =
    tone === 'primary'
      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:border-cyan-300/50 hover:bg-cyan-400/16'
      : 'border-white/[0.08] text-white/72 hover:border-white/[0.16] hover:bg-white/[0.05]';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
        disabled ? 'border-white/[0.05] text-white/25' : activeClass
      } disabled:cursor-not-allowed`}
    >
      <Icon size={11} strokeWidth={1.7} />
      {label}
    </button>
  );
}
