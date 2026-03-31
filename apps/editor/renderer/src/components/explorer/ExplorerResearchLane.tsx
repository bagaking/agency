import React from 'react';
import { ExternalLink, Eye, FileDown, FileText, Link2, Quote, X } from 'lucide-react';

import { useModal } from '../modals/ModalSystem';
import { IconButton } from '../ui/IconButton';
import { focusRing } from '../ui/focusRing';
import { useExplorerResearchLane } from './useExplorerResearchLane';

type ExplorerResearchLaneProps = {
  rootPath: string;
  projectRoot?: string;
  selectedCellId?: string;
  targetDirPath: string;
  allowMemoCapture: boolean;
  allowMarkdownSave: boolean;
  onOpenSavedFile?: (path: string) => void;
  onRevealSavedFile?: (path: string) => void;
  onClose: () => void;
};

const focusRingClass = focusRing.sidebar;

export function ExplorerResearchLane({
  rootPath,
  projectRoot = '',
  selectedCellId = '',
  targetDirPath,
  allowMemoCapture,
  allowMarkdownSave,
  onOpenSavedFile,
  onRevealSavedFile,
  onClose,
}: ExplorerResearchLaneProps) {
  const modal = useModal();
  const {
    url,
    setUrl,
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
    inspect,
    openInBrowser,
    saveMarkdown,
    createCitationMemo,
    openSavedArtifact,
    revealSavedArtifact,
  } = useExplorerResearchLane({
    rootPath,
    projectRoot,
    selectedCellId,
    targetDirPath,
    allowMemoCapture,
    allowMarkdownSave,
    onOpenSavedFile,
    onRevealSavedFile,
    promptForPath: async (defaultValue) => {
      return (
        (await modal?.prompt?.({
          title: 'Save Research Capture',
          description:
            'Choose a workspace-relative Markdown path. Research lane outputs stay inside the project and remain subordinate to Explorer.',
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

  const canInspect = Boolean(url.trim()) && !fetching;
  const canOpenBrowser = Boolean(browserUrl);
  const hasPreview = Boolean(preview);
  const previewText =
    preview?.summary || preview?.excerpt || preview?.text || 'No readable preview extracted.';

  return (
    <section
      data-testid="explorer-research-lane"
      className="border-b border-border/40 bg-sidebar px-3 py-3 text-sidebar-foreground"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/55">
            Research Lane
          </div>
          <div className="mt-1 max-w-[34rem] text-[11px] leading-5 text-muted-foreground/72">
            Turn a public URL into repo context. Inspect it here, then hand it back to
            workspace files or memo artifacts instead of growing a general browser inside Agency.
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/48">
            <span className="rounded-full border border-border/35 px-2 py-0.5">
              Public http/https
            </span>
            <span className="rounded-full border border-border/35 px-2 py-0.5">
              Explorer-bound
            </span>
            <span className="rounded-full border border-border/35 px-2 py-0.5">
              No tabs or cookies
            </span>
          </div>
        </div>
        <IconButton
          label="Close research lane"
          focusRing="sidebar"
          className="h-6 w-6 rounded-md text-muted-foreground/55 hover:bg-white/5 hover:text-foreground"
          onClick={onClose}
        >
          <X size={12} strokeWidth={1.7} />
        </IconButton>
      </div>

      <div className="mt-3 rounded-2xl border border-border/40 bg-white/[0.03] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/48">
            URL Intake
          </div>
          <button
            type="button"
            onClick={() => void openInBrowser()}
            disabled={!canOpenBrowser}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
              canOpenBrowser
                ? 'border-border/30 text-muted-foreground hover:border-border/55 hover:text-foreground'
                : 'border-border/20 text-muted-foreground/30'
            } disabled:cursor-not-allowed`}
          >
            <ExternalLink size={11} strokeWidth={1.7} />
            Open in Browser
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/40 bg-muted/10 px-2 py-2">
          <Link2 size={12} strokeWidth={1.7} className="shrink-0 text-muted-foreground/50" />
          <input
            data-testid="explorer-research-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste a documentation or research URL..."
            aria-label="Research URL"
            className={`min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground/35 ${focusRingClass}`}
          />
          <button
            type="button"
            onClick={() => void inspect()}
            disabled={!canInspect}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${focusRingClass} ${
              canInspect
                ? 'border-primary/30 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/15'
                : 'border-border/30 text-muted-foreground/45'
            } disabled:cursor-not-allowed`}
          >
            {fetching ? 'Inspecting...' : 'Inspect'}
          </button>
        </div>

        <div className="mt-2 text-[10px] leading-5 text-muted-foreground/55">
          Inspect fetches a bounded reader preview for public URLs only. Login-heavy, local, or
          full-browser flows should use the explicit Open in Browser escape hatch.
        </div>
      </div>

      {error ? (
        <div className="mt-2 rounded-lg border border-rose-500/10 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300">
          {error}
        </div>
      ) : null}

      {hasPreview ? (
        <>
          <div className="mt-3 rounded-2xl border border-border/40 bg-white/[0.03] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/48">
                  Reader Preview
                </div>
                <div className="mt-1 truncate text-[12px] font-semibold text-foreground">
                  {preview?.title || preview?.url}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground/60">
                  {preview?.siteName || 'Unknown source'}
                  {preview?.byline ? ` · ${preview.byline}` : ''}
                  {preview?.wordCount ? ` · ${preview.wordCount} words` : ''}
                  {preview?.truncated ? ' · truncated' : ''}
                </div>
              </div>
              <div className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">
                Reader
              </div>
            </div>

            <div className="mt-3 max-h-36 overflow-y-auto rounded-xl border border-border/20 bg-black/10 px-3 py-2 text-[11px] leading-5 text-muted-foreground/82">
              {previewText}
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-border/40 bg-white/[0.03] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/48">
                  Workspace Handoff
                </div>
                <div className="mt-1 text-[11px] leading-5 text-muted-foreground/72">
                  Save the preview as Markdown, or cite it into the memo workflow. If a Markdown
                  file exists, the memo citation references that workspace path instead of creating
                  a parallel intake path.
                </div>
              </div>
              <div className="rounded-full border border-border/35 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/55">
                Explorer first
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/46">
                Target Markdown Path
              </div>
              <div
                data-testid="explorer-research-target-path"
                className="mt-1 flex items-center gap-2 text-[11px] text-foreground/88"
              >
                <FileText size={12} strokeWidth={1.6} className="shrink-0 text-primary/75" />
                <span className="truncate font-mono">{suggestedPath}</span>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/46">
                Handoff Note
              </label>
              <textarea
                data-testid="explorer-research-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Optional note about why this page matters or how the saved artifact should be used..."
                className={`mt-2 w-full resize-y rounded-xl border border-border/35 bg-muted/10 px-3 py-2 text-[11px] leading-5 text-foreground outline-none placeholder:text-muted-foreground/35 ${focusRingClass}`}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void saveMarkdown()}
                disabled={!allowMarkdownSave || savingMarkdown}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
                  allowMarkdownSave
                    ? 'border-primary/30 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/15'
                    : 'border-border/30 text-muted-foreground/35'
                } disabled:cursor-not-allowed`}
              >
                <FileDown size={11} strokeWidth={1.7} />
                {savingMarkdown ? 'Saving...' : 'Save Markdown'}
              </button>

              <button
                type="button"
                onClick={() => void createCitationMemo()}
                disabled={!allowMemoCapture || creatingMemo}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
                  allowMemoCapture
                    ? 'border-border/30 text-muted-foreground hover:border-border/55 hover:text-foreground'
                    : 'border-border/30 text-muted-foreground/35'
                } disabled:cursor-not-allowed`}
              >
                <Quote size={11} strokeWidth={1.7} />
                {creatingMemo ? 'Creating...' : 'Cite In Memo'}
              </button>
            </div>

            <div className="mt-3 text-[10px] leading-5 text-muted-foreground/55">
              This lane does not keep browser session state, tabs, or page-local app logic. It
              only helps convert a URL into repo files or workflow artifacts.
            </div>
          </div>
        </>
      ) : null}

      {savedArtifact ? (
        <div className="mt-3 rounded-2xl border border-emerald-400/14 bg-emerald-500/6 px-3 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/72">
            Markdown Saved
          </div>
          <div className="mt-1 text-[11px] text-emerald-50/88">
            {savedArtifact.path}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openSavedArtifact}
              className={`inline-flex items-center gap-1 rounded-full border border-emerald-300/24 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-50/88 transition-colors hover:border-emerald-200/40 hover:bg-emerald-300/8 ${focusRingClass}`}
            >
              <FileText size={11} strokeWidth={1.7} />
              Open Saved
            </button>
            <button
              type="button"
              onClick={revealSavedArtifact}
              className={`inline-flex items-center gap-1 rounded-full border border-emerald-300/24 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-50/88 transition-colors hover:border-emerald-200/40 hover:bg-emerald-300/8 ${focusRingClass}`}
            >
              <Eye size={11} strokeWidth={1.7} />
              Reveal
            </button>
          </div>
        </div>
      ) : null}

      {memoArtifact ? (
        <div className="mt-2 rounded-2xl border border-cyan-300/12 bg-cyan-400/5 px-3 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">
            Memo Citation Created
          </div>
          <div className="mt-1 text-[11px] leading-5 text-cyan-50/84">
            {memoArtifact.id
              ? `Memo ${memoArtifact.id} is now in the HIL/Memo flow and can be promoted later without creating a research-only delivery path.`
              : 'The citation memo is now in the HIL/Memo flow and can be promoted later.'}
          </div>
        </div>
      ) : null}
    </section>
  );
}
