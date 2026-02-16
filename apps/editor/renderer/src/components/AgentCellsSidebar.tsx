import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  GitBranch,
  Circle,
  SquareTerminal,
  Command,
  Link2,
  ShieldCheck,
  ArrowUpRight,
  FolderOpen,
  MoreHorizontal,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  RefreshCw,
  GripHorizontal,
} from 'lucide-react';
import { RecentProjectsList } from './RecentProjectsList';
import { SessionContextMenu, SessionCreateMenu, SessionOverflowMenu } from './SessionMenus';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge';
import { AvatarPickerMenu } from './ui/AvatarPickerMenu';
import { formatIdleShort } from '../utils/timeFormat';
import { resolveSessionAvatarId } from '../utils/agentAvatar';
import { buildAgentCellModifiedFileChanges } from '../utils/agentCellFileChanges';
import { setFileDragPayload } from '../utils/fileDragPayload';
import {
  hasExternalDropEntries as hasExternalDroppedPaths,
  readExternalDropPaths as readDroppedExternalPaths,
} from '../utils/externalDropPaths';
import { useFileSnippetPreview } from '../hooks/useFileSnippetPreview';
import {
  getExplorerStatus,
  getPathForDroppedFile,
  searchExplorerFiles,
} from '../services/agencyBridge';
import { FileDashboardList } from './fileDashboard/FileDashboardList';


const cellStateColors = {
  draft: 'text-muted-foreground',
  active: 'text-emerald-400',
  paused: 'text-amber-400',
  archived: 'text-slate-500',
};


const FILE_DASHBOARD_MIN_HEIGHT = 148;
const FILE_DASHBOARD_DEFAULT_RATIO = 0.5;
const FILE_DASHBOARD_MAX_RATIO = 0.82;
const FILE_DASHBOARD_ALL_LIMIT = 4000;
const AGENTS_PANEL_MIN_HEIGHT = 128;

const clampNumber = (value: number, min: number, max: number) => {
  const upper = Math.max(min, max);
  return Math.min(upper, Math.max(min, value));
};

const buildSessionKey = (cellId, sessionId) => `${cellId}:${sessionId}`;

