import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  Archive, 
  Hash, 
  Target, 
  Search,
  Clock,
  Terminal,
  StickyNote,
  Layers,
  FileText,
  Activity,
  ChevronDown,
  Camera,
  Quote,
  Inbox
} from 'lucide-react';
import { ProjectEmptyState } from '../../ProjectEmptyState.jsx';
import { useHilItems } from '../../../hooks/useHilItems.js';
import { InboxSection } from './InboxSection.jsx';
import { CaptureRoutingSheet } from '../../capture/CaptureRoutingSheet.jsx';
import {
  createHilItem as agencyCreateHilItem,
  startScreenshotCapture as agencyStartScreenshotCapture,
  saveCaptureAsset as agencySaveCaptureAsset,
  copyCaptureToClipboard as agencyCopyCaptureToClipboard,
  getWorkbenchFileUrl as agencyGetWorkbenchFileUrl,
} from '../../../services/agencyBridge.js';

const kindIcons = {
    comment: Terminal,
    memo: StickyNote,
    draft: Layers
};

const resolveBody = (item) =>
  typeof item?.body === 'string' ? item.body : typeof item?.message === 'string' ? item.message : '';

const summarizeBody = (item) => {
  const raw = resolveBody(item).trim();
  if (!raw) {
    return 'Untitled Draft';
  }
  const firstLine = raw.split('\n')[0];
  if (firstLine.length > 46) {
    return `${firstLine.slice(0, 46)}…`;
  }
  return firstLine;
};

