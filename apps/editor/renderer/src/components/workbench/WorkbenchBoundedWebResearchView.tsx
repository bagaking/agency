import React from 'react';
import {
  Eye,
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
  allowMarkdownSave = true,
  allowMemoCapture = true,
  linkedMarkdownPath = '',
  linkedMarkdownDirty = false,
  initialState,
  onStateChange,
  onMarkdownSaved,
  onOpenSavedFile,
  onRevealSavedFile,
  onResolvedTitle,
}: {
  rootPath: string;
  url: string;
  allowMarkdownSave?: boolean;
  allowMemoCapture?: boolean;
  linkedMarkdownPath?: string;
  linkedMarkdownDirty?: boolean;
  initialState?: any;
  onStateChange?: (state: any) => void;
  onMarkdownSaved?: (path: string) => void;
  onOpenSavedFile?: (path: string) => void;
  onRevealSavedFile?: (path: string) => void;
  onResolvedTitle?: (title: string) => void;
}) {
  const modal = useModal();
  const linkedMarkdownMode = Boolean(linkedMarkdownPath);
  const [liveFrameStatus, setLiveFrameStatus] = React.useState<'loading' | 'ready' | 'timeout'>(
    'loading'
  );
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
    allowMarkdownSave,
    allowMemoCapture,
    linkedMarkdownPath,
    linkedMarkdownDirty,
    confirmOverwriteMarkdown: async () => {
      if (!linkedMarkdownPath || !linkedMarkdownDirty) {
        return true;
      }
      const confirmed = await modal?.confirm?.({
        title: 'Overwrite Markdown',
        description:
          'This Markdown tab has unsaved edits. Overwriting will replace the current file contents with the latest bounded web research capture.',
        confirmLabel: 'Overwrite',
        cancelLabel: 'Cancel',
        tone: 'warning',
      });
      return Boolean(confirmed);
    },
    initialState,
    onStateChange,
    onMarkdownSaved,
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

  React.useEffect(() => {
    const nextTitle = String(preview?.title || '').trim();
    if (!nextTitle) {
      return;
    }
    onResolvedTitle?.(nextTitle);
  }, [onResolvedTitle, preview?.title]);

  React.useEffect(() => {
    if (preferredMode !== 'live') {
      setLiveFrameStatus('loading');
      return;
    }
    setLiveFrameStatus('loading');
    const timeoutHandle = window.setTimeout(() => {
      setLiveFrameStatus('timeout');
    }, 4000);
    return () => {
      window.clearTimeout(timeoutHandle);
    };
  }, [browserUrl, liveFrameKey, preferredMode]);

  const previewText =
    preview?.summary || preview?.excerpt || preview?.text || 'No readable preview extracted.';

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#0b0d11] text-white">
      <div className="border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300/60">
              {linkedMarkdownMode ? 'Linked Web Preview' : 'Web Research'}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[12px] font-semibold text-white/90">
              <Globe2 size={13} className="shrink-0 text-cyan-300/70" />
              <span className="truncate">{url}</span>
            </div>
            <div className="mt-1 text-[10px] leading-5 text-white/45">
              {linkedMarkdownMode
                ? 'The Markdown file on the left is the repo-native artifact. The preview on the right stays linked to its source URL.'
                : 'Explorer launches this bounded tab; primary research actions stay here, while full browsing still escapes to the system browser.'}
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
            testId="workbench-web-research-reload"
          />
          <ActionButton
            icon={ExternalLink}
            label="Open in Browser"
            onClick={() => void openInBrowser()}
            disabled={!browserUrl}
            testId="workbench-web-research-open-browser"
          />
          <ActionButton
            icon={FileDown}
            label={
              savingMarkdown
                ? linkedMarkdownPath
                  ? 'Overwriting…'
                  : 'Saving…'
                : linkedMarkdownPath
                  ? 'Overwrite Markdown'
                  : 'Save Markdown'
            }
            onClick={() => void saveMarkdown()}
            disabled={!preview || savingMarkdown || !allowMarkdownSave}
            testId="workbench-web-research-save-markdown"
          />
          <ActionButton
            icon={Quote}
            label={creatingMemo ? 'Citing…' : 'Cite'}
            onClick={() => void createCitationMemo()}
            disabled={!preview || creatingMemo || !allowMemoCapture}
            testId="workbench-web-research-cite"
          />
        </div>

        {linkedMarkdownMode ? (
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-[10px] leading-5 text-white/48">
            <span className="font-semibold text-white/70">Save</span> in the editor preserves your
            Markdown edits. <span className="font-semibold text-white/70">Overwrite Markdown</span>{' '}
            regenerates this file from the source preview.
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">
            <span className="rounded-full border border-white/[0.08] px-2 py-1">Bounded host</span>
            <span className="rounded-full border border-white/[0.08] px-2 py-1">No browser-global tabs</span>
            <span className="rounded-full border border-white/[0.08] px-2 py-1">No cookies UI</span>
          </div>
        )}
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
              Live mode stays bounded. If the page is blank or blocked, switch to{' '}
              <span className="text-white/65">Reader</span> or use{' '}
              <span className="text-white/65">Open in Browser</span>.
            </div>
            {liveFrameStatus === 'timeout' ? (
              <div className="border-b border-amber-400/12 bg-amber-400/6 px-4 py-2 text-[10px] text-amber-100/82">
                This site may refuse embedded preview. The bounded tab still keeps your research
                actions and file handoff available here.
              </div>
            ) : null}
            <iframe
              key={`${browserUrl}:${liveFrameKey}`}
              title="Bounded web research page"
              src={browserUrl}
              className="h-full w-full bg-white"
              referrerPolicy="no-referrer"
              onLoad={() => setLiveFrameStatus('ready')}
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

            {!linkedMarkdownMode ? (
              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                  Workspace Handoff
                </div>
                <div className="mt-1 text-[11px] leading-5 text-white/56">
                  Save the current research result into repo-owned Markdown or cite it into Memo
                  without leaving the hosted tab.
                </div>
                <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">
                    {linkedMarkdownPath ? 'Linked Markdown Path' : 'Target Markdown Path'}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-white/86">
                    {linkedMarkdownPath || suggestedPath}
                  </div>
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
            ) : null}

            {savedArtifact ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/16 bg-emerald-500/8 px-4 py-3 text-[11px] text-emerald-100">
                <div>
                  Saved to <span className="font-mono text-emerald-50">{savedArtifact.path}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!linkedMarkdownPath ? (
                    <>
                      <ActionButton
                        icon={FileDown}
                        label="Open Saved"
                        onClick={() => onOpenSavedFile?.(savedArtifact.path)}
                        disabled={!onOpenSavedFile}
                        testId="workbench-web-research-open-saved"
                      />
                      <ActionButton
                        icon={Eye}
                        label="Reveal"
                        onClick={() => onRevealSavedFile?.(savedArtifact.path)}
                        disabled={!onRevealSavedFile}
                        testId="workbench-web-research-reveal-saved"
                      />
                    </>
                  ) : null}
                </div>
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
  testId,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary';
  testId?: string;
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
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
        disabled ? 'border-white/[0.05] text-white/25' : activeClass
      } disabled:cursor-not-allowed`}
    >
      <Icon size={11} strokeWidth={1.7} />
      {label}
    </button>
  );
}
