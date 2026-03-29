import React, { useMemo, useState } from 'react';
import { ExternalLink, FileDown, Link2, Quote, X } from 'lucide-react';

import {
  createHilItem,
  fetchHilExcerpt,
  openExternalUrl,
  writeWorkbenchEntry,
} from '../../services/agencyBridge';
import { useModal } from '../modals/ModalSystem';
import { IconButton } from '../ui/IconButton';
import { focusRing } from '../ui/focusRing';

type ExplorerResearchLaneProps = {
  rootPath: string;
  targetDirPath: string;
  allowMemoCapture: boolean;
  allowMarkdownSave: boolean;
  onOpenSavedFile?: (path: string) => void;
  onClose: () => void;
};

const focusRingClass = focusRing.sidebar;

function slugify(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildExcerptMarkdown(preview: Record<string, any>) {
  const parts = [
    `# ${preview.title || 'Research Capture'}`,
    '',
    `- Source: ${preview.url || ''}`,
    preview.siteName ? `- Site: ${preview.siteName}` : '',
    preview.fetchedAt ? `- Fetched: ${preview.fetchedAt}` : '',
    '',
    preview.summary ? preview.summary : '',
    '',
    preview.excerpt ? `> ${String(preview.excerpt).replace(/\n+/g, '\n> ')}` : '',
    '',
    preview.text || '',
  ];
  return parts.filter(Boolean).join('\n');
}

export function ExplorerResearchLane({
  rootPath,
  targetDirPath,
  allowMemoCapture,
  allowMarkdownSave,
  onOpenSavedFile,
  onClose,
}: ExplorerResearchLaneProps) {
  const modal = useModal();
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const suggestedFileName = useMemo(() => {
    const base = slugify(preview?.title || preview?.siteName || 'research-capture') || 'research-capture';
    if (targetDirPath) {
      return `${targetDirPath}/${base}.md`;
    }
    return `research/${base}.md`;
  }, [preview?.siteName, preview?.title, targetDirPath]);

  const handleInspect = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Enter a URL to inspect.');
      return;
    }
    setFetching(true);
    setError('');
    try {
      const nextPreview = await fetchHilExcerpt({ url: trimmedUrl });
      setPreview(nextPreview || null);
    } catch (inspectError: any) {
      setPreview(null);
      setError(inspectError?.message || 'Failed to inspect URL.');
    } finally {
      setFetching(false);
    }
  };

  const handleOpenBrowser = async () => {
    const targetUrl = preview?.url || url.trim();
    if (!targetUrl) {
      return;
    }
    await openExternalUrl({ url: targetUrl });
  };

  const handleSaveMarkdown = async () => {
    if (!preview || !allowMarkdownSave) {
      return;
    }
    const targetPath = await modal.prompt({
      title: 'Save Research Capture',
      description: 'Choose a workspace-relative path for the captured Markdown.',
      inputLabel: 'target_path',
      defaultValue: suggestedFileName,
      validateValue: (value) => {
        if (!String(value || '').trim()) {
          return 'Target path is required.';
        }
        if (String(value).includes('..')) {
          return 'Target path must stay inside the project root.';
        }
        return '';
      },
    });
    if (!targetPath) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await writeWorkbenchEntry({
        rootPath,
        targetPath,
        content: buildExcerptMarkdown(preview),
      });
      if (result?.path) {
        onOpenSavedFile?.(result.path);
      }
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save research capture.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMemo = async () => {
    if (!preview || !allowMemoCapture) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createHilItem({
        worktreePath: rootPath,
        kind: 'memo',
        body: preview.summary || preview.excerpt || preview.title || preview.url || '',
        meta: {
          noteType: 'excerpt',
          url: preview.url,
          title: preview.title,
          byline: preview.byline,
          siteName: preview.siteName,
          excerpt: preview.excerpt,
          summary: preview.summary,
          text: preview.text,
          wordCount: preview.wordCount,
          charCount: preview.charCount,
          fetchedAt: preview.fetchedAt,
          truncated: preview.truncated,
          sourceSurface: 'explorer-research-lane',
        },
      });
    } catch (memoError: any) {
      setError(memoError?.message || 'Failed to create memo excerpt.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border-b border-border/40 bg-sidebar px-3 py-3 text-sidebar-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/55">
            Research Lane
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground/72">
            Inspect a URL, then save or cite it without leaving the editing workspace.
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

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/40 bg-muted/10 px-2 py-2">
        <Link2 size={12} strokeWidth={1.7} className="shrink-0 text-muted-foreground/50" />
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste a documentation or research URL…"
          aria-label="Research URL"
          className={`min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground/35 ${focusRingClass}`}
        />
        <button
          type="button"
          onClick={() => void handleInspect()}
          disabled={fetching}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${focusRingClass} ${
            fetching
              ? 'border-border/30 text-muted-foreground/45'
              : 'border-primary/30 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/15'
          }`}
        >
          {fetching ? 'Inspecting…' : 'Inspect'}
        </button>
      </div>

      {error ? (
        <div className="mt-2 rounded-lg border border-rose-500/10 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300">
          {error}
        </div>
      ) : null}

      {preview ? (
        <div className="mt-3 rounded-2xl border border-border/40 bg-white/[0.03] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-foreground">
                {preview.title || preview.url}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground/60">
                {preview.siteName || 'Unknown source'}
                {preview.wordCount ? ` · ${preview.wordCount} words` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleOpenBrowser()}
              className={`inline-flex items-center gap-1 rounded-full border border-border/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground ${focusRingClass}`}
            >
              <ExternalLink size={11} strokeWidth={1.7} />
              Browser
            </button>
          </div>

          <div className="mt-3 max-h-36 overflow-y-auto text-[11px] leading-5 text-muted-foreground/80">
            {preview.summary || preview.excerpt || preview.text || 'No readable preview extracted.'}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSaveMarkdown()}
              disabled={!allowMarkdownSave || saving}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
                allowMarkdownSave
                  ? 'border-primary/30 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/15'
                  : 'border-border/30 text-muted-foreground/35'
              } disabled:cursor-not-allowed`}
            >
              <FileDown size={11} strokeWidth={1.7} />
              Save Markdown
            </button>
            <button
              type="button"
              onClick={() => void handleCreateMemo()}
              disabled={!allowMemoCapture || saving}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
                allowMemoCapture
                  ? 'border-border/30 text-muted-foreground hover:text-foreground'
                  : 'border-border/30 text-muted-foreground/35'
              } disabled:cursor-not-allowed`}
            >
              <Quote size={11} strokeWidth={1.7} />
              Create Memo
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