export function HilMemoView({
  worktreePath,
  projectReady,
  projectError,
  onSelectProject,
  selection,
  cells = [],
  selectedCellId,
  projectRoot,
}) {
  const { items, filters, setFilters, loading, error, refresh } = useHilItems({
    worktreePath,
    fetchAll: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dockSelection, setDockSelection] = useState({
    type: 'inbox',
    inboxType: 'comments',
    draftId: null,
  });
  const [flashText, setFlashText] = useState('');
  const [excerptNote, setExcerptNote] = useState('');
  const [screenshotNote, setScreenshotNote] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [captureLoading, setCaptureLoading] = useState(false);
  const [screenshotAsset, setScreenshotAsset] = useState(null);
  const [captureResult, setCaptureResult] = useState(null);
  const [routingOpen, setRoutingOpen] = useState(false);
  const [routingMode, setRoutingMode] = useState('hil');
  const [routingTargetId, setRoutingTargetId] = useState('');
  const [routingError, setRoutingError] = useState('');

  const draftItems = useMemo(
    () => items.filter((item) => item.kind === 'draft'),
    [items]
  );
  const inboxItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.kind === 'comment' || item.kind === 'memo') && item.meta?.processed !== true
      ),
    [items]
  );
  const selectedDraft = useMemo(
    () => draftItems.find((item) => item.id === dockSelection.draftId) || null,
    [dockSelection.draftId, draftItems]
  );
  const pendingInboxCount = inboxItems.length;
  const draftCount = draftItems.length;

  useEffect(() => {
    if (dockSelection.type === 'draft' && !selectedDraft) {
      setDockSelection({ type: 'inbox', inboxType: 'comments', draftId: null });
    }
  }, [dockSelection.type, selectedDraft]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (filters.kind !== 'all') {
      result = result.filter((item) => item.kind === filters.kind);
    }
    if (filters.status !== 'all') {
      result = result.filter((item) => item.status === filters.status);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          (item.body || item.message || '').toLowerCase().includes(q) ||
          (item.anchor?.file || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, searchQuery, filters.kind, filters.status]);

  const inboxSections = useMemo(
    () => [
      { id: 'comments', label: 'Comments', kind: 'comment', noteType: null, icon: Terminal },
      { id: 'flash', label: 'Flash', kind: 'memo', noteType: 'flash', icon: StickyNote },
      { id: 'excerpt', label: 'Excerpt', kind: 'memo', noteType: 'excerpt', icon: Quote },
      { id: 'screenshot', label: 'Screenshot', kind: 'memo', noteType: 'screenshot', icon: Camera },
    ],
    []
  );
  const activeInboxSection =
    inboxSections.find((section) => section.id === dockSelection.inboxType) || inboxSections[0];
  const inboxCounts = useMemo(() => {
    const counts = {};
    inboxSections.forEach((section) => {
      counts[section.id] = inboxItems.filter((item) => {
        if (item.kind !== section.kind) return false;
        if (section.noteType && item.meta?.noteType !== section.noteType) return false;
        return true;
      }).length;
    });
    return counts;
  }, [inboxItems, inboxSections]);
  const visibleInboxItems = useMemo(() => {
    if (!activeInboxSection) {
      return [];
    }
    return filteredItems.filter((item) => {
      if (item.meta?.processed === true) {
        return false;
      }
      if (item.kind !== activeInboxSection.kind) {
        return false;
      }
      if (activeInboxSection.noteType && item.meta?.noteType !== activeInboxSection.noteType) {
        return false;
      }
      return true;
    });
  }, [activeInboxSection, filteredItems]);

  const summary = useMemo(() => {
    const counts = { comment: 0, memo: 0, draft: 0 };
    items.forEach((item) => {
      if (counts[item.kind] !== undefined) counts[item.kind] += 1;
    });
    return counts;
  }, [items]);

  const routingTargets = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (projectRoot) {
      list.push({
        id: 'project-root',
        label: 'Project Root',
        worktreePath: projectRoot,
      });
      seen.add(projectRoot);
    }
    (cells || [])
      .filter((cell) => cell?.worktreePath)
      .forEach((cell) => {
        if (seen.has(cell.worktreePath)) {
          return;
        }
        seen.add(cell.worktreePath);
        list.push({
          id: cell.id,
          label: cell.name || cell.id,
          worktreePath: cell.worktreePath,
        });
      });
    return list;
  }, [cells, projectRoot]);

  const resolveDefaultRoutingTarget = useCallback(() => {
    const selectedCell = cells.find((cell) => cell.id === selectedCellId && cell.worktreePath);
    if (selectedCell?.id) {
      return selectedCell.id;
    }
    if (projectRoot) {
      return 'project-root';
    }
    return routingTargets[0]?.id || '';
  }, [cells, projectRoot, routingTargets, selectedCellId]);

  const updateStatus = useCallback(async (item, status) => {
    if (!window.agency?.updateHilItem || !item?.id || !worktreePath) return;
    await window.agency.updateHilItem({ worktreePath, itemId: item.id, patch: { status } });
    refresh();
  }, [refresh, worktreePath]);

  const selectionInWorktree = Boolean(
    selection?.filePath && selection?.rootPath && worktreePath && selection.rootPath === worktreePath
  );
  const selectionText = selectionInWorktree ? selection.text || '' : '';
  const selectionLines = selectionInWorktree
    ? { start: selection.startLine, end: selection.endLine }
    : null;

  useEffect(() => {
    setCaptureError('');
  }, [activeInboxSection?.id]);

  useEffect(() => {
    if (routingOpen && !routingTargetId) {
      const nextTarget = resolveDefaultRoutingTarget();
      if (nextTarget) {
        setRoutingTargetId(nextTarget);
      }
    }
  }, [resolveDefaultRoutingTarget, routingOpen, routingTargetId]);

  const resetCaptureState = useCallback(() => {
    setFlashText('');
    setExcerptNote('');
    setScreenshotNote('');
    setScreenshotAsset(null);
    setCaptureResult(null);
    setRoutingOpen(false);
    setRoutingMode('hil');
    setRoutingTargetId('');
    setRoutingError('');
    setCaptureError('');
    setCaptureLoading(false);
  }, []);

  const handleCreateMemo = useCallback(
    async ({ body, anchor, meta }) => {
      if (!worktreePath) {
        setCaptureError('Select a project before creating memos.');
        return;
      }
      if (!body || !body.trim()) {
        setCaptureError('Content is required.');
        return;
      }
      setCaptureLoading(true);
      setCaptureError('');
      try {
        await agencyCreateHilItem({
          worktreePath,
          kind: 'memo',
          body: body.trim(),
          anchor,
          meta,
        });
        resetCaptureState();
        refresh();
      } catch (createError) {
        setCaptureError(createError?.message || 'Failed to create memo.');
      } finally {
        setCaptureLoading(false);
      }
    },
    [refresh, resetCaptureState, worktreePath]
  );

  const handleCreateFlash = useCallback(async () => {
    await handleCreateMemo({
      body: flashText,
      meta: { noteType: 'flash' },
    });
  }, [flashText, handleCreateMemo]);

  const handleCreateExcerpt = useCallback(async () => {
    if (!selectionInWorktree || !selectionText.trim()) {
      setCaptureError('Select text in the editor to capture an excerpt.');
      return;
    }
    await handleCreateMemo({
      body: selectionText,
      anchor: selection?.filePath
        ? {
            file: selection.filePath,
            line: selection.startLine || 1,
            column: selection.startColumn || 1,
          }
        : null,
      meta: {
        noteType: 'excerpt',
        source: {
          file: selection.filePath,
          startLine: selection.startLine,
          endLine: selection.endLine,
          selection: selectionText,
          note: excerptNote.trim() || null,
        },
      },
    });
  }, [excerptNote, handleCreateMemo, selection, selectionInWorktree, selectionText]);

  const handleCaptureScreenshot = useCallback(async () => {
    if (!worktreePath) {
      setCaptureError('Select a project before capturing.');
      return;
    }
    setCaptureLoading(true);
    setCaptureError('');
    try {
      const result = await agencyStartScreenshotCapture({ includeAgencyWindows: false });
      if (!result?.dataUrl) {
        setCaptureError('Capture failed.');
        return;
      }
      setCaptureResult(result);
      setRoutingMode('hil');
      if (!routingTargetId) {
        const nextTarget = resolveDefaultRoutingTarget();
        if (nextTarget) {
          setRoutingTargetId(nextTarget);
        }
      }
      setRoutingError('');
      setRoutingOpen(true);
    } catch (captureError) {
      setCaptureError(captureError?.message || 'Failed to capture screenshot.');
    } finally {
      setCaptureLoading(false);
    }
  }, [cells, routingTargetId, selectedCellId, worktreePath]);

  const handleConfirmRouting = useCallback(async () => {
    if (!captureResult?.dataUrl) {
      setRoutingError('Capture payload missing.');
      return;
    }
    const target = cells.find((cell) => cell.id === routingTargetId) || null;
    const targetWorktree = target?.worktreePath || projectRoot || worktreePath;
    const saveToHil = routingMode === 'hil' || routingMode === 'both';
    const saveToClipboard = routingMode === 'clipboard' || routingMode === 'both';
    if (saveToHil && !targetWorktree) {
      setRoutingError('Select a target worktree.');
      return;
    }
    setCaptureLoading(true);
    setRoutingError('');
    try {
      if (saveToClipboard) {
        await agencyCopyCaptureToClipboard({ dataUrl: captureResult.dataUrl });
      }
      let assetMeta = null;
      if (saveToHil) {
        assetMeta = await agencySaveCaptureAsset({
          worktreePath: targetWorktree,
          dataUrl: captureResult.dataUrl,
        });
        if (!assetMeta?.path) {
          throw new Error('Failed to save screenshot asset.');
        }
        const filename = assetMeta.path.split('/').pop() || 'screenshot';
        await agencyCreateHilItem({
          worktreePath: targetWorktree,
          kind: 'memo',
          body: screenshotNote.trim() || `Screenshot ${filename}`,
          meta: {
            noteType: 'screenshot',
            asset: assetMeta,
          },
        });
        if (targetWorktree === worktreePath) {
          const urlResult = await agencyGetWorkbenchFileUrl({
            rootPath: targetWorktree,
            targetPath: assetMeta.path,
          });
          setScreenshotAsset({
            ...assetMeta,
            url: urlResult?.url || '',
          });
          refresh();
        }
      }
      setCaptureResult(null);
      setRoutingOpen(false);
      setScreenshotNote('');
      setRoutingMode('hil');
      setRoutingTargetId('');
    } catch (error) {
      setRoutingError(error?.message || 'Failed to route capture.');
    } finally {
      setCaptureLoading(false);
    }
  }, [
    captureResult,
    cells,
    projectRoot,
    refresh,
    routingMode,
    routingTargetId,
    screenshotNote,
    worktreePath,
  ]);

  const handleCancelRouting = useCallback(() => {
    setRoutingOpen(false);
    setCaptureResult(null);
    setRoutingError('');
  }, []);

  if (!projectReady) {
    return (
      <ProjectEmptyState
        title="No project selected"
        description="Select a workspace to manage HIL repository."
        error={projectError}
        onSelect={onSelectProject}
      />
    );
  }

  return (
    <section className="flex h-full flex-1 flex-col bg-background overflow-hidden select-none">
      <div className="flex flex-1 overflow-hidden">
        {/* Dock */}
        <aside className="w-72 shrink-0 border-r border-border/20 bg-muted/5 flex flex-col">
          <div className="border-b border-border/20 px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col shrink-0">
                <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/40 mb-1">Human-In-Loop</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-foreground tracking-tighter italic">Repository_</span>
                  <div className="flex items-center gap-3 text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest ml-1">
                    <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-muted-foreground/30" /> {summary.comment}</span>
                    <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-muted-foreground/30" /> {summary.memo}</span>
                    <span className="flex items-center gap-1.5 text-primary/40"><div className="w-1 h-1 rounded-full bg-current" /> {summary.draft}</span>
                  </div>
                </div>
              </div>
              <button onClick={refresh} className="shrink-0 p-2 rounded-full bg-muted/5 text-muted-foreground/40 hover:text-foreground transition-all hover:bg-muted/10 active:scale-90">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="mt-4 relative group">
              <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-all" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="FILTER OBJECTS..."
                className="w-full h-10 bg-transparent border-b border-border/10 pl-8 text-xs text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/40 transition-all tracking-[0.1em]"
              />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <FilterChip 
                label="Type" 
                value={filters.kind} 
                options={kindOptions} 
                onChange={(v) => setFilters(curr => ({ ...curr, kind: v }))} 
              />
              <FilterChip 
                label="Status" 
                value={filters.status} 
                options={statusOptions} 
                onChange={(v) => setFilters(curr => ({ ...curr, status: v }))} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
              Inbox
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/40">{pendingInboxCount}</span>
          </div>
          <div className="flex flex-col">
            {inboxSections.map((section) => {
              const Icon = section.icon;
              const active = dockSelection.type === 'inbox' && dockSelection.inboxType === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setDockSelection({ type: 'inbox', inboxType: section.id, draftId: null })}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-[11px] font-semibold transition ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground/60 hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={14} />
                    {section.label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/40">
                    {inboxCounts[section.id] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between px-4 py-2 border-t border-border/10">
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
              Drafts
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/40">{draftCount}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {draftItems.length ? (
              draftItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDockSelection({ type: 'draft', draftId: item.id })}
                  className={`flex w-full flex-col gap-1 px-4 py-2 text-left text-[11px] transition ${
                    dockSelection.type === 'draft' && dockSelection.draftId === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground/60 hover:text-foreground'
                  }`}
                >
                  <span className="truncate font-semibold">{summarizeBody(item)}</span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40">
                    {item.status}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-[10px] text-muted-foreground/40">
                No drafts yet.
              </div>
            )}
          </div>
        </aside>

        {/* Main Pane */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            {dockSelection.type === 'draft' && selectedDraft ? (
              <DraftDetail
                draft={selectedDraft}
                onUpdateStatus={updateStatus}
              />
            ) : (
              <div className="flex h-full flex-col">
                <InboxSection
                  activeSection={activeInboxSection}
                  selectionPath={selectionInWorktree ? selection?.filePath : ''}
                  selectionLines={selectionLines}
                  selectionText={selectionText}
                  flashValue={flashText}
                  onFlashChange={setFlashText}
                  onSaveFlash={handleCreateFlash}
                  excerptNote={excerptNote}
                  onExcerptNoteChange={setExcerptNote}
                  onSaveExcerpt={handleCreateExcerpt}
                  screenshotAsset={screenshotAsset}
                  pendingCapture={captureResult}
                  screenshotNote={screenshotNote}
                  onScreenshotNoteChange={setScreenshotNote}
                  onCaptureScreenshot={handleCaptureScreenshot}
                  onOpenRouting={() => {
                    if (captureResult) {
                      setRoutingOpen(true);
                    }
                  }}
                  captureLoading={captureLoading}
                  captureError={captureError}
                />

                {error && (
                  <div className="mx-6 mt-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-rose-400 text-[11px] font-medium animate-slide-down">
                    <Activity size={14} className="inline mr-2" /> {error}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    {visibleInboxItems.map((item, index) => (
                    <MemoRow
                      key={item.id}
                      index={index}
                      item={item}
                      onUpdateStatus={updateStatus}
                    />
                    ))}
                  </div>

                  {!loading && visibleInboxItems.length === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center opacity-5">
                      <Hash size={64} strokeWidth={1} />
                      <p className="text-[11px] font-black uppercase tracking-[0.5em] mt-6">
                        Inbox Empty
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <CaptureRoutingSheet
        open={routingOpen}
        previewUrl={captureResult?.dataUrl || ''}
        note={screenshotNote}
        onNoteChange={setScreenshotNote}
        targets={routingTargets}
        selectedTargetId={routingTargetId}
        onSelectTarget={setRoutingTargetId}
        mode={routingMode}
        onModeChange={setRoutingMode}
        onConfirm={handleConfirmRouting}
        onCancel={handleCancelRouting}
        error={routingError}
      />
    </section>
  );
}

function FilterChip({ label, value, options, onChange }) {
    const activeLabel = options.find(o => o.value === value)?.label;
    return (
        <div className="relative group/chip">
            <select
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-popover text-foreground">{opt.label}</option>
                ))}
            </select>
            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-muted/10 border border-border/10 text-[9px] font-bold text-muted-foreground/50 group-hover/chip:text-primary group-hover/chip:border-primary/20 transition-all">
                <span className="opacity-40">{label}:</span>
                <span className="text-muted-foreground/80 tracking-tight">{activeLabel}</span>
                <ChevronDown size={10} className="opacity-20" />
            </div>
        </div>
    );
}

function MemoRow({ item, index, onUpdateStatus }) {
    const isResolved = item.status === 'resolved' || item.status === 'archived';
    const isProcessed = item.kind === 'comment' && item.meta?.processed === true;
    const isMemoProcessed = item.kind === 'memo' && item.meta?.processed === true;
    const Icon = kindIcons[item.kind] || FileText;
    const bodySummary = resolveBody(item);
    const noteType = item.kind === 'memo' ? item.meta?.noteType : null;
    const noteLabel = noteType ? String(noteType).toUpperCase() : null;
    
    return (
        <div className={`group flex items-center h-12 px-4 gap-6 transition-all duration-500 rounded-xl ${
            isResolved ? 'opacity-40 grayscale' : 'hover:bg-muted/5'
        }`}>
            {/* Index & Status Dot */}
            <div className="w-8 flex items-center gap-3 shrink-0">
                <span className="text-[9px] font-mono text-muted-foreground/30 font-black">{String(index + 1).padStart(2, '0')}</span>
                <div className={`h-1.5 w-1.5 rounded-full transition-all duration-700 ${item.status === 'open' ? 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-muted-foreground/30'}`} />
            </div>

            {/* Type Identifier */}
            <div className="w-24 shrink-0 flex items-center gap-2">
                <Icon size={13} strokeWidth={1.5} className={!isResolved ? 'text-primary/60' : 'text-muted-foreground/30'} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{item.kind}</span>
                {noteLabel ? (
                    <span className="rounded-full border border-border/20 px-1.5 py-0 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        {noteLabel}
                    </span>
                ) : null}
                {isProcessed || isMemoProcessed ? (
                    <span className="rounded-full border border-emerald-500/30 px-1.5 py-0 text-[8px] font-bold uppercase tracking-widest text-emerald-400/70">
                        Done
                    </span>
                ) : null}
            </div>

            {/* Content Summary */}
            <div className="flex-1 min-w-0 flex items-center gap-4">
                <div className="text-[13px] text-muted-foreground truncate tracking-tight group-hover:text-foreground transition-colors duration-300 font-medium">
                    {bodySummary}
                </div>
                
                {/* Inline Hover Actions: Zen Style */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    {item.status === 'open' ? (
                        <RowAction icon={CheckCircle2} title="Resolve" onClick={() => onUpdateStatus(item, 'resolved')} color="hover:text-emerald-500 hover:bg-emerald-500/10" />
                    ) : (
                        <RowAction icon={RefreshCw} title="Restore" onClick={() => onUpdateStatus(item, 'open')} color="hover:text-amber-500 hover:bg-amber-500/10" />
                    )}
                    <RowAction icon={Archive} title="Archive" onClick={() => onUpdateStatus(item, 'archived')} />
                </div>
            </div>

            {/* Context & Temporal */}
            <div className="w-64 shrink-0 flex items-center justify-end gap-6">
                {item.anchor?.file && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/30 italic truncate max-w-[160px] group-hover:text-muted-foreground/50 transition-colors">
                        <Target size={10} className="shrink-0" />
                        {item.anchor.file.split('/').pop()}
                        <span className="not-italic opacity-40">:{item.anchor.line}</span>
                    </div>
                )}
                <div className="text-[10px] font-mono text-muted-foreground/20 font-bold tabular-nums">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
            </div>
        </div>
    );
}

function DraftDetail({ draft, onUpdateStatus }) {
    const isResolved = draft.status === 'resolved' || draft.status === 'archived';
    const createdAt = draft.createdAt ? new Date(draft.createdAt) : null;
    const references = Array.isArray(draft.references) ? draft.references : [];

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border/10">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Draft Detail
                    </div>
                    <div className="text-lg font-semibold text-foreground tracking-tight">
                        {summarizeBody(draft)}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">
                        <span className="inline-flex items-center gap-1">
                            <Layers size={12} />
                            {draft.status}
                        </span>
                        {createdAt && (
                            <span className="inline-flex items-center gap-1">
                                <Clock size={12} />
                                {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {draft.status === 'open' ? (
                        <RowAction
                            icon={CheckCircle2}
                            title="Resolve"
                            onClick={() => onUpdateStatus(draft, 'resolved')}
                            color="hover:text-emerald-500 hover:bg-emerald-500/10"
                        />
                    ) : (
                        <RowAction
                            icon={RefreshCw}
                            title="Reopen"
                            onClick={() => onUpdateStatus(draft, 'open')}
                            color="hover:text-amber-500 hover:bg-amber-500/10"
                        />
                    )}
                    <RowAction
                        icon={Archive}
                        title="Archive"
                        onClick={() => onUpdateStatus(draft, 'archived')}
                    />
                </div>
            </header>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                <div className="rounded-2xl border border-border/10 bg-muted/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Draft Body
                    </div>
                    <div className="mt-3 text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
                        {resolveBody(draft) || 'No content.'}
                    </div>
                </div>

                {references.length > 0 && (
                    <div className="mt-6">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                            References
                        </div>
                        <div className="mt-2 flex flex-col gap-2">
                            {references.map((ref, index) => (
                                <div
                                    key={`${ref.id || ref.path || index}`}
                                    className="rounded-xl border border-border/10 bg-muted/5 px-3 py-2 text-[11px] text-muted-foreground/70"
                                >
                                    <div className="flex items-center gap-2">
                                        <Target size={12} className="text-primary/60" />
                                        <span className="font-mono truncate">
                                            {ref.path || ref.id || 'Unknown reference'}
                                        </span>
                                        {ref.line ? (
                                            <span className="text-[10px] text-muted-foreground/40">:{ref.line}</span>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function RowAction({ icon: Icon, onClick, title, color = "hover:text-foreground hover:bg-muted/10" }) {
    return (
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`p-1.5 rounded-lg transition-all text-muted-foreground/40 ${color}`}
            title={title}
        >
            <Icon size={14} strokeWidth={2} />
        </button>
    )
}

const kindOptions = [
  { value: 'all', label: 'Everything' },
  { value: 'comment', label: 'Comments' },
  { value: 'memo', label: 'Memos' },
  { value: 'draft', label: 'Drafts' },
];

const statusOptions = [
  { value: 'all', label: 'Any Status' },
  { value: 'open', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
];
