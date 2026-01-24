export const BASELINE_PROFILE_ID = 'shell';

export const BASELINE_PROFILE = {
  id: BASELINE_PROFILE_ID,
  label: 'Shell',
  startCommand: '',
  resumeCommand: '',
  locked: true,
  kind: 'shell',
  shortcuts: {
    bindings: [],
  },
};

const normalizeId = (value, fallback) => {
  const id = String(value || '').trim();
  return id || fallback;
};

const mergeById = (...scopes) => {
  const merged = [];
  const indexById = new Map();
  scopes.flat().forEach((item, index) => {
    if (!item) {
      return;
    }
    const id = normalizeId(item.id, `item-${index}`);
    const normalized = { ...item, id };
    if (indexById.has(id)) {
      merged[indexById.get(id)] = { ...merged[indexById.get(id)], ...normalized };
    } else {
      indexById.set(id, merged.length);
      merged.push(normalized);
    }
  });
  return merged;
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

const getProfileBindings = (profiles, profileId) => {
  if (!profileId) {
    return [];
  }
  const match = (profiles || []).find((profile) => profile?.id === profileId);
  return Array.isArray(match?.shortcuts?.bindings) ? match.shortcuts.bindings : [];
};

const ensureBaseline = (profiles) => {
  const list = Array.isArray(profiles) ? profiles.map((profile) => ({ ...profile })) : [];
  const index = list.findIndex((profile) => profile.id === BASELINE_PROFILE_ID);
  if (index === -1) {
    return [BASELINE_PROFILE, ...list];
  }
  list[index] = {
    ...BASELINE_PROFILE,
    ...list[index],
    locked: true,
  };
  return list;
};

export const mergeProfiles = (...scopes) => ensureBaseline(mergeById(...scopes));

export const mergeBindings = (...scopes) => mergeById(...scopes);

export const buildProfileRows = ({ scope, globalProfiles, projectProfiles, agentProfiles }) => {
  const globalMap = indexById(globalProfiles);
  const projectMap = indexById(projectProfiles);
  const agentMap = indexById(agentProfiles);
  const effectiveProfiles =
    scope === 'global'
      ? globalProfiles
      : scope === 'project'
        ? mergeProfiles(globalProfiles, projectProfiles)
        : mergeProfiles(globalProfiles, projectProfiles, agentProfiles);
  return (effectiveProfiles || []).map((profile) => {
    const id = profile.id;
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
      ...profile,
      locked: Boolean(profile.locked || id === BASELINE_PROFILE_ID),
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

export const buildBindingRows = ({ scope, globalBindings, projectBindings, agentBindings }) => {
  const globalMap = indexById(globalBindings);
  const projectMap = indexById(projectBindings);
  const agentMap = indexById(agentBindings);
  const effectiveBindings =
    scope === 'global'
      ? globalBindings
      : scope === 'project'
        ? mergeBindings(globalBindings, projectBindings)
        : mergeBindings(globalBindings, projectBindings, agentBindings);
  return (effectiveBindings || []).map((binding) => {
    const id = binding.id;
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
      ...binding,
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

export const mergeProfileBindings = ({ profileIds, globalProfiles, projectProfiles, agentProfiles }) => {
  const map = new Map();
  (profileIds || []).forEach((profileId) => {
    const globalBindings = getProfileBindings(globalProfiles, profileId);
    const projectBindings = getProfileBindings(projectProfiles, profileId);
    const agentBindings = getProfileBindings(agentProfiles, profileId);
    map.set(profileId, mergeBindings(globalBindings, projectBindings, agentBindings));
  });
  return map;
};

export const buildBindingRowsByProfile = ({
  scope,
  profileIds,
  globalProfiles,
  projectProfiles,
  agentProfiles,
}) => {
  const rows = new Map();
  (profileIds || []).forEach((profileId) => {
    rows.set(
      profileId,
      buildBindingRows({
        scope,
        globalBindings: getProfileBindings(globalProfiles, profileId),
        projectBindings: getProfileBindings(projectProfiles, profileId),
        agentBindings: getProfileBindings(agentProfiles, profileId),
      })
    );
  });
  return rows;
};
