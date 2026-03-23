// @ts-nocheck
const { BASELINE_PROFILE_ID } = require('../terminusSettings');

function normalizeStrategy(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'tool_native_fork') {
    return 'tool_native_fork';
  }
  return 'create_child';
}

function normalizeLaunchInput(value = {}) {
  const text = String(value?.text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const confirm = value?.confirm && typeof value.confirm === 'object' ? value.confirm : {};
  return {
    text,
    confirm: {
      mode: String(confirm?.mode || 'none').trim().toLowerCase() || 'none',
      settleMs: Number.isFinite(Number(confirm?.settleMs)) ? Number(confirm.settleMs) : 0,
      keys: Array.isArray(confirm?.keys) ? confirm.keys : [],
    },
  };
}

function buildSessionRuntimePayload(step = {}) {
  const agent = step?.agent && typeof step.agent === 'object' ? step.agent : {};
  const sessionRuntime = agent?.sessionRuntime && typeof agent.sessionRuntime === 'object'
    ? agent.sessionRuntime
    : {};
  return {
    worktreePath: sessionRuntime.worktreePath || '',
    cellId: sessionRuntime.cellId || '',
    cellName: sessionRuntime.cellName || '',
    cellBranch: sessionRuntime.cellBranch || '',
    sessionId: sessionRuntime.sessionId || '',
    profileId: sessionRuntime.profileId || '',
    nodeKind: sessionRuntime.nodeKind || 'fork',
    sourceSessionId: sessionRuntime.sourceSessionId || '',
  };
}

function createRunnerSkillPackRegistry() {
  const skillPacks = new Map();

  skillPacks.set('session.create-child', {
    id: 'session.create-child',
    title: 'Session Create Child',
    requiredCapabilities: ['session.runtime'],
    async execute(ctx, step) {
      const payload = buildSessionRuntimePayload(step);
      const createResult = await ctx.invokeCapability({
        step,
        capabilityId: 'session.runtime',
        title: 'Create child session',
        input: {
          intent: 'create_child',
          worktreePath: payload.worktreePath,
          cellId: payload.cellId,
          cellName: payload.cellName,
          cellBranch: payload.cellBranch,
          sessionId: payload.sessionId,
          sourceSessionId: payload.sourceSessionId || payload.sessionId,
          profileId: payload.profileId || BASELINE_PROFILE_ID,
          nodeKind: payload.nodeKind || 'sub_terminal',
        },
      });

      const createdSession = createResult?.response?.data?.session || null;
      const launchInput = normalizeLaunchInput(step?.agent?.launchInput);
      if (createdSession?.id && launchInput.text) {
        await ctx.invokeCapability({
          step,
          capabilityId: 'session.runtime',
          title: 'Launch child session input',
          input: {
            intent: 'dispatch_input',
            worktreePath: payload.worktreePath,
            sessionId: createdSession.id,
            text: launchInput.text,
            confirm: launchInput.confirm,
          },
        });
      }

      return {
        mode: 'create_child',
        session: createdSession,
        specialization: {
          strategy: 'create_child',
        },
      };
    },
  });

  skillPacks.set('session.tool-native-fork', {
    id: 'session.tool-native-fork',
    title: 'Session Tool-Native Fork',
    requiredCapabilities: ['session.runtime'],
    async execute(ctx, step) {
      const payload = buildSessionRuntimePayload(step);
      const smartFork = await ctx.invokeCapability({
        step,
        capabilityId: 'session.runtime',
        title: 'Run tool-native fork',
        input: {
          intent: 'smart_fork',
          worktreePath: payload.worktreePath,
          cellId: payload.cellId,
          cellName: payload.cellName,
          cellBranch: payload.cellBranch,
          sessionId: payload.sessionId,
          sourceSessionId: payload.sourceSessionId || payload.sessionId,
        },
      });
      return {
        mode: 'tool_native_fork',
        session: smartFork?.response?.data?.session || null,
        sourceSession: smartFork?.response?.data?.sourceSession || null,
        sourceRuntime: smartFork?.response?.data?.sourceRuntime || null,
        metadata: smartFork?.response?.data?.metadata || null,
        launch: smartFork?.response?.data?.launch || null,
        specialization: {
          strategy: 'tool_native_fork',
          driver: smartFork?.response?.data?.profileFork?.driver || '',
        },
      };
    },
  });

  return {
    resolve(step = {}) {
      const explicitId = String(step?.skillPackId || '').trim();
      if (explicitId && skillPacks.has(explicitId)) {
        return skillPacks.get(explicitId);
      }
      const strategy = normalizeStrategy(step?.agent?.strategy);
      if (strategy === 'tool_native_fork') {
        return skillPacks.get('session.tool-native-fork');
      }
      return skillPacks.get('session.create-child');
    },
    list() {
      return Array.from(skillPacks.values()).map((item) => ({
        id: item.id,
        title: item.title,
        requiredCapabilities: item.requiredCapabilities,
      }));
    },
  };
}

module.exports = {
  createRunnerSkillPackRegistry,
};
