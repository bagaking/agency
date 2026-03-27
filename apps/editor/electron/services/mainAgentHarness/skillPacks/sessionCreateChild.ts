const { BASELINE_PROFILE_ID, getResolvedTerminusSettings } = require('../../terminusSettings') as {
  BASELINE_PROFILE_ID: string;
  getResolvedTerminusSettings: (input: { worktreePath: string }) => Promise<{ profiles?: unknown[] } | null>;
};
const { buildDecisionSchema } = require('../runnerProviders/shared/decisionSchema') as {
  buildDecisionSchema: (input: {
    allowedCapabilityIds?: string[];
    modeEnum?: string[];
    maxCapabilityCalls?: number;
  }) => Record<string, unknown>;
};

type SessionRuntimePayload = {
  worktreePath: string;
  cellId: string;
  cellName: string;
  cellBranch: string;
  sessionId: string;
  profileId: string;
  nodeKind: string;
  sourceSessionId: string;
};

type LaunchInput = {
  text: string;
  confirm: {
    mode: string;
    settleMs: number;
    keys: string[];
  };
};

type DecisionCapabilityCall = {
  capabilityId: string;
  title: string;
  input: Record<string, any>;
};

type ProfileRecord = {
  id?: string;
  startCommand?: string;
};

type SkillPackStep = {
  agent?: {
    sessionRuntime?: Partial<SessionRuntimePayload>;
    launchInput?: {
      text?: string;
      confirm?: {
        mode?: string;
        settleMs?: number;
        keys?: unknown[];
      };
    };
  };
};

type PreparedContext = {
  payload: SessionRuntimePayload;
  launchInput: LaunchInput;
};

function getProfileForSessionRuntime({
  settings,
  profileId,
}: {
  settings?: { profiles?: ProfileRecord[] } | null;
  profileId?: string;
}): ProfileRecord | null {
  const profiles = Array.isArray(settings?.profiles) ? settings.profiles : [];
  return (
    profiles.find((profile) => String(profile?.id || '').trim() === String(profileId || '').trim()) ||
    profiles.find((profile) => String(profile?.id || '').trim() === BASELINE_PROFILE_ID) ||
    null
  );
}

function normalizeLaunchInput(
  value: SkillPackStep['agent'] extends { launchInput?: infer T } ? T : never = {}
): LaunchInput {
  const text = String(value?.text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const confirm = value?.confirm && typeof value.confirm === 'object' ? value.confirm : {};
  return {
    text,
    confirm: {
      mode: String(confirm?.mode || 'none').trim().toLowerCase() || 'none',
      settleMs: Number.isFinite(Number(confirm?.settleMs)) ? Number(confirm.settleMs) : 0,
      keys: Array.isArray(confirm?.keys) ? confirm.keys.map((key) => String(key)) : [],
    },
  };
}

export function buildSessionRuntimePayload(step: SkillPackStep = {}): SessionRuntimePayload {
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

export function createSessionCreateChildSkillPack() {
  return {
    id: 'session.create-child',
    title: 'Session Create Child',
    allowedCapabilities: ['session.runtime'],
    instruction:
      'Create a child execution lane and optionally launch the target CLI in that child session.',
    rules: [
      'Only use the session.runtime capability.',
      'Do not emit dispatch_input unless you have a concrete launch command.',
      'Create the child session before any launch input.',
    ],
    async prepare({ step }: { step?: SkillPackStep }): Promise<PreparedContext> {
      const payload = buildSessionRuntimePayload(step);
      const launchInput = normalizeLaunchInput(step?.agent?.launchInput);
      let profile = null;
      if (payload.worktreePath) {
        const settings = await getResolvedTerminusSettings({ worktreePath: payload.worktreePath });
        profile = getProfileForSessionRuntime({
          settings,
          profileId: payload.profileId,
        });
      }
      const fallbackLaunchText =
        launchInput.text ||
        String(profile?.startCommand || '').trim() ||
        '';
      return {
        payload,
        launchInput: {
          text: fallbackLaunchText,
          confirm: launchInput.text
            ? launchInput.confirm
            : {
                mode: fallbackLaunchText ? 'enter' : 'none',
                settleMs: 64,
                keys: [],
              },
        },
      };
    },
    buildDeterministicDecision({ preparedContext }: { preparedContext?: PreparedContext }) {
      const payload: SessionRuntimePayload = preparedContext?.payload || buildSessionRuntimePayload();
      const launchInput: LaunchInput = preparedContext?.launchInput || {
        text: '',
        confirm: { mode: 'none', settleMs: 0, keys: [] },
      };
      const capabilityCalls: DecisionCapabilityCall[] = [
        {
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
        },
      ];
      if (launchInput.text) {
        capabilityCalls.push({
          capabilityId: 'session.runtime',
          title: 'Launch child session input',
          input: {
            intent: 'dispatch_input',
            worktreePath: payload.worktreePath,
            text: launchInput.text,
            confirm: launchInput.confirm,
            sessionIdFromPreviousCall: 0,
          },
        });
      }
      return {
        mode: launchInput.text ? 'create_child_launch' : 'create_child',
        summary: launchInput.text
          ? 'Create child session and launch configured command.'
          : 'Create child session only.',
        capabilityCalls,
      };
    },
    buildDecisionSchema() {
      return buildDecisionSchema({
        allowedCapabilityIds: ['session.runtime'],
        modeEnum: ['create_child', 'create_child_launch'],
        maxCapabilityCalls: 2,
      });
    },
    validateDecision() {
      return null;
    },
    resolveWorkingDirectory({ preparedContext }: { preparedContext?: PreparedContext }) {
      return preparedContext?.payload?.worktreePath || process.cwd();
    },
    buildCapabilityCalls({
      decision,
      preparedContext,
    }: {
      decision?: { capabilityCalls?: DecisionCapabilityCall[] };
      preparedContext?: PreparedContext;
    }) {
      if (decision?.capabilityCalls?.length) {
        return decision.capabilityCalls;
      }
      return this.buildDeterministicDecision({ preparedContext }).capabilityCalls;
    },
    finalize({
      capabilityResults,
      decision,
    }: {
      capabilityResults?: Array<{ response?: { data?: any }; input?: { text?: string } }>;
      decision?: { mode?: string };
    }) {
      const createResult = capabilityResults[0]?.response?.data || {};
      const childSession = createResult?.session || null;
      const launchCall = capabilityResults[1] || null;
      return {
        mode: decision?.mode || (launchCall ? 'create_child_launch' : 'create_child'),
        session: childSession,
        sourceSession: createResult?.sourceSession || null,
        sourceRuntime: null,
        metadata: null,
        launch: launchCall
          ? {
              command: launchCall.input?.text || '',
            }
          : null,
        specialization: {
          strategy: 'create_child',
        },
      };
    },
  };
}