export function AgentCellsSidebar({
  cells,
  selectedId,
  onSelect,
  onCreate,
  onJump,
  onOpenExplorer,
  projectReady,
  projectError,
  onSelectProject,
  recentProjects,
  onOpenRecentProject,
  sessionsByCellId,
  activeSessionByCellId,
  sessionActivityByKey,
  terminusProfiles,
  onSelectSession,
  onCreateSession,
  onDispatchCommand,
  onCloseSession,
  onDetachSession,
  onRenameSession,
  onUpdateSessionAvatar,
  onConfigureProfile,
  onOpenFileReference,
  onRevealFileReference,
  onImportFileReferences,
}: any) {
  const [idleNow, setIdleNow] = useState(Date.now());
  const [closedMenu, setClosedMenu] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [createMenu, setCreateMenu] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [avatarMenu, setAvatarMenu] = useState(null);
  const [collapsedCells, setCollapsedCells] = useState<Set<string>>(() => new Set());
  const [fileDashboardOpen, setFileDashboardOpen] = useState(true);
  const [fileDashboardLoading, setFileDashboardLoading] = useState(false);
  const [fileDashboardEntries, setFileDashboardEntries] = useState([]);
  const [fileDashboardAllPaths, setFileDashboardAllPaths] = useState<string[]>([]);
  const [fileDashboardAllTruncated, setFileDashboardAllTruncated] = useState(false);
  const [fileDashboardUpdatedAt, setFileDashboardUpdatedAt] = useState(0);
  const [fileDashboardMode, setFileDashboardMode] = useState<'flat' | 'tree'>('flat');
  const [fileDashboardCellFilter, setFileDashboardCellFilter] = useState<'changes' | 'all'>('changes');
  const [fileDashboardNotice, setFileDashboardNotice] = useState('');
  const fileDashboardSnippetPreview = useFileSnippetPreview({ defaultContext: 2 });
  const fileDashboardPreview = fileDashboardSnippetPreview.preview;
  const [fileDashboardHeight, setFileDashboardHeight] = useState<number | null>(null);
  const [fileDashboardDragging, setFileDashboardDragging] = useState(false);
  const [sidebarBodyHeight, setSidebarBodyHeight] = useState(0);
  const [sidebarTopHeight, setSidebarTopHeight] = useState(0);
  const closedMenuRef = useRef(null);
  const contextMenuRef = useRef(null);
  const createMenuRef = useRef(null);
  const avatarMenuRef = useRef(null);
  const sidebarBodyRef = useRef<HTMLDivElement | null>(null);
  const sidebarTopRef = useRef<HTMLDivElement | null>(null);
  const fileDashboardDragRef = useRef<{
    startY: number;
    startHeight: number;
    minHeight: number;
    maxHeight: number;
  } | null>(null);
  const cellsById = useMemo(
    () => new Map<string, any>((cells || []).filter(Boolean).map((cell: any) => [cell.id, cell])),
    [cells]
  );

  useEffect(() => {
    const interval = setInterval(() => setIdleNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const node = sidebarBodyRef.current;
    if (!node) {
      return undefined;
    }

    const syncHeight = () => {
      const nextHeight = Number(node.getBoundingClientRect().height || 0);
      setSidebarBodyHeight(Number.isFinite(nextHeight) ? nextHeight : 0);
    };

    syncHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncHeight);
      return () => window.removeEventListener('resize', syncHeight);
    }

    const observer = new ResizeObserver(() => syncHeight());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = sidebarTopRef.current;
    if (!node) {
      return undefined;
    }

    const syncHeight = () => {
      const nextHeight = Number(node.getBoundingClientRect().height || 0);
      setSidebarTopHeight(Number.isFinite(nextHeight) ? nextHeight : 0);
    };

    syncHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncHeight);
      return () => window.removeEventListener('resize', syncHeight);
    }

    const observer = new ResizeObserver(() => syncHeight());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!closedMenu) {
      return undefined;
    }
    const handleClick = (event) => {
      if (closedMenuRef.current?.contains(event.target)) {
        return;
      }
      setClosedMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [closedMenu]);

  useEffect(() => {
    if (!contextMenu) {
      return undefined;
    }
    const handleClick = (event) => {
      if (contextMenuRef.current?.contains(event.target)) {
        return;
      }
      setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  useEffect(() => {
    if (!createMenu) {
      return undefined;
    }
    const handleClick = (event) => {
      if (createMenuRef.current?.contains(event.target)) {
        return;
      }
      setCreateMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [createMenu]);

  useEffect(() => {
    if (!avatarMenu) {
      return undefined;
    }
    const handleClick = (event) => {
      if (avatarMenuRef.current?.contains(event.target)) {
        return;
      }
      if (event.target?.closest?.('[data-avatar-picker-anchor="true"]')) {
        return;
      }
      setAvatarMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [avatarMenu]);

  useEffect(() => {
    if (!cellsById.size) {
      return;
    }
    setCollapsedCells((current) => {
      const next = new Set<string>();
      current.forEach((id) => {
        if (cellsById.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [cellsById]);

  const beginRenameSession = (cellId, session) => {
    if (!cellId || !session) {
      return;
    }
    setEditingSession({ cellId, sessionId: session.id });
    setEditingSessionName(session.name || session.id);
  };

  const cancelRenameSession = () => {
    setEditingSession(null);
    setEditingSessionName('');
  };

  const commitRenameSession = () => {
    if (!editingSession) {
      return;
    }
    const nextName = editingSessionName.trim();
    if (nextName) {
      onRenameSession?.(editingSession.sessionId, nextName, editingSession.cellId);
    }
    cancelRenameSession();
  };

  const openAvatarMenu = (payload, rect) => {
    if (!rect) {
      return;
    }
    setAvatarMenu({ ...payload, x: rect.left, y: rect.bottom + 6 });
  };

  const toggleCellCollapse = (cellId) => {
    setCollapsedCells((current) => {
      const next = new Set(current);
      if (next.has(cellId)) {
        next.delete(cellId);
      } else {
        next.add(cellId);
      }
      return next;
    });
  };

  const resolveSessionActivity = useCallback((cellId, session) => {
    const key = buildSessionKey(cellId, session?.id);
    const activity = sessionActivityByKey?.[key];
    if (Number.isFinite(activity)) {
      return activity;
    }
    const parsed = Date.parse(session?.lastActivityAt || '');
    return Number.isFinite(parsed) ? parsed : null;
  }, [sessionActivityByKey]);

  const resolveCellSessions = useCallback(
    (cellId): any[] => sessionsByCellId?.[cellId] || [],
    [sessionsByCellId]
  );

  const selectedCell: any = useMemo(
    () => (selectedId ? cellsById.get(selectedId) || null : null),
    [cellsById, selectedId]
  );

  const fileDashboardScopeLabel = useMemo(() => {
    return fileDashboardCellFilter === 'all'
      ? 'All files · selected Cell'
      : 'Changes · selected Cell';
  }, [fileDashboardCellFilter]);


  const loadFileDashboardPreview = useCallback(
    async (shortcut) => {
      if (!shortcut?.relativePath || !selectedCell?.worktreePath) {
        fileDashboardSnippetPreview.clearPreview();
        return;
      }

      const relativePath = String(shortcut.relativePath).trim();
      if (!relativePath) {
        fileDashboardSnippetPreview.clearPreview();
        return;
      }

      const line = Number.isFinite(shortcut.line) ? Math.max(1, Math.floor(shortcut.line)) : null;
      await fileDashboardSnippetPreview.loadPreview({
        rootPath: selectedCell.worktreePath,
        targetPath: relativePath,
        relativePath,
        line,
        context: 2,
      });
    },
    [fileDashboardSnippetPreview, selectedCell?.worktreePath]
  );

  const clearFileDashboardPreview = useCallback(() => {
    fileDashboardSnippetPreview.clearPreview();
  }, [fileDashboardSnippetPreview]);

  const canDropIntoFileDashboard = Boolean(
    selectedCell?.id && selectedCell?.worktreePath && onImportFileReferences
  );

  const computeFileDashboardMaxHeight = useCallback(() => {
    if (!sidebarBodyHeight) {
      return 0;
    }

    const middleAreaHeight = Math.max(0, sidebarBodyHeight - sidebarTopHeight);
    if (!middleAreaHeight) {
      return 0;
    }

    const minHeight = Math.min(FILE_DASHBOARD_MIN_HEIGHT, middleAreaHeight);
    const preferredMax = Math.floor(middleAreaHeight * FILE_DASHBOARD_MAX_RATIO);
    const spaceBoundMax = Math.floor(middleAreaHeight - AGENTS_PANEL_MIN_HEIGHT);
    const maxCandidate = Math.min(preferredMax, spaceBoundMax);
    return Math.max(minHeight, Math.min(middleAreaHeight, maxCandidate));
  }, [sidebarBodyHeight, sidebarTopHeight]);

  const resolvedFileDashboardHeight = useMemo(() => {
    if (!fileDashboardOpen || !sidebarBodyHeight) {
      return 0;
    }
    const maxHeight = computeFileDashboardMaxHeight();
    if (!maxHeight) {
      return 0;
    }
    const middleAreaHeight = Math.max(0, sidebarBodyHeight - sidebarTopHeight);
    const fallback = Math.round(middleAreaHeight * FILE_DASHBOARD_DEFAULT_RATIO);
    const minHeight = Math.min(FILE_DASHBOARD_MIN_HEIGHT, maxHeight);
    const baseHeight =
      Number.isFinite(fileDashboardHeight as number) && Number(fileDashboardHeight) > 0
        ? Number(fileDashboardHeight)
        : fallback;
    return clampNumber(baseHeight, minHeight, maxHeight);
  }, [
    computeFileDashboardMaxHeight,
    fileDashboardHeight,
    fileDashboardOpen,
    sidebarBodyHeight,
    sidebarTopHeight,
  ]);

  useEffect(() => {
    if (!fileDashboardOpen) {
      return;
    }
    const maxHeight = computeFileDashboardMaxHeight();
    if (!maxHeight) {
      return;
    }
    setFileDashboardHeight((current) => {
      const middleAreaHeight = Math.max(0, sidebarBodyHeight - sidebarTopHeight);
      const fallback = Math.round(middleAreaHeight * FILE_DASHBOARD_DEFAULT_RATIO);
      const minHeight = Math.min(FILE_DASHBOARD_MIN_HEIGHT, maxHeight);
      const baseHeight = Number.isFinite(current as number) && Number(current) > 0
        ? Number(current)
        : fallback;
      return clampNumber(baseHeight, minHeight, maxHeight);
    });
  }, [computeFileDashboardMaxHeight, fileDashboardOpen, sidebarBodyHeight, sidebarTopHeight]);

  const handleFileDashboardResizeStart = useCallback((event) => {
    if (!fileDashboardOpen) {
      return;
    }
    event.preventDefault();

    const maxHeight = computeFileDashboardMaxHeight();
    if (!maxHeight) {
      return;
    }

    const middleAreaHeight = Math.max(0, sidebarBodyHeight - sidebarTopHeight);
    const fallbackHeight = Math.round(middleAreaHeight * FILE_DASHBOARD_DEFAULT_RATIO);
    const minHeight = Math.min(FILE_DASHBOARD_MIN_HEIGHT, maxHeight);
    const startHeight = clampNumber(
      resolvedFileDashboardHeight || fallbackHeight,
      minHeight,
      maxHeight
    );
    fileDashboardDragRef.current = {
      startY: event.clientY,
      startHeight,
      minHeight,
      maxHeight,
    };
    setFileDashboardDragging(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const state = fileDashboardDragRef.current;
      if (!state) {
        return;
      }
      const delta = state.startY - moveEvent.clientY;
      const nextHeight = clampNumber(
        Math.round(state.startHeight + delta),
        state.minHeight,
        state.maxHeight
      );
      setFileDashboardHeight(nextHeight);
    };

    const finishDrag = () => {
      fileDashboardDragRef.current = null;
      setFileDashboardDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    const handlePointerUp = () => {
      finishDrag();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, [
    computeFileDashboardMaxHeight,
    fileDashboardOpen,
    resolvedFileDashboardHeight,
    sidebarBodyHeight,
    sidebarTopHeight,
  ]);

  useEffect(() => {
    return () => {
      if (fileDashboardDragRef.current) {
        fileDashboardDragRef.current = null;
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  useEffect(() => {
    setFileDashboardNotice('');
    clearFileDashboardPreview();
  }, [clearFileDashboardPreview, fileDashboardCellFilter, selectedCell?.id]);

  useEffect(() => {
    setFileDashboardAllPaths([]);
    setFileDashboardAllTruncated(false);
  }, [selectedCell?.id, selectedCell?.worktreePath]);

  const handleFileDashboardOpen = useCallback(
    (shortcut, options: { focusView?: boolean; mode?: 'preview' | 'pinned' } = {}) => {
      if (!shortcut?.relativePath || !selectedCell?.id || !selectedCell?.worktreePath) {
        return;
      }
      const focusView = options.focusView !== false;
      const mode = options.mode === 'preview' ? 'preview' : 'pinned';
      onOpenFileReference?.({
        cellId: selectedCell.id,
        rootPath: selectedCell.worktreePath,
        path: shortcut.relativePath,
        line: shortcut.line || undefined,
        column: shortcut.column || undefined,
        focusView,
        mode,
      });
    },
    [onOpenFileReference, selectedCell?.id, selectedCell?.worktreePath]
  );

  const handleFileDashboardReveal = useCallback(
    (shortcut) => {
      if (!shortcut?.relativePath || !selectedCell?.id || !selectedCell?.worktreePath) {
        return;
      }
      onRevealFileReference?.({
        cellId: selectedCell.id,
        rootPath: selectedCell.worktreePath,
        path: shortcut.relativePath,
      });
    },
    [onRevealFileReference, selectedCell?.id, selectedCell?.worktreePath]
  );

  const handleFileDashboardPreview = useCallback(
    async (shortcut) => {
      await loadFileDashboardPreview(shortcut);
      handleFileDashboardOpen(shortcut, {
        focusView: false,
        mode: 'preview',
      });
    },
    [handleFileDashboardOpen, loadFileDashboardPreview]
  );

  const handleFileDashboardDragStart = useCallback((event, shortcut) => {
    const success = setFileDragPayload(event, shortcut?.absolutePath || '');
    if (!success) {
      event.preventDefault();
    }
  }, []);

  const hasExternalDropEntries = useCallback(
    (dataTransfer) => hasExternalDroppedPaths(dataTransfer),
    []
  );

  const readExternalDropPaths = useCallback(
    (dataTransfer) =>
      readDroppedExternalPaths(dataTransfer, {
        getPathForDroppedFile,
      }),
    []
  );

  const refreshFileDashboard = useCallback(
    async (
      { showBusy = false, forceAllPaths = false }: { showBusy?: boolean; forceAllPaths?: boolean } = {}
    ) => {
      if (!fileDashboardOpen || !selectedCell?.id || !selectedCell?.worktreePath) {
        setFileDashboardEntries([]);
        setFileDashboardLoading(false);
        setFileDashboardUpdatedAt(0);
        return;
      }
      if (showBusy) {
        setFileDashboardLoading(true);
      }
      try {
        const status = await getExplorerStatus({
          rootPath: selectedCell.worktreePath,
        });
        const statusFiles = status?.files || {};
        const baseRoot = String(selectedCell.worktreePath || '').replace(/\/+$/, '');

        if (fileDashboardCellFilter === 'all') {
          let allPaths = fileDashboardAllPaths;
          let truncated = fileDashboardAllTruncated;

          if (!allPaths.length || forceAllPaths) {
            const result = await searchExplorerFiles({
              rootPath: selectedCell.worktreePath,
              query: '',
              includeAll: true,
              limit: FILE_DASHBOARD_ALL_LIMIT,
            });
            allPaths = Array.isArray(result?.matches) ? result.matches : [];
            truncated = Boolean(result?.truncated);
            setFileDashboardAllPaths(allPaths);
            setFileDashboardAllTruncated(truncated);
          }

          const changedEntries = buildAgentCellModifiedFileChanges({
            statusFiles,
            cellId: selectedCell.id,
          })
            .filter((entry) => String(entry?.status || '').toLowerCase() !== 'ignored')
            .map((entry) => ({
              ...entry,
              absolutePath: baseRoot && entry?.relativePath ? `${baseRoot}/${entry.relativePath}` : '',
            }));

          const changedSet = new Set(changedEntries.map((entry) => entry.relativePath));
          const cleanEntries = allPaths
            .filter((relativePath) => !changedSet.has(relativePath))
            .map((relativePath) => ({
              rawText: relativePath,
              relativePath,
              displayPath: relativePath.split('/').pop() || relativePath,
              absolutePath: baseRoot ? `${baseRoot}/${relativePath}` : '',
              line: null,
              column: null,
              sessions: [],
              sessionCount: 0,
              latestActivityAt: 0,
            }));
          cleanEntries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

          setFileDashboardEntries([...changedEntries, ...cleanEntries]);
          setFileDashboardUpdatedAt(Date.now());
          return;
        }

        const nextEntries = buildAgentCellModifiedFileChanges({
          statusFiles,
          cellId: selectedCell.id,
        })
          .filter((entry) => String(entry?.status || '').toLowerCase() !== 'ignored')
          .map((entry) => ({
            ...entry,
            absolutePath: baseRoot && entry?.relativePath ? `${baseRoot}/${entry.relativePath}` : '',
          }));
        setFileDashboardEntries(nextEntries);
        setFileDashboardUpdatedAt(Date.now());
      } finally {
        if (showBusy) {
          setFileDashboardLoading(false);
        }
      }
    },
    [
      fileDashboardOpen,
      fileDashboardCellFilter,
      fileDashboardAllPaths,
      fileDashboardAllTruncated,
      selectedCell?.id,
      selectedCell?.worktreePath,
    ]
  );

  const handleFileDashboardImport = useCallback(
    async (sourcePaths: string[]) => {
      if (!sourcePaths?.length || !selectedCell?.id || !selectedCell?.worktreePath) {
        return;
      }
      if (!onImportFileReferences) {
        setFileDashboardNotice('Import is unavailable.');
        return;
      }

      try {
        const report = await onImportFileReferences({
          cellId: selectedCell.id,
          rootPath: selectedCell.worktreePath,
          sourcePaths,
        });
        if (!report) {
          setFileDashboardNotice('Import is unavailable.');
          return;
        }
        const importedCount = Array.isArray(report.imported)
          ? report.imported.length
          : Array.isArray(report.importedPaths)
            ? report.importedPaths.length
            : 0;
        const failureCount = Array.isArray(report.failures) ? report.failures.length : 0;
        if (failureCount > 0) {
          const firstFailure = report.failures?.[0]?.error
            ? ` (${report.failures[0].error})`
            : '';
          if (importedCount > 0) {
            setFileDashboardNotice(
              `Imported ${importedCount} item${importedCount === 1 ? '' : 's'} with ${failureCount} failure${failureCount === 1 ? '' : 's'}${firstFailure}.`
            );
          } else {
            setFileDashboardNotice(
              `Import failed: ${failureCount} failure${failureCount === 1 ? '' : 's'}${firstFailure}.`
            );
          }
        } else if (importedCount > 0) {
          setFileDashboardNotice(
            `Imported ${importedCount} item${importedCount === 1 ? '' : 's'} into ${selectedCell.name || selectedCell.id}.`
          );
        } else {
          setFileDashboardNotice('No files were imported.');
        }
        await refreshFileDashboard({ showBusy: true, forceAllPaths: true });
      } catch (error) {
        setFileDashboardNotice(error?.message || 'Import failed.');
      }
    },
    [onImportFileReferences, refreshFileDashboard, selectedCell?.id, selectedCell?.name, selectedCell?.worktreePath]
  );

  const handleFileDashboardDragOver = useCallback((event) => {
    if (!fileDashboardOpen || !canDropIntoFileDashboard) {
      return;
    }
    if (!hasExternalDropEntries(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, [canDropIntoFileDashboard, fileDashboardOpen, hasExternalDropEntries]);

  const handleFileDashboardDrop = useCallback(async (event) => {
    if (!fileDashboardOpen || !canDropIntoFileDashboard) {
      return;
    }
    if (!hasExternalDropEntries(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    const sourcePaths = readExternalDropPaths(event.dataTransfer);
    if (!sourcePaths.length) {
      setFileDashboardNotice('Unable to read dropped file paths.');
      return;
    }
    await handleFileDashboardImport(sourcePaths);
  }, [canDropIntoFileDashboard, fileDashboardOpen, handleFileDashboardImport, hasExternalDropEntries, readExternalDropPaths]);

  useEffect(() => {
    if (!fileDashboardOpen) {
      setFileDashboardEntries([]);
      setFileDashboardAllPaths([]);
      setFileDashboardAllTruncated(false);
      setFileDashboardLoading(false);
      setFileDashboardUpdatedAt(0);
      setFileDashboardNotice('');
      clearFileDashboardPreview();
      return;
    }
    void refreshFileDashboard({ showBusy: true });
    const intervalMs = fileDashboardCellFilter === 'all' ? 6000 : 1600;
    const timer = setInterval(() => {
      void refreshFileDashboard();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [clearFileDashboardPreview, fileDashboardCellFilter, fileDashboardOpen, refreshFileDashboard]);

  const overflowSessions = useMemo(() => {
    if (!closedMenu?.cellId) {
      return { detached: [], closed: [] };
    }
    const list = resolveCellSessions(closedMenu.cellId);
    return {
      detached: list.filter((session) => session.status === 'detached'),
      closed: list.filter((session) => session.status === 'closed'),
    };
  }, [closedMenu?.cellId, resolveCellSessions]);

  const contextMenuSession = useMemo(() => {
    if (!contextMenu?.cellId || !contextMenu?.sessionId) {
      return null;
    }
    return resolveCellSessions(contextMenu.cellId).find(
      (session) => session.id === contextMenu.sessionId
    );
  }, [contextMenu?.cellId, contextMenu?.sessionId, resolveCellSessions]);

  const avatarMenuSessions = useMemo(() => {
    if (!avatarMenu?.cellId) {
      return [];
    }
    return resolveCellSessions(avatarMenu.cellId);
  }, [avatarMenu?.cellId, resolveCellSessions]);

  const avatarMenuSession = avatarMenu
    ? avatarMenuSessions.find((session) => session.id === avatarMenu.sessionId)
    : null;
  const avatarMenuCell = avatarMenu?.cellId ? cellsById.get(avatarMenu.cellId) : null;
  const avatarMenuActiveIds = useMemo(() => {
    if (!avatarMenu?.cellId) {
      return new Set<string>();
    }
    const ids = new Set<string>();
    avatarMenuSessions.forEach((session) => {
      if (!session || !['active', 'detached'].includes(session.status)) {
        return;
      }
      const resolved = resolveSessionAvatarId(session, avatarMenuCell);
      if (resolved) {
        ids.add(resolved);
      }
    });
    return ids;
  }, [avatarMenu?.cellId, avatarMenuCell, avatarMenuSessions]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col text-sidebar-foreground" data-testid="sidebar">
      <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Agent Cells</span>
        <button
          onClick={onCreate}
          className={`rounded p-1 ${projectReady ? 'hover:bg-muted/50 hover:text-foreground' : 'opacity-40 cursor-not-allowed'}`}
          title={projectReady ? 'New Cell' : 'Select a project to create Cells'}
          data-testid="open-create-cell"
          disabled={!projectReady}
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div ref={sidebarBodyRef} className="flex-1 min-h-0 flex flex-col px-2 pb-2">
        <div ref={sidebarTopRef}>
          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">CONFIGURATION</div>
          <div className="grid grid-cols-2 gap-1">
          <NavItem
            icon={SquareTerminal}
            label="Terminus"
            onClick={() => onJump?.('actions')}
            disabled={!projectReady}
          />
          <NavItem
            icon={Command}
            label="App Shortcuts"
            onClick={() => onJump?.('app-shortcuts')}
            disabled={!projectReady}
          />
          <NavItem
            icon={ShieldCheck}
            label="Gates"
            onClick={() => onJump?.('gates')}
            disabled={!projectReady}
          />
          <NavItem
            icon={Link2}
            label="Softlinks"
            onClick={() => onJump?.('softlinks')}
            disabled={!projectReady}
          />
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {!projectReady ? (
          <>
            <div className="mb-3 rounded-lg border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
              <div className="font-medium text-foreground">No project selected</div>
              <div className="mt-1">Choose a project directory to load Cells.</div>
              {projectError ? (
                <div className="mt-2 text-rose-300">{projectError}</div>
              ) : null}
              <button
                type="button"
                onClick={onSelectProject}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
              >
                Select Project
              </button>
            </div>
            <RecentProjectsList
              projects={recentProjects}
              onOpen={onOpenRecentProject}
              title="Recent Projects"
              emptyLabel="No recent projects yet"
            />
          </>
        ) : null}
        {cells.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No active cells
          </div>
        ) : (
          <div className="space-y-2" data-testid="cell-list">
            {cells.map((cell) => {
              const cellSessions = resolveCellSessions(cell.id);
              const activeSessionId = activeSessionByCellId?.[cell.id] || null;
              const isCollapsed = collapsedCells.has(cell.id);
              const openSessions = cellSessions.filter((session) => {
                if (session.status === 'closed') {
                  return false;
                }
                if (session.status === 'detached') {
                  return session.id === activeSessionId;
                }
                return true;
              });
              const sortedSessions = openSessions;
              const hasOverflow = cellSessions.some(
                (session) => session.status === 'detached' || session.status === 'closed'
              );

              return (
                <div key={cell.id} className="rounded-md">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect?.(cell.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect?.(cell.id);
                      }
                    }}
                    data-testid={`cell-item-${cell.id}`}
                    className={`group flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors ${
                      selectedId === cell.id
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCellCollapse(cell.id);
                      }}
                      className="rounded p-0.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                      title={isCollapsed ? 'Expand sessions' : 'Collapse sessions'}
                    >
                      {isCollapsed ? (
                        <ChevronRight size={12} strokeWidth={1.5} />
                      ) : (
                        <ChevronDown size={12} strokeWidth={1.5} />
                      )}
                    </button>
                    {cell.isVirtual ? (
                      <SquareTerminal size={14} strokeWidth={1.5} className="opacity-70" />
                    ) : (
                      <GitBranch size={14} strokeWidth={1.5} className="opacity-70" />
                    )}
                    <span className="truncate">{cell.name}</span>
                    <div
                      className={`ml-auto flex items-center gap-1 transition-opacity ${
                        selectedId === cell.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {!cell.isVirtual ? (
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenExplorer?.(cell.id);
                          }}
                          title="Open in Explorer"
                        >
                          <FolderOpen size={12} strokeWidth={1.5} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const rect = event.currentTarget.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const openUpwards = spaceBelow < 320;
                          setCreateMenu({
                            cellId: cell.id,
                            x: rect.left,
                            y: openUpwards ? rect.top - 6 : rect.bottom + 6,
                            openUpwards,
                          });
                        }}
                        className="rounded p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                        title="New Session"
                      >
                        <Plus size={12} strokeWidth={1.5} />
                      </button>
                      {hasOverflow ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const rect = event.currentTarget.getBoundingClientRect();
                            setClosedMenu({
                              cellId: cell.id,
                              x: rect.left,
                              y: rect.bottom + 6,
                            });
                          }}
                          className="rounded p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                          title="Detached/closed sessions"
                        >
                          <MoreHorizontal size={12} strokeWidth={1.5} />
                        </button>
                      ) : null}
                      {!cell.isVirtual ? (
                        <Circle
                          size={8}
                          className={cellStateColors[cell.state] || cellStateColors.draft}
                          fill="currentColor"
                        />
                      ) : null}
                    </div>
                  </div>

                  {!isCollapsed ? (
                    <div className="mt-1 space-y-0.5 pl-6">
                      {sortedSessions.map((session) => {
                      const isActive = session.id === activeSessionId;
                      const activityAt = resolveSessionActivity(cell.id, session);
                      const idleDuration = Number.isFinite(activityAt)
                        ? Math.max(0, idleNow - activityAt)
                        : null;
                      const idleLabel = idleDuration !== null ? formatIdleShort(idleDuration) : '—';
                      const isClosed = session.status === 'closed';
                      const isEditing =
                        editingSession?.cellId === cell.id &&
                        editingSession?.sessionId === session.id;
                      const statusPrefix =
                        session.status === 'detached'
                          ? 'Detached · '
                          : session.status === 'stale'
                            ? 'Stale · '
                            : '';

                      return (
                        <div
                          key={session.id}
                          className={`group relative flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[11px] transition-all duration-200 select-none ${
                            isActive
                              ? 'bg-primary/10 text-foreground ring-1 ring-primary/20 shadow-sm'
                              : 'bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                          }`}
                          data-testid={`session-tab-${session.id}`}
                          data-active={isActive ? 'true' : 'false'}
                          onClick={() => onSelectSession?.(cell.id, session.id)}
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            beginRenameSession(cell.id, session);
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            setContextMenu({
                              cellId: cell.id,
                              sessionId: session.id,
                              x: event.clientX,
                              y: event.clientY,
                            });
                          }}
                        >
                          <div className="relative flex shrink-0 items-center justify-center">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!onUpdateSessionAvatar) return;
                                const rect = event.currentTarget.getBoundingClientRect();
                                openAvatarMenu({ cellId: cell.id, sessionId: session.id }, rect);
                              }}
                              className="relative flex h-5 w-5 items-center justify-center rounded-full transition-transform active:scale-95"
                              title="Change avatar"
                              data-avatar-picker-anchor="true"
                            >
                              <AgentAvatarBadge
                                avatarId={resolveSessionAvatarId(session, cell)}
                                size={16}
                                ringSize={20}
                                idleMs={idleDuration}
                                isClosed={isClosed}
                                className="shadow-sm"
                              />
                            </button>
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            {isEditing ? (
                              <input
                                value={editingSessionName}
                                onChange={(event) => setEditingSessionName(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                onBlur={() => commitRenameSession()}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    commitRenameSession();
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    cancelRenameSession();
                                  }
                                }}
                                className="w-full min-w-0 bg-transparent p-0 text-[11px] font-medium text-foreground outline-none placeholder:text-muted-foreground/30 focus:ring-0 selection:bg-primary/20"
                                autoFocus
                                onFocus={(e) => e.target.select()}
                              />
                            ) : (
                              <span className="truncate font-medium leading-none tracking-tight">
                                {session.name || session.id}
                              </span>
                            )}
                            
                            {!isEditing && (
                              <div className="flex items-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-90">
                                <span className={`h-1 w-1 rounded-full ${
                                  session.status === 'detached' ? 'bg-amber-400/50' : 
                                  session.status === 'stale' ? 'bg-rose-400/50' : 
                                  isActive ? 'bg-emerald-400/50' : 'bg-slate-400/30'
                                }`} />
                                <span className="truncate text-[9px] font-medium tabular-nums tracking-wide">
                                  {idleLabel === '—' ? 'Active' : idleLabel}
                                </span>
                              </div>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onCloseSession?.(session.id, cell.id);
                                }}
                                className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                title="Terminate Session"
                              >
                                <X size={10} strokeWidth={2.5} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        </div>

        {projectReady && selectedCell?.worktreePath ? (
          <div
            className="mt-2 shrink-0 -mx-2 border-t border-border/40 bg-sidebar/20"
            data-testid="agent-cells-file-dashboard"
            onDragOver={handleFileDashboardDragOver}
            onDrop={handleFileDashboardDrop}
          >
            <div className="flex items-center justify-between px-3 py-2 text-[11px] font-medium text-muted-foreground">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <FileText size={11} strokeWidth={1.6} />
                <span className="truncate">Explorer</span>
                {fileDashboardOpen ? (
                  <span className="rounded bg-background/60 px-1 text-[9px] font-mono text-muted-foreground/80">
                    {fileDashboardEntries.length}
                  </span>
                ) : null}
              </span>
              <div className="inline-flex items-center gap-1">
                {fileDashboardOpen ? (
                  <button
                    type="button"
                    onClick={() => void refreshFileDashboard({ showBusy: true, forceAllPaths: true })}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    title="Refresh Explorer panel"
                    disabled={fileDashboardLoading}
                  >
                    <RefreshCw
                      size={10}
                      strokeWidth={1.6}
                      className={fileDashboardLoading ? 'animate-spin' : ''}
                    />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setFileDashboardOpen((current) => !current)}
                  disabled={!projectReady || !selectedCell?.worktreePath}
                  data-testid="agent-cells-file-dashboard-toggle"
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                    fileDashboardOpen
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={fileDashboardOpen ? 'Hide Explorer panel' : 'Open Explorer panel'}
                >
                  <span>{fileDashboardOpen ? 'Close' : 'Open'}</span>
                </button>
              </div>
            </div>

            {fileDashboardOpen ? (
              <div
                className={`flex h-full flex-col ${fileDashboardDragging ? 'select-none' : ''}`}
                style={{
                  height: `${resolvedFileDashboardHeight || FILE_DASHBOARD_MIN_HEIGHT}px`,
                }}
              >
                <button
                  type="button"
                  onPointerDown={handleFileDashboardResizeStart}
                  className="flex h-5 w-full cursor-row-resize items-center justify-center text-muted-foreground/50 hover:text-foreground"
                  title="Drag to resize Explorer panel"
                >
                  <GripHorizontal size={12} strokeWidth={1.6} />
                </button>

                <div className="flex min-h-0 flex-1 flex-col gap-1 px-3 pb-2">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span className="truncate">{selectedCell.name || selectedCell.id}</span>
                    <span className="truncate text-[9px] text-muted-foreground/70">{fileDashboardScopeLabel}</span>
                  </div>

                  {fileDashboardCellFilter === 'all' && fileDashboardAllTruncated ? (
                    <div className="text-[9px] text-muted-foreground/70">
                      Showing first {FILE_DASHBOARD_ALL_LIMIT} files in this Cell.
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-1">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setFileDashboardCellFilter('changes')}
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                          fileDashboardCellFilter === 'changes'
                            ? 'bg-primary/15 text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFileDashboardCellFilter('all')}
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                          fileDashboardCellFilter === 'all'
                            ? 'bg-primary/15 text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        All
                      </button>
                    </div>

                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setFileDashboardMode('flat')}
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                          fileDashboardMode === 'flat'
                            ? 'bg-primary/15 text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Flat
                      </button>
                      <button
                        type="button"
                        onClick={() => setFileDashboardMode('tree')}
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                          fileDashboardMode === 'tree'
                            ? 'bg-primary/15 text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Tree
                      </button>
                    </div>
                  </div>

                  {fileDashboardNotice ? (
                    <div className="rounded bg-primary/10 px-1.5 py-1 text-[9px] text-primary">
                      {fileDashboardNotice}
                    </div>
                  ) : null}

                  <FileDashboardList
                    entries={fileDashboardEntries}
                    mode={fileDashboardMode}
                    loading={fileDashboardLoading}
                    loadingMessage={
                      fileDashboardCellFilter === 'changes'
                        ? 'Scanning changes for selected Cell…'
                        : 'Listing files for selected Cell…'
                    }
                    emptyMessage={
                      fileDashboardCellFilter === 'changes'
                        ? 'No changed files in the selected Cell.'
                        : 'No files found in the selected Cell.'
                    }
                    onOpen={(entry) => handleFileDashboardOpen(entry)}
                    onReveal={(entry) => handleFileDashboardReveal(entry)}
                    onPreview={(entry) => handleFileDashboardPreview(entry)}
                    onDragStart={handleFileDashboardDragStart}
                    preview={fileDashboardPreview}
                    onClearPreview={clearFileDashboardPreview}
                    listTestId="agent-cells-file-dashboard-list"
                  />

                  {canDropIntoFileDashboard ? (
                    <div className="text-[9px] text-muted-foreground/80">
                      Drop local files here to import into this Cell worktree.
                    </div>
                  ) : null}

                  {fileDashboardUpdatedAt ? (
                    <div className="text-[9px] text-muted-foreground/80">
                      Updated {formatIdleShort(Math.max(0, Date.now() - fileDashboardUpdatedAt))} ago
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <SessionOverflowMenu
        isOpen={Boolean(closedMenu)}
        position={closedMenu || { x: 0, y: 0 }}
        containerRef={closedMenuRef}
        detachedSessions={overflowSessions.detached}
        closedSessions={overflowSessions.closed}
        cell={closedMenu?.cellId ? cellsById.get(closedMenu.cellId) : null}
        onSelectDetached={(session) => {
          if (closedMenu?.cellId) {
            onSelectSession?.(closedMenu.cellId, session.id);
          }
          setClosedMenu(null);
        }}
        onRestoreClosed={(session) => {
          if (closedMenu?.cellId) {
            const cell = cellsById.get(closedMenu.cellId) as any;
            if (cell) {
              onCreateSession?.(cell, { name: session.name || session.id });
            }
          }
          setClosedMenu(null);
        }}
      />

      <SessionContextMenu
        isOpen={Boolean(contextMenu && contextMenuSession)}
        position={contextMenu || { x: 0, y: 0 }}
        containerRef={contextMenuRef}
        onDetach={() => {
          if (contextMenu?.cellId && contextMenu?.sessionId) {
            onDetachSession?.(contextMenu.sessionId, contextMenu.cellId);
          }
          setContextMenu(null);
        }}
        onRename={() => {
          if (contextMenu?.cellId && contextMenuSession) {
            beginRenameSession(contextMenu.cellId, contextMenuSession);
          }
          setContextMenu(null);
        }}
      />

      <SessionCreateMenu
        isOpen={Boolean(createMenu)}
        position={createMenu || { x: 0, y: 0 }}
        containerRef={createMenuRef}
        profiles={terminusProfiles || []}
        onConfigureProfile={onConfigureProfile}
        onCreateBase={async () => {
          if (createMenu?.cellId) {
            const cell = cellsById.get(createMenu.cellId) as any;
            if (cell) {
              await onCreateSession?.(cell);
            }
          }
          setCreateMenu(null);
        }}
        onCreateProfile={(profile, action) => {
          const command = String(action?.command || profile?.startCommand || '').trim();
          if (!command || !createMenu?.cellId) {
            setCreateMenu(null);
            return;
          }
          const cell = cellsById.get(createMenu.cellId) as any;
          if (cell) {
            const modeLabel = action?.mode === 'resume' ? ' (resume)' : '';
            onDispatchCommand?.({
              command,
              kind: 'start',
              label: `${profile.label || profile.id}${modeLabel}`,
              profileId: profile.id,
              appendEnter: true,
              cellId: cell.id,
              worktreePath: cell.worktreePath,
            });
          }
          setCreateMenu(null);
        }}
      />

      {avatarMenu ? (
        <AvatarPickerMenu
          isOpen={Boolean(avatarMenu)}
          position={avatarMenu}
          containerRef={avatarMenuRef}
          selectedId={resolveSessionAvatarId(avatarMenuSession, avatarMenuCell)}
          activeAvatarIds={avatarMenuActiveIds}
          title="Select Session Avatar"
          onSelect={(id) => {
            if (avatarMenu?.cellId && avatarMenu?.sessionId) {
              onUpdateSessionAvatar?.(avatarMenu.sessionId, id, avatarMenu.cellId);
            }
            setAvatarMenu(null);
          }}
        />
      ) : null}
    </aside>
  );
}

function NavItem({ icon: Icon, label, onClick, disabled }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-[11px] transition-colors ${
        disabled
          ? 'cursor-not-allowed text-muted-foreground/50'
          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
      }`}
    >
      <span className="flex items-center gap-1.5 truncate">
        <Icon size={14} strokeWidth={1.5} className="opacity-70" />
        <span className="truncate">{label}</span>
      </span>
      <ArrowUpRight size={12} strokeWidth={1.5} className={disabled ? 'opacity-30' : 'opacity-50'} />
    </button>
  );
}
