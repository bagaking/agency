import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  FileText,
  Pin,
  PinOff,
  X,
  RefreshCw,
  GitCompare,
  GitCommit,
  Save,
  AlertTriangle,
  Search,
  Command,
  MoreVertical,
  Columns,
  Maximize2,
  Split,
  FileCode,
  ListTodo,
} from 'lucide-react';
import { CodeWorkbenchView } from './CodeWorkbenchView.jsx';
import { MediaWorkbenchView } from './MediaWorkbenchView.jsx';
import { QuickOpenModal } from './QuickOpenModal.jsx';
import { ProjectEmptyState } from '../ProjectEmptyState.jsx';
import { Logo } from '../Logo.jsx';

const languageFromPath = (filePath) => {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'js': case 'cjs': case 'mjs': case 'jsx': return 'javascript';
    case 'ts': case 'tsx': return 'typescript';
    case 'json': return 'json';
    case 'md': case 'markdown': return 'markdown';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'yaml': case 'yml': return 'yaml';
    case 'py': return 'python';
    case 'go': return 'go';
    case 'rs': return 'rust';
    case 'sh': case 'bash': return 'shell';
    default: return 'plaintext';
  }
};

const formatBytes = (value) => {
  if (!value && value !== 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const buildBreadcrumbs = (path) => path.split('/').filter(Boolean);

export function WorkbenchPane({
  workbench,
  activeRootPath,
  activeRootLabel,
  onTabMetaChange,
  cellId,
  projectReady,
  projectError,
  onSelectProject,
  commentLines,
  onOpenComment,
  onCursorPositionChange,
}) {
  if (!projectReady) {
    return (
      <ProjectEmptyState
        title="No project selected"
        description="Connect to a workspace to begin orchestrating agents and editing assets."
        error={projectError}
        onSelect={onSelectProject}
      />
    );
  }
  return (
    <WorkbenchPaneContent
      workbench={workbench}
      activeRootPath={activeRootPath}
      activeRootLabel={activeRootLabel}
      onTabMetaChange={onTabMetaChange}
      cellId={cellId}
      commentLines={commentLines}
      onOpenComment={onOpenComment}
      onCursorPositionChange={onCursorPositionChange}
    />
  );
}

function WorkbenchPaneContent({
  workbench,
  activeRootPath,
  activeRootLabel,
  onTabMetaChange,
  cellId,
  commentLines,
  onOpenComment,
  onCursorPositionChange,
}) {
  const { 
    tabs, 
    activeTab, 
    openFile, 
    closeTab, 
    closeOtherTabs, 
    closeAllTabs, 
    pinTab, 
    reorderTabs, 
    setActiveTab 
  } = workbench;
  
  const [tabStateById, setTabStateById] = useState({});
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [statusPosition, setStatusPosition] = useState({ line: 1, column: 1 });
  const [tabMenu, setTabMenu] = useState(null);
  const dragSourceRef = useRef(null);

  const activeState = activeTab ? tabStateById[activeTab.id] || {} : {};
  const canComment = Boolean(activeTab && activeTab.kind === 'code');

  const updateTabState = useCallback((tabId, updates) => {
    setTabStateById((current) => ({
      ...current,
      [tabId]: { ...(current[tabId] || {}), ...updates },
    }));
  }, []);

  const loadTab = useCallback(async (tab) => {
    if (!tab || !window.agency) return;
    updateTabState(tab.id, { loading: true, error: '', needsReload: false, diffEnabled: false, blameEnabled: false });
    try {
      if (['image', 'video', 'audio', 'pdf'].includes(tab.kind)) {
        const [meta, urlResult] = await Promise.all([
          window.agency.statWorkbenchEntry({ rootPath: tab.rootPath, targetPath: tab.path }),
          window.agency.getWorkbenchFileUrl({ rootPath: tab.rootPath, targetPath: tab.path }),
        ]);
        updateTabState(tab.id, { loading: false, fileUrl: urlResult?.url || '', size: meta?.size || 0, mtimeMs: meta?.mtimeMs || 0 });
        return;
      }
      const result = await window.agency.readWorkbenchEntry({ rootPath: tab.rootPath, targetPath: tab.path });
      updateTabState(tab.id, {
        loading: false,
        content: result?.content || '',
        size: result?.size || 0,
        mtimeMs: result?.mtimeMs || 0,
        binary: Boolean(result?.binary),
        truncated: Boolean(result?.truncated),
        language: languageFromPath(tab.path),
        isDirty: false,
      });
    } catch (error) {
      updateTabState(tab.id, { loading: false, error: error?.message || 'Load failed' });
    }
  }, [updateTabState]);

  useEffect(() => {
    if (activeTab && !tabStateById[activeTab.id]) loadTab(activeTab);
  }, [activeTab, loadTab, tabStateById]);

  const handleSave = useCallback(async () => {
    if (!activeTab || !activeState || !window.agency?.writeWorkbenchEntry) return;
    updateTabState(activeTab.id, { saving: true });
    try {
      const result = await window.agency.writeWorkbenchEntry({
        rootPath: activeTab.rootPath, targetPath: activeTab.path, content: activeState.content || '',
      });
      updateTabState(activeTab.id, { saving: false, isDirty: false, mtimeMs: result?.mtimeMs || activeState.mtimeMs });
    } catch (error) {
      updateTabState(activeTab.id, { saving: false, error: 'Save failed' });
    }
  }, [activeState, activeTab, updateTabState]);

  const toggleDiff = useCallback(async () => {
    if (!activeTab || !window.agency?.diffWorkbenchEntry) return;
    const enabled = !activeState.diffEnabled;
    updateTabState(activeTab.id, { diffEnabled: enabled });
    if (enabled && !activeState.diffHunks) {
      try {
        const result = await window.agency.diffWorkbenchEntry({ rootPath: activeTab.rootPath, targetPath: activeTab.path });
        updateTabState(activeTab.id, { diffHunks: result?.hunks || [] });
      } catch (e) { console.error(e); }
    }
  }, [activeState, activeTab, updateTabState]);

  const toggleBlame = useCallback(async () => {
    if (!activeTab || !window.agency?.blameWorkbenchEntry) return;
    const enabled = !activeState.blameEnabled;
    updateTabState(activeTab.id, { blameEnabled: enabled });
    if (enabled && !activeState.blameLines) {
      try {
        const result = await window.agency.blameWorkbenchEntry({ rootPath: activeTab.rootPath, targetPath: activeTab.path });
        updateTabState(activeTab.id, { blameLines: result?.lines || [] });
      } catch (e) { console.error(e); }
    }
  }, [activeState, activeTab, updateTabState]);

  const handleCursorChange = useCallback(
    (position) => {
      setStatusPosition(position);
      onCursorPositionChange?.(position);
    },
    [onCursorPositionChange]
  );

  const breadcrumbs = activeTab ? buildBreadcrumbs(activeTab.path) : [];

  return (
    <section className="flex h-full flex-1 flex-col bg-[#0b0d11] overflow-hidden select-none">
      {/* 1. Header: File Tabs & Global Actions */}
      <div className="flex h-11 shrink-0 items-center bg-[#111318] border-b border-white/[0.03]">
        <div className="flex-1 flex items-center h-full overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map((tab) => {
            const state = tabStateById[tab.id] || {};
            const isActive = activeTab?.id === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onContextMenu={(e) => { e.preventDefault(); setTabMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
                className={`group relative flex items-center gap-2.5 px-4 h-full min-w-fit transition-all cursor-pointer border-r border-white/[0.03] ${
                  isActive ? 'bg-[#0b0d11] text-foreground' : 'text-muted-foreground/50 hover:bg-white/[0.02] hover:text-muted-foreground'
                }`}
              >
                {/* Active Indicator Line (Top) */}
                {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                
                <FileText size={13} className={isActive ? 'text-primary' : 'opacity-30 group-hover:opacity-60'} />
                <span className={`text-[11px] font-bold tracking-tight whitespace-nowrap ${tab.isPreview ? 'italic opacity-80' : ''}`}>
                    {tab.title}
                </span>
                
                {state.isDirty ? (
                    <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)] ml-1" />
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                        className={`p-1 rounded-md hover:bg-white/10 transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        <X size={12} strokeWidth={2.5} />
                    </button>
                )}
              </div>
            );
          })}
          
          {tabs.length === 0 && (
            <div className="px-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/10 italic">
                <Columns size={12} />
                Editor Workspace Empty
            </div>
          )}
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-1 px-3 border-l border-white/[0.03]">
          <button onClick={() => setQuickOpenVisible(true)} className="p-2 text-muted-foreground/40 hover:text-primary transition-all hover:bg-white/5 rounded-lg" title="Quick Open (Cmd+P)">
            <Search size={16} strokeWidth={2} />
          </button>
          <button className="p-2 text-muted-foreground/20 hover:text-muted-foreground transition-all rounded-lg" title="Split Editor">
            <Split size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 2. Sub-Header: Breadcrumbs & Editor Actions */}
      <div className="flex h-9 shrink-0 items-center justify-between bg-[#0b0d11] border-b border-white/[0.02] px-4">
        <div className="flex items-center gap-2 overflow-hidden py-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.1em]">
            <Logo size={14} className="opacity-30 grayscale shrink-0" />
            <span className="hidden sm:inline">{activeRootLabel}</span>
          </div>
          <ChevronRight size={10} className="text-muted-foreground/10 shrink-0" />
          <div className="flex items-center gap-1 overflow-hidden">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                <span className={`text-[10px] font-medium transition-colors whitespace-nowrap ${i === breadcrumbs.length - 1 ? 'text-muted-foreground/90 font-bold' : 'text-muted-foreground/30 hover:text-muted-foreground/60 cursor-default'}`}>
                  {crumb}
                </span>
                {i < breadcrumbs.length - 1 && <ChevronRight size={8} className="text-muted-foreground/5 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {activeTab && (
          <div className="flex items-center gap-1.5 pl-4">
            <div className="flex items-center bg-white/[0.03] rounded-md p-0.5 border border-white/[0.02]">
                <button 
                    onClick={toggleDiff} 
                    className={`p-1.5 rounded transition-all ${activeState.diffEnabled ? 'bg-primary/20 text-primary shadow-sm' : 'text-muted-foreground/30 hover:text-muted-foreground/60'}`}
                    title="Git Diff"
                >
                    <GitCompare size={13} strokeWidth={2} />
                </button>
                <button 
                    onClick={toggleBlame} 
                    className={`p-1.5 rounded transition-all ${activeState.blameEnabled ? 'bg-primary/20 text-primary shadow-sm' : 'text-muted-foreground/30 hover:text-muted-foreground/60'}`}
                    title="Git Blame"
                >
                    <GitCommit size={13} strokeWidth={2} />
                </button>
            </div>

            <div className="w-px h-4 bg-white/5 mx-1" />

            <div className="flex items-center gap-1">
                <button onClick={() => loadTab(activeTab)} className="p-1.5 text-muted-foreground/30 hover:text-foreground transition-all rounded-md hover:bg-white/5" title="Reload File">
                    <RefreshCw size={13} className={activeState.loading ? 'animate-spin' : ''} />
                </button>
                <button
                    onClick={handleSave}
                    disabled={!activeState.isDirty}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all border ${
                        activeState.isDirty 
                            ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]' 
                            : 'border-transparent text-muted-foreground/20 pointer-events-none'
                    }`}
                >
                    <Save size={12} strokeWidth={2.5} />
                    {activeState.saving ? 'Saving...' : 'Save'}
                </button>
                <button 
                    onClick={() => pinTab(activeTab.id)} 
                    className={`p-1.5 rounded-md transition-all ${activeTab.isPreview ? 'text-muted-foreground/30 hover:text-foreground hover:bg-white/5' : 'text-primary bg-primary/5'}`}
                    title={activeTab.isPreview ? "Pin Tab" : "Pinned"}
                >
                    {activeTab.isPreview ? <Pin size={13} /> : <PinOff size={13} />}
                </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Viewport */}
      <div className="flex-1 overflow-hidden relative">
        {!activeTab ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground/20 bg-[#0b0d11]">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
                <Logo size={96} className="relative opacity-[0.03] grayscale animate-pulse-slow" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.5em] opacity-30">Infrastructure Ready</p>
            <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-primary/40" /> Cmd + P : Quick Open</div>
                <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-primary/40" /> Cmd + S : Save File</div>
                <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-primary/40" /> Double Click : Pin Tab</div>
                <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-primary/40" /> Right Click : Context</div>
            </div>
          </div>
        ) : activeState.loading ? (
          <div className="flex h-full flex-col items-center justify-center bg-[#0b0d11]">
            <RefreshCw size={24} className="animate-spin text-primary/40 mb-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30">Loading Object</span>
          </div>
        ) : activeState.error ? (
          <div className="flex h-full flex-col items-center justify-center text-rose-400 bg-rose-500/[0.02]">
            <AlertTriangle size={32} strokeWidth={1} className="mb-4 opacity-50" />
            <span className="text-xs italic font-medium">{activeState.error}</span>
            <button onClick={() => loadTab(activeTab)} className="mt-6 px-4 py-1.5 rounded-full border border-rose-500/20 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500/10 transition-all">Retry Access</button>
          </div>
        ) : (
          <CodeWorkbenchView
            value={activeState.content || ''}
            language={activeState.language || 'plaintext'}
            diffHunks={activeState.diffEnabled ? activeState.diffHunks || [] : []}
            blameEnabled={activeState.blameEnabled}
            blameLines={activeState.blameLines || []}
            commentLines={commentLines}
            commentsEnabled={canComment}
            readOnly={activeState.truncated}
            onChange={(val) => updateTabState(activeTab.id, { content: val, isDirty: true })}
            onCursorChange={setStatusPosition}
            onLineComment={({ line, column }) => {
              openCommentModal({ line, column });
            }}
          />
        )}
        {activeTab && canComment && (
          <div className="absolute right-4 top-4 w-64 rounded-xl border border-white/10 bg-[#141821]/95 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Comments {comments.length ? `(${comments.length})` : ''}
              </span>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary/70 hover:border-primary/40 hover:text-primary"
                onClick={() => openCommentModal({ line: statusPosition.line, column: statusPosition.column })}
              >
                <MessageSquarePlus size={11} />
                Add
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto px-3 py-2 space-y-2">
              {commentsLoading && (
                <div className="text-[10px] text-muted-foreground/40">Loading comments…</div>
              )}
              {commentsError && (
                <div className="text-[10px] text-rose-400">{commentsError}</div>
              )}
              {!commentsLoading && !commentsError && comments.length === 0 && (
                <div className="text-[10px] text-muted-foreground/40">No comments yet.</div>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
                    <span>Ln {comment.line}</span>
                    {comment.todo && (
                      <span className="flex items-center gap-1 text-amber-300/80">
                        <ListTodo size={10} />
                        TODO
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground/80">
                    {comment.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Functional Footer */}
      {activeTab && (
        <div className="flex h-7 shrink-0 items-center justify-between px-4 bg-[#111318] border-t border-white/[0.03] text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <span className="text-muted-foreground/20">Position</span>
                <span className="text-muted-foreground/60 tracking-tighter">Ln {statusPosition.line}, Col {statusPosition.column}</span>
            </div>
            {activeState.truncated && (
                <div className="flex items-center gap-1.5 text-amber-500/60">
                    <AlertTriangle size={10} />
                    <span>Overflow Truncated</span>
                </div>
            )}
            {activeState.binary && <span className="text-rose-400/60 ring-1 ring-rose-500/20 px-1.5 py-0.5 rounded-sm bg-rose-500/5">Binary Object</span>}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <FileCode size={10} className="text-primary/40" />
                <span className="text-primary/60">{activeState.language}</span>
            </div>
            <div className="h-3 w-px bg-white/5" />
            <div className="flex items-center gap-2">
                <Maximize2 size={10} className="opacity-20" />
                <span>{formatBytes(activeState.size)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Context Modals */}
      <QuickOpenModal open={quickOpenVisible} onClose={() => setQuickOpenVisible(false)} onSelect={(path) => openFile({ path, mode: 'preview', rootPath: activeRootPath })} rootPath={activeRootPath} />

      {tabMenu && (
        <div
          data-workbench-tab-menu
          className="fixed z-[100] w-44 rounded-xl border border-white/10 bg-[#1a1d23]/95 backdrop-blur-xl py-1.5 text-[11px] shadow-2xl animate-tab-in ring-1 ring-black/50"
          style={{ top: tabMenu.y, left: tabMenu.x }}
        >
          <TabMenuItem label="Close Tab" icon={X} onClick={() => { closeTab(tabMenu.tabId); setTabMenu(null); }} />
          <TabMenuItem label="Close Others" onClick={() => { closeOtherTabs(tabMenu.tabId); setTabMenu(null); }} />
          <TabMenuItem label="Close All" onClick={() => { closeAllTabs(); setTabMenu(null); }} />
          <div className="my-1 border-t border-white/5" />
          <TabMenuItem label="Keep Open (Pin)" icon={Pin} onClick={() => { pinTab(tabMenu.tabId); setTabMenu(null); }} />
        </div>
      )}
    </section>
  );
}

function TabMenuItem({ label, icon: Icon, onClick, variant }) {
    return (
        <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
            onClick={onClick}
        >
            <span className="font-medium tracking-tight">{label}</span>
            {Icon && <Icon size={12} className="opacity-30 group-hover:opacity-100" />}
        </button>
    );
}
