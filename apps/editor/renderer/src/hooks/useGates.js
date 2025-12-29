import { useEffect, useMemo, useState } from 'react';
import {
  buildGateRows,
  gateConfigHasEntries,
  gateStages,
  normalizeGateConfig,
} from '../utils/gates.js';

const pathBaseName = (value) => value.split('/').filter(Boolean).pop() || value;

const generateGateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `gate-${Date.now()}`;
};

export function useGates({ selectedCell, gateScope, gateStage, repoRoot }) {
  const [globalGates, setGlobalGates] = useState(() => normalizeGateConfig({}));
  const [projectGates, setProjectGates] = useState(() => normalizeGateConfig({}));
  const [agentGates, setAgentGates] = useState(() => normalizeGateConfig({}));
  const [gatesError, setGatesError] = useState('');
  const [gatesSaving, setGatesSaving] = useState(false);
  const [gateResultsByCellId, setGateResultsByCellId] = useState({});
  const [gatesCheckingByCellId, setGatesCheckingByCellId] = useState({});

  useEffect(() => {
    const loadGlobalGates = async () => {
      if (!window.agency?.getGates) {
        return;
      }
      try {
        const gates = await window.agency.getGates({ scope: 'global' });
        setGlobalGates(normalizeGateConfig(gates || {}));
      } catch (error) {
        setGatesError(error?.message || 'Failed to load gates.');
      }
    };
    loadGlobalGates();
  }, []);

  useEffect(() => {
    const loadScopedGates = async () => {
      if (!window.agency?.getGates) {
        return;
      }
      if (!selectedCell?.worktreePath) {
        setProjectGates(normalizeGateConfig({}));
        setAgentGates(normalizeGateConfig({}));
        return;
      }
      try {
        const [project, agent] = await Promise.all([
          window.agency.getGates({
            scope: 'project',
            worktreePath: selectedCell.worktreePath,
          }),
          window.agency.getGates({
            scope: 'agent',
            worktreePath: selectedCell.worktreePath,
          }),
        ]);
        setProjectGates(normalizeGateConfig(project || {}));
        setAgentGates(normalizeGateConfig(agent || {}));
      } catch (error) {
        setGatesError(error?.message || 'Failed to load gates.');
        setProjectGates(normalizeGateConfig({}));
        setAgentGates(normalizeGateConfig({}));
      }
    };
    loadScopedGates();
  }, [selectedCell?.worktreePath]);

  const gateRows = useMemo(
    () =>
      buildGateRows({
        scope: gateScope,
        stage: gateStage,
        globalConfig: globalGates,
        projectConfig: projectGates,
        agentConfig: agentGates,
      }),
    [gateScope, gateStage, globalGates, projectGates, agentGates]
  );

  const scopeGates =
    gateScope === 'project'
      ? normalizeGateConfig(projectGates)[gateStage]
      : gateScope === 'agent'
        ? normalizeGateConfig(agentGates)[gateStage]
        : normalizeGateConfig(globalGates)[gateStage];

  const worktreeName = selectedCell?.worktreePath ? pathBaseName(selectedCell.worktreePath) : '';
  const projectGatesPath = repoRoot ? `${repoRoot}/.agency/gates.yaml` : '';
  const agentGatesPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/gates-${worktreeName}.yaml`
    : '';
  const gateScopeDisabled = gateScope !== 'global' && !selectedCell?.worktreePath;

  const updateGateResults = (cellId, stage, results) => {
    if (!cellId || !stage) {
      return;
    }
    setGateResultsByCellId((current) => ({
      ...current,
      [cellId]: {
        ...(current[cellId] || {}),
        [stage]: results,
      },
    }));
  };

  const updateGatesChecking = (cellId, stage, isChecking) => {
    if (!cellId || !stage) {
      return;
    }
    setGatesCheckingByCellId((current) => ({
      ...current,
      [cellId]: {
        ...(current[cellId] || {}),
        [stage]: isChecking,
      },
    }));
  };

  const checkGatesForCell = async ({ cell, stage, silent = true }) => {
    if (!cell?.worktreePath || !window.agency?.checkGates) {
      return [];
    }
    const resolvedStage = gateStages.includes(stage) ? stage : 'active';
    updateGatesChecking(cell.id, resolvedStage, true);
    try {
      const results = await window.agency.checkGates({
        worktreePath: cell.worktreePath,
        stage: resolvedStage,
      });
      const normalized = Array.isArray(results) ? results : [];
      updateGateResults(cell.id, resolvedStage, normalized);
      return normalized;
    } catch (error) {
      if (!silent) {
        setGatesError(error?.message || 'Failed to run gates.');
      }
      const fallback = [
        {
          id: 'gate-check',
          label: 'Gate check failed',
          passed: false,
          detail: error?.message || 'Unable to run gate commands.',
        },
      ];
      updateGateResults(cell.id, resolvedStage, fallback);
      return fallback;
    } finally {
      updateGatesChecking(cell.id, resolvedStage, false);
    }
  };

  useEffect(() => {
    if (!selectedCell?.worktreePath) {
      return;
    }
    const stage = selectedCell.state === 'archived' ? 'archived' : 'active';
    checkGatesForCell({ cell: selectedCell, stage, silent: true });
  }, [selectedCell?.id, selectedCell?.worktreePath]);

  const updateScopedGates = (updater) => {
    const applyUpdate = (config) => {
      const normalized = normalizeGateConfig(config);
      const nextStage = typeof updater === 'function' ? updater(normalized[gateStage]) : updater;
      return { ...normalized, [gateStage]: nextStage };
    };
    if (gateScope === 'project') {
      setProjectGates((current) => applyUpdate(current));
      return;
    }
    if (gateScope === 'agent') {
      setAgentGates((current) => applyUpdate(current));
      return;
    }
    setGlobalGates((current) => applyUpdate(current));
  };

  const addGate = () => {
    if (gateScope !== 'global' && !selectedCell?.worktreePath) {
      setGatesError('Select a Cell to edit project or agent gates.');
      return;
    }
    updateScopedGates((current) => [
      ...current,
      {
        id: generateGateId(),
        label: 'New Gate',
        commands: [],
      },
    ]);
  };

  const updateGate = (id, patch) => {
    updateScopedGates((current) => current.map((gate) => (gate.id === id ? { ...gate, ...patch } : gate)));
  };

  const overrideGate = (id) => {
    const source = gateRows.find((gate) => gate.id === id);
    if (!source) {
      return;
    }
    const { meta, ...payload } = source;
    updateScopedGates((current) => {
      if (current.some((gate) => gate.id === id)) {
        return current;
      }
      return [...current, payload];
    });
  };

  const removeGate = (id) => {
    updateScopedGates((current) => current.filter((gate) => gate.id !== id));
  };

  const resetGate = (id) => {
    updateScopedGates((current) => current.filter((gate) => gate.id !== id));
  };

  const saveGates = async () => {
    if (!window.agency?.setGates) {
      return;
    }
    if (gateScope !== 'global' && !selectedCell?.worktreePath) {
      setGatesError('Select a Cell to edit project or agent gates.');
      return;
    }
    setGatesSaving(true);
    setGatesError('');
    try {
      const gatesToSave =
        gateScope === 'project'
          ? normalizeGateConfig(projectGates)
          : gateScope === 'agent'
            ? normalizeGateConfig(agentGates)
            : normalizeGateConfig(globalGates);
      const saved = await window.agency.setGates({
        scope: gateScope,
        worktreePath: selectedCell?.worktreePath,
        gates: gatesToSave,
      });
      const normalized = normalizeGateConfig(saved || gatesToSave);
      if (gateScope === 'project') {
        setProjectGates(normalized);
      } else if (gateScope === 'agent') {
        setAgentGates(normalized);
      } else {
        setGlobalGates(normalized);
      }
    } catch (error) {
      setGatesError(error?.message || 'Failed to save gates.');
    } finally {
      setGatesSaving(false);
    }
  };

  const gateSummary = {
    globalOverrides: gateConfigHasEntries(projectGates) || gateConfigHasEntries(agentGates),
    projectOverrides: gateConfigHasEntries(projectGates),
    agentOverrides: gateConfigHasEntries(agentGates),
    agentLabel: selectedCell?.name || 'Select Cell',
  };

  const clearGatesError = () => setGatesError('');

  return {
    gateRows,
    scopeGates,
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
  };
}
