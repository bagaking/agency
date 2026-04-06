import React from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileDown,
  Globe2,
  Quote,
  RefreshCw,
  ScanText,
  Eye,
} from 'lucide-react';

import { useModal } from '../modals/ModalSystem';
import { focusRing } from '../ui/focusRing';
import { IconButton } from '../ui/IconButton';
import { WorkbenchBrowserLane } from './WorkbenchBrowserLane';
import { normalizeWorkbenchResearchUrl } from './workbenchBoundedResearch';
import { useWorkbenchBoundedWebResearch } from './useWorkbenchBoundedWebResearch';
import {
  goBackWorkbenchBrowserSurface,
  goForwardWorkbenchBrowserSurface,
} from '../../services/agencyBridge';

const focusRingClass = focusRing.dark;

export type WorkbenchBrowserSurfaceHandle = {
  browserSurfaceAvailable: boolean;
  surfaceState: {
    url?: string;
    title?: string;
    phase?: 'hidden' | 'loading' | 'ready' | 'error' | 'crashed' | 'disposed';
    error?: string;
    visible?: boolean;
    canGoBack?: boolean;
    canGoForward?: boolean;
  };
} | null;

type SceneSharedProps = {
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
  browserSurface?: WorkbenchBrowserSurfaceHandle;
  onBrowserSurfaceSuspendedChange?: (value: boolean) => void;
};

export type WorkbenchBoundedWebResearchSceneModel = ReturnType<
  typeof useWorkbenchBoundedWebResearchSceneModel
>;

const compactPath = (value: string, max = 56) => {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed.length <= max) {
    return trimmed;
  }
  return `...${trimmed.slice(-(max - 3))}`;
};

function useWorkbenchBoundedWebResearchSceneModel({
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
  onResolvedTitle,
  onNavigateUrl,
  browserSurface = null,
  onBrowserSurfaceSuspendedChange,
}: SceneSharedProps) {
  const modal = useModal();
  const linkedMarkdownMode = Boolean(linkedMarkdownPath);
  const [locationDraft, setLocationDraft] = React.useState(String(url || ''));
  const [locationError, setLocationError] = React.useState('');
  const [navigatingDraft, setNavigatingDraft] = React.useState(false);
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
    promptForPath: async (defaultValue) =>
      runWithBrowserSurfaceSuspended(async () =>
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
      ),
  });

  React.useEffect(() => {
    onBrowserSurfaceSuspendedChange?.(browserSurfaceSuspended);
    return () => {
      if (browserSurfaceSuspended) {
        onBrowserSurfaceSuspendedChange?.(false);
      }
    };
  }, [browserSurfaceSuspended, onBrowserSurfaceSuspendedChange]);

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
    setNavigatingDraft(false);
  }, [url]);

  React.useEffect(() => {
    if (!navigatingDraft) {
      return;
    }
    const phase = browserSurface?.surfaceState.phase;
    if (phase === 'ready' || phase === 'error' || phase === 'crashed') {
      setNavigatingDraft(false);
    }
  }, [browserSurface?.surfaceState.phase, navigatingDraft]);

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
  const liveSurfaceFailed =
    browserSurface?.surfaceState.phase === 'error' || browserSurface?.surfaceState.phase === 'crashed';

  React.useEffect(() => {
    const nativeTitle = String(browserSurface?.surfaceState.title || '').trim();
    if (!nativeTitle || nativeTitle === lastResolvedBrowserTitleRef.current) {
      return;
    }
    lastResolvedBrowserTitleRef.current = nativeTitle;
    onResolvedTitle?.(nativeTitle);
  }, [browserSurface?.surfaceState.title, onResolvedTitle]);

  React.useEffect(() => {
    if (!canNavigate || typeof onNavigateUrl !== 'function') {
      return;
    }
    const surfaceUrl = normalizeWorkbenchResearchUrl(browserSurface?.surfaceState.url);
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
  }, [browserSurface?.surfaceState.url, browserUrl, canNavigate, onNavigateUrl]);

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
      setNavigatingDraft(true);
      setPreferredMode('live');
      const changed = normalizedUrl !== browserUrl;
      const didNavigate = onNavigateUrl?.(normalizedUrl);
      if (!changed && didNavigate !== false) {
        void reload().finally(() => {
          setNavigatingDraft(false);
        });
        return;
      }
      if (didNavigate === false) {
        setNavigatingDraft(false);
      }
    },
    [browserUrl, canNavigate, locationDraft, onNavigateUrl, reload, setPreferredMode]
  );

  return {
    tabId,
    url,
    browserSurface,
    linkedMarkdownPath,
    linkedMarkdownDirty,
    linkedMarkdownMode,
    locationDraft,
    setLocationDraft,
    locationError,
    setLocationError,
    navigatingDraft,
    browserSurfaceSuspended,
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
    previewText,
    resolvedTitle,
    sourceMeta,
    canNavigate,
    liveSurfaceFailed,
    handleLocationSubmit,
    allowMarkdownSave,
    allowMemoCapture,
  };
}

