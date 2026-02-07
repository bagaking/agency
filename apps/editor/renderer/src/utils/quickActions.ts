export const mergeQuickActions = (...scopes) => {
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

export const buildActionRows = ({ scope, globalActions, projectActions, agentActions }) => {
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
