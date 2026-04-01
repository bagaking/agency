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
import { normalizeWorkbenchResearchUrl } from './workbenchBoundedResearch';
import { useWorkbenchBrowserSurface } from './useWorkbenchBrowserSurface';
import { useWorkbenchBoundedWebResearch } from './useWorkbenchBoundedWebResearch';

const focusRingClass = focusRing.dark;
const compactPath = (value: string, max = 56) => {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed.length <= max) {
    return trimmed;
  }
  return `...${trimmed.slice(-(max - 3))}`;
};

export function WorkbenchBoundedWebResearchView({
  rootPath,
  tabId,
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
  onNavigateUrl,
}: {
  rootPath: string;
  tabId: string;
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
  onNavigateUrl?: (url: string) => boolean | void;
}) {
  const modal = useModal();
  const linkedMarkdownMode = Boolean(linkedMarkdownPath);
  const [locationDraft, setLocationDraft] = React.useState(String(url || ''));
  const [locationError, setLocationError] = React.useState('');
  const [browserSurfaceSuspended, setBrowserSurfaceSuspended] = React.useState(false);
  const lastForwardedBrowserSurfaceUrlRef = React.useRef('');
  const lastResolvedPreviewTitleRef = React.useRef('');
  const lastResolvedBrowserTitleRef = React.useRef('');
  const runWithBrowserSurfaceSuspended = React.useCallback(async <T,>(task: () => Promise<T>) => {
    setBrowserSurfaceSuspended(true);
    try {
      return await task();
    } finally {
      setBrowserSurfaceSuspended(false);
    }
  }, []);
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
      const confirmed = await runWithBrowserSurfaceSuspended(async () =>
        (await modal?.confirm?.({
          title: 'Overwrite Markdown',
          description:
            'This Markdown tab has unsaved edits. Overwriting will replace the current file contents with the latest bounded web research capture.',
          confirmLabel: 'Overwrite',
          cancelLabel: 'Cancel',
          tone: 'warning',
        })) ?? false
      );
      return Boolean(confirmed);
    },
    initialState,
    onStateChange,
    onMarkdownSaved,
    promptForPath: async (defaultValue) => {
      return runWithBrowserSurfaceSuspended(async () =>
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
    if (!nextTitle || nextTitle === lastResolvedPreviewTitleRef.current) {
      return;
    }
    lastResolvedPreviewTitleRef.current = nextTitle;
    onResolvedTitle?.(nextTitle);
  }, [onResolvedTitle, preview?.title]);

  React.useEffect(() => {
    setLocationDraft(String(url || ''));
    setLocationError('');
  }, [url]);

  const previewText =
    preview?.summary || preview?.excerpt || preview?.text || 'No readable preview extracted.';
  const resolvedTitle = String(preview?.title || '').trim() || url;
  const sourceMeta = [
    preview?.siteName || '',
    preview?.byline || '',
    preview?.wordCount ? `${preview.wordCount} words` : '',
    preview?.truncated ? 'truncated' : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const canNavigate = !linkedMarkdownMode && typeof onNavigateUrl === 'function';
  const browserSurface = useWorkbenchBrowserSurface({
    tabId,
    url: browserUrl,
    visible: preferredMode === 'live' && !browserSurfaceSuspended,
    navigationKey: liveFrameKey,
    disposeOnUnmount: false,
  });
  const liveSurfaceFailed =
    browserSurface.surfaceState.phase === 'error' || browserSurface.surfaceState.phase === 'crashed';

  React.useEffect(() => {
    const nativeTitle = String(browserSurface.surfaceState.title || '').trim();
    if (!nativeTitle || nativeTitle === lastResolvedBrowserTitleRef.current) {
      return;
    }
    lastResolvedBrowserTitleRef.current = nativeTitle;
    onResolvedTitle?.(nativeTitle);
  }, [browserSurface.surfaceState.title, onResolvedTitle]);

  React.useEffect(() => {
    if (!canNavigate || typeof onNavigateUrl !== 'function') {
      return;
    }
    const surfaceUrl = normalizeWorkbenchResearchUrl(browserSurface.surfaceState.url);
    if (!surfaceUrl || surfaceUrl === browserUrl) {
      lastForwardedBrowserSurfaceUrlRef.current = '';
      return;
    }
    if (surfaceUrl === lastForwardedBrowserSurfaceUrlRef.current) {
      return;
    }
    lastForwardedBrowserSurfaceUrlRef.current = surfaceUrl;
    const didNavigate = onNavigateUrl(surfaceUrl);
    if (didNavigate === false) {
      lastForwardedBrowserSurfaceUrlRef.current = '';
    }
  }, [browserSurface.surfaceState.url, browserUrl, canNavigate, onNavigateUrl]);

  const handleLocationSubmit = React.useCallback(
    (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!canNavigate) {
        return;
      }
      const normalizedUrl = normalizeWorkbenchResearchUrl(locationDraft);
      if (!normalizedUrl) {
        setLocationError('Enter a public http/https URL.');
        return;
      }
      setLocationError('');
      setPreferredMode('live');
      const changed = normalizedUrl !== browserUrl;
      const didNavigate = onNavigateUrl?.(normalizedUrl);
      if (!changed && didNavigate !== false) {
        void reload();
      }
    },
    [browserUrl, canNavigate, locationDraft, onNavigateUrl, reload, setPreferredMode]
  );

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#0b0d11] text-white">
      <div className="border-b border-white/[0.05] px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <HeaderPill label={linkedMarkdownMode ? 'Linked Preview' : 'Bounded Web'} />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold tracking-[0.01em] text-white/92">
                {resolvedTitle}
              </div>
              {sourceMeta ? (
                <div className="truncate text-[10px] text-white/38">{sourceMeta}</div>
              ) : null}
            </div>
          </div>
          <div className="inline-flex shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5">
            <ModePill
              active={preferredMode === 'live'}
              label="View"
              onClick={() => setPreferredMode('live')}
            />
            <ModePill
              active={preferredMode === 'reader'}
              label="Reader"
              onClick={() => setPreferredMode('reader')}
            />
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {canNavigate ? (
            <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={handleLocationSubmit}>
              <label className="sr-only" htmlFor="workbench-web-research-location">
                Web research address
              </label>
              <div className="relative min-w-0 flex-1">
                <Globe2
                  size={11}
                  className="pointer-events-none absolute left-3 top-2.5 text-cyan-300/60"
                />
                <input
                  id="workbench-web-research-location"
                  type="url"
                  inputMode="url"
                  value={locationDraft}
                  onChange={(event) => {
                    setLocationDraft(event.target.value);
                    if (locationError) {
                      setLocationError('');
                    }
                  }}
                  className={`w-full rounded-full border border-white/[0.08] bg-white/[0.03] py-2 pl-8 pr-4 text-[11px] text-white outline-none placeholder:text-white/24 focus:border-cyan-300/30 focus:ring-1 focus:ring-cyan-300/15 ${focusRingClass}`}
                  placeholder="Paste a public URL…"
                />
              </div>
              <button
                type="submit"
                className={`rounded-full border border-cyan-400/28 bg-cyan-400/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition-colors hover:border-cyan-300/45 hover:bg-cyan-400/16 ${focusRingClass}`}
              >
                Open
              </button>
            </form>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] text-white/55">
              <Globe2 size={11} className="shrink-0 text-cyan-300/60" />
              <span className="truncate">{url}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              icon={RefreshCw}
              label={fetching ? 'Reloading…' : 'Reload'}
              onClick={() => void reload()}
              disabled={fetching}
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
              tone="primary"
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
        </div>

        {locationError ? (
          <div className="mt-1.5 text-[10px] text-amber-200">{locationError}</div>
        ) : null}

        {linkedMarkdownMode ? (
          <div className="mt-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-[10px] leading-5 text-white/48">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/40">
                  Linked Markdown
                </div>
                <div className="mt-1 font-mono text-[10px] text-white/70">
                  {compactPath(linkedMarkdownPath, 72)}
                </div>
              </div>
              <StatusPill
                tone={linkedMarkdownDirty ? 'warning' : 'success'}
                label={linkedMarkdownDirty ? 'Editor dirty' : 'In sync'}
              />
            </div>
            <div className="mt-2">
              Save in the editor keeps your Markdown edits. Overwrite regenerates this file from the
              current bounded source preview.
            </div>
          </div>
        ) : null}
      </div>

      {error && (preferredMode === 'reader' || liveSurfaceFailed || !browserSurface.browserSurfaceAvailable) ? (
        <div className="border-b border-rose-500/15 bg-rose-500/8 px-4 py-2 text-[11px] text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {preferredMode === 'live' ? (
          <div className="flex h-full flex-col">
            {browserSurfaceSuspended ? (
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
            ) : !browserSurface.browserSurfaceAvailable ? (
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
                    onClick={() => setPreferredMode('reader')}
                    className={`rounded-full border border-slate-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 ${focusRingClass}`}
                  >
                    Open Reader
                  </button>
                  <button
                    type="button"
                    onClick={() => void openInBrowser()}
                    className={`rounded-full border border-slate-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 ${focusRingClass}`}
                  >
                    Open in Browser
                  </button>
                </div>
              </div>
            ) : liveSurfaceFailed ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 bg-white px-8 text-center text-slate-700">
                <div className="max-w-lg space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    View Failed
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    The native browser surface could not load this page.
                  </div>
                  <div className="text-sm text-slate-600">
                    {browserSurface.surfaceState.error ||
                      'Switch to Reader, open it in the system browser, or try another URL.'}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreferredMode('live');
                      void reload();
                    }}
                    className={`rounded-full border border-slate-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 ${focusRingClass}`}
                  >
                    Retry View
                  </button>
                  <button
                    type="button"
                    onClick={() => void openInBrowser()}
                    className={`rounded-full border border-slate-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 ${focusRingClass}`}
                  >
                    Open in Browser
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative min-h-0 flex-1 bg-white">
                <div
                  ref={browserSurface.hostRef}
                  data-testid="workbench-browser-surface-host"
                  className="absolute inset-0"
                />
                {browserSurface.surfaceState.phase !== 'ready' ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/92 text-slate-600">
                    <div className="text-center">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Opening View
                      </div>
                      <div className="mt-2 text-sm">
                        {browserSurface.surfaceState.title || browserUrl}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300/55">
                    Reader Text
                  </div>
                  <div className="mt-1 text-[10px] text-white/42">
                    {sourceMeta || 'Reader snapshot from the linked source'}
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
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                    Workspace Handoff
                  </div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/32">
                    Repo-native output
                  </div>
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
                    Capture Note
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

function HeaderPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cyan-400/18 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
      {label}
    </span>
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

function StatusPill({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  const base =
    tone === 'success'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
      : tone === 'warning'
      ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
      : 'border-white/[0.08] bg-white/[0.03] text-white/60';

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${base}`}
    >
      {label}
    </span>
  );
}
