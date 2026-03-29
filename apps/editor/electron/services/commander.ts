const crypto = require('crypto');

const {
  COMMANDER_ACTION_IDS,
  COMMANDER_PROVIDER_ID,
  getCommanderActionConfig,
} = require('../../shared/commanderCore') as {
  COMMANDER_ACTION_IDS: {
    smartFork: 'smart_fork';
    smartName: 'smart_name';
  };
  COMMANDER_PROVIDER_ID: string;
  getCommanderActionConfig: (actionId: 'smart_fork' | 'smart_name') => {
    id: string;
    callerId: string;
    goal: {
      type: string;
      title: string;
      instruction: string;
    };
    runner: {
      stepId: string;
      stepKind: 'create_agent' | 'agent_task';
      stepTitle: string;
      skillPackId: string;
      strategy: string;
      requestedCapabilities: string[];
    };
  } | null;
};
const {
  getCommanderStatus: getCommanderReadinessStatus,
} = require('./commanderStatus') as {
  getCommanderStatus: (input?: {
    worktreePath?: string;
    forceRefresh?: boolean;
  }) => Promise<Record<string, any>>;
};
const {
  inspectSessionRuntime,
} = require('./sessionRuntimeAtoms') as {
  inspectSessionRuntime: (payload?: Record<string, any>) => Promise<Record<string, any>>;
};
const {
  getResolvedTerminusSettings,
} = require('./terminusSettings') as {
  getResolvedTerminusSettings: (input: { worktreePath: string }) => Promise<{ profiles?: unknown[] } | null>;
};
const {
  buildPreparedToolNativeForkContext,
  createSessionToolNativeForkSkillPack,
} = require('./mainAgentHarness/skillPacks/sessionToolNativeFork') as {
  buildPreparedToolNativeForkContext: (input: {
    payload: Record<string, any>;
    sourceSession?: Record<string, any> | null;
    sourceRuntime?: Record<string, any> | null;
    profiles?: Record<string, any>[];
  }) => Record<string, any>;
  createSessionToolNativeForkSkillPack: () => {
    buildDeterministicDecision: (input: {
      preparedContext?: Record<string, any>;
    }) => Record<string, any>;
  };
};
const {
  startMainAgentHarnessRun,
} = require('./mainAgentHarness') as {
  startMainAgentHarnessRun: (
    payload: Record<string, any>,
    context?: Record<string, any>
  ) => Promise<Record<string, any>>;
};

type CommanderActionId = 'smart_fork' | 'smart_name';

const DEFAULT_ACTION_STATUS = Object.freeze({
  visible: false,
  enabled: false,
  reason: '',
  checkedAt: '',
  mode: '',
});

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function createClientRequestId(prefix: string): string {
  const suffix = crypto.randomUUID
    ? crypto.randomUUID().split('-')[0]
    : Math.random().toString(16).slice(2, 10);
  return `${prefix}-${Date.now()}-${suffix}`;
}

function createUserError(message: string, code = 'USER_ERROR') {
  const error = new Error(message) as Error & {
    code?: string;
  };
  error.code = code;
  return error;
}

function normalizeCommanderActionId(value: unknown): CommanderActionId {
  const normalized = normalizeText(value).toLowerCase();
  if (
    normalized !== COMMANDER_ACTION_IDS.smartFork &&
    normalized !== COMMANDER_ACTION_IDS.smartName
  ) {
    throw createUserError(`Unsupported Commander action: ${normalized || 'unknown'}.`);
  }
  return normalized as CommanderActionId;
}

