// @ts-nocheck
const path = require('path');

function normalizePathKey(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  try {
    return path.resolve(raw);
  } catch (_error) {
    return raw;
  }
}

function normalizeRunDedupeKeys(value) {
  const list = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      list
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))
    )
  );
}

function computeHarnessRunDedupeKeys({ runner }) {
  const normalizedRunner =
    runner && typeof runner === 'object' ? runner : {};
  const steps = Array.isArray(normalizedRunner.steps) ? normalizedRunner.steps : [];
  const keys = [];
  steps.forEach((step) => {
    const kind = String(step?.kind || '').trim().toLowerCase();
    if (kind !== 'create_agent') {
      return;
    }
    const strategy = String(step?.agent?.strategy || '').trim().toLowerCase();
    const skillPackId = String(step?.skillPackId || '').trim().toLowerCase();
    if (strategy !== 'tool_native_fork' && skillPackId !== 'session.tool-native-fork') {
      return;
    }
    const sessionRuntime = step?.agent?.sessionRuntime || {};
    const worktreePath = normalizePathKey(sessionRuntime.worktreePath);
    const cellId = String(sessionRuntime.cellId || '').trim();
    const sourceSessionId = String(
      sessionRuntime.sourceSessionId || sessionRuntime.sessionId || ''
    ).trim();
    if (!worktreePath || !cellId || !sourceSessionId) {
      return;
    }
    keys.push(`session.tool-native-fork:${worktreePath}:${cellId}:${sourceSessionId}`);
  });
  return normalizeRunDedupeKeys(keys);
}

function createHarnessRunDedupeIndex({ store, isTerminalStatus }) {
  const activeRunIdsByDedupeKey = new Map();

  async function findActiveRunByKey(dedupeKey) {
    const normalizedKey = String(dedupeKey || '').trim();
    if (!normalizedKey) {
      return null;
    }
    const runId = activeRunIdsByDedupeKey.get(normalizedKey);
    if (!runId) {
      return null;
    }
    const run = await store.read(runId);
    if (!run || isTerminalStatus(run.status)) {
      activeRunIdsByDedupeKey.delete(normalizedKey);
      return null;
    }
    return run;
  }

  function register(run) {
    const runId = String(run?.runId || '').trim();
    if (!runId) {
      return;
    }
    normalizeRunDedupeKeys(run?.dedupeKeys).forEach((key) => {
      activeRunIdsByDedupeKey.set(key, runId);
    });
  }

  function unregister(run) {
    const runId = String(run?.runId || '').trim();
    if (!runId) {
      return;
    }
    normalizeRunDedupeKeys(run?.dedupeKeys).forEach((key) => {
      if (activeRunIdsByDedupeKey.get(key) === runId) {
        activeRunIdsByDedupeKey.delete(key);
      }
    });
  }

  return {
    findActiveRunByKey,
    register,
    unregister,
  };
}

module.exports = {
  computeHarnessRunDedupeKeys,
  createHarnessRunDedupeIndex,
  normalizeRunDedupeKeys,
};
