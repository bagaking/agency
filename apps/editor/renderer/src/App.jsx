import React, { useEffect, useMemo, useState } from 'react';
import 'xterm/css/xterm.css';
import { ActivityBar } from './components/ActivityBar.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { StatusBar } from './components/StatusBar.jsx';
import { EditorPane } from './components/EditorPane.jsx';
import { QuickActionsView } from './components/QuickActionsView.jsx';
import { WorktreeLinksView } from './components/WorktreeLinksView.jsx';

const defaultCells = [
  {
    id: 'sample-cell',
    name: 'sample-cell',
    branch: 'feature/sample-cell',
    worktreePath: '',
    state: 'draft',
    validation: { warnings: ['Spec file not found (temporary validation).'] },
  },
];

const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 20;

const buildSessionKey = (cellId, sessionId) => `${cellId}:${sessionId}`;

const branchPrefixes = ['feat', 'refactor', 'fix', 'lint', 'chore', 'doc'];
const pathBaseName = (value) => value.split('/').filter(Boolean).pop() || value;
const toBranchSlug = (value) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'cell';
};

const mergeQuickActions = (...scopes) => {
  const merged = [];
  const indexById = new Map();
  scopes.flat().forEach((action, index) => {
    if (!action) {
      return;
    }
    const id = action?.id || `action-${index}`;
    const normalized = { ...action, id };
    if (indexById.has(id)) {
      merged[indexById.get(id)] = { ...merged[indexById.get(id)], ...normalized };
    } else {
      indexById.set(id, merged.length);
      merged.push(normalized);
    }
  });
  return merged;
};

const indexActions = (actions) => {
  const map = new Map();
  (actions || []).forEach((action) => {
    if (action?.id) {
      map.set(action.id, action);
    }
  });
  return map;
};

const buildActionRows = ({ scope, globalActions, projectActions, agentActions }) => {
  const globalMap = indexActions(globalActions);
  const projectMap = indexActions(projectActions);
  const agentMap = indexActions(agentActions);
  const effectiveActions =
    scope === 'global'
      ? globalActions
      : scope === 'project'
        ? mergeQuickActions(globalActions, projectActions)
        : mergeQuickActions(globalActions, projectActions, agentActions);
  return (effectiveActions || []).map((action) => {
    const id = action.id;
    const hasGlobal = globalMap.has(id);
    const hasProject = projectMap.has(id);
    const hasAgent = agentMap.has(id);
    const isLocal =
      (scope === 'global' && hasGlobal) ||
      (scope === 'project' && hasProject) ||
      (scope === 'agent' && hasAgent);
    const inheritedFrom = isLocal
      ? null
      : scope === 'project'
        ? 'global'
        : hasProject
          ? 'project'
          : 'global';
    const overriddenBy =
      scope === 'global'
        ? hasAgent
          ? 'agent'
          : hasProject
            ? 'project'
            : null
        : scope === 'project'
          ? hasAgent
            ? 'agent'
            : null
          : null;
    const hasParent =
      scope === 'project'
        ? hasGlobal
        : scope === 'agent'
          ? hasProject || hasGlobal
          : false;
    const parentScope =
      scope === 'project' && hasGlobal
        ? 'global'
        : scope === 'agent' && hasProject
          ? 'project'
          : scope === 'agent' && hasGlobal
            ? 'global'
            : null;
    return {
      ...action,
      meta: {
        isLocal,
        inheritedFrom,
        overriddenBy,
        hasParent,
        parentScope,
      },
    };
  });
};

