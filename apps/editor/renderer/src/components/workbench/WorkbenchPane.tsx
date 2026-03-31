import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  FileCode,
  FileWarning,
  FileCode2,
  MessageSquarePlus,
} from 'lucide-react';
import { CodeWorkbenchView } from './CodeWorkbenchView';
import { MediaWorkbenchView } from './MediaWorkbenchView';
import { VectorWorkbenchView } from './VectorWorkbenchView';
import { QuickOpenModal } from './QuickOpenModal';
import { ProjectEmptyState } from '../ProjectEmptyState';
import { Logo } from '../Logo';
import { IconButton } from '../ui/IconButton';
import { useModal } from '../modals/ModalSystem';
import {
  isAgencyAvailable,
  isAgencyMethodAvailable,
} from '../../services/agencyBridge';
import {
  buildWorkbenchBreadcrumbs,
  formatWorkbenchBytes,
} from './workbenchPaneHelpers';
import { loadWorkbenchCodeState, loadWorkbenchTabState } from './workbenchPaneLoaders';
import {
} from './workbenchPaneCommands';
import { useWorkbenchKeyboardShortcuts } from './useWorkbenchKeyboardShortcuts';
import { useWorkbenchDiskSync } from './useWorkbenchDiskSync';
import { useWorkbenchDocumentCommands } from './useWorkbenchDocumentCommands';
import { resolveWorkbenchLanguageDecision } from './workbenchLanguageDecision';
import { useWorkbenchProjectPolicy } from './useWorkbenchProjectPolicy';
import { useWorkbenchLanguageOverrides } from './useWorkbenchLanguageOverrides';
import { WorkbenchLanguageControl } from './WorkbenchLanguageControl';
import { getWorkbenchLanguageLabel } from '../../../../shared/workbenchLanguageCore';


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
  pendingJump,
  onJumpHandled,
  onRevealPathInExplorer,
}: any) {
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
      pendingJump={pendingJump}
      onJumpHandled={onJumpHandled}
      onRevealPathInExplorer={onRevealPathInExplorer}
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
  pendingJump,
  onJumpHandled,
  onRevealPathInExplorer,
}: any) {
  const modal = useModal();
  const { 
    tabs, 
    activeTab, 
    openFile, 
    closeTab, 
    closeOtherTabs, 
    closeAllTabs, 
    pinTab, 
    setActiveTab 
  } = workbench;
  
  const [tabStateById, setTabStateById] = useState({});
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [localPendingJump, setLocalPendingJump] = useState<any>(null);
  const [statusPosition, setStatusPosition] = useState({ line: 1, column: 1 });
  const [tabMenu, setTabMenu] = useState(null);
  const [editorToken, setEditorToken] = useState(0);
  const activeEditorRef = useRef(null);
  const tabStateByIdRef = useRef({});
  const loadRequestByTabRef = useRef({});
  const activePolicyRootPath = activeTab?.rootPath || activeRootPath;
  const projectPolicy = useWorkbenchProjectPolicy(activePolicyRootPath);
  const languageOverrides = useWorkbenchLanguageOverrides({
    stateKey: activePolicyRootPath,
    currentFilePath: activeTab?.path || '',
  });

  const activeState = activeTab ? tabStateById[activeTab.id] || {} : {};
  const effectivePendingJump = pendingJump || localPendingJump;
  const resolvedCommentLines = Array.isArray(commentLines) ? commentLines : [];
  const canComment = Boolean(activeTab && activeTab.kind === 'code');
  const isCodeTab = activeState.kind === 'code';
  const activeLanguageDecision =
    activeTab && isCodeTab
      ? resolveWorkbenchLanguageDecision({
          targetPath: activeTab.path,
          manualLanguage: languageOverrides.currentFileOverride,
          projectRules: projectPolicy.languages.overrides,
        })
      : null;
  const resolvedActiveLanguage =
    activeLanguageDecision?.language ||
    activeState.language ||
    (activeState.kind === 'vector' ? 'xml' : '');
  const passiveFooterLabel =
    activeState.kind === 'vector'
      ? getWorkbenchLanguageLabel(resolvedActiveLanguage || 'xml')
      : String(activeState.kind || '').toUpperCase() || 'OBJECT';
  const controlPolicyWarnings =
    activeLanguageDecision?.source === 'project' ? projectPolicy.warnings : [];
  const controlPolicyError =
    activeLanguageDecision?.source === 'project' ? projectPolicy.error : '';

  useEffect(() => {
    tabStateByIdRef.current = tabStateById;
  }, [tabStateById]);

  const updateTabState = useCallback((tabId, updates) => {
    setTabStateById((current) => ({
      ...current,
      [tabId]: { ...(current[tabId] || {}), ...updates },
    }));
  }, []);

  const updateTabContent = useCallback((tabId, nextContent) => {
    setTabStateById((current) => {
      const previous = current[tabId] || {};
      const content = nextContent || '';
      const syncedContent =
        typeof previous.syncedContent === 'string'
          ? previous.syncedContent
          : previous.content || '';
      return {
        ...current,
        [tabId]: {
          ...previous,
          content,
          isDirty: content !== syncedContent,
        },
      };
    });
  }, []);

  const loadTab = useCallback(async (tab) => {
    if (!tab || !isAgencyAvailable()) {
      return;
    }
    const tabId = tab.id;
    const requestId = (Number(loadRequestByTabRef.current[tabId]) || 0) + 1;
    loadRequestByTabRef.current[tabId] = requestId;

    const commitIfLatest = (updates) => {
      if (loadRequestByTabRef.current[tabId] !== requestId) {
        return false;
      }
      updateTabState(tabId, updates);
      return true;
    };

    updateTabState(tabId, {
      loading: true,
      error: '',
      needsReload: false,
      diskMtimeMs: 0,
      diffEnabled: false,
      blameEnabled: false,
      unlocked: false,
    });

    try {
      const nextState = await loadWorkbenchTabState({
        rootPath: tab.rootPath,
        targetPath: tab.path,
      });
      commitIfLatest(nextState);
    } catch (error) {
      commitIfLatest({ loading: false, error: error?.message || 'Load failed' });
    }
  }, [updateTabState]);

  useEffect(() => {
    if (activeTab && !tabStateById[activeTab.id]) {
      loadTab(activeTab);
    }
  }, [activeTab, loadTab, tabStateById]);

  useWorkbenchDiskSync({
    activeTab,
    loadTab,
    updateTabState,
    tabStateByIdRef,
  });


  const {
    handleSave,
    handleSaveAs,
    handleReload,
    toggleDiff,
    toggleBlame,
    handleUnlock,
  } = useWorkbenchDocumentCommands({
    activeTab,
    activeState,
    modal,
    openFile,
    updateTabState,
    loadTab,
  });

  const registerActiveEditor = useCallback((editor) => {
    activeEditorRef.current = editor || null;
    setEditorToken((value) => value + 1);
  }, []);

  const runEditorAction = useCallback((actionId) => {
    const editor = activeEditorRef.current;
    if (!editor || !actionId) {
      return;
    }
    const action = editor.getAction?.(actionId);
    action?.run?.();
  }, []);

  const closeActiveTab = useCallback(() => {
    if (activeTab?.id) {
      closeTab(activeTab.id);
    }
  }, [activeTab?.id, closeTab]);

  useWorkbenchKeyboardShortcuts({
    activeTab,
    activeKind: activeState.kind,
    onSave: handleSave,
    onSaveAs: handleSaveAs,
    onCloseActiveTab: closeActiveTab,
    runEditorAction,
  });

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

  useEffect(() => {
    if (!effectivePendingJump || !activeTab) {
      return;
    }
    if (
      effectivePendingJump.path !== activeTab.path ||
      effectivePendingJump.rootPath !== activeTab.rootPath
    ) {
      return;
    }
    if (activeState.loading) {
      return;
    }
    if (activeState.kind !== 'code') {
      if (pendingJump) {
        onJumpHandled?.();
      }
      if (localPendingJump) {
        setLocalPendingJump(null);
      }
      return;
    }
    const editor = activeEditorRef.current;
    if (!editor) {
      return;
    }
    const model = editor.getModel?.();
    const maxLine = model?.getLineCount?.() || effectivePendingJump.line || 1;
    const line = Math.min(Math.max(1, Math.floor(effectivePendingJump.line || 1)), maxLine);
    const column = Math.max(1, Math.floor(effectivePendingJump.column || 1));
    editor.setPosition?.({ lineNumber: line, column });
    editor.revealPositionInCenter?.({ lineNumber: line, column });
    editor.focus?.();
    if (pendingJump) {
      onJumpHandled?.();
    }
    if (localPendingJump) {
      setLocalPendingJump(null);
    }
  }, [
    activeState.kind,
    activeState.loading,
    activeTab,
    editorToken,
    effectivePendingJump,
    localPendingJump,
    onJumpHandled,
    pendingJump,
  ]);

  const breadcrumbs = activeTab ? buildWorkbenchBreadcrumbs(activeTab.path) : [];

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
	            <HeaderButton
	              onClick={() => setQuickOpenVisible(true)}
	              icon={Search}
	              label="Quick Open"
	              shortcut="⌘P"
	              primary
	            />
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
            {breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.id}>
                <button
                  type="button"
                  onClick={() => onRevealPathInExplorer?.(crumb.path)}
                  className={`text-[10px] font-medium transition-colors whitespace-nowrap rounded-sm px-0.5 ${
                    crumb.isLast
                      ? 'text-white/80 hover:text-white'
                      : 'text-white/30 hover:text-white/70'
                  }`}
                  title={`Reveal in Explorer: ${crumb.path}`}
                >
                  {crumb.label}
                </button>
                {!crumb.isLast && <ChevronRight size={8} className="text-white/[0.02] shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {activeTab && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-white/[0.03] bg-white/[0.02] px-2 py-1">
              <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/22">
                Review
              </span>
              <div className="flex items-center gap-1 rounded-md bg-black/10 p-0.5">
                <ToolButton
                  active={activeState.diffEnabled}
                  onClick={toggleDiff}
                  icon={GitCompare}
                  title="Show Diff"
                />
                <ToolButton
                  active={activeState.blameEnabled}
                  onClick={toggleBlame}
                  icon={GitCommit}
                  title="Show Blame"
                />
                <div className="mx-0.5 h-3 w-px bg-white/5" />
                <ToolButton
                  onClick={() =>
                    onOpenComment?.({ line: statusPosition.line, column: statusPosition.column })
                  }
                  icon={MessageSquarePlus}
                  title="Add HIL Comment"
                />
              </div>
            </div>

            <div className="h-4 w-px bg-white/5" />

            <div className="flex items-center gap-2 rounded-md border border-white/[0.03] bg-white/[0.02] px-2 py-1">
              <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/22">
                File
              </span>
              <div className="flex items-center gap-1">
                <ToolButton
                  loading={activeState.loading}
                  onClick={handleReload}
                  icon={RefreshCw}
                  title="Sync from Disk"
                />

                <IconButton
                  label={activeState.saving ? 'Saving changes' : 'Save changes'}
                  tooltip={activeState.saving ? 'Saving changes' : 'Save changes'}
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
                    title={activeTab.isPreview ? 'Keep Open' : 'Pinned'}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Viewport */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab && activeState.needsReload ? (
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-md border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[10px] font-semibold text-amber-100 shadow-lg">
            <AlertTriangle size={12} className="text-amber-300" />
            <span>
              {activeState.isDirty
                ? 'File changed on disk. Reload to reconcile before saving.'
                : 'File changed on disk. Click reload to sync.'}
            </span>
            <button
              type="button"
              onClick={handleReload}
              className="rounded border border-amber-300/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100 hover:bg-amber-500/20"
            >
              Reload
            </button>
          </div>
        ) : null}
        {!activeTab ? (
	          <div className="flex h-full flex-col items-center justify-center text-white/[0.02] bg-[#0b0d11]">
	            <Logo size={120} className="opacity-10 grayscale animate-pulse-slow mb-8" />
	            <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-[9px] font-bold uppercase tracking-[0.3em]">
	                <div className="flex items-center gap-3"><div className="w-1.5 h-[1px] bg-primary/20" /> CMD + P <span className="opacity-40">Quick Open</span></div>
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
            language={resolvedActiveLanguage}
            readOnly={activeState.truncated}
            onChange={(val) => updateTabContent(activeTab.id, val)}
            onCursorChange={setStatusPosition}
          />
        ) : activeState.kind === 'code' ? (
          <CodeWorkbenchView
            value={activeState.content || ''}
            language={resolvedActiveLanguage}
            diffHunks={activeState.diffEnabled ? activeState.diffHunks || [] : []}
            blameEnabled={activeState.blameEnabled}
            blameLines={activeState.blameLines || []}
            commentLines={resolvedCommentLines}
            commentsEnabled={canComment}
            readOnly={activeState.truncated}
            onChange={(val) => updateTabContent(activeTab.id, val)}
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
            onLineComment={({ line, column }: any) => onOpenComment?.({ line, column })}
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
            {activeLanguageDecision ? (
              <WorkbenchLanguageControl
                key={activeTab?.id || activeTab?.path || 'workbench-language-control'}
                decision={activeLanguageDecision}
                policyWarnings={controlPolicyWarnings}
                policyError={controlPolicyError}
                disabled={!languageOverrides.restored || projectPolicy.loading}
                onSelectLanguage={languageOverrides.setCurrentFileOverride}
                onResetToAuto={languageOverrides.resetCurrentFileOverride}
              />
	            ) : (
	              <div className="flex items-center gap-2">
	                <FileCode size={10} className="text-primary/20" />
	                <span className="text-primary/20">{passiveFooterLabel}</span>
	              </div>
	            )}
	            <div className="h-3 w-px bg-white/[0.03]" />
	            <div className="flex items-center gap-2">
	              <span className="opacity-35">Size</span>
	              <span>{formatWorkbenchBytes(activeState.size)}</span>
	            </div>
	        </div>
	      </div>

	      <QuickOpenModal
	        open={quickOpenVisible}
	        onClose={() => setQuickOpenVisible(false)}
	        onSelect={(item) => {
	          if (item?.kind === 'tab' && item?.tabId) {
	            setActiveTab(item.tabId);
	            if (item.line) {
	              setLocalPendingJump({
	                path: item.path,
	                rootPath: item.rootPath || activeRootPath,
	                line: item.line,
	                column: item.column || 1,
	              });
	            }
	            return;
	          }
	          if (item?.path) {
	            openFile({ path: item.path, mode: 'preview', rootPath: activeRootPath });
	            if (item.line) {
	              setLocalPendingJump({
	                path: item.path,
	                rootPath: activeRootPath,
	                line: item.line,
	                column: item.column || 1,
	              });
	            }
	          }
	        }}
	        rootPath={activeRootPath}
	        openTabs={tabs}
	        activeTabId={activeTab?.id || ''}
	      />

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

function HeaderButton({ onClick, icon: Icon, label, shortcut, primary }: any) {
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

function ToolButton({ active, loading, onClick, icon: Icon, title }: any) {
    return (
        <button 
            onClick={onClick} 
            className={`p-1.5 rounded-md transition-all ${
              active
                ? 'bg-primary/10 text-primary'
                : 'text-white/18 hover:text-white/55 hover:bg-white/5'
            }`}
            title={title}
        >
            <Icon size={13} strokeWidth={active ? 2.5 : 1.5} className={loading ? 'animate-spin' : ''} />
        </button>
    )
}

function TabMenuItem({ label, icon: Icon, onClick }: any) {
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
