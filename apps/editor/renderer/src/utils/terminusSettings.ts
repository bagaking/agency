export const BASELINE_PROFILE_ID = 'shell';
export const DEFAULT_PROFILE_FORK = {
  enabled: false,
  driver: '',
  launchTemplate: '',
  sourceIdleMs: 1500,
  forkAckTimeoutMs: 15000,
  childReadyTimeoutMs: 20000,
};

const normalizeForkNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeProfileFork = (fork) => ({
  enabled: Boolean(fork?.enabled),
  driver: String(fork?.driver || '').trim(),
  launchTemplate: String(fork?.launchTemplate || '').trim(),
  sourceIdleMs: normalizeForkNumber(fork?.sourceIdleMs, DEFAULT_PROFILE_FORK.sourceIdleMs),
  forkAckTimeoutMs: normalizeForkNumber(
    fork?.forkAckTimeoutMs,
    DEFAULT_PROFILE_FORK.forkAckTimeoutMs
  ),
  childReadyTimeoutMs: normalizeForkNumber(
    fork?.childReadyTimeoutMs,
    DEFAULT_PROFILE_FORK.childReadyTimeoutMs
  ),
});

export const BASELINE_PROFILE = {
  id: BASELINE_PROFILE_ID,
  label: 'Shell',
  startCommand: '',
  resumeCommand: '',
  subcommands: [],
  locked: true,
  kind: 'shell',
  fork: DEFAULT_PROFILE_FORK,
  shortcuts: {
    bindings: [],
  },
};

const normalizeId = (value, fallback) => {
  const id = String(value || '').trim();
  return id || fallback;
};

const LEGACY_RESUME_SUBCOMMAND_ID = '__legacy_resume__';

const normalizeCommand = (value) => String(value || '').trim();

const normalizeSubcommand = (entry, index) => {
  const command = normalizeCommand(entry?.command);
  if (!command) {
    return null;
  }
  return {
    id: normalizeId(entry?.id, `subcommand-${index + 1}`),
    label: String(entry?.label || '').trim() || `Sub ${index + 1}`,
    command,
  };
};

export const normalizeProfileSubcommands = (subcommands) => {
  if (!Array.isArray(subcommands)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  subcommands.forEach((entry, index) => {
    const item = normalizeSubcommand(entry, index);
    if (!item) {
      return;
    }
    const dedupeKey = `${item.label}::${item.command}`;
    if (seen.has(dedupeKey)) {
      return;
    }
    seen.add(dedupeKey);
    normalized.push(item);
  });
  return normalized;
};

export const getProfileSubcommands = (profile) => {
  const subcommands = normalizeProfileSubcommands(profile?.subcommands);
  const resumeCommand = normalizeCommand(profile?.resumeCommand);
  if (resumeCommand && !subcommands.some((item) => item.command === resumeCommand)) {
    subcommands.unshift({
      id: LEGACY_RESUME_SUBCOMMAND_ID,
      label: 'Resume',
      command: resumeCommand,
    });
  }
  return subcommands;
};

export const deriveLegacyResumeCommand = (subcommands) => {
  const normalized = normalizeProfileSubcommands(subcommands);
  const resume = normalized.find(
    (item) => item.id === LEGACY_RESUME_SUBCOMMAND_ID || /^resume$/i.test(item.label)
  );
  return resume?.command || '';
};

export const buildProfileCreateActions = (profile) => {
  const profileLabel = profile?.label || profile?.id || 'Profile';
  const profileId = normalizeId(profile?.id, 'profile');
  const actions = [];
  const startCommand = normalizeCommand(profile?.startCommand);

  if (startCommand) {
    actions.push({
      key: `${profileId}:start`,
      mode: 'start',
      badge: 'Start',
      label: 'Start',
      command: startCommand,
      profileLabel,
      subcommandId: null,
    });
  }

  getProfileSubcommands(profile).forEach((subcommand, index) => {
    const subcommandId = normalizeId(subcommand.id, `subcommand-${index + 1}`);
    const subcommandLabel = String(subcommand.label || '').trim() || `Sub ${index + 1}`;
    actions.push({
      key: `${profileId}:subcommand:${subcommandId}`,
      mode:
        subcommandId === LEGACY_RESUME_SUBCOMMAND_ID || /^resume$/i.test(subcommandLabel)
          ? 'resume'
          : 'subcommand',
      badge: subcommandLabel,
      label: subcommandLabel,
      command: subcommand.command,
      profileLabel,
      subcommandId,
    });
  });

  return actions;
};

export const hasProfileLaunchCommands = (profile) => buildProfileCreateActions(profile).length > 0;

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
    subcommands: normalizeProfileSubcommands(list[index]?.subcommands),
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
      subcommands: normalizeProfileSubcommands(profile?.subcommands),
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
