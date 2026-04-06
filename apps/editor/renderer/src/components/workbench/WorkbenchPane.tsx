import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  FileText,
  Globe2,
  Pin,
  PinOff,
  X,
  RefreshCw,
  GitCompare,
  GitCommit,
  Save,
  AlertTriangle,
  Search,
  Maximize2,
  FileCode,
  FileWarning,
  FileCode2,
  MessageSquarePlus,
} from 'lucide-react';
import { CodeWorkbenchView } from './CodeWorkbenchView';
import { MediaWorkbenchView } from './MediaWorkbenchView';
import { VectorWorkbenchView } from './VectorWorkbenchView';
import { WorkbenchBrowserLane } from './WorkbenchBrowserLane';
import {
  WorkbenchBoundedWebResearchChrome,
  WorkbenchBoundedWebResearchReaderPane,
  WorkbenchBoundedWebResearchScene,
  WorkbenchBoundedWebResearchStatusBanner,
} from './WorkbenchBoundedWebResearchView';
import { QuickOpenModal } from './QuickOpenModal';
import { ProjectEmptyState } from '../ProjectEmptyState';
import { Logo } from '../Logo';
import { IconButton } from '../ui/IconButton';
import { useModal } from '../modals/ModalSystem';
import {
  disposeWorkbenchBrowserSurface,
  isAgencyAvailable,
  isAgencyMethodAvailable,
} from '../../services/agencyBridge';
import {
  buildWorkbenchBreadcrumbs,
  formatWorkbenchBytes,
} from './workbenchPaneHelpers';
import { loadWorkbenchCodeState, loadWorkbenchTabState } from './workbenchPaneLoaders';
import {
  deriveWorkbenchResearchTitle,
  isWorkbenchBoundedResearchTab,
  normalizeWorkbenchResearchUrl,
} from './workbenchBoundedResearch';
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
  browserLaneMeta,
  onBrowserLaneMetaChange,
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
      browserLaneMeta={browserLaneMeta}
      onBrowserLaneMetaChange={onBrowserLaneMetaChange}
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
  browserLaneMeta,
  onBrowserLaneMetaChange,
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
    setActiveTab,
    updateTab,
  } = workbench;
  
  const [tabStateById, setTabStateById] = useState({});
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [statusPosition, setStatusPosition] = useState({ line: 1, column: 1 });
  const [tabMenu, setTabMenu] = useState(null);
  const [editorToken, setEditorToken] = useState(0);
  const [browserSurfaceSuspendedByTabId, setBrowserSurfaceSuspendedByTabId] = useState<Record<string, boolean>>({});
  const activeEditorRef = useRef(null);
  const browserLaneSlotRef = useRef<HTMLDivElement | null>(null);
  const tabElementByIdRef = useRef<Record<string, HTMLDivElement | null>>({});
  const tabStateByIdRef = useRef({});
  const loadRequestByTabRef = useRef({});
  const activePolicyRootPath = activeTab?.rootPath || activeRootPath;
  const managedBrowserSurfaceTabIdsRef = useRef<Set<string>>(new Set());
  const projectPolicy = useWorkbenchProjectPolicy(activePolicyRootPath);
  const languageOverrides = useWorkbenchLanguageOverrides({
    stateKey: activePolicyRootPath,
    currentFilePath: activeTab?.path || '',
  });

  const activeState = activeTab ? tabStateById[activeTab.id] || {} : {};
  const activeResearchState = activeState.researchState || null;
  const activeResearchPreferredMode = activeResearchState?.preferredMode || 'live';
  const activeResearchNavigationKey = Number(activeResearchState?.liveFrameKey || 0);
  const activeBrowserSurfaceSuspended = Boolean(
    activeTab?.id && browserSurfaceSuspendedByTabId[activeTab.id]
  );
  const activeShellBrowserLaneMeta =
    browserLaneMeta && activeTab?.id && browserLaneMeta.tabId === activeTab.id ? browserLaneMeta : null;
  const activeShellBrowserSurface =
    activeShellBrowserLaneMeta
      ? {
          browserSurfaceAvailable:
            activeShellBrowserLaneMeta.browserSurfaceAvailable !== false &&
            isAgencyMethodAvailable('syncWorkbenchBrowserSurface'),
          surfaceState: activeShellBrowserLaneMeta.surfaceState || {
            phase: activeShellBrowserLaneMeta.visible ? 'loading' : 'hidden',
            visible: activeShellBrowserLaneMeta.visible,
            canGoBack: false,
            canGoForward: false,
          },
        }
      : null;
  const resolvedCommentLines = Array.isArray(commentLines) ? commentLines : [];
  const isCodeTab = activeState.kind === 'code';
  const canComment = Boolean(activeTab && isCodeTab);
  const canToggleDiff = Boolean(activeTab && isCodeTab && isAgencyMethodAvailable('diffWorkbenchEntry'));
  const canToggleBlame = Boolean(
    activeTab && isCodeTab && isAgencyMethodAvailable('blameWorkbenchEntry')
  );
  const canCreateComment = Boolean(activeTab && isCodeTab && onOpenComment);
  const showReviewTools = canToggleDiff || canToggleBlame || canCreateComment;
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

  useEffect(() => {
    if (!isAgencyMethodAvailable('disposeWorkbenchBrowserSurface')) {
      managedBrowserSurfaceTabIdsRef.current = new Set();
      return;
    }

    const nextManagedTabIds = new Set<string>();
    (tabs || []).forEach((tab) => {
      if (!tab?.id) {
        return;
      }
      if (isWorkbenchBoundedResearchTab(tab)) {
        nextManagedTabIds.add(tab.id);
        return;
      }
      const tabState = tabStateById[tab.id] || {};
      if (tabState.kind === 'code' && String(tabState.researchSourceUrl || '').trim()) {
        nextManagedTabIds.add(tab.id);
      }
    });

    managedBrowserSurfaceTabIdsRef.current.forEach((tabId) => {
      if (!nextManagedTabIds.has(tabId)) {
        void disposeWorkbenchBrowserSurface({ tabId });
      }
    });
    managedBrowserSurfaceTabIdsRef.current = nextManagedTabIds;
  }, [tabStateById, tabs]);

  useEffect(() => {
    const liveTabIds = new Set((tabs || []).map((tab: any) => String(tab?.id || '').trim()).filter(Boolean));
    setBrowserSurfaceSuspendedByTabId((current) => {
      const next: Record<string, boolean> = {};
      Object.entries(current).forEach(([tabId, suspended]) => {
        if (liveTabIds.has(tabId) && suspended) {
          next[tabId] = true;
        }
      });
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      if (
        currentKeys.length === nextKeys.length &&
        currentKeys.every((key) => next[key] === current[key])
      ) {
        return current;
      }
      return next;
    });
  }, [tabs]);

  useEffect(() => {
    return () => {
      if (!isAgencyMethodAvailable('disposeWorkbenchBrowserSurface')) {
        return;
      }
      managedBrowserSurfaceTabIdsRef.current.forEach((tabId) => {
        void disposeWorkbenchBrowserSurface({ tabId });
      });
      managedBrowserSurfaceTabIdsRef.current.clear();
    };
  }, []);

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
        tab,
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
  const handleBrowserSurfaceSuspendedChange = useCallback((tabId: string, value: boolean) => {
    const normalizedTabId = String(tabId || '').trim();
    if (!normalizedTabId) {
      return;
    }
    setBrowserSurfaceSuspendedByTabId((current) => {
      if (value) {
        if (current[normalizedTabId]) {
          return current;
        }
        return {
          ...current,
          [normalizedTabId]: true,
        };
      }
      if (!current[normalizedTabId]) {
        return current;
      }
      const next = { ...current };
      delete next[normalizedTabId];
      return next;
    });
  }, []);
  const handleResearchTabStateChange = useCallback(
    (tabId: string, nextState: Record<string, any>) => {
      updateTabState(tabId, nextState);
    },
    [updateTabState]
  );
  const handleResearchTabTitleChange = useCallback(
    (tabId: string, title: string) => {
      if (!String(title || '').trim()) {
        return;
      }
      updateTab(tabId, { title });
    },
    [updateTab]
  );
  const handleResearchTabNavigate = useCallback(
    (tabId: string, nextUrl: string) => {
      const normalizedUrl = normalizeWorkbenchResearchUrl(nextUrl);
      if (!normalizedUrl) {
        return false;
      }
      updateTab(tabId, {
        url: normalizedUrl,
        title: deriveWorkbenchResearchTitle(normalizedUrl),
      });
      updateTabState(tabId, {
        researchState: {
          note: '',
          preview: null,
          error: '',
          savedArtifact: null,
          memoArtifact: null,
          preferredMode: 'live',
          liveFrameKey: 0,
        },
      });
      return true;
    },
    [updateTab, updateTabState]
  );

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

  useLayoutEffect(() => {
    if (!onBrowserLaneMetaChange) {
      return undefined;
    }
    const publishMeta = () => {
      const isBrowserLaneOwner =
        Boolean(activeTab?.id) &&
        ((activeState.kind === 'bounded-web-research' ||
          (activeState.kind === 'code' && activeState.researchSourceUrl)) &&
          activeResearchPreferredMode === 'live');
      if (!isBrowserLaneOwner || !browserLaneSlotRef.current) {
        onBrowserLaneMetaChange(cellId || 'repo', null);
        return;
      }
      const rect = browserLaneSlotRef.current.getBoundingClientRect();
      onBrowserLaneMetaChange(cellId || 'repo', {
        cellId: cellId || 'repo',
        tabId: activeTab.id,
        url: activeState.kind === 'bounded-web-research' ? activeTab.url : activeState.researchSourceUrl,
        navigationKey: activeResearchNavigationKey,
        visible: true,
        suspended: activeBrowserSurfaceSuspended,
        rect: {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        surfaceState: activeShellBrowserLaneMeta?.surfaceState || null,
        browserSurfaceAvailable: activeShellBrowserLaneMeta?.browserSurfaceAvailable ?? null,
      });
    };
    publishMeta();
    const observedNodes = [
      browserLaneSlotRef.current,
      document.querySelector('[data-shell-main-panels]'),
      document.querySelector('[data-shell-attention-rail]'),
      document.querySelector('[data-shell-hil-drawer]'),
    ].filter(Boolean) as HTMLElement[];
    const handleWindowChange = () => publishMeta();
    const handleTransitionEnd = () => publishMeta();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    observedNodes.forEach((node) => {
      node.addEventListener('transitionend', handleTransitionEnd);
    });
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && observedNodes.length) {
      observer = new ResizeObserver(() => publishMeta());
      observedNodes.forEach((node) => observer?.observe(node));
    }
    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
      observedNodes.forEach((node) => {
        node.removeEventListener('transitionend', handleTransitionEnd);
      });
      observer?.disconnect();
    };
  }, [
    activeBrowserSurfaceSuspended,
    activeResearchNavigationKey,
    activeResearchPreferredMode,
    activeShellBrowserLaneMeta?.browserSurfaceAvailable,
    activeShellBrowserLaneMeta?.surfaceState,
    activeState.kind,
    activeState.researchSourceUrl,
    activeTab?.id,
    activeTab?.url,
    cellId,
    onBrowserLaneMetaChange,
  ]);

  useEffect(() => {
    if (!pendingJump || !activeTab) {
      return;
    }
    if (pendingJump.path !== activeTab.path || pendingJump.rootPath !== activeTab.rootPath) {
      return;
    }
    if (activeState.loading) {
      return;
    }
    if (activeState.kind !== 'code') {
      onJumpHandled?.();
      return;
    }
    const editor = activeEditorRef.current;
    if (!editor) {
      return;
    }
    const model = editor.getModel?.();
    const maxLine = model?.getLineCount?.() || pendingJump.line || 1;
    const line = Math.min(Math.max(1, Math.floor(pendingJump.line || 1)), maxLine);
    const column = Math.max(1, Math.floor(pendingJump.column || 1));
    editor.setPosition?.({ lineNumber: line, column });
    editor.revealPositionInCenter?.({ lineNumber: line, column });
    editor.focus?.();
    onJumpHandled?.();
  }, [
    activeState.kind,
    activeState.loading,
    activeTab,
    editorToken,
    onJumpHandled,
    pendingJump,
  ]);

  const showFileBreadcrumbs = Boolean(activeTab && !isWorkbenchBoundedResearchTab(activeTab) && activeTab.path);
  const breadcrumbs = showFileBreadcrumbs ? buildWorkbenchBreadcrumbs(activeTab.path) : [];
  const activePanelId = activeTab ? `workbench-panel-${activeTab.id}` : 'workbench-panel';

  const focusTabElement = useCallback((tabId: string) => {
    const node = tabElementByIdRef.current[tabId];
    if (!node) {
      return;
    }
    const scheduleFocus =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (callback: FrameRequestCallback) => window.setTimeout(callback, 0);
    scheduleFocus(() => node.focus());
  }, []);

  const activateTabAtIndex = useCallback(
    (index: number) => {
      const nextTab = tabs[index];
      if (!nextTab?.id) {
        return;
      }
      setActiveTab(nextTab.id);
      focusTabElement(nextTab.id);
    },
    [focusTabElement, setActiveTab, tabs]
  );

  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      if (!tabs.length) {
        return;
      }
      let nextIndex: number | null = null;
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          nextIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      activateTabAtIndex(nextIndex);
    },
    [activateTabAtIndex, tabs]
  );

  return (
    <section className="flex h-full flex-1 flex-col bg-[#0b0d11] overflow-hidden select-none">
      {/* 1. Integrated Header: Tabs & Global Context */}
      <div className="flex h-11 shrink-0 items-center bg-[#111318] border-b border-white/[0.03] pl-1 pr-3">
        <div
          role="tablist"
          aria-label="Workbench tabs"
          className="flex-1 flex items-center h-full overflow-x-auto no-scrollbar scroll-smooth"
        >
          {tabs.map((tab, index) => {
            const state = tabStateById[tab.id] || {};
            const isActive = activeTab?.id === tab.id;
            const TabIcon = isWorkbenchBoundedResearchTab(tab) ? Globe2 : FileText;
            return (
              <div
                key={tab.id}
                ref={(node) => {
                  tabElementByIdRef.current[tab.id] = node;
                }}
                role="tab"
                id={`workbench-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={activePanelId}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                onContextMenu={(e) => { e.preventDefault(); setTabMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
                className={`group relative flex items-center gap-2.5 px-4 h-full min-w-fit transition-all cursor-pointer border-r border-white/[0.03] ${
                  isActive ? 'bg-[#0b0d11] text-foreground' : 'text-muted-foreground/50 hover:bg-white/[0.02] hover:text-muted-foreground'
                }`}
              >
                {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_10px_rgba(59,130,246,0.6)]" />}
                <TabIcon size={13} className={isActive ? 'text-primary' : 'opacity-20 group-hover:opacity-50'} />
                <span className={`text-[11px] font-bold tracking-tight whitespace-nowrap ${tab.isPreview ? 'italic opacity-70' : ''}`}>
                    {tab.title}
                </span>
                {state.isDirty ? (
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] ml-1" />
                ) : (
                    <button
                        type="button"
                        aria-label={`Close ${tab.title}`}
                        onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                        onKeyDown={(event) => {
                          if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
                            event.stopPropagation();
                          }
                        }}
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
            <HeaderButton onClick={() => setQuickOpenVisible(true)} icon={Search} label="Quick Open" shortcut="⌘P" primary />
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
          {showFileBreadcrumbs ? (
            <>
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
            </>
          ) : activeTab && isWorkbenchBoundedResearchTab(activeTab) ? (
            <>
              <ChevronRight size={10} className="text-white/5 shrink-0" />
              <div className="min-w-0 max-w-[18rem] truncate text-[10px] font-medium text-white/56">
                {activeTab.title || 'Bounded Web Research'}
              </div>
            </>
          ) : null}
        </div>

        {activeTab && (
          <div className="flex items-center gap-3">
            {isWorkbenchBoundedResearchTab(activeTab) ? (
              <div className="flex items-center gap-1">
                <ToolButton
                  active={!activeTab.isPreview}
                  onClick={() => pinTab(activeTab.id)}
                  icon={activeTab.isPreview ? Pin : PinOff}
                  title={activeTab.isPreview ? 'Keep Open' : 'Object Pinned'}
                />
              </div>
            ) : (
              <>
                {showReviewTools ? (
                  <>
                    <div
                      data-workbench-review-tools
                      className="flex items-center gap-1 bg-white/[0.02] rounded-md p-0.5"
                    >
                      {canToggleDiff ? (
                        <ToolButton
                          active={activeState.diffEnabled}
                          onClick={toggleDiff}
                          icon={GitCompare}
                          title="Show Diff"
                          toggle={true}
                        />
                      ) : null}
                      {canToggleBlame ? (
                        <ToolButton
                          active={activeState.blameEnabled}
                          onClick={toggleBlame}
                          icon={GitCommit}
                          title="Show Blame"
                          toggle={true}
                        />
                      ) : null}
                      {canCreateComment && (canToggleDiff || canToggleBlame) ? (
                        <div className="w-px h-3 bg-white/5 mx-0.5" />
                      ) : null}
                      {canCreateComment ? (
                        <ToolButton
                          onClick={() =>
                            onOpenComment?.({ line: statusPosition.line, column: statusPosition.column })
                          }
                          icon={MessageSquarePlus}
                          title="Add HIL Comment"
                        />
                      ) : null}
                    </div>

                    <div className="h-4 w-px bg-white/5" />
                  </>
                ) : null}

                <div className="flex items-center gap-1" data-workbench-file-tools>
                  <ToolButton
                    loading={activeState.loading}
                    onClick={handleReload}
                    icon={RefreshCw}
                    title="Sync from Disk"
                  />

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
                    title={activeTab.isPreview ? 'Keep Open' : 'Pinned'}
                  />
                </div>
              </>
            )}
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
        ) : activeState.kind === 'bounded-web-research' ? (
          <WorkbenchBoundedWebResearchScene
            tabId={activeTab.id}
            rootPath={activeTab.rootPath}
            url={activeTab.url}
            allowMarkdownSave={activeTab.allowMarkdownSave !== false}
            allowMemoCapture={activeTab.allowMemoCapture !== false}
            initialState={activeResearchState}
            onNavigateUrl={(nextUrl) => handleResearchTabNavigate(activeTab.id, nextUrl)}
            onStateChange={(nextState) => {
              handleResearchTabStateChange(activeTab.id, { researchState: nextState });
            }}
            onMarkdownSaved={(savedPath) =>
              openFile({
                path: savedPath,
                mode: 'pinned',
                rootPath: activeTab.rootPath,
              })
            }
            onResolvedTitle={(title) => {
              handleResearchTabTitleChange(activeTab.id, title);
            }}
            browserSurface={activeShellBrowserSurface}
            onBrowserSurfaceSuspendedChange={(value) =>
              handleBrowserSurfaceSuspendedChange(activeTab.id, value)
            }
          >
            {(scene) => (
              <section className="flex h-full min-h-0 flex-col bg-[#0b0d11] text-white">
                <WorkbenchBoundedWebResearchChrome scene={scene} />
                <WorkbenchBoundedWebResearchStatusBanner scene={scene} />
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  {scene.preferredMode === 'live' ? (
                    <WorkbenchBrowserLane
                      browserSurface={scene.browserSurface}
                      slotRef={browserLaneSlotRef}
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
                      onOpenSavedFile={(path) =>
                        openFile({
                          path,
                          mode: 'pinned',
                          rootPath: activeTab.rootPath,
                        })
                      }
                      onRevealSavedFile={onRevealPathInExplorer}
                    />
                  )}
                </div>
              </section>
            )}
          </WorkbenchBoundedWebResearchScene>
        ) : activeState.kind === 'code' && activeState.researchSourceUrl ? (
          <div className="flex h-full min-h-0 bg-[#0b0d11]">
            <div className="min-w-0 flex-[1.08] border-r border-white/[0.05]">
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
            </div>
            <div className="min-w-0 flex-1">
              <WorkbenchBoundedWebResearchScene
                tabId={activeTab.id}
                rootPath={activeTab.rootPath}
                url={activeState.researchSourceUrl}
                linkedMarkdownPath={activeTab.path}
                linkedMarkdownDirty={Boolean(activeState.isDirty)}
                initialState={activeResearchState}
                onStateChange={(nextState) => {
                  handleResearchTabStateChange(activeTab.id, { researchState: nextState });
                }}
                onMarkdownSaved={() => {
                  void loadTab(activeTab);
                }}
                allowMarkdownSave={true}
                allowMemoCapture={true}
                browserSurface={activeShellBrowserSurface}
                onBrowserSurfaceSuspendedChange={(value) =>
                  handleBrowserSurfaceSuspendedChange(activeTab.id, value)
                }
              >
                {(scene) => (
                  <section className="flex h-full min-h-0 flex-col bg-[#0b0d11] text-white">
                    <WorkbenchBoundedWebResearchChrome scene={scene} />
                    <WorkbenchBoundedWebResearchStatusBanner scene={scene} />
                    <div className="relative min-h-0 flex-1 overflow-hidden">
                      {scene.preferredMode === 'live' ? (
                        <WorkbenchBrowserLane
                          browserSurface={scene.browserSurface}
                          slotRef={browserLaneSlotRef}
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
                          onRevealSavedFile={onRevealPathInExplorer}
                        />
                      )}
                    </div>
                  </section>
                )}
              </WorkbenchBoundedWebResearchScene>
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
            {activeState.kind === 'bounded-web-research' ? (
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-cyan-400/30" />
                <span className="opacity-40">Bounded web host</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary/20" />
                    <span className="opacity-40">Ln {statusPosition.line}, Col {statusPosition.column}</span>
                </div>
                {activeState.truncated && <div className="flex items-center gap-1.5 text-amber-500/40 italic"><AlertTriangle size={10} /> Buffer Overflow</div>}
                {activeState.binary && <span className="text-rose-400/40 font-black">Binary Object</span>}
              </>
            )}
        </div>
        
        <div className="flex items-center gap-6">
            {activeState.kind === 'bounded-web-research' ? (
              <div className="flex items-center gap-2">
                <FileCode size={10} className="text-cyan-300/30" />
                <span className="text-cyan-200/35">WEB RESEARCH</span>
              </div>
            ) : activeLanguageDecision ? (
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
            <div className="flex items-center gap-2"><Maximize2 size={10} className="opacity-10" /><span>{formatWorkbenchBytes(activeState.size)}</span></div>
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

function HeaderButton({ onClick, icon: Icon, label, shortcut, primary }: any) {
    return (
        <button 
            type="button"
            onClick={onClick} 
            aria-label={label}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md transition-all group ${primary ? 'hover:bg-primary/10' : 'hover:bg-white/5'}`}
            title={label}
        >
            <Icon size={14} strokeWidth={primary ? 2.5 : 1.5} className={primary ? 'text-primary' : 'text-white/20 group-hover:text-white/60'} />
            {shortcut && <span className="text-[9px] font-black text-white/10 group-hover:text-white/30 tracking-tighter">{shortcut}</span>}
        </button>
    )
}

function ToolButton({ active, loading, onClick, icon: Icon, title, toggle = false }: any) {
    return (
        <button 
            type="button"
            onClick={onClick} 
            className={`p-1.5 rounded-md transition-all ${active ? 'bg-primary/10 text-primary' : 'text-white/20 hover:text-white/60 hover:bg-white/5'}`}
            title={title}
            aria-label={title}
            aria-pressed={toggle ? Boolean(active) : undefined}
            aria-busy={loading || undefined}
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