function createCommanderActionStatus(overrides: Record<string, any> = {}) {
  return {
    ...DEFAULT_ACTION_STATUS,
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

function buildCommanderSessionRuntime({
  worktreePath,
  cellId,
  cellName,
  cellBranch,
  sessionId,
  sessionName,
}: {
  worktreePath: string;
  cellId: string;
  cellName?: string;
  cellBranch?: string;
  sessionId: string;
  sessionName?: string;
}) {
  return {
    worktreePath,
    cellId,
    cellName: normalizeText(cellName),
    cellBranch: normalizeText(cellBranch),
    sessionId,
    ...(normalizeText(sessionName) ? { sessionName: normalizeText(sessionName) } : {}),
  };
}

function buildCommanderHarnessPayload(payload: Record<string, any> = {}) {
  const actionId = normalizeCommanderActionId(payload?.actionId);
  const config = getCommanderActionConfig(actionId);
  if (!config) {
    throw createUserError(`Commander action is not configured: ${actionId}.`);
  }

  const worktreePath = normalizeText(payload?.worktreePath);
  const cellId = normalizeText(payload?.cellId);
  const sessionId = normalizeText(payload?.sessionId);
  if (!worktreePath) {
    throw createUserError('Commander action requires worktreePath.');
  }
  if (!cellId) {
    throw createUserError('Commander action requires cellId.');
  }
  if (!sessionId) {
    throw createUserError('Commander action requires sessionId.');
  }

  const sessionRuntime = buildCommanderSessionRuntime({
    worktreePath,
    cellId,
    cellName: payload?.cellName,
    cellBranch: payload?.cellBranch,
    sessionId,
    sessionName: payload?.sessionName,
  });

  const step = {
    id: config.runner.stepId,
    kind: config.runner.stepKind,
    title: config.runner.stepTitle,
    skillPackId: config.runner.skillPackId,
    agent: {
      strategy: config.runner.strategy,
      sessionRuntime,
    },
  } as Record<string, any>;

  return {
    clientRequestId:
      normalizeText(payload?.clientRequestId) ||
      createClientRequestId(actionId === COMMANDER_ACTION_IDS.smartFork ? 'fork' : 'smart-name'),
    sourceSurface: normalizeText(payload?.sourceSurface) || 'agent-cells',
    callerType: normalizeText(payload?.callerType) || 'renderer',
    callerId: config.callerId,
    goal: {
      ...config.goal,
    },
    requestedCapabilities: config.runner.requestedCapabilities.slice(),
    contextRefs: [
      {
        type: 'cell',
        cellId,
        worktreePath,
      },
      {
        type: 'session',
        sessionId,
      },
    ],
    runner: {
      adapterId: normalizeText(payload?.adapterId) || 'agent_backed',
      providerId: normalizeText(payload?.providerId) || COMMANDER_PROVIDER_ID,
      steps: [step],
    },
  };
}

async function resolveSmartForkAvailability(payload: Record<string, any> = {}) {
  const worktreePath = normalizeText(payload?.worktreePath);
  const sessionId = normalizeText(payload?.sessionId);
  const cellId = normalizeText(payload?.cellId);
  if (!worktreePath || !sessionId || !cellId) {
    return createCommanderActionStatus({
      reason: 'Smart Fork requires a concrete cell/session context.',
    });
  }

  try {
    const inspection = await inspectSessionRuntime({
      worktreePath,
      sessionId,
      sourceSurface: normalizeText(payload?.sourceSurface) || 'agent-cells',
      callerType: 'host',
      callerId: 'commander-smart-fork-availability',
    });
    const settings = await getResolvedTerminusSettings({ worktreePath });
    const profiles = Array.isArray(settings?.profiles)
      ? (settings.profiles as Record<string, any>[])
      : [];
    const preparedContext = buildPreparedToolNativeForkContext({
      payload: buildCommanderSessionRuntime({
        worktreePath,
        cellId,
        cellName: payload?.cellName,
        cellBranch: payload?.cellBranch,
        sessionId,
      }),
      sourceSession: inspection?.session || null,
      sourceRuntime: inspection?.runtime || null,
      profiles,
    });
    const skillPack = createSessionToolNativeForkSkillPack();
    const decision = skillPack.buildDeterministicDecision({
      preparedContext,
    });
    const mode = normalizeText(decision?.mode).toLowerCase();
    if (mode === 'fail') {
      return createCommanderActionStatus({
        reason:
          normalizeText(decision?.failure?.message) ||
          'Smart Fork is not supported for the current session.',
        mode,
      });
    }
    return createCommanderActionStatus({
      visible: true,
      enabled: true,
      reason: '',
      mode,
    });
  } catch (error: any) {
    return createCommanderActionStatus({
      reason:
        normalizeText(error?.message) ||
        'Failed to inspect Smart Fork suitability.',
    });
  }
}

async function resolveCommanderActionStatuses(
  readiness: Record<string, any>,
  payload: Record<string, any> = {}
) {
  const checkedAt = readiness?.checkedAt || new Date().toISOString();
  const baseUnavailable = {
    visible: false,
    enabled: false,
    reason:
      normalizeText(readiness?.reason) ||
      'Commander backend is not ready for provider-backed actions.',
    checkedAt,
    mode: '',
  };
  if (!readiness?.ready) {
    return {
      [COMMANDER_ACTION_IDS.smartFork]: { ...baseUnavailable },
      [COMMANDER_ACTION_IDS.smartName]: { ...baseUnavailable },
    };
  }

  const smartNameStatus = createCommanderActionStatus({
    visible: true,
    enabled: true,
    checkedAt,
  });
  const smartForkStatus = await resolveSmartForkAvailability({
    ...payload,
  });
  return {
    [COMMANDER_ACTION_IDS.smartFork]: {
      ...smartForkStatus,
      checkedAt,
    },
    [COMMANDER_ACTION_IDS.smartName]: {
      ...smartNameStatus,
      checkedAt,
    },
  };
}

function createCommanderService({
  getCommanderStatus = getCommanderReadinessStatus,
  startHarnessRun = startMainAgentHarnessRun,
  resolveActionStatuses = resolveCommanderActionStatuses,
}: {
  getCommanderStatus?: (input?: {
    worktreePath?: string;
    forceRefresh?: boolean;
  }) => Promise<Record<string, any>>;
  startHarnessRun?: (
    payload: Record<string, any>,
    context?: Record<string, any>
  ) => Promise<Record<string, any>>;
  resolveActionStatuses?: (
    readiness: Record<string, any>,
    payload?: Record<string, any>
  ) => Promise<Record<string, any>>;
} = {}) {
  const getCommanderStatusWithActions = async (
    input: Record<string, any> = {}
  ): Promise<Record<string, any>> => {
    const readiness = await getCommanderStatus(input || {});
    const actions = await resolveActionStatuses(readiness, input || {});
    return {
      ...(readiness || {}),
      actions,
    };
  };

  return {
    getCommanderStatus: getCommanderStatusWithActions,
    async performCommanderAction(
      payload: Record<string, any> = {},
      context: Record<string, any> = {}
    ) {
      const harnessPayload = buildCommanderHarnessPayload(payload || {});
      const status = await getCommanderStatusWithActions({
        worktreePath: harnessPayload?.contextRefs?.[0]?.worktreePath || '',
        cellId: payload?.cellId,
        cellName: payload?.cellName,
        cellBranch: payload?.cellBranch,
        sessionId: payload?.sessionId,
        sourceSurface: payload?.sourceSurface,
        forceRefresh: true,
      });
      const actionId = normalizeCommanderActionId(payload?.actionId);
      const actionStatus = status?.actions?.[actionId] || DEFAULT_ACTION_STATUS;
      if (!status?.ready || !actionStatus?.enabled) {
        throw createUserError(
          normalizeText(actionStatus?.reason) ||
            normalizeText(status?.reason) ||
            'Commander backend is not ready for provider-backed actions.',
          'COMMANDER_NOT_READY'
        );
      }
      return startHarnessRun(harnessPayload, context || {});
    },
  };
}

const commanderService = createCommanderService();

module.exports = {
  buildCommanderHarnessPayload,
  createCommanderService,
  getCommanderStatus: commanderService.getCommanderStatus,
  performCommanderAction: commanderService.performCommanderAction,
};

export {};