export function WorkbenchBoundedWebResearchScene({
  children,
  ...props
}: SceneSharedProps & {
  children: (scene: WorkbenchBoundedWebResearchSceneModel) => React.ReactNode;
}) {
  const scene = useWorkbenchBoundedWebResearchSceneModel(props);
  return <>{children(scene)}</>;
}

export function WorkbenchBoundedWebResearchChrome({
  scene,
}: {
  scene: WorkbenchBoundedWebResearchSceneModel;
}) {
  const {
    tabId,
    url,
    browserSurface,
    fetching,
    canNavigate,
    handleLocationSubmit,
    locationDraft,
    setLocationDraft,
    locationError,
    setLocationError,
    navigatingDraft,
    preferredMode,
    setPreferredMode,
    resolvedTitle,
    sourceMeta,
    browserUrl,
    openInBrowser,
    savingMarkdown,
    linkedMarkdownPath,
    preview,
    allowMarkdownSave,
    saveMarkdown,
    creatingMemo,
    allowMemoCapture,
    createCitationMemo,
    linkedMarkdownMode,
    linkedMarkdownDirty,
  } = scene;

  return (
      <div className="border-b border-white/[0.05] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-[10px] border border-white/[0.06] bg-white/[0.03] p-0.5">
            <ToolbarIconButton
              icon={ChevronLeft}
              label="Back"
              onClick={() => void goBackWorkbenchBrowserSurface({ tabId })}
              disabled={!browserSurface?.surfaceState.canGoBack}
              testId="workbench-web-research-back"
            />
            <ToolbarIconButton
              icon={ChevronRight}
              label="Forward"
              onClick={() => void goForwardWorkbenchBrowserSurface({ tabId })}
              disabled={!browserSurface?.surfaceState.canGoForward}
              testId="workbench-web-research-forward"
            />
            <ToolbarIconButton
              icon={RefreshCw}
              label={fetching ? 'Reloading…' : 'Reload'}
              onClick={() => void scene.reload()}
              disabled={fetching}
              testId="workbench-web-research-reload"
            />
          </div>
          {canNavigate ? (
            <form className="flex min-w-0 flex-1 items-center" onSubmit={handleLocationSubmit}>
              <label className="sr-only" htmlFor="workbench-web-research-location">
                Web research address
              </label>
              <div className="relative min-w-0 flex-1 rounded-[10px] border border-white/[0.07] bg-black/20">
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
                  className={`w-full rounded-[10px] border-0 bg-transparent py-2 pl-8 pr-14 text-[11px] text-white outline-none placeholder:text-white/24 focus:ring-1 focus:ring-cyan-300/15 ${focusRingClass}`}
                  placeholder="Paste a public URL…"
                />
                <button
                  type="submit"
                  disabled={navigatingDraft}
                  aria-label="Open URL"
                  className={`absolute right-1 top-1 inline-flex h-7 items-center gap-1 rounded-[8px] px-2.5 text-[10px] font-medium text-cyan-100 transition-colors ${
                    navigatingDraft
                      ? 'cursor-wait bg-cyan-400/10 opacity-70'
                      : 'bg-cyan-400/12 hover:bg-cyan-400/18'
                  } ${focusRingClass}`}
                >
                  <ArrowRight size={11} />
                  {navigatingDraft ? 'Opening…' : 'Go'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2 text-[10px] text-white/55">
              <Globe2 size={11} className="shrink-0 text-cyan-300/60" />
              <span className="truncate">{url}</span>
            </div>
          )}
          <div className="inline-flex shrink-0 items-center rounded-[10px] border border-white/[0.06] bg-white/[0.03] p-0.5">
            <ModePill active={preferredMode === 'live'} label="View" onClick={() => setPreferredMode('live')} />
            <ModePill active={preferredMode === 'reader'} label="Reader" onClick={() => setPreferredMode('reader')} />
          </div>
        </div>

      {locationError ? <div className="mt-1.5 text-[10px] text-amber-200">{locationError}</div> : null}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.04] pt-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-cyan-400/10 text-cyan-200">
              <Globe2 size={13} />
            </div>
            <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold tracking-[0.01em] text-white/88">
              {resolvedTitle}
            </div>
            <div className="truncate text-[10px] text-white/38">
              {sourceMeta || (linkedMarkdownMode ? 'Linked markdown preview' : 'Bounded web view')}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
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
  );
}

