import React, { useCallback, useEffect, useMemo, useState } from 'react';
import 'xterm/css/xterm.css';
import { StatusBar } from './components/StatusBar.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { CreateCellModal } from './components/modals/CreateCellModal.jsx';
import { LifecycleConfirmModal } from './components/modals/LifecycleConfirmModal.jsx';
import { useQuickActions } from './hooks/useQuickActions.js';
import { useGates } from './hooks/useGates.js';
import { useWorktreeLinks } from './hooks/useWorktreeLinks.js';
import { useSessions } from './hooks/useSessions.js';
import { useWorkbench } from './hooks/useWorkbench.js';
const defaultCells = [
  {
    id: 'sample-cell',
    name: 'sample-cell',
    branch: 'feature/sample-cell',
    worktreePath: '',
    state: 'draft',
    gatesStage: 'active',
    gates: [],
    validation: { warnings: ['Spec file not found (temporary validation).'] },
  },
];
function App() {
  const [cells, setCells] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projectRoot, setProjectRoot] = useState('');
  const [projectError, setProjectError] = useState('');
  const [recentProjects, setRecentProjects] = useState([]);
  const [fallbackTerminalRoot, setFallbackTerminalRoot] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [transitionError, setTransitionError] = useState('');
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [uiStateLoaded, setUiStateLoaded] = useState(false);
  const [activeView, setActiveView] = useState('agent-cells');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hilDrawerOpen, setHilDrawerOpen] = useState(false);
  const [hilDrawerPanel, setHilDrawerPanel] = useState('comments');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [hierarchySection, setHierarchySection] = useState('actions');
  const [actionsScope, setActionsScope] = useState('global');
  const [gateScope, setGateScope] = useState('global');
  const [gateStage, setGateStage] = useState('active');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMode, setTerminalMode] = useState('shell');
  const [tmuxStatus, setTmuxStatus] = useState({ available: true });
  const [initialActiveSessions, setInitialActiveSessions] = useState({});
  const [initialWorkbenchTabs, setInitialWorkbenchTabs] = useState({});
  const [initialWorkbenchActiveTabs, setInitialWorkbenchActiveTabs] = useState({});
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [commentTodo, setCommentTodo] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentTarget, setCommentTarget] = useState({ line: 1, column: 1 });
  const [commentSnippet, setCommentSnippet] = useState(null);
  const [commentSnippetLoading, setCommentSnippetLoading] = useState(false);
  const [commentSnippetError, setCommentSnippetError] = useState('');
  const [bulkPromoteOpen, setBulkPromoteOpen] = useState(false);
  const [bulkPromoteDescription, setBulkPromoteDescription] = useState('');
  const [bulkPromoteLoading, setBulkPromoteLoading] = useState(false);
  const [bulkPromoteError, setBulkPromoteError] = useState('');
  const [bulkPromoteItems, setBulkPromoteItems] = useState([]);
  const [bulkPromoteSelectedIds, setBulkPromoteSelectedIds] = useState([]);
  const [bulkPromotePreviewById, setBulkPromotePreviewById] = useState({});
  const projectReady = Boolean(projectRoot);
  const virtualCell = useMemo(() => {
    if (projectReady) {
      return null;
    }
    return {
      id: 'local-terminal',
      name: 'Local Terminal',
      branch: 'local',
      worktreePath: fallbackTerminalRoot || '/',
      state: 'draft',
      isVirtual: true,
      validation: { warnings: ['Project root not selected.'] },
    };
  }, [fallbackTerminalRoot, projectReady]);
  const displayCells = useMemo(() => {
    if (projectReady) {
      return cells;
    }
    return virtualCell ? [virtualCell] : [];
  }, [cells, projectReady, virtualCell]);
  const selectedCell = useMemo(
    () => displayCells.find((cell) => cell.id === selectedId) || null,
    [displayCells, selectedId]
  );
  const scopedCell = useMemo(() => {
    if (!projectReady || !selectedCell || selectedCell.isVirtual) {
      return null;
    }
    return selectedCell;
  }, [projectReady, selectedCell]);
  const loadCells = useCallback(
    async (preferredSelection, rootOverride) => {
      const effectiveRoot = rootOverride || projectRoot;
      setLoading(true);
      try {
        if (!effectiveRoot) {
          setCells([]);
          if (!selectedId) {
            setSelectedId('local-terminal');
          }
          return;
        }
        if (window.agency && window.agency.listCells) {
          const result = await window.agency.listCells({ rootPath: effectiveRoot });
          setCells(result);
          if (result.length) {
            const preferredMatch = preferredSelection
              ? result.find((cell) => cell.id === preferredSelection)
              : null;
            const existingMatch = selectedId
              ? result.find((cell) => cell.id === selectedId)
              : null;
            setSelectedId((preferredMatch || existingMatch || result[0]).id);
          } else {
            setSelectedId(null);
          }
        } else {
          setCells(defaultCells);
          if (!selectedId) setSelectedId(defaultCells[0].id);
        }
      } catch (error) {
        console.error(error);
        if (String(error?.message || '').includes('Project root is not configured')) {
          setCells([]);
          setSelectedId(null);
        } else {
          setCells(defaultCells);
          if (!selectedId) setSelectedId(defaultCells[0].id);
        }
      } finally {
        setLoading(false);
      }
    },
    [projectRoot, selectedId]
  );
  useEffect(() => {
    const bootstrap = async () => {
      let context = null;
      if (window.agency?.getProjectContext) {
        try {
          context = await window.agency.getProjectContext();
        } catch (error) {
          console.error(error);
        }
      }
      const resolvedProjectRoot = context?.projectRoot || '';
      setProjectRoot(resolvedProjectRoot);
      setRecentProjects(Array.isArray(context?.recentProjects) ? context.recentProjects : []);
      setFallbackTerminalRoot(context?.userDataPath || '');
      if (context?.storedRoot && !context?.valid) {
        setProjectError('Stored project path is no longer available. Select a new project.');
      } else {
        setProjectError('');
      }
      if (window.agency?.getUiState) {
        try {
          const state = await window.agency.getUiState();
          if (state?.activeSessionByCellId && typeof state.activeSessionByCellId === 'object') {
            setInitialActiveSessions(state.activeSessionByCellId);
          }
          if (state?.workbenchTabsByCellId && typeof state.workbenchTabsByCellId === 'object') {
            setInitialWorkbenchTabs(
              resolvedProjectRoot ? state.workbenchTabsByCellId : {}
            );
          }
          if (state?.workbenchActiveTabByCellId && typeof state.workbenchActiveTabByCellId === 'object') {
            setInitialWorkbenchActiveTabs(
              resolvedProjectRoot ? state.workbenchActiveTabByCellId : {}
            );
          }
          if (state?.selectedId) {
            setSelectedId(state.selectedId);
          } else if (!resolvedProjectRoot) {
            setSelectedId('local-terminal');
          }
          if (typeof state?.sidebarWidth === 'number') {
            setSidebarWidth(state.sidebarWidth);
          }
          if (typeof state?.sidebarCollapsed === 'boolean') {
            setSidebarCollapsed(state.sidebarCollapsed);
          }
          if (typeof state?.activeView === 'string') {
            const allowedViews = new Set(['agent-cells', 'explorer', 'hierarchy', 'settings', 'memo']);
            if (allowedViews.has(state.activeView)) {
              setActiveView(state.activeView);
            }
          }
          if (typeof state?.hilDrawerOpen === 'boolean') {
            setHilDrawerOpen(state.hilDrawerOpen);
          }
          if (typeof state?.hilDrawerPanel === 'string') {
            setHilDrawerPanel(state.hilDrawerPanel);
          }
          if (!resolvedProjectRoot) {
            setActiveView('agent-cells');
            setSelectedId('local-terminal');
            setTerminalOpen(true); // 确保终端面板打开
            setCells([]);
          }
          await loadCells(state?.selectedId || (resolvedProjectRoot ? undefined : 'local-terminal'), resolvedProjectRoot);
        } catch (error) {
          console.error(error);
          await loadCells(undefined, resolvedProjectRoot);
        } finally {
          setUiStateLoaded(true);
        }
        return;
      }
      await loadCells(undefined, resolvedProjectRoot);
      setUiStateLoaded(true);
    };
    bootstrap();
  }, [loadCells]);
  useEffect(() => {
    const handleRejection = (event) => {
      const reason = event?.reason;
      if (reason && reason.type === 'cancelation') {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  useEffect(() => {
    if (!window.agency || !window.agency.onCellsUpdated) {
      return undefined;
    }
    const unsubscribe = window.agency.onCellsUpdated(() => loadCells());
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loadCells]);
  useEffect(() => {
    if (!uiStateLoaded) {
      return;
    }
    if (!projectRoot) {
      setActiveView('agent-cells');
      setSelectedId('local-terminal');
      setTerminalOpen(true);
    }
    loadCells(undefined, projectRoot);
  }, [projectRoot, uiStateLoaded, loadCells]);
  useEffect(() => {
    const loadTmuxStatus = async () => {
      if (!window.agency?.getTmuxStatus) {
        return;
      }
      try {
        const status = await window.agency.getTmuxStatus();
        setTmuxStatus(status || { available: false, error: 'Unable to detect tmux.' });
      } catch (error) {
        setTmuxStatus({
          available: false,
          error: error?.message || 'Unable to detect tmux.',
        });
      }
    };
    loadTmuxStatus();
  }, []);
  const {
    links: worktreeLinks,
    autoLinkOnCreate: worktreeLinksAuto,
    candidates: worktreeLinksCandidates,
    statusesByPath: worktreeLinksStatusesByPath,
    repoRoot: worktreeLinksRepoRoot,
    configPath: worktreeLinksConfigPath,
    loading: worktreeLinksLoading,
    error: worktreeLinksError,
    dirty: worktreeLinksDirty,
    toggleAuto: toggleWorktreeLinksAuto,
    addLink: addWorktreeLink,
    addFromCandidate: addWorktreeLinkFromCandidate,
    updateLink: updateWorktreeLink,
    removeLink: removeWorktreeLink,
    saveLinks: saveWorktreeLinks,
    applyLink: applyWorktreeLink,
    applyAll: applyAllWorktreeLinks,
    refreshLinks: refreshWorktreeLinks,
    clearError: clearWorktreeLinksError,
  } = useWorktreeLinks({ selectedCell: scopedCell, cells, projectRoot });
  const {
    resolvedQuickActions,
    actionsRows,
    scopeDisabled: actionsScopeDisabled,
    projectActionsPath,
    agentActionsPath,
    quickActionsError,
    quickActionsSaving,
    actionSummary,
    addQuickAction,
    updateQuickAction,
    overrideQuickAction,
    removeQuickAction,
    resetQuickAction,
    saveQuickActions,
    clearQuickActionsError,
  } = useQuickActions({ selectedCell: scopedCell, actionsScope });
  const {
    gateRows,
    gateScopeDisabled,
    projectGatesPath,
    agentGatesPath,
    gatesError,
    gatesSaving,
    gateResultsByCellId,
    gatesCheckingByCellId,
    gateSummary,
    checkGatesForCell,
    addGate,
    updateGate,
    overrideGate,
    removeGate,
    resetGate,
    saveGates,
    clearGatesError,
  } = useGates({ selectedCell: scopedCell, gateScope, gateStage, repoRoot: projectRoot });
  const handleOpenTerminal = useCallback(() => {
    setTerminalMode('shell');
    setTerminalOpen(true);
  }, []);
  const {
    sessions,
    activeSessionId,
    activeFontSize,
    lastActivityAt,
    sessionActivityByKey,
    sessionLoading,
    sessionError,
    pendingCommand,
    activeSessionByCellId,
    refreshSessions,
    createSession,
    closeSession,
    detachSession,
    renameSession,
    selectSession,
    updateSessionActivity,
    zoomIn,
    zoomOut,
    zoomReset,
    runActionCommand,
    acknowledgeCommandSent,
    handleSessionAttached,
    resetSessions,
  } = useSessions({
    selectedCell,
    tmuxStatus,
    onOpenTerminal: handleOpenTerminal,
    initialActiveSessions,
  });
  const workbench = useWorkbench({
    selectedCell: scopedCell,
    repoRoot: projectRoot,
    initialTabsByCellId: initialWorkbenchTabs,
    initialActiveTabByCellId: initialWorkbenchActiveTabs,
  });
  const activeTab = workbench.activeTab;
  const canComment = Boolean(activeTab && activeTab.kind === 'code');
  const commentRootPath = activeTab?.rootPath || '';
  const commentFilePath = activeTab?.path || '';
  const [workbenchMetaByCellId, setWorkbenchMetaByCellId] = useState({});
  const handleWorkbenchMetaChange = useCallback((cellId, meta) => {
    if (!cellId) {
      return;
    }
    setWorkbenchMetaByCellId((current) => ({
      ...current,
      [cellId]: meta || {},
    }));
  }, []);
  const openHilDrawer = useCallback((panel = 'comments') => {
    setHilDrawerPanel(panel);
    setHilDrawerOpen(true);
  }, []);
  const loadComments = useCallback(async () => {
    if (!commentRootPath || !commentFilePath || !canComment || !window.agency?.listComments) {
      setComments([]);
      setCommentsError('');
      setCommentsLoading(false);
      return;
    }
    setCommentsLoading(true);
    setCommentsError('');
    try {
      const list = await window.agency.listComments({
        worktreePath: commentRootPath,
        filePath: commentFilePath,
      });
      setComments(Array.isArray(list) ? list : []);
    } catch (error) {
      setCommentsError(error?.message || 'Failed to load comments.');
    } finally {
      setCommentsLoading(false);
    }
  }, [canComment, commentFilePath, commentRootPath]);
  const commentLines = useMemo(() => {
    if (!comments.length) {
      return [];
    }
    const map = new Map();
    comments.forEach((comment) => {
      const line = Number(comment.line || comment.anchor?.line);
      if (!Number.isFinite(line) || line <= 0) {
        return;
      }
      const entry = map.get(line) || { line, todo: false, count: 0 };
      entry.count += 1;
      if (comment.todo || comment.meta?.todo) {
        entry.todo = true;
      }
      map.set(line, entry);
    });
    return Array.from(map.values());
  }, [comments]);
  const openCommentModal = useCallback(
    ({ line, column } = {}) => {
      if (!commentRootPath || !commentFilePath) {
        return;
      }
      const nextLine = Number.isFinite(line) ? line : cursorPosition.line;
      const nextColumn = Number.isFinite(column) ? column : cursorPosition.column;
      setCommentTarget({
        line: Math.max(1, Math.floor(nextLine || 1)),
        column: Math.max(1, Math.floor(nextColumn || 1)),
      });
      setCommentModalOpen(true);
      setCommentMessage('');
      setCommentTodo(false);
      setCommentError('');
      openHilDrawer('comments');
    },
    [commentFilePath, commentRootPath, cursorPosition, openHilDrawer]
  );
  const closeCommentModal = useCallback(() => {
    setCommentModalOpen(false);
    setCommentMessage('');
    setCommentTodo(false);
    setCommentError('');
    setCommentSnippet(null);
    setCommentSnippetLoading(false);
    setCommentSnippetError('');
  }, []);
  const submitComment = useCallback(async () => {
    if (!commentRootPath || !commentFilePath || !window.agency?.submitComment) {
      return;
    }
    if (!commentMessage.trim()) {
      setCommentError('Comment cannot be empty.');
      return;
    }
    setCommentSaving(true);
    setCommentError('');
    try {
      await window.agency.submitComment({
        worktreePath: commentRootPath,
        filePath: commentFilePath,
        line: commentTarget.line,
        column: commentTarget.column,
        message: commentMessage.trim(),
        todo: commentTodo,
      });
      await loadComments();
      closeCommentModal();
      openHilDrawer('comments');
    } catch (error) {
      setCommentError(error?.message || 'Failed to submit comment.');
    } finally {
      setCommentSaving(false);
    }
  }, [commentFilePath, commentMessage, commentRootPath, commentTodo, commentTarget, closeCommentModal, loadComments, openHilDrawer]);
  const updateCommentStatus = useCallback(
    async (comment, status) => {
      if (!window.agency?.updateHilItem || !comment?.id || !commentRootPath) {
        return;
      }
      await window.agency.updateHilItem({
        worktreePath: commentRootPath,
        itemId: comment.id,
        patch: { status },
      });
      await loadComments();
    },
    [commentRootPath, loadComments]
  );
  const promoteComment = useCallback(
    async (comment) => {
      if (!window.agency?.promoteHilItem || !comment?.id || !commentRootPath) {
        return;
      }
      await window.agency.promoteHilItem({
        worktreePath: commentRootPath,
        itemId: comment.id,
      });
      await loadComments();
      openHilDrawer('comments');
    },
    [commentRootPath, loadComments, openHilDrawer]
  );
  useEffect(() => {
    loadComments();
  }, [loadComments]);
  useEffect(() => {
    if (!commentFilePath) {
      closeCommentModal();
    }
  }, [commentFilePath, closeCommentModal]);
  useEffect(() => {
    if (!commentModalOpen || !commentRootPath || !commentFilePath || !window.agency?.getFileSnippet) {
      setCommentSnippet(null);
      setCommentSnippetLoading(false);
      setCommentSnippetError('');
      return undefined;
    }
    let canceled = false;
    setCommentSnippetLoading(true);
    setCommentSnippetError('');
    window.agency
      .getFileSnippet({
        rootPath: commentRootPath,
        targetPath: commentFilePath,
        line: commentTarget.line,
        context: 3,
      })
      .then((result) => {
        if (canceled) {
          return;
        }
        setCommentSnippet(result || null);
      })
      .catch((error) => {
        if (canceled) {
          return;
        }
        setCommentSnippet(null);
        setCommentSnippetError(error?.message || 'Failed to load line context.');
      })
      .finally(() => {
        if (canceled) {
          return;
        }
        setCommentSnippetLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [commentFilePath, commentModalOpen, commentRootPath, commentTarget.line]);
  useEffect(() => {
    if (commentModalOpen || bulkPromoteOpen) {
      setHilDrawerPanel('comments');
      setHilDrawerOpen(true);
    }
  }, [bulkPromoteOpen, commentModalOpen]);
  const promoteWorktreePath = selectedCell?.worktreePath || projectRoot || '';
  const openBulkPromote = useCallback(async () => {
    if (!promoteWorktreePath || !window.agency?.listHilItems) {
      return;
    }
    setBulkPromoteOpen(true);
    setBulkPromoteLoading(true);
    setBulkPromoteError('');
    setBulkPromoteDescription('');
    setBulkPromotePreviewById({});
    try {
      const list = await window.agency.listHilItems({
        worktreePath: promoteWorktreePath,
        kind: 'comment',
      });
      const pending = (Array.isArray(list) ? list : [])
        .filter((item) => item && item.meta?.processed !== true)
        .sort((a, b) => {
          const fileA = a.anchor?.file || '';
          const fileB = b.anchor?.file || '';
          if (fileA !== fileB) {
            return fileA.localeCompare(fileB);
          }
          const lineA = Number(a.anchor?.line || 0);
          const lineB = Number(b.anchor?.line || 0);
          return lineA - lineB;
        });
      setBulkPromoteItems(pending);
      setBulkPromoteSelectedIds(pending.map((item) => item.id));
    } catch (error) {
      setBulkPromoteError(error?.message || 'Failed to load pending comments.');
      setBulkPromoteItems([]);
      setBulkPromoteSelectedIds([]);
    } finally {
      setBulkPromoteLoading(false);
    }
  }, [promoteWorktreePath]);
  const closeBulkPromote = useCallback(() => {
    setBulkPromoteOpen(false);
    setBulkPromoteError('');
    setBulkPromoteItems([]);
    setBulkPromoteSelectedIds([]);
    setBulkPromotePreviewById({});
  }, []);
  const toggleBulkPromoteItem = useCallback((itemId) => {
    if (!itemId) {
      return;
    }
    setBulkPromoteSelectedIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }
      return [...current, itemId];
    });
  }, []);
  const loadBulkPromotePreview = useCallback(
    async (item) => {
      if (!item?.id || !item?.anchor?.file || !promoteWorktreePath) {
        return;
      }
      if (bulkPromotePreviewById[item.id]) {
        return;
      }
      if (!window.agency?.readWorkbenchEntry) {
        return;
      }
      try {
        const result = await window.agency.readWorkbenchEntry({
          rootPath: promoteWorktreePath,
          targetPath: item.anchor.file,
        });
        const content = result?.content || '';
        const lines = content.split('\n');
        const targetLine = Math.max(1, Number(item.anchor?.line || 1));
        const start = Math.max(1, targetLine - 2);
        const end = Math.min(lines.length || 1, targetLine + 2);
        const snippet = lines.slice(start - 1, end).map((text, index) => ({
          line: start + index,
          text,
        }));
        setBulkPromotePreviewById((current) => ({
          ...current,
          [item.id]: {
            snippet,
            file: item.anchor.file,
            line: targetLine,
          },
        }));
      } catch (error) {
        setBulkPromotePreviewById((current) => ({
          ...current,
          [item.id]: {
            error: error?.message || 'Unable to load preview.',
          },
        }));
      }
    },
    [bulkPromotePreviewById, promoteWorktreePath]
  );
  const submitBulkPromote = useCallback(async () => {
    if (!promoteWorktreePath || !window.agency?.createHilItem || !window.agency?.updateHilItem) {
      return;
    }
    if (!bulkPromoteDescription.trim()) {
      setBulkPromoteError('Description is required.');
      return;
    }
    const selected = bulkPromoteItems.filter((item) => bulkPromoteSelectedIds.includes(item.id));
    if (!selected.length) {
      setBulkPromoteError('Select at least one comment to promote.');
      return;
    }
    setBulkPromoteLoading(true);
    setBulkPromoteError('');
    try {
      const references = selected.map((item) => ({
        system: 'hil',
        id: item.id,
        path: item.anchor?.file || null,
        line: item.anchor?.line || null,
      }));
      await window.agency.createHilItem({
        worktreePath: promoteWorktreePath,
        kind: 'draft',
        body: bulkPromoteDescription.trim(),
        references,
        meta: {
          sourceKind: 'comment',
          sourceBatch: 'bulk',
        },
      });
      await Promise.all(
        selected.map((item) =>
          window.agency.updateHilItem({
            worktreePath: promoteWorktreePath,
            itemId: item.id,
            patch: { meta: { processed: true } },
          })
        )
      );
      await loadComments();
      closeBulkPromote();
      openHilDrawer('comments');
    } catch (error) {
      setBulkPromoteError(error?.message || 'Failed to promote comments.');
    } finally {
      setBulkPromoteLoading(false);
    }
  }, [
    bulkPromoteDescription,
    bulkPromoteItems,
    bulkPromoteSelectedIds,
    closeBulkPromote,
    loadComments,
    openHilDrawer,
    promoteWorktreePath,
  ]);
  const resetProjectState = useCallback(() => {
    setSelectedId(null);
    setCells([]);
    setInitialActiveSessions({});
    resetSessions();
    workbench.resetTabs();
    setWorkbenchMetaByCellId({});
    setInitialWorkbenchTabs({});
    setInitialWorkbenchActiveTabs({});
  }, [
    resetSessions,
    workbench,
    setInitialWorkbenchTabs,
    setInitialWorkbenchActiveTabs,
  ]);
  const handleSelectProjectRoot = useCallback(async () => {
    if (!window.agency?.selectProjectRoot) {
      return;
    }
    setProjectError('');
    try {
      await window.agency.selectProjectRoot();
    } catch (error) {
      setProjectError(error?.message || 'Failed to select project.');
    }
  }, []);

  const handleOpenRecentProject = useCallback(
    async (projectPath) => {
      if (!projectPath || !window.agency?.setProjectRoot) {
        return;
      }
      setProjectError('');
      try {
        await window.agency.setProjectRoot({ projectRoot: projectPath });
      } catch (error) {
        setProjectError(error?.message || 'Failed to open project.');
      }
    },
    []
  );
  useEffect(() => {
    if (!window.agency?.onProjectUpdated) {
      return undefined;
    }
    const unsubscribe = window.agency.onProjectUpdated(async (payload) => {
      if (!payload) {
        return;
      }
      resetProjectState();
      setProjectRoot(payload.projectRoot || '');
      setRecentProjects(Array.isArray(payload.recentProjects) ? payload.recentProjects : []);
      setProjectError('');
      // 移除这里的 setActiveView('explorer')，保留用户当前视图
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [resetProjectState]);
  useEffect(() => {
    if (!window.agency?.onRecentProjectsUpdated) {
      return undefined;
    }
    const unsubscribe = window.agency.onRecentProjectsUpdated((payload) => {
      if (!payload) {
        return;
      }
      setRecentProjects(Array.isArray(payload.recentProjects) ? payload.recentProjects : []);
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  useEffect(() => {
    if (!selectedCell?.id) {
      return;
    }
    if (uiStateLoaded && window.agency?.setUiState) {
      window.agency
        .setUiState({
          selectedId: selectedCell.id,
          activeSessionByCellId,
        })
        .catch(() => undefined);
    }
    setTerminalMode('shell');
    setTerminalOpen(true);
  }, [selectedCell?.id, activeSessionByCellId, uiStateLoaded]);

  useEffect(() => {
    if (!uiStateLoaded || !window.agency?.setUiState) {
      return;
    }
    const handle = setTimeout(() => {
      window.agency
        .setUiState({
          sidebarWidth,
          sidebarCollapsed,
          activeView,
          hilDrawerOpen,
          hilDrawerPanel,
          workbenchTabsByCellId: workbench.serializeTabs(workbench.tabsByCellId),
          workbenchActiveTabByCellId: workbench.activeTabByCellId,
        })
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(handle);
  }, [
    activeView,
    hilDrawerOpen,
    hilDrawerPanel,
    sidebarCollapsed,
    sidebarWidth,
    uiStateLoaded,
    workbench.activeTabByCellId,
    workbench.tabsByCellId,
  ]);
  const gateDisplayStage = scopedCell?.state === 'archived' ? 'archived' : 'active';
  const gateResultsByStage = scopedCell ? gateResultsByCellId[scopedCell.id] || {} : {};
  const gatesCheckingByStage = scopedCell ? gatesCheckingByCellId[scopedCell.id] || {} : {};
  const handleStateChange = useCallback(
    async (nextState) => {
      if (!scopedCell || !window.agency?.updateCellState) {
        return;
      }
      if (nextState === scopedCell.state) {
        return;
      }
      setTransitionError('');
      let nextCells = cells;
      if (window.agency?.listCells) {
        try {
          nextCells = await window.agency.listCells({ rootPath: projectRoot });
          setCells(nextCells);
        } catch (error) {
          console.error(error);
        }
      }
      const freshCell = nextCells.find((cell) => cell.id === scopedCell.id) || scopedCell;
      let gates = [];
      if (['active', 'archived'].includes(nextState)) {
        gates = await checkGatesForCell({ cell: freshCell, stage: nextState, silent: true });
      }
      setPendingTransition({
        cell: freshCell,
        nextState,
        gates,
      });
    },
    [cells, checkGatesForCell, projectRoot, scopedCell]
  );
  const handleCreate = useCallback(
    async ({ name, branch, reusePath }) => {
      if (!window.agency?.createCell) {
        return;
      }
      if (!projectReady) {
        setProjectError('Select a project before creating a Cell.');
        return;
      }
      setLoading(true);
      try {
        const cell = await window.agency.createCell({
          name,
          branch,
          reusePath,
          rootPath: projectRoot,
        });
        setShowCreate(false);
        await loadCells();
        if (cell?.id) {
          setSelectedId(cell.id);
        }
        handleOpenTerminal();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [handleOpenTerminal, loadCells, projectReady, projectRoot]
  );
  const handleSaveGates = useCallback(async () => {
    await saveGates();
    await loadCells();
  }, [loadCells, saveGates]);
  const canUseScopedConfig = Boolean(scopedCell?.worktreePath);
  const resolvedRepoRoot = projectRoot || worktreeLinksRepoRoot;

  const editorPaneProps = {
    cell: selectedCell,
    projectReady,
    projectError,
    terminalMode,
    terminalOpen,
    sessionId: activeSessionId,
    sessions,
    sessionLoading,
    sessionError,
    quickActions: resolvedQuickActions,
    tmuxStatus,
    gateResultsByStage,
    gatesCheckingByStage,
    gateDisplayStage,
    idleSince: lastActivityAt,
    isVisible: activeView === 'agent-cells',
    onCreateSession: createSession,
    onRefreshSessions: refreshSessions,
    onSelectSession: selectSession,
    onCloseSession: closeSession,
    onDetachSession: detachSession,
    onRenameSession: renameSession,
    onStateChange: handleStateChange,
    onOpenTerminal: handleOpenTerminal,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onZoomReset: zoomReset,
    onSelectProject: handleSelectProjectRoot,
    onRunCommand: runActionCommand,
    pendingCommand,
    onCommandSent: acknowledgeCommandSent,
    onSessionActivity: updateSessionActivity,
    onSessionAttached: handleSessionAttached,
    terminalFontSize: activeFontSize,
  };
  const explorerRootPath = projectReady
    ? selectedCell?.worktreePath || projectRoot || ''
    : '';
  const explorerRootLabel = projectReady
    ? selectedCell?.name || 'Repository'
    : 'Project';
  const explorerMeta = workbenchMetaByCellId[selectedCell?.id || 'repo'] || {};
  const hilCommentsProps = {
    activeFile: activeTab?.path || '',
    cursorPosition,
    comments,
    loading: commentsLoading,
    error: commentsError,
    onOpenComment: openCommentModal,
    onPromoteComment: promoteComment,
    onUpdateStatus: updateCommentStatus,
    commentModalOpen,
    commentTarget,
    commentMessage,
    commentTodo,
    commentError,
    commentSaving,
    commentSnippet,
    commentSnippetLoading,
    commentSnippetError,
    onCommentMessageChange: setCommentMessage,
    onCommentTodoChange: setCommentTodo,
    onCloseComment: closeCommentModal,
    onSubmitComment: submitComment,
    onOpenBulkPromote: openBulkPromote,
    bulkPromoteOpen,
    bulkPromoteDescription,
    bulkPromoteError,
    bulkPromoteLoading,
    bulkPromoteItems,
    bulkPromoteSelectedIds,
    bulkPromotePreviewById,
    onBulkPromoteDescriptionChange: setBulkPromoteDescription,
    onBulkPromoteToggleItem: toggleBulkPromoteItem,
    onBulkPromotePreview: loadBulkPromotePreview,
    onCloseBulkPromote: closeBulkPromote,
    onSubmitBulkPromote: submitBulkPromote,
  };
  const handleSwitchView = useCallback(
    (view) => {
      setActiveView(view);
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    },
    [sidebarCollapsed]
  );
  const handleOpenExplorerForCell = useCallback(
    (cellId) => {
      if (cellId) {
        setSelectedId(cellId);
      }
      handleSwitchView('explorer');
    },
    [handleSwitchView]
  );
  const handleSidebarResizeEnd = useCallback(
    (nextWidth) => {
      setSidebarWidth(nextWidth);
      if (window.agency?.setUiState) {
        window.agency
          .setUiState({
            sidebarWidth: nextWidth,
            sidebarCollapsed,
          })
          .catch(() => undefined);
      }
    },
    [sidebarCollapsed]
  );
  const handleHierarchyJump = useCallback(
    (target) => {
      setHierarchySection(target);
      setActiveView('hierarchy');
      if (target === 'actions') {
        clearQuickActionsError();
      }
      if (target === 'gates') {
        clearGatesError();
      }
      if (target === 'softlinks') {
        clearWorktreeLinksError();
      }
    },
    [clearGatesError, clearQuickActionsError, clearWorktreeLinksError]
  );
  const handleSelectActionsScope = useCallback(
    (scope) => {
      setHierarchySection('actions');
      setActionsScope(scope);
      clearQuickActionsError();
    },
    [clearQuickActionsError]
  );
  const handleSelectGateScope = useCallback(
    (scope) => {
      setHierarchySection('gates');
      setGateScope(scope);
      clearGatesError();
    },
    [clearGatesError]
  );
  const handleSelectHierarchySection = useCallback(
    (section) => {
      setHierarchySection(section);
      if (section === 'softlinks') {
        clearWorktreeLinksError();
      }
    },
    [clearWorktreeLinksError]
  );
  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <AppLayout
        activeView={activeView}
        onSwitchView={handleSwitchView}
        hierarchySection={hierarchySection}
        onSelectHierarchySection={handleSelectHierarchySection}
        cells={displayCells}
        selectedId={selectedId}
        selectedCell={selectedCell}
        onSelectCell={setSelectedId}
        onCreateCell={() => {
          if (projectReady) {
            setShowCreate(true);
          } else {
            handleSelectProjectRoot();
          }
        }}
        onJumpToHierarchy={handleHierarchyJump}
        onOpenExplorerForCell={handleOpenExplorerForCell}
        projectReady={projectReady}
        projectError={projectError}
        projectRoot={projectRoot}
        recentProjects={recentProjects}
        tmuxStatus={tmuxStatus}
        onSelectProject={handleSelectProjectRoot}
        onOpenRecentProject={handleOpenRecentProject}
        onOpenActions={() => handleHierarchyJump('actions')}
        onOpenGates={() => handleHierarchyJump('gates')}
        onOpenSoftlinks={() => handleHierarchyJump('softlinks')}
        actionsScope={actionsScope}
        onSelectActionsScope={handleSelectActionsScope}
        actionsScopeDisabled={actionsScopeDisabled}
        actionSummary={actionSummary}
        actionsRows={actionsRows}
        projectActionsPath={projectActionsPath}
        agentActionsPath={agentActionsPath}
        quickActionsError={quickActionsError}
        quickActionsSaving={quickActionsSaving}
        onAddAction={addQuickAction}
        onRemoveAction={removeQuickAction}
        onOverrideAction={overrideQuickAction}
        onResetAction={resetQuickAction}
        onUpdateAction={updateQuickAction}
        onSaveActions={saveQuickActions}
        gateScope={gateScope}
        onSelectGateScope={handleSelectGateScope}
        gateStage={gateStage}
        onSelectGateStage={setGateStage}
        gateScopeDisabled={gateScopeDisabled}
        gateSummary={gateSummary}
        gateRows={gateRows}
        projectGatesPath={projectGatesPath}
        agentGatesPath={agentGatesPath}
        gatesError={gatesError}
        gatesSaving={gatesSaving}
        onAddGate={addGate}
        onRemoveGate={removeGate}
        onOverrideGate={overrideGate}
        onResetGate={resetGate}
        onUpdateGate={updateGate}
        onSaveGates={handleSaveGates}
        worktreeLinks={worktreeLinks}
        worktreeLinksAuto={worktreeLinksAuto}
        worktreeLinksCandidates={worktreeLinksCandidates}
        worktreeLinksStatusesByPath={worktreeLinksStatusesByPath}
        worktreeLinksConfigPath={worktreeLinksConfigPath}
        worktreeLinksLoading={worktreeLinksLoading}
        worktreeLinksError={worktreeLinksError}
        worktreeLinksDirty={worktreeLinksDirty}
        onToggleWorktreeLinksAuto={toggleWorktreeLinksAuto}
        onAddWorktreeLink={addWorktreeLink}
        onAddWorktreeLinkFromCandidate={addWorktreeLinkFromCandidate}
        onUpdateWorktreeLink={updateWorktreeLink}
        onRemoveWorktreeLink={removeWorktreeLink}
        onApplyWorktreeLink={applyWorktreeLink}
        onApplyAllWorktreeLinks={applyAllWorktreeLinks}
        onSaveWorktreeLinks={saveWorktreeLinks}
        onRefreshWorktreeLinks={refreshWorktreeLinks}
        repoRoot={resolvedRepoRoot}
        canUseProjectScope={canUseScopedConfig}
        canUseAgentScope={canUseScopedConfig}
        editorPaneProps={editorPaneProps}
        sidebarWidth={sidebarWidth}
        sidebarCollapsed={sidebarCollapsed}
        onResizeSidebar={setSidebarWidth}
        onResizeSidebarEnd={handleSidebarResizeEnd}
        onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        hilDrawerOpen={hilDrawerOpen}
        hilDrawerPanel={hilDrawerPanel}
        onToggleHilDrawer={setHilDrawerOpen}
        onSelectHilDrawerPanel={setHilDrawerPanel}
        hilCommentsProps={hilCommentsProps}
        explorerSidebarProps={{
          rootPath: explorerRootPath,
          rootLabel: explorerRootLabel,
          cells: projectReady ? cells : [],
          selectedId,
          onSelectCell: setSelectedId,
          selectedCell,
          sessions,
          activeSessionId,
          sessionActivityByKey,
          onJumpToAgents: () => handleSwitchView('agent-cells'),
          workbenchMeta: explorerMeta,
          onSelectSession: selectSession,
          onRunCommand: runActionCommand,
          onOpenFile: ({ path, mode }) => {
            workbench.openFile({ path, mode, rootPath: explorerRootPath });
          },
        }}
        explorerPaneProps={{
          workbench,
          activeRootPath: explorerRootPath,
          activeRootLabel: explorerRootLabel,
          projectReady,
          projectError,
          onSelectProject: handleSelectProjectRoot,
          cellId: selectedCell?.id || 'repo',
          onTabMetaChange: handleWorkbenchMetaChange,
          commentLines,
          onOpenComment: openCommentModal,
          onCursorPositionChange: setCursorPosition,
        }}
        memoPaneProps={{
          worktreePath: selectedCell?.worktreePath || projectRoot || '',
          projectReady,
          projectError,
          onSelectProject: handleSelectProjectRoot,
        }}
      />

      <StatusBar loading={loading} onRefresh={loadCells} tmuxStatus={tmuxStatus} />

      {showCreate ? (
        <CreateCellModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      ) : null}
      {pendingTransition ? (
        <LifecycleConfirmModal
          transition={pendingTransition}
          error={transitionError}
          loading={transitionLoading}
          onCancel={() => {
            setPendingTransition(null);
            setTransitionError('');
          }}
          onConfirm={async () => {
            if (!pendingTransition?.cell) {
              return;
            }
            setTransitionLoading(true);
            try {
              await window.agency.updateCellState({
                id: pendingTransition.cell.id,
                state: pendingTransition.nextState,
                worktreePath: pendingTransition.cell.worktreePath,
              });
              await loadCells();
              setPendingTransition(null);
            } catch (error) {
              setTransitionError(error?.message || 'Lifecycle transition failed.');
            } finally {
              setTransitionLoading(false);
            }
          }}
          onRefresh={async () => {
            if (!pendingTransition?.cell) {
              return;
            }
            try {
              const gates = ['active', 'archived'].includes(pendingTransition.nextState)
                ? await checkGatesForCell({
                    cell: pendingTransition.cell,
                    stage: pendingTransition.nextState,
                  })
                : [];
              setPendingTransition({
                ...pendingTransition,
                gates,
              });
              setTransitionError('');
            } catch (error) {
              setTransitionError(error?.message || 'Failed to run gates.');
            }
          }}
        />
      ) : null}
    </div>
  );
}

export default App;