function App() {
  const [cells, setCells] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [transitionError, setTransitionError] = useState('');
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [pendingCommand, setPendingCommand] = useState(null);
  const [activeSessionByCellId, setActiveSessionByCellId] = useState({});
  const [sessionsByCellId, setSessionsByCellId] = useState({});
  const [sessionFontSizeByKey, setSessionFontSizeByKey] = useState({});
  const [sessionActivityByKey, setSessionActivityByKey] = useState({});
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [uiStateLoaded, setUiStateLoaded] = useState(false);
  const [explorerMode, setExplorerMode] = useState('agent');
  const [actionsScope, setActionsScope] = useState('global');
  const [globalQuickActions, setGlobalQuickActions] = useState([]);
  const [projectQuickActions, setProjectQuickActions] = useState([]);
  const [agentQuickActions, setAgentQuickActions] = useState([]);
  const [quickActionsError, setQuickActionsError] = useState('');
  const [quickActionsSaving, setQuickActionsSaving] = useState(false);
  const [worktreeLinks, setWorktreeLinks] = useState([]);
  const [worktreeLinksAuto, setWorktreeLinksAuto] = useState(false);
  const [worktreeLinksCandidates, setWorktreeLinksCandidates] = useState([]);
  const [worktreeLinksStatusesByPath, setWorktreeLinksStatusesByPath] = useState({});
  const [repoRoot, setRepoRoot] = useState('');
  const [worktreeLinksConfigPath, setWorktreeLinksConfigPath] = useState('');
  const [worktreeLinksLoading, setWorktreeLinksLoading] = useState(false);
  const [worktreeLinksError, setWorktreeLinksError] = useState('');
  const [worktreeLinksDirty, setWorktreeLinksDirty] = useState(false);
  const [tmuxStatus, setTmuxStatus] = useState({ available: true });
  
  // Terminal State
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMode, setTerminalMode] = useState('shell');
  
  // View State
  const [activeView, setActiveView] = useState('explorer'); // explorer, terminal, settings

  const selectedCell = useMemo(
    () => cells.find((cell) => cell.id === selectedId),
    [cells, selectedId]
  );
  const sessions = selectedCell ? sessionsByCellId[selectedCell.id] || [] : [];
  const openSessions = useMemo(() => {
    const preferred = activeSessionByCellId[selectedCell?.id];
    return sessions.filter((session) => {
      if (session.status === 'closed') {
        return false;
      }
      if (session.status === 'detached') {
        return session.id === preferred;
      }
      return true;
    });
  }, [sessions, activeSessionByCellId, selectedCell?.id]);
  const preferredSessionId = selectedCell ? activeSessionByCellId[selectedCell.id] : undefined;
  const activeSessionId = selectedCell
    ? openSessions.find((session) => session.id === preferredSessionId)?.id ||
      openSessions.find((session) => session.status === 'active')?.id ||
      openSessions[0]?.id
    : undefined;
  const activeSessionKey =
    selectedCell && activeSessionId ? buildSessionKey(selectedCell.id, activeSessionId) : null;
  const activeFontSize = activeSessionKey
    ? sessionFontSizeByKey[activeSessionKey] || DEFAULT_FONT_SIZE
    : DEFAULT_FONT_SIZE;
  const lastActivityAt = activeSessionKey ? sessionActivityByKey[activeSessionKey] : null;
  const resolvedQuickActions = useMemo(
    () => mergeQuickActions(globalQuickActions, projectQuickActions, agentQuickActions),
    [globalQuickActions, projectQuickActions, agentQuickActions]
  );
  const canUseProjectScope = Boolean(selectedCell?.worktreePath);
  const canUseAgentScope = Boolean(selectedCell?.worktreePath);
  const actionsRows = useMemo(
    () =>
      buildActionRows({
        scope: actionsScope,
        globalActions: globalQuickActions,
        projectActions: projectQuickActions,
        agentActions: agentQuickActions,
      }),
    [actionsScope, globalQuickActions, projectQuickActions, agentQuickActions]
  );
  const scopeActions =
    actionsScope === 'project'
      ? projectQuickActions
      : actionsScope === 'agent'
        ? agentQuickActions
        : globalQuickActions;
  const worktreeName = selectedCell?.worktreePath ? pathBaseName(selectedCell.worktreePath) : '';
  const projectActionsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/quick-actions.yaml`
    : '';
  const agentActionsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/quick-actions-${worktreeName}.yaml`
    : '';
  const scopeDisabled = actionsScope !== 'global' && !selectedCell?.worktreePath;

  const loadCells = async (preferredSelection) => {
    setLoading(true);
    try {
      if (window.agency && window.agency.listCells) {
        const result = await window.agency.listCells();
        setCells(result);
        if (result.length && !selectedId) {
          const match = preferredSelection
            ? result.find((cell) => cell.id === preferredSelection)
            : null;
          setSelectedId(match ? match.id : result[0].id);
        }
      } else {
        setCells(defaultCells);
        if (!selectedId) setSelectedId(defaultCells[0].id);
      }
    } catch (error) {
      console.error(error);
      setCells(defaultCells);
      if (!selectedId) setSelectedId(defaultCells[0].id);
    } finally {
      setLoading(false);
    }
  };

  const loadWorktreeLinks = async ({ preserveEdits = false } = {}) => {
    if (!window.agency?.getWorktreeLinks) {
      return;
    }
    setWorktreeLinksLoading(true);
    setWorktreeLinksError('');
    try {
      const summary = await window.agency.getWorktreeLinks({
        worktreePath: selectedCell?.worktreePath,
        worktreePaths: cells.map((cell) => cell.worktreePath).filter(Boolean),
      });
      if (!preserveEdits) {
        const config = summary?.config || {};
        setWorktreeLinks(Array.isArray(config.links) ? config.links : []);
        setWorktreeLinksAuto(Boolean(config.autoLinkOnCreate));
        setWorktreeLinksDirty(false);
      }
      setWorktreeLinksCandidates(Array.isArray(summary?.candidates) ? summary.candidates : []);
      setWorktreeLinksStatusesByPath(summary?.statusesByPath || {});
      setRepoRoot(summary?.repoRoot || '');
      setWorktreeLinksConfigPath(summary?.configPath || '');
    } catch (error) {
      setWorktreeLinksError(error?.message || 'Failed to load worktree links.');
    } finally {
      setWorktreeLinksLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (window.agency?.getUiState) {
        try {
          const state = await window.agency.getUiState();
          if (state?.activeSessionByCellId && typeof state.activeSessionByCellId === 'object') {
            setActiveSessionByCellId(state.activeSessionByCellId);
          }
          if (state?.selectedId) {
            setSelectedId(state.selectedId);
          }
          await loadCells(state?.selectedId);
        } catch (error) {
          console.error(error);
          await loadCells();
        } finally {
          setUiStateLoaded(true);
        }
        return;
      }
      await loadCells();
      setUiStateLoaded(true);
    };
    bootstrap();
  }, []);

  useEffect(() => {
    const loadGlobalQuickActions = async () => {
      if (!window.agency?.getQuickActions) {
        return;
      }
      try {
        const actions = await window.agency.getQuickActions({ scope: 'global' });
        setGlobalQuickActions(Array.isArray(actions) ? actions : []);
      } catch (error) {
        setQuickActionsError(error?.message || 'Failed to load quick actions.');
      }
    };
    loadGlobalQuickActions();
  }, []);

  useEffect(() => {
    const loadScopedQuickActions = async () => {
      if (!window.agency?.getQuickActions) {
        return;
      }
      if (!selectedCell?.worktreePath) {
        setProjectQuickActions([]);
        setAgentQuickActions([]);
        return;
      }
      try {
        const [project, agent] = await Promise.all([
          window.agency.getQuickActions({
            scope: 'project',
            worktreePath: selectedCell.worktreePath,
          }),
          window.agency.getQuickActions({
            scope: 'agent',
            worktreePath: selectedCell.worktreePath,
          }),
        ]);
        setProjectQuickActions(Array.isArray(project) ? project : []);
        setAgentQuickActions(Array.isArray(agent) ? agent : []);
      } catch (error) {
        setQuickActionsError(error?.message || 'Failed to load quick actions.');
        setProjectQuickActions([]);
        setAgentQuickActions([]);
      }
    };
    loadScopedQuickActions();
  }, [selectedCell?.worktreePath]);

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

  useEffect(() => {
    loadWorktreeLinks({ preserveEdits: false });
  }, []);

  useEffect(() => {
    loadWorktreeLinks({ preserveEdits: worktreeLinksDirty });
  }, [selectedCell?.worktreePath, cells.length]);

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
  }, []);

  useEffect(() => {
    if (!selectedCell?.id) {
      return;
    }
    if (uiStateLoaded && window.agency?.setUiState) {
      window.agency.setUiState({
        selectedId: selectedCell.id,
        activeSessionByCellId,
      }).catch(() => undefined);
    }
    setTerminalMode('shell');
    setTerminalOpen(true);
  }, [selectedCell?.id, activeSessionByCellId, uiStateLoaded]);

  const handleStateChange = async (nextState) => {
    if (!selectedCell || !window.agency?.updateCellState) {
      return;
    }
    if (nextState === selectedCell.state) {
      return;
    }
    setTransitionError('');
    let nextCells = cells;
    if (window.agency?.listCells) {
      try {
        nextCells = await window.agency.listCells();
        setCells(nextCells);
      } catch (error) {
        console.error(error);
      }
    }
    const freshCell = nextCells.find((cell) => cell.id === selectedCell.id) || selectedCell;
    setPendingTransition({
      cell: freshCell,
      nextState,
      gates: freshCell.gates || [],
    });
  };

  const loadSessionsForCell = async (cell, { silent = false } = {}) => {
    if (!cell || !window.agency?.listSessions) {
      return;
    }
    if (tmuxStatus?.available === false) {
      if (!silent) {
        setSessionError(tmuxStatus.error || 'tmux is required. Install tmux and try again.');
      }
      setSessionsByCellId((current) => ({ ...current, [cell.id]: [] }));
      setActiveSessionByCellId((current) => {
        const next = { ...current };
        delete next[cell.id];
        return next;
      });
      return;
    }
    if (!silent) {
      setSessionLoading(true);
      setSessionError('');
    }
    try {
      let nextSessions = await window.agency.listSessions({ worktreePath: cell.worktreePath });
      if (nextSessions.length === 0 && window.agency?.createSession) {
        const created = await window.agency.createSession({
          cellId: cell.id,
          worktreePath: cell.worktreePath,
          name: 'Default',
        });
        nextSessions = created ? [created] : nextSessions;
      }
      setSessionsByCellId((current) => ({ ...current, [cell.id]: nextSessions }));

      const open = nextSessions.filter(
        (session) => session.status !== 'closed' && session.status !== 'detached'
      );
      const preferred = activeSessionByCellId[cell.id];
      const active =
        (preferred && open.find((session) => session.id === preferred)) ||
        open.find((session) => session.status === 'active') ||
        open[0];
      setActiveSessionByCellId((current) => {
        const next = { ...current };
        if (active && active.id) {
          next[cell.id] = active.id;
        } else {
          delete next[cell.id];
        }
        return next;
      });
    } catch (error) {
      if (!silent) {
        setSessionError(error?.message || 'Failed to load sessions.');
      }
      setSessionsByCellId((current) => ({ ...current, [cell.id]: [] }));
      setActiveSessionByCellId((current) => {
        const next = { ...current };
        delete next[cell.id];
        return next;
      });
    } finally {
      if (!silent) {
        setSessionLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!selectedCell) {
      return;
    }
    loadSessionsForCell(selectedCell);
  }, [selectedCell?.id, tmuxStatus?.available]);

  useEffect(() => {
    if (!activeSessionKey) {
      return;
    }
    if (!sessionActivityByKey[activeSessionKey]) {
      setSessionActivityByKey((current) => ({
        ...current,
        [activeSessionKey]: Date.now(),
      }));
    }
  }, [activeSessionKey, sessionActivityByKey]);

  const handleCreate = async ({ name, branch, reusePath }) => {
    if (!window.agency?.createCell) {
      return;
    }
    setLoading(true);
    try {
      const cell = await window.agency.createCell({ name, branch, reusePath });
      setShowCreate(false);
      await loadCells();
      if (cell?.id) {
        setSelectedId(cell.id);
      }
      setExplorerMode('agent');
      setTerminalMode('shell');
      setTerminalOpen(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateActionId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `action-${Date.now()}`;
  };

  const generateLinkId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `link-${Date.now()}`;
  };

  const clampFontSize = (value) => Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, value));

  const updateSessionActivity = ({ cellId, sessionId }) => {
    if (!cellId || !sessionId) {
      return;
    }
    const key = buildSessionKey(cellId, sessionId);
    setSessionActivityByKey((current) => ({ ...current, [key]: Date.now() }));
  };

  const updateFontSizeForSession = ({ cellId, sessionId, nextSize }) => {
    if (!cellId || !sessionId) {
      return;
    }
    const key = buildSessionKey(cellId, sessionId);
    setSessionFontSizeByKey((current) => ({
      ...current,
      [key]: clampFontSize(nextSize),
    }));
  };

  const updateWorktreeLinks = (updater) => {
    setWorktreeLinks((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      return next;
    });
    setWorktreeLinksDirty(true);
  };

  const persistWorktreeLinks = async () => {
    const saved = await window.agency.setWorktreeLinks({
      autoLinkOnCreate: worktreeLinksAuto,
      links: worktreeLinks,
    });
    setWorktreeLinks(Array.isArray(saved?.links) ? saved.links : []);
    setWorktreeLinksAuto(Boolean(saved?.autoLinkOnCreate));
    setWorktreeLinksDirty(false);
    return saved;
  };

  const updateScopedActions = (updater) => {
    if (actionsScope === 'project') {
      setProjectQuickActions(updater);
      return;
    }
    if (actionsScope === 'agent') {
      setAgentQuickActions(updater);
      return;
    }
    setGlobalQuickActions(updater);
  };

  const addQuickAction = () => {
    if (actionsScope !== 'global' && !selectedCell?.worktreePath) {
      setQuickActionsError('Select a Cell to edit project or agent actions.');
      return;
    }
    updateScopedActions((current) => [
      ...current,
      {
        id: generateActionId(),
        label: 'New Action',
        startCommand: '',
        resumeCommand: '',
      },
    ]);
  };

  const updateQuickAction = (id, patch) => {
    updateScopedActions((current) =>
      current.map((action) => (action.id === id ? { ...action, ...patch } : action))
    );
  };

  const overrideQuickAction = (id) => {
    const source = actionsRows.find((action) => action.id === id);
    if (!source) {
      return;
    }
    const { meta, ...payload } = source;
    updateScopedActions((current) => {
      if (current.some((action) => action.id === id)) {
        return current;
      }
      return [...current, payload];
    });
  };

  const removeQuickAction = (id) => {
    updateScopedActions((current) => current.filter((action) => action.id !== id));
  };

  const resetQuickAction = (id) => {
    updateScopedActions((current) => current.filter((action) => action.id !== id));
  };

  const runActionCommand = async ({ command, kind, label }) => {
    if (!selectedCell || !command) {
      return;
    }
    setTerminalMode('shell');
    setTerminalOpen(true);
    if (kind === 'start') {
      if (tmuxStatus?.available === false) {
        setSessionError(tmuxStatus.error || 'tmux is required. Install tmux and try again.');
        return;
      }
      if (!window.agency?.createSession) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        const created = await window.agency.createSession({
          cellId: selectedCell.id,
          worktreePath: selectedCell.worktreePath,
          name: label ? `CLI - ${label}` : 'CLI',
        });
        if (created?.id) {
          setSessionsByCellId((current) => ({
            ...current,
            [selectedCell.id]: [...(current[selectedCell.id] || []), created],
          }));
          setActiveSessionByCellId((current) => ({
            ...current,
            [selectedCell.id]: created.id,
          }));
        }
        setPendingCommand({ cellId: selectedCell.id, command });
      } catch (error) {
        setSessionError(error?.message || 'Failed to create session.');
      } finally {
        setSessionLoading(false);
      }
      return;
    }
    setPendingCommand({ cellId: selectedCell.id, command });
  };

  const addWorktreeLink = () => {
    updateWorktreeLinks((current) => [
      ...current,
      {
        id: generateLinkId(),
        label: '',
        source: '',
        target: '',
      },
    ]);
  };

  const addWorktreeLinkFromCandidate = (candidate) => {
    if (!candidate) {
      return;
    }
    updateWorktreeLinks((current) => [
      ...current,
      {
        id: generateLinkId(),
        label: candidate,
        source: candidate,
        target: candidate,
      },
    ]);
  };

  const updateWorktreeLink = (id, patch) => {
    updateWorktreeLinks((current) =>
      current.map((link) => (link.id === id ? { ...link, ...patch } : link))
    );
  };

  const removeWorktreeLink = (id) => {
    updateWorktreeLinks((current) => current.filter((link) => link.id !== id));
  };

  const saveWorktreeLinks = async () => {
    if (!window.agency?.setWorktreeLinks) {
      return;
    }
    setWorktreeLinksLoading(true);
    setWorktreeLinksError('');
    try {
      await persistWorktreeLinks();
      await loadWorktreeLinks({ preserveEdits: true });
    } catch (error) {
      setWorktreeLinksError(error?.message || 'Failed to save worktree links.');
    } finally {
      setWorktreeLinksLoading(false);
    }
  };

  const applyWorktreeLink = async (linkId, options = {}) => {
    const targetPath = options.worktreePath || selectedCell?.worktreePath;
    if (!targetPath || !window.agency?.applyWorktreeLink) {
      return;
    }
    setWorktreeLinksLoading(true);
    setWorktreeLinksError('');
    try {
      if (worktreeLinksDirty) {
        await persistWorktreeLinks();
      }
      await window.agency.applyWorktreeLink({
        worktreePath: targetPath,
        linkId,
      });
      await loadWorktreeLinks({ preserveEdits: false });
    } catch (error) {
      setWorktreeLinksError(error?.message || 'Failed to link worktree.');
    } finally {
      setWorktreeLinksLoading(false);
    }
  };

  const applyAllWorktreeLinks = async (options = {}) => {
    const targetPath = options.worktreePath || selectedCell?.worktreePath;
    if (!targetPath || !window.agency?.applyAllWorktreeLinks) {
      return;
    }
    setWorktreeLinksLoading(true);
    setWorktreeLinksError('');
    try {
      if (worktreeLinksDirty) {
        await persistWorktreeLinks();
      }
      const results = await window.agency.applyAllWorktreeLinks({
        worktreePath: targetPath,
      });
      await loadWorktreeLinks({ preserveEdits: false });
      const failures = Array.isArray(results) ? results.filter((item) => !item.ok) : [];
      if (failures.length) {
        const details = failures
          .slice(0, 3)
          .map((item) => `${item.id}: ${item.error}`)
          .join('; ');
        const suffix = failures.length > 3 ? ` (+${failures.length - 3} more)` : '';
        setWorktreeLinksError(`Link all completed with ${failures.length} failures. ${details}${suffix}`);
      }
    } catch (error) {
      setWorktreeLinksError(error?.message || 'Failed to link worktree.');
    } finally {
      setWorktreeLinksLoading(false);
    }
  };

  const saveQuickActions = async () => {
    if (!window.agency?.setQuickActions) {
      return;
    }
    if (actionsScope !== 'global' && !selectedCell?.worktreePath) {
      setQuickActionsError('Select a Cell to edit project or agent actions.');
      return;
    }
    setQuickActionsSaving(true);
    setQuickActionsError('');
    try {
      const actionsToSave = scopeActions;
      const saved = await window.agency.setQuickActions({
        scope: actionsScope,
        worktreePath: selectedCell?.worktreePath,
        actions: actionsToSave,
      });
      if (actionsScope === 'project') {
        setProjectQuickActions(Array.isArray(saved) ? saved : actionsToSave);
      } else if (actionsScope === 'agent') {
        setAgentQuickActions(Array.isArray(saved) ? saved : actionsToSave);
      } else {
        setGlobalQuickActions(Array.isArray(saved) ? saved : actionsToSave);
      }
    } catch (error) {
      setQuickActionsError(error?.message || 'Failed to save quick actions.');
    } finally {
      setQuickActionsSaving(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      
      {/* Main Workspace Area (Activity Bar + Sidebar + Editor) */}
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar activeView={activeView} onSwitchView={setActiveView} />
        
        {activeView === 'explorer' && (
          <Sidebar 
            cells={cells} 
            selectedId={selectedId} 
            onSelect={(id) => {
              setSelectedId(id);
              setExplorerMode('agent');
            }} 
            onCreate={() => setShowCreate(true)}
            explorerMode={explorerMode}
            actionsScope={actionsScope}
            onSelectActionsScope={(scope) => {
              setActionsScope(scope);
              setExplorerMode('actions');
              setQuickActionsError('');
            }}
            onSelectLinks={() => {
              setExplorerMode('links');
              setWorktreeLinksError('');
            }}
            canUseProjectScope={canUseProjectScope}
            canUseAgentScope={canUseAgentScope}
            actionSummary={{
              globalOverrides:
                projectQuickActions.length > 0 || agentQuickActions.length > 0,
              projectOverrides: projectQuickActions.length > 0,
              agentOverrides: agentQuickActions.length > 0,
              agentLabel: selectedCell?.name || 'Select Cell',
            }}
          />
        )}

        {activeView === 'explorer' && explorerMode === 'actions' ? (
          <QuickActionsView
            actions={actionsRows}
            scope={actionsScope}
            scopeDisabled={scopeDisabled}
            scopePaths={{
              project: projectActionsPath,
              agent: agentActionsPath,
            }}
            error={quickActionsError}
            saving={quickActionsSaving}
            onAddAction={addQuickAction}
            onRemoveAction={removeQuickAction}
            onOverrideAction={overrideQuickAction}
            onResetAction={resetQuickAction}
            onUpdateAction={updateQuickAction}
            onSaveActions={saveQuickActions}
          />
        ) : activeView === 'explorer' && explorerMode === 'links' ? (
          <WorktreeLinksView
            links={worktreeLinks}
            autoLinkOnCreate={worktreeLinksAuto}
            candidates={worktreeLinksCandidates}
            statusesByPath={worktreeLinksStatusesByPath}
            configPath={worktreeLinksConfigPath}
            selectedCell={selectedCell}
            cells={cells}
            repoRoot={repoRoot}
            loading={worktreeLinksLoading}
            error={worktreeLinksError}
            dirty={worktreeLinksDirty}
            onToggleAuto={(next) => {
              setWorktreeLinksAuto(next);
              setWorktreeLinksDirty(true);
            }}
            onAddLink={addWorktreeLink}
            onAddFromCandidate={addWorktreeLinkFromCandidate}
            onUpdateLink={updateWorktreeLink}
            onRemoveLink={removeWorktreeLink}
            onApplyLink={applyWorktreeLink}
            onApplyAll={applyAllWorktreeLinks}
            onSave={saveWorktreeLinks}
            onRefresh={() => loadWorktreeLinks({ preserveEdits: worktreeLinksDirty })}
          />
        ) : (
          <EditorPane 
              cell={selectedCell}
              terminalMode={terminalMode}
              terminalOpen={terminalOpen}
              sessionId={activeSessionId}
              sessions={sessions}
              sessionLoading={sessionLoading}
              sessionError={sessionError}
              quickActions={resolvedQuickActions}
              tmuxStatus={tmuxStatus}
              idleSince={lastActivityAt}
            onCreateSession={async (options = {}) => {
              if (!selectedCell || !window.agency?.createSession) {
                return;
              }
              if (tmuxStatus?.available === false) {
                setSessionError(tmuxStatus.error || 'tmux is required. Install tmux and try again.');
                return;
              }
              setSessionLoading(true);
              setSessionError('');
                try {
                  const { name } = options || {};
                  const created = await window.agency.createSession({
                    cellId: selectedCell.id,
                    worktreePath: selectedCell.worktreePath,
                    name: name || undefined,
                  });
                  setSessionsByCellId((current) => {
                    const currentSessions = current[selectedCell.id] || [];
                    const nextSessions = created ? [...currentSessions, created] : currentSessions;
                    return { ...current, [selectedCell.id]: nextSessions };
                  });
                  if (created?.id) {
                    setActiveSessionByCellId((current) => ({
                      ...current,
                      [selectedCell.id]: created.id,
                    }));
                  }
                } catch (error) {
                  setSessionError(error?.message || 'Failed to create session.');
                } finally {
                  setSessionLoading(false);
                }
              }}
              onRefreshSessions={() => loadSessionsForCell(selectedCell)}
              onSelectSession={(sessionId) => {
                if (!selectedCell) {
                  return;
                }
                setActiveSessionByCellId((current) => ({
                  ...current,
                  [selectedCell.id]: sessionId,
                }));
                updateSessionActivity({ cellId: selectedCell.id, sessionId });
              }}
              onCloseSession={async (sessionId) => {
                if (!selectedCell || !window.agency?.closeSession) {
                  return;
                }
                setSessionLoading(true);
                setSessionError('');
                try {
                  await window.agency.closeSession({
                    worktreePath: selectedCell.worktreePath,
                    sessionId,
                  });
                  await loadSessionsForCell(selectedCell);
                } catch (error) {
                  setSessionError(error?.message || 'Failed to close session.');
                } finally {
                  setSessionLoading(false);
                }
              }}
              onDetachSession={async (sessionId) => {
                if (!selectedCell || !window.agency?.detachSession) {
                  return;
                }
                setSessionLoading(true);
                setSessionError('');
                try {
                  await window.agency.detachSession({
                    worktreePath: selectedCell.worktreePath,
                    sessionId,
                  });
                  await loadSessionsForCell(selectedCell);
                } catch (error) {
                  setSessionError(error?.message || 'Failed to detach session.');
                } finally {
                  setSessionLoading(false);
                }
              }}
              onRenameSession={async (sessionId, name) => {
                if (!selectedCell || !window.agency?.renameSession) {
                  return;
                }
                setSessionLoading(true);
                setSessionError('');
                try {
                  await window.agency.renameSession({
                    worktreePath: selectedCell.worktreePath,
                    sessionId,
                    name,
                  });
                  await loadSessionsForCell(selectedCell);
                } catch (error) {
                  setSessionError(error?.message || 'Failed to rename session.');
                } finally {
                  setSessionLoading(false);
                }
              }}
              onStateChange={handleStateChange}
              onOpenTerminal={() => {
                  setTerminalMode('shell');
                  setTerminalOpen(true);
              }}
              onZoomIn={() => {
                if (!selectedCell || !activeSessionId) {
                  return;
                }
                updateFontSizeForSession({
                  cellId: selectedCell.id,
                  sessionId: activeSessionId,
                  nextSize: activeFontSize + 1,
                });
              }}
              onZoomOut={() => {
                if (!selectedCell || !activeSessionId) {
                  return;
                }
                updateFontSizeForSession({
                  cellId: selectedCell.id,
                  sessionId: activeSessionId,
                  nextSize: activeFontSize - 1,
                });
              }}
              onZoomReset={() => {
                if (!selectedCell || !activeSessionId) {
                  return;
                }
                updateFontSizeForSession({
                  cellId: selectedCell.id,
                  sessionId: activeSessionId,
                  nextSize: DEFAULT_FONT_SIZE,
                });
              }}
              onRunCommand={runActionCommand}
              pendingCommand={pendingCommand}
              onCommandSent={(payload) => {
                setPendingCommand((current) => {
                  if (!current) {
                    return current;
                  }
                  if (current.cellId !== payload?.cellId || current.command !== payload?.command) {
                    return current;
                  }
                  return null;
                });
              }}
              onSessionActivity={updateSessionActivity}
              onSessionAttached={() => {
                if (selectedCell) {
                  loadSessionsForCell(selectedCell, { silent: true });
                }
              }}
              terminalFontSize={activeFontSize}
          />
        )}
      </div>

      {/* Global Status Bar */}
      <StatusBar loading={loading} onRefresh={loadCells} tmuxStatus={tmuxStatus} />

      {/* Modals */}
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
            if (!window.agency?.listCells || !pendingTransition?.cell) {
              return;
            }
            try {
              const result = await window.agency.listCells();
              setCells(result);
              const updated = result.find((cell) => cell.id === pendingTransition.cell.id);
              if (updated) {
                setPendingTransition({
                  ...pendingTransition,
                  cell: updated,
                  gates: updated.gates || [],
                });
              }
            } catch (error) {
              console.error(error);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function CreateCellModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [reuseExisting, setReuseExisting] = useState(false);
  const [worktrees, setWorktrees] = useState([]);
  const [selectedWorktree, setSelectedWorktree] = useState('');
  const [branchPrefix, setBranchPrefix] = useState(branchPrefixes[0]);
  const selectedWorktreeInfo = worktrees.find((item) => item.path === selectedWorktree);
  const generatedBranch = name ? `${branchPrefix}/${toBranchSlug(name)}` : '';
  const needsBranch = reuseExisting && selectedWorktreeInfo && !selectedWorktreeInfo.branch;
  const canSubmit = reuseExisting
    ? Boolean(selectedWorktree) && (selectedWorktreeInfo?.branch || generatedBranch)
    : Boolean(generatedBranch);

  useEffect(() => {
    const loadWorktrees = async () => {
      if (!window.agency?.listWorktrees) {
        return;
      }
      try {
        const items = await window.agency.listWorktrees();
        setWorktrees(items);
      } catch (error) {
        console.error(error);
      }
    };
    loadWorktrees();
  }, []);

  const handleWorktreeSelect = (event) => {
    const nextPath = event.target.value;
    setSelectedWorktree(nextPath);
    const match = worktrees.find((item) => item.path === nextPath);
    if (match) {
      const branchParts = (match.branch || '').split('/');
      if (branchParts.length > 1 && branchPrefixes.includes(branchParts[0])) {
        setBranchPrefix(branchParts[0]);
        setName(branchParts.slice(1).join('/'));
      } else {
        setName(pathBaseName(match.path));
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      data-testid="create-cell-modal"
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Create New Agent</h3>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        
        <div className="space-y-5">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-input bg-transparent text-primary focus:ring-1 focus:ring-primary"
              checked={reuseExisting}
              onChange={(event) => setReuseExisting(event.target.checked)}
            />
            Link to existing git worktree
          </label>
          
          {reuseExisting ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block" htmlFor="reuse-worktree">
                Select Worktree
              </label>
              <select
                id="reuse-worktree"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedWorktree}
                onChange={handleWorktreeSelect}
              >
                <option value="">-- Choose directory --</option>
                {worktrees.map((item) => (
                  <option key={item.path} value={item.path}>
                    {item.branch || 'detached'} · {item.path}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block" htmlFor="cell-name">
              Agent Name
            </label>
            <input
              id="cell-name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. docs-updater"
              disabled={reuseExisting && selectedWorktreeInfo?.branch}
            />
          </div>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block" htmlFor="branch-prefix">
              Branch Strategy
            </label>
            <div className="flex gap-2">
                <select
                id="branch-prefix"
                className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={branchPrefix}
                onChange={(event) => setBranchPrefix(event.target.value)}
                disabled={reuseExisting && Boolean(selectedWorktreeInfo?.branch)}
                >
                {branchPrefixes.map((prefix) => (
                    <option key={prefix} value={prefix}>
                    {prefix}/
                    </option>
                ))}
                </select>
                <div className="flex-1 flex items-center px-3 text-sm text-muted-foreground border border-transparent">
                     {toBranchSlug(name) || '<name>'}
                </div>
            </div>
             <p className="mt-2 text-xs text-muted-foreground font-mono bg-muted/30 p-1.5 rounded">
              git branch: {reuseExisting && selectedWorktreeInfo?.branch
                ? selectedWorktreeInfo.branch
                : (generatedBranch || '...')}
            </p>
          </div>
          
          <div className="flex items-center justify-end gap-3 mt-8">
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canSubmit}
              onClick={() =>
                onCreate({
                  name,
                  branch: generatedBranch,
                  reusePath: reuseExisting ? selectedWorktree : undefined,
                })
              }
            >
              Create Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

function LifecycleConfirmModal({ transition, error, loading, onCancel, onConfirm, onRefresh }) {
  const { cell, nextState, gates } = transition;
  const requiresGates = ['active', 'archived'].includes(nextState);
  const failedGates = (gates || []).filter((gate) => !gate.passed);
  const canProceed = !requiresGates || failedGates.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Confirm Lifecycle Transition</h3>
            <p className="text-xs text-muted-foreground">
              {cell?.name} · {cell?.branch}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          Target state: <span className="font-semibold text-foreground">{nextState}</span>
          <span className="mx-2 text-muted-foreground/40">|</span>
          Lifecycle file will be updated after confirmation.
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gate Checks</h4>
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs text-primary hover:underline"
            >
              Recheck
            </button>
          </div>
          <div className="mt-3">
            <GateList gates={gates} emptyLabel="Gate status unavailable. Recheck to refresh." />
          </div>
          {!canProceed && requiresGates ? (
            <p className="mt-3 text-xs text-amber-300">
              Fix the failing gates before moving to {nextState}.
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={!canProceed || loading}
          >
            {loading ? 'Updating...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