export function WorkbenchBoundedWebResearchStatusBanner({
  scene,
}: {
  scene: WorkbenchBoundedWebResearchSceneModel;
}) {
  if (
    !scene.error ||
    !(
      scene.preferredMode === 'reader' ||
      scene.liveSurfaceFailed ||
      !scene.browserSurface?.browserSurfaceAvailable
    )
  ) {
    return null;
  }
  return (
    <div className="border-b border-rose-500/15 bg-rose-500/8 px-4 py-2 text-[11px] text-rose-200">
      {scene.error}
    </div>
  );
}

export function WorkbenchBoundedWebResearchReaderPane({
  scene,
  onOpenSavedFile,
  onRevealSavedFile,
}: {
  scene: WorkbenchBoundedWebResearchSceneModel;
  onOpenSavedFile?: (path: string) => void;
  onRevealSavedFile?: (path: string) => void;
}) {
  const {
    sourceMeta,
    previewText,
    linkedMarkdownMode,
    linkedMarkdownPath,
    suggestedPath,
    note,
    setNote,
    savedArtifact,
    memoArtifact,
  } = scene;

  return (
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
  );
}

export function WorkbenchBoundedWebResearchView(props: SceneSharedProps) {
  return (
    <WorkbenchBoundedWebResearchScene {...props}>
      {(scene) => (
        <section className="flex h-full min-h-0 flex-col bg-[#0b0d11] text-white">
          <WorkbenchBoundedWebResearchChrome scene={scene} />
          <WorkbenchBoundedWebResearchStatusBanner scene={scene} />
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {scene.preferredMode === 'live' ? (
              <WorkbenchBrowserLane
                browserSurface={scene.browserSurface}
                suspended={scene.browserSurfaceSuspended}
                onOpenReader={() => scene.setPreferredMode('reader')}
                onOpenInBrowser={() => void scene.openInBrowser()}
                onReload={() => {
                  scene.setPreferredMode('live');
                  void scene.reload();
                }}
              />
            ) : (
              <WorkbenchBoundedWebResearchReaderPane
                scene={scene}
                onOpenSavedFile={props.onOpenSavedFile}
                onRevealSavedFile={props.onRevealSavedFile}
              />
            )}
          </div>
        </section>
      )}
    </WorkbenchBoundedWebResearchScene>
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
      className={`rounded-[8px] px-3 py-1 text-[10px] font-medium transition-colors ${focusRingClass} ${
        active ? 'bg-cyan-400/15 text-cyan-200' : 'text-white/48 hover:bg-white/[0.04] hover:text-white/78'
      }`}
    >
      {label}
    </button>
  );
}

function ToolbarIconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  testId,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <IconButton
      label={label}
      tooltip={label}
      side="bottom"
      focusRing="dark"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`h-7 w-7 rounded-[8px] transition-colors ${
        disabled
          ? 'text-white/20'
          : 'text-white/58 hover:bg-white/[0.05] hover:text-white/86'
      }`}
    >
      <Icon size={13} strokeWidth={1.9} />
    </IconButton>
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
      ? 'border-cyan-400/22 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/16'
      : 'border-transparent text-white/62 hover:bg-white/[0.05] hover:text-white/84';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[10px] font-medium transition-colors ${focusRingClass} ${
        disabled ? 'border-transparent text-white/22' : activeClass
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
