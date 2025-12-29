export const gateStages = ['draft', 'active', 'archived'];

export const normalizeGateConfig = (config) => ({
  draft: Array.isArray(config?.draft) ? config.draft : [],
  active: Array.isArray(config?.active) ? config.active : [],
  archived: Array.isArray(config?.archived) ? config.archived : [],
});

const mergeGates = (...scopes) => {
  const merged = [];
  const indexById = new Map();
  scopes.flat().forEach((gate, index) => {
    if (!gate) {
      return;
    }
    const id = gate?.id || `gate-${index}`;
    const normalized = { ...gate, id };
    if (indexById.has(id)) {
      merged[indexById.get(id)] = { ...merged[indexById.get(id)], ...normalized };
    } else {
      indexById.set(id, merged.length);
      merged.push(normalized);
    }
  });
  return merged;
};

const indexGates = (gates) => {
  const map = new Map();
  (gates || []).forEach((gate) => {
    if (gate?.id) {
      map.set(gate.id, gate);
    }
  });
  return map;
};

export const buildGateRows = ({ scope, stage, globalConfig, projectConfig, agentConfig }) => {
  const globalGates = normalizeGateConfig(globalConfig)[stage] || [];
  const projectGates = normalizeGateConfig(projectConfig)[stage] || [];
  const agentGates = normalizeGateConfig(agentConfig)[stage] || [];
  const globalMap = indexGates(globalGates);
  const projectMap = indexGates(projectGates);
  const agentMap = indexGates(agentGates);
  const effectiveGates =
    scope === 'global'
      ? globalGates
      : scope === 'project'
        ? mergeGates(globalGates, projectGates)
        : mergeGates(globalGates, projectGates, agentGates);
  return (effectiveGates || []).map((gate) => {
    const id = gate.id;
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
      ...gate,
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

export const gateConfigHasEntries = (config) => {
  const normalized = normalizeGateConfig(config);
  return gateStages.some((stage) => normalized[stage]?.length);
};
