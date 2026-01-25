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
  Columns,
  Maximize2,
  Split,
  FileCode,
  FileWarning,
  FileCode2,
  MessageSquarePlus,
} from 'lucide-react';
import { CodeWorkbenchView } from './CodeWorkbenchView.jsx';
import { MediaWorkbenchView } from './MediaWorkbenchView.jsx';
import { VectorWorkbenchView } from './VectorWorkbenchView.jsx';
import { QuickOpenModal } from './QuickOpenModal.jsx';
import { ProjectEmptyState } from '../ProjectEmptyState.jsx';
import { Logo } from '../Logo.jsx';
import { IconButton } from '../ui/IconButton.jsx';

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
    case 'sql': return 'sql';
    default: return 'plaintext';
  }
};

const TEXT_EXTS = new Set([
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'json', 'yaml', 'yml', 'toml', 'md', 'markdown',
    'css', 'scss', 'less', 'html', 'htm', 'py', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'java',
    'rb', 'php', 'sh', 'bash', 'zsh', 'sql', 'txt', 'log', 'env', 'gitignore', 'makefile'
]);

const MEDIA_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'pdf']);

const detectSecureKind = (filePath) => {
    const ext = (filePath.split('.').pop() || '').toLowerCase();
    if (ext === 'svg') return 'vector';
    if (TEXT_EXTS.has(ext)) return 'code';
    if (MEDIA_EXTS.has(ext)) {
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico'].includes(ext)) return 'image';
        if (['mp4', 'mov', 'webm'].includes(ext)) return 'video';
        if (['mp3', 'wav'].includes(ext)) return 'audio';
        if (ext === 'pdf') return 'pdf';
    }
    return 'unknown';
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
  onSelectionChange,
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
      onSelectionChange={onSelectionChange}
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
  onSelectionChange,
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
  const activeEditorRef = useRef(null);

  const activeState = activeTab ? tabStateById[activeTab.id] || {} : {};
  const resolvedCommentLines = Array.isArray(commentLines) ? commentLines : [];
  const canComment = Boolean(activeTab && activeTab.kind === 'code');

  const updateTabState = useCallback((tabId, updates) => {
    setTabStateById((current) => ({
      ...current,
      [tabId]: { ...(current[tabId] || {}), ...updates },
    }));
  }, []);

  const loadTab = useCallback(async (tab) => {
    if (!tab || !window.agency) return;
    const secureKind = detectSecureKind(tab.path);
    
    updateTabState(tab.id, { 
        loading: true, 
        error: '', 
        needsReload: false, 
        diffEnabled: false, 
        blameEnabled: false,
        secureKind,
        unlocked: false
    });

    try {
      if (secureKind === 'vector') {
          const [contentResult, urlResult, meta] = await Promise.all([
            window.agency.readWorkbenchEntry({ rootPath: tab.rootPath, targetPath: tab.path }),
            window.agency.getWorkbenchFileUrl({ rootPath: tab.rootPath, targetPath: tab.path }),
            window.agency.statWorkbenchEntry({ rootPath: tab.rootPath, targetPath: tab.path }),
          ]);
          updateTabState(tab.id, {
            loading: false,
            content: contentResult?.content || '',
            fileUrl: urlResult?.url || '',
            size: meta?.size || 0,
            mtimeMs: meta?.mtimeMs || 0,
            language: 'xml',
            isDirty: false,
            kind: 'vector'
          });
          return;
      }

      if (['image', 'video', 'audio', 'pdf'].includes(secureKind)) {
        const [meta, urlResult] = await Promise.all([
          window.agency.statWorkbenchEntry({ rootPath: tab.rootPath, targetPath: tab.path }),
          window.agency.getWorkbenchFileUrl({ rootPath: tab.rootPath, targetPath: tab.path }),
        ]);
        updateTabState(tab.id, { loading: false, fileUrl: urlResult?.url || '', size: meta?.size || 0, mtimeMs: meta?.mtimeMs || 0, kind: secureKind });
        return;
      }

      if (secureKind === 'code') {
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
            kind: 'code'
          });
      } else {
          const meta = await window.agency.statWorkbenchEntry({ rootPath: tab.rootPath, targetPath: tab.path });
          updateTabState(tab.id, {
              loading: false,
              size: meta?.size || 0,
              mtimeMs: meta?.mtimeMs || 0,
              kind: 'unknown'
          });
      }
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
  const handleSaveAs = useCallback(async () => {
    if (!activeTab || !activeState || !window.agency?.writeWorkbenchEntry) {
      return;
    }
    const nextPath = window.prompt('Save as…', activeTab.path);
    if (!nextPath) {
      return;
    }
    const normalizedPath = nextPath.replace(/\\/g, '/').replace(/^\.?\//, '');
    if (!normalizedPath) {
      return;
    }
    updateTabState(activeTab.id, { saving: true });
    try {
      await window.agency.writeWorkbenchEntry({
        rootPath: activeTab.rootPath,
        targetPath: normalizedPath,
        content: activeState.content || '',
      });
      updateTabState(activeTab.id, { saving: false });
      openFile({ path: normalizedPath, mode: 'pinned', rootPath: activeTab.rootPath });
    } catch (error) {
      updateTabState(activeTab.id, { saving: false, error: 'Save as failed.' });
    }
  }, [activeState, activeTab, openFile, updateTabState]);

  const handleReload = useCallback(() => {
    if (activeTab) loadTab(activeTab);
  }, [activeTab, loadTab]);

  const registerActiveEditor = useCallback((editor) => {
    activeEditorRef.current = editor || null;
  }, []);

  const runEditorAction = useCallback((actionId) => {
    const editor = activeEditorRef.current;
    if (!editor || !actionId) {
      return;
    }
    const action = editor.getAction?.(actionId);
    action?.run?.();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!activeTab) {
        return;
      }
      const target = event.target;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      const isMonaco = Boolean(target?.closest?.('.monaco-editor'));
      if (isEditable && !isMonaco) {
        return;
      }
      const isMac = navigator.platform?.toLowerCase().includes('mac');
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      if (!modKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        if (event.shiftKey) {
          handleSaveAs();
        } else {
          handleSave();
        }
        return;
      }
      if (key === 'w') {
        event.preventDefault();
        if (activeTab?.id) {
          closeTab(activeTab.id);
        }
        return;
      }
      if (key === 'f' && activeState.kind === 'code') {
        event.preventDefault();
        if (event.altKey) {
          runEditorAction('editor.action.startFindReplaceAction');
        } else {
          runEditorAction('actions.find');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeState.kind, activeTab, closeTab, handleSave, handleSaveAs, runEditorAction]);

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

  useEffect(() => {
    if (activeState.kind !== 'code') {
      onSelectionChange?.(null);
    }
  }, [activeState.kind, onSelectionChange]);

  useEffect(() => {
    onSelectionChange?.(null);
  }, [activeTab?.id, onSelectionChange]);

  const handleUnlock = async () => {
      if (!activeTab) return;
      updateTabState(activeTab.id, { loading: true });
      try {
          const result = await window.agency.readWorkbenchEntry({ rootPath: activeTab.rootPath, targetPath: activeTab.path });
          updateTabState(activeTab.id, {
            loading: false,
            content: result?.content || '',
            size: result?.size || 0,
            mtimeMs: result?.mtimeMs || 0,
            binary: Boolean(result?.binary),
            truncated: Boolean(result?.truncated),
            language: languageFromPath(activeTab.path),
            isDirty: false,
            kind: 'code',
            unlocked: true
          });
      } catch (e) {
          updateTabState(activeTab.id, { loading: false, error: 'Forced load failed.' });
      }
  };

  const breadcrumbs = activeTab ? buildBreadcrumbs(activeTab.path) : [];

  return (
    <section className="flex h-full flex-1 flex-col bg-[#0b0d11] overflow-hidden select-none">
      {/* 1. Integrated Header: Tabs & Global Context */}
      <div className="flex h-11 shrink-0 items-center bg-[#111318] border-b border-white/[0.03] pl-1 pr-3">
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
                {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_10px_rgba(59,130,246,0.6)]" />}
                <FileText size={13} className={isActive ? 'text-primary' : 'opacity-20 group-hover:opacity-50'} />
                <span className={`text-[11px] font-bold tracking-tight whitespace-nowrap ${tab.isPreview ? 'italic opacity-70' : ''}`}>
                    {tab.title}
                </span>
                {state.isDirty ? (
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] ml-1" />
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                        className={`p-1 rounded-md hover:bg-white/10 transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        <X size={10} strokeWidth={2.5} />
                    </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.02]">
            <HeaderButton onClick={() => setQuickOpenVisible(true)} icon={Search} label="Search" shortcut="⌘P" primary />
            <HeaderButton icon={Split} label="Split" />
          </div>
        </div>
      </div>

      {/* 2. Toolbox Header: Breadcrumbs & Domain Actions */}
      <div className="flex h-9 shrink-0 items-center justify-between bg-[#0b0d11] border-b border-white/[0.02] px-4">
        <div className="flex items-center gap-2 overflow-hidden py-1">
          <div className="flex items-center gap-1.5 text-[9px] font-black text-white/10 uppercase tracking-widest shrink-0">
            <Logo size={12} className="opacity-20 grayscale" />
            <span className="hidden lg:inline">{activeRootLabel}</span>
          </div>
          <ChevronRight size={10} className="text-white/5 shrink-0" />
          <div className="flex items-center gap-1 overflow-hidden">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                <span className={`text-[10px] font-medium transition-colors whitespace-nowrap ${i === breadcrumbs.length - 1 ? 'text-white/80' : 'text-white/20 hover:text-white/40 cursor-default'}`}>
                  {crumb}
                </span>
                {i < breadcrumbs.length - 1 && <ChevronRight size={8} className="text-white/[0.02] shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {activeTab && (
          <div className="flex items-center gap-3">
            {/* Context Toolset */}
            <div className="flex items-center gap-1 bg-white/[0.02] rounded-md p-0.5">
                <ToolButton active={activeState.diffEnabled} onClick={toggleDiff} icon={GitCompare} title="Version Diff" />
                <ToolButton active={activeState.blameEnabled} onClick={toggleBlame} icon={GitCommit} title="Git Blame" />
                <div className="w-px h-3 bg-white/5 mx-0.5" />
                <ToolButton onClick={() => onOpenComment?.({ line: statusPosition.line, column: statusPosition.column })} icon={MessageSquarePlus} title="Add HIL Comment" />
            </div>

            <div className="h-4 w-px bg-white/5" />

            {/* Lifecycle Actions */}
            <div className="flex items-center gap-1">
                <ToolButton loading={activeState.loading} onClick={handleReload} icon={RefreshCw} title="Sync from Disk" />
                
                <IconButton
                  label={activeState.saving ? 'Saving changes' : 'Commit changes'}
                  tooltip={activeState.saving ? 'Saving changes' : 'Commit changes'}
                  side="bottom"
                  focusRing="dark"
                  onClick={handleSave}
                  disabled={!activeState.isDirty}
                  className={`h-7 w-7 rounded-md text-[9px] font-black uppercase tracking-[0.1em] border transition-colors transition-transform ${
                    activeState.isDirty
                      ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105'
                      : 'border-white/5 text-white/5 pointer-events-none'
                  }`}
                >
                  <Save size={11} strokeWidth={3} aria-hidden="true" />
                </IconButton>

                <ToolButton 
                    active={!activeTab.isPreview} 
                    onClick={() => pinTab(activeTab.id)} 
                    icon={activeTab.isPreview ? Pin : PinOff} 
                    title={activeTab.isPreview ? "Keep Open" : "Object Pinned"} 
                />
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Viewport */}
      <div className="flex-1 overflow-hidden relative">
        {!activeTab ? (
          <div className="flex h-full flex-col items-center justify-center text-white/[0.02] bg-[#0b0d11]">
            <Logo size={120} className="opacity-10 grayscale animate-pulse-slow mb-8" />
            <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-[9px] font-bold uppercase tracking-[0.3em]">
                <div className="flex items-center gap-3"><div className="w-1.5 h-[1px] bg-primary/20" /> CMD + P <span className="opacity-40">Open Path</span></div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-[1px] bg-primary/20" /> CMD + S <span className="opacity-40">Save Object</span></div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-[1px] bg-primary/20" /> Double Click <span className="opacity-40">Pin Tab</span></div>
                <div className="flex items-center gap-3"><div className="w-1.5 h-[1px] bg-primary/20" /> Right Click <span className="opacity-40">Command Menu</span></div>
            </div>
          </div>
        ) : activeState.loading ? (
          <div className="flex h-full flex-col items-center justify-center bg-[#0b0d11]">
            <RefreshCw size={24} className="animate-spin text-primary mb-4 opacity-40" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/20">Syncing Object Data</span>
          </div>
        ) : activeState.error ? (
          <div className="flex h-full flex-col items-center justify-center text-rose-400 bg-rose-500/[0.02]">
            <AlertTriangle size={32} strokeWidth={1} className="mb-4 opacity-30" />
            <span className="text-xs font-mono mb-6">{activeState.error}</span>
            <button onClick={() => loadTab(activeTab)} className="px-6 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all">Emergency Retry</button>
          </div>
        ) : activeState.kind === 'unknown' ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground/40 bg-black/20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] text-amber-500/40 mb-6 ring-1 ring-white/5 shadow-2xl">
                <FileWarning size={32} strokeWidth={1.5} />
            </div>
            <div className="text-[11px] font-black uppercase tracking-[0.3em] mb-2 text-white/60 text-center px-10">Unrecognized Object Structure</div>
            <p className="text-[10px] max-w-xs text-center leading-relaxed mb-8 opacity-40 px-10">
                Security protocol has suspended active editing for this structure to prevent data integrity loss.
            </p>
            <div className="flex items-center gap-4">
                <button onClick={() => loadTab(activeTab)} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-[9px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-white/40">
                    <RefreshCw size={10} /> Re-Inspect
                </button>
                <button onClick={handleUnlock} className="flex items-center gap-2 px-6 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all shadow-lg shadow-amber-500/10">
                    <FileCode2 size={12} /> Bypass & Edit
                </button>
            </div>
          </div>
        ) : activeState.kind === 'vector' ? (
          <VectorWorkbenchView
            content={activeState.content || ''}
            fileUrl={activeState.fileUrl}
            language={activeState.language || 'xml'}
            readOnly={activeState.truncated}
            onChange={(val) => updateTabState(activeTab.id, { content: val, isDirty: true })}
            onCursorChange={setStatusPosition}
          />
        ) : activeState.kind === 'code' ? (
          <CodeWorkbenchView
            value={activeState.content || ''}
            language={activeState.language || 'plaintext'}
            diffHunks={activeState.diffEnabled ? activeState.diffHunks || [] : []}
            blameEnabled={activeState.blameEnabled}
            blameLines={activeState.blameLines || []}
            commentLines={resolvedCommentLines}
            commentsEnabled={canComment}
            readOnly={activeState.truncated}
            onChange={(val) => updateTabState(activeTab.id, { content: val, isDirty: true })}
            onCursorChange={handleCursorChange}
            onSelectionChange={(selection) => {
              if (!onSelectionChange) {
                return;
              }
              if (!selection) {
                onSelectionChange(null);
                return;
              }
              onSelectionChange({
                ...selection,
                filePath: activeTab.path,
                rootPath: activeTab.rootPath,
              });
            }}
            onLineComment={({ line, column }) => onOpenComment?.({ line, column })}
            onEditorReady={registerActiveEditor}
          />
        ) : (
          <MediaWorkbenchView kind={activeState.kind} fileUrl={activeState.fileUrl} size={activeState.size} onReload={handleReload} />
        )}
      </div>

      <div className="flex h-7 shrink-0 items-center justify-between px-4 bg-[#111318] border-t border-white/[0.03] text-[9px] font-black uppercase tracking-widest text-white/10">
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/20" />
                <span className="opacity-40">Ln {statusPosition.line}, Col {statusPosition.column}</span>
            </div>
            {activeState.truncated && <div className="flex items-center gap-1.5 text-amber-500/40 italic"><AlertTriangle size={10} /> Buffer Overflow</div>}
            {activeState.binary && <span className="text-rose-400/40 font-black">Binary Object</span>}
        </div>
        
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><FileCode size={10} className="text-primary/20" /><span className="text-primary/40">{activeState.language}</span></div>
            <div className="h-3 w-px bg-white/[0.03]" />
            <div className="flex items-center gap-2"><Maximize2 size={10} className="opacity-10" /><span>{formatBytes(activeState.size)}</span></div>
        </div>
      </div>

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

function HeaderButton({ onClick, icon: Icon, label, shortcut, primary }) {
    return (
        <button 
            onClick={onClick} 
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md transition-all group ${primary ? 'hover:bg-primary/10' : 'hover:bg-white/5'}`}
            title={label}
        >
            <Icon size={14} strokeWidth={primary ? 2.5 : 1.5} className={primary ? 'text-primary' : 'text-white/20 group-hover:text-white/60'} />
            {shortcut && <span className="text-[9px] font-black text-white/10 group-hover:text-white/30 tracking-tighter">{shortcut}</span>}
        </button>
    )
}

function ToolButton({ active, loading, onClick, icon: Icon, title }) {
    return (
        <button 
            onClick={onClick} 
            className={`p-1.5 rounded-md transition-all ${active ? 'bg-primary/10 text-primary' : 'text-white/20 hover:text-white/60 hover:bg-white/5'}`}
            title={title}
        >
            <Icon size={13} strokeWidth={active ? 2.5 : 1.5} className={loading ? 'animate-spin' : ''} />
        </button>
    )
}

function TabMenuItem({ label, icon: Icon, onClick }) {
    return (
        <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-white/40 hover:bg-primary/10 hover:text-primary transition-colors group"
            onClick={onClick}
        >
            <span className="font-semibold tracking-tight">{label}</span>
            {Icon && <Icon size={12} className="opacity-20 group-hover:opacity-100" />}
        </button>
    );
}
