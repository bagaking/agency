export const APP_SHORTCUTS_CATALOG = [
  {
    id: 'capture.screenshot',
    label: 'Screenshot Capture',
    description: 'Capture a screenshot and route it to your memo inbox.',
    defaultShortcut: 'CmdOrCtrl+Shift+5',
    defaultEnabled: true,
    category: 'Capture',
  },
  {
    id: 'memo.voice',
    label: 'Quick Voice',
    description: 'Start voice capture for a flash memo from anywhere.',
    defaultShortcut: '',
    defaultEnabled: false,
    category: 'Memo',
  },
  {
    id: 'view.agents',
    label: 'Agents View',
    description: 'Jump to the Agents workspace.',
    defaultShortcut: 'CmdOrCtrl+Shift+A',
    defaultEnabled: true,
    category: 'Navigation',
  },
  {
    id: 'view.explorer',
    label: 'Explorer View',
    description: 'Jump to the Explorer workspace.',
    defaultShortcut: 'CmdOrCtrl+Shift+E',
    defaultEnabled: true,
    category: 'Navigation',
  },
];

const normalizeId = (value, fallback) => {
  const id = String(value || '').trim();
  return id || fallback;
};

const indexById = (items) => {
  const map = new Map();
  (items || []).forEach((item) => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });
  return map;
};

export const buildDefaultActions = () =>
  APP_SHORTCUTS_CATALOG.map((entry, index) => ({
    id: normalizeId(entry.id, `action-${index}`),
    enabled: Boolean(entry.defaultEnabled),
    shortcut: String(entry.defaultShortcut || ''),
  }));

export const mergeActions = (...scopes) => {
  const merged = [];
  const indexMap = new Map();
  scopes.flat().forEach((item, index) => {
    if (!item) {
      return;
    }
    const id = normalizeId(item.id, `action-${index}`);
    const normalized = { ...item, id };
    if (indexMap.has(id)) {
      merged[indexMap.get(id)] = { ...merged[indexMap.get(id)], ...normalized };
    } else {
      indexMap.set(id, merged.length);
      merged.push(normalized);
    }
  });
  return merged;
};

export const buildActionRows = ({ scope, globalActions, projectActions, agentActions }) => {
  const defaults = buildDefaultActions();
  const normalizedGlobal = mergeActions(defaults, globalActions || []);
  const globalMap = new Map([
    ...indexById(defaults),
    ...indexById(globalActions || []),
  ]);
  const projectMap = indexById(projectActions || []);
  const agentMap = indexById(agentActions || []);

  const effectiveActions =
    scope === 'global'
      ? normalizedGlobal
      : scope === 'project'
        ? mergeActions(normalizedGlobal, projectActions || [])
        : mergeActions(normalizedGlobal, projectActions || [], agentActions || []);

  const catalogMap = new Map(APP_SHORTCUTS_CATALOG.map((entry) => [entry.id, entry]));

  return (effectiveActions || []).map((action, index) => {
    const id = normalizeId(action.id, `action-${index}`);
    const hasGlobal = globalMap.has(id) || scope === 'global';
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
    const catalog = catalogMap.get(id);
    return {
      id,
      enabled: Boolean(action.enabled),
      shortcut: String(action.shortcut || ''),
      label: catalog?.label || id,
      description: catalog?.description || '',
      category: catalog?.category || '',
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

export const getCatalogEntry = (id) =>
  APP_SHORTCUTS_CATALOG.find((entry) => entry.id === id) || null;
