// @ts-nocheck
const path = require('path');
const { BASELINE_PROFILE_ID, getResolvedTerminusSettings } = require('../../terminusSettings');
const { buildDecisionSchema } = require('../runnerProviders/shared/decisionSchema');
const { buildSessionRuntimePayload } = require('./sessionCreateChild');

function normalizeToolId(value) {
  return path.basename(String(value || '').trim()).toLowerCase();
}

function resolveProfile(profiles = [], profileId = '') {
  return (
    (Array.isArray(profiles) ? profiles : []).find(
      (profile) => String(profile?.id || '').trim() === String(profileId || '').trim()
    ) || null
  );
}

function resolveProfileForRuntime(profiles = [], profileId = '', runtimeTool = '') {
  const preferred = resolveProfile(profiles, profileId);
  if (preferred?.fork?.enabled) {
    return preferred;
  }
  const normalizedRuntimeTool = normalizeToolId(runtimeTool);
  const runtimeMatch = normalizedRuntimeTool
    ? (Array.isArray(profiles) ? profiles : []).find(
        (profile) => normalizeToolId(profile?.id) === normalizedRuntimeTool
      ) || null
    : null;
  return runtimeMatch || preferred || null;
}

function normalizeLaunchCommand(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function createSessionToolNativeForkSkillPack() {
  return {
    id: 'session.tool-native-fork',
    title: 'Session Tool-Native Fork',
    allowedCapabilities: ['session.runtime'],
    providerHints: {
      defaultProviderId: 'codex_cli',
    },
    instruction:
      'Create a child execution lane from the selected source session. Allowed decision modes are: smart_fork, create_child_start, or fail. Prefer a true tool-native fork only when the host facts prove that it is supported. Otherwise create a child session and launch a fresh agent command when one is available. If neither path is possible, fail instead of creating an empty child session. Never pretend a fork succeeded when the host did not confirm it.',
    rules: [
      'Only use the session.runtime capability.',
      'If true smart fork is not supported, do not emit smart_fork.',
      'If you fall back to create_child, start the child with a concrete command only when one is available.',
      'If no concrete child launch command exists, emit fail instead of create_child_only.',
      'Use resumeCommand only when you have a concrete resume target; otherwise prefer startCommand.',
      'Do not emit raw tmux or file operations.',
    ],
    async prepare({ step, invokeCapability }) {
      const payload = buildSessionRuntimePayload(step);
      const inspect = await invokeCapability({
        step,
        capabilityId: 'session.runtime',
        title: 'Inspect source session runtime',
        input: {
          intent: 'inspect',
          worktreePath: payload.worktreePath,
          sessionId: payload.sessionId,
        },
      });
      const inspectData = inspect?.response?.data || {};
      const sourceSession = inspectData?.session || null;
      const sourceRuntime = inspectData?.runtime || null;
      const settings = await getResolvedTerminusSettings({ worktreePath: payload.worktreePath });
      const profiles = Array.isArray(settings?.profiles) ? settings.profiles : [];
      const storedProfileId =
        String(sourceSession?.profileId || payload.profileId || '').trim() || BASELINE_PROFILE_ID;
      const profile = resolveProfileForRuntime(profiles, storedProfileId, sourceRuntime?.tool);
      const effectiveProfileId =
        String(profile?.id || storedProfileId).trim() || BASELINE_PROFILE_ID;
      const smartForkConfig = profile?.fork || {};
      const startCommand = normalizeLaunchCommand(profile?.startCommand);
      const resumeCommand = normalizeLaunchCommand(profile?.resumeCommand);
      return {
        payload: {
          ...payload,
          profileId: effectiveProfileId,
        },
        storedProfileId,
        resolvedProfileId: effectiveProfileId,
        sourceSession,
        sourceRuntime,
        profile: profile
          ? {
              id: profile.id || '',
              label: profile.label || '',
              startCommand,
              resumeCommand,
              fork: {
                enabled: Boolean(smartForkConfig?.enabled),
                driver: String(smartForkConfig?.driver || '').trim().toLowerCase(),
                launchTemplate: String(smartForkConfig?.launchTemplate || '').trim(),
              },
            }
          : null,
      };
    },
    shouldUseDeterministicDecision({ preparedContext }) {
      const storedProfileId = String(preparedContext?.storedProfileId || '').trim().toLowerCase();
      const resolvedProfileId = String(preparedContext?.resolvedProfileId || '').trim().toLowerCase();
      const runtimeTool = String(preparedContext?.sourceRuntime?.tool || '').trim().toLowerCase();
      return Boolean(runtimeTool && resolvedProfileId && resolvedProfileId !== storedProfileId);
    },
    buildDecisionSchema() {
      return buildDecisionSchema({
        allowedCapabilityIds: ['session.runtime'],
        modeEnum: ['smart_fork', 'create_child_start', 'fail'],
        maxCapabilityCalls: 2,
      });
    },
    buildDeterministicDecision({ preparedContext }) {
      const payload = preparedContext?.payload || {};
      const sourceRuntime = preparedContext?.sourceRuntime || {};
      const profile = preparedContext?.profile || {};
      const smartForkEnabled =
        Boolean(profile?.fork?.enabled) &&
        String(profile?.fork?.driver || '').trim().toLowerCase() === 'codex' &&
        String(sourceRuntime?.tool || '').trim().toLowerCase() === 'codex' &&
        sourceRuntime?.readyForFork !== false;
      if (smartForkEnabled) {
        return {
          mode: 'smart_fork',
          summary: 'Run a true Codex smart fork through session.runtime.',
          capabilityCalls: [
            {
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
                profileId: payload.profileId || BASELINE_PROFILE_ID,
              },
            },
          ],
        };
      }
      if (profile?.startCommand) {
        return {
          mode: 'create_child_start',
          summary: 'Create a child session and start a fresh agent command.',
          capabilityCalls: [
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
                nodeKind: 'fork',
              },
            },
            {
              capabilityId: 'session.runtime',
              title: 'Launch child session input',
              input: {
                intent: 'dispatch_input',
                worktreePath: payload.worktreePath,
                sessionIdFromPreviousCall: 0,
                text: profile.startCommand,
                confirm: {
                  mode: 'enter',
                  settleMs: 64,
                  keys: [],
                },
              },
            },
          ],
        };
      }
      return {
        mode: 'fail',
        summary: 'Fail because no true smart fork or concrete child launch path is available.',
        failure: {
          code: 'FORK_UNSUPPORTED_NO_LAUNCH_PATH',
          message:
            'Fork cannot degrade to create_child_only. No true smart fork path or concrete child launch command is available.',
        },
      };
    },
    validateDecision(decision) {
      const mode = String(decision?.mode || '').trim();
      const calls = Array.isArray(decision?.capabilityCalls) ? decision.capabilityCalls : [];
      if (!['smart_fork', 'create_child_start', 'fail'].includes(mode)) {
        const error = new Error(`tool-native fork decision mode is not supported: ${mode || 'unknown'}.`);
        error.code = 'INVALID_PROVIDER_DECISION';
        throw error;
      }
      if (mode === 'fail') {
        if (!decision?.failure?.message) {
          const error = new Error('tool-native fork failure decisions require failure metadata.');
          error.code = 'INVALID_PROVIDER_DECISION';
          throw error;
        }
        return null;
      }
      if (!calls.length) {
        const error = new Error('tool-native fork decisions require at least one capability call.');
        error.code = 'INVALID_PROVIDER_DECISION';
        throw error;
      }
      if (calls.some((call) => String(call?.capabilityId || '').trim() !== 'session.runtime')) {
        const error = new Error('tool-native fork decisions may only invoke session.runtime.');
        error.code = 'INVALID_PROVIDER_DECISION';
        throw error;
      }
      const intents = calls.map((call) => String(call?.input?.intent || '').trim().toLowerCase());
      if (mode === 'smart_fork') {
        if (calls.length !== 1 || intents[0] !== 'smart_fork') {
          const error = new Error('smart_fork decisions must emit exactly one session.runtime smart_fork call.');
          error.code = 'INVALID_PROVIDER_DECISION';
          throw error;
        }
      }
      if (mode === 'create_child_start') {
        if (calls.length !== 2 || intents[0] !== 'create_child' || intents[1] !== 'dispatch_input') {
          const error = new Error('create_child_start decisions must emit create_child followed by dispatch_input.');
          error.code = 'INVALID_PROVIDER_DECISION';
          throw error;
        }
      }
      return null;
    },
    resolveWorkingDirectory({ preparedContext }) {
      return preparedContext?.payload?.worktreePath || process.cwd();
    },
    buildCapabilityCalls({ decision, preparedContext }) {
      const mode = String(decision?.mode || '').trim();
      if (mode === 'fail') {
        const error = new Error(
          decision?.failure?.message || 'tool-native fork decision failed before execution.'
        );
        error.code = String(decision?.failure?.code || 'SKILL_PACK_DECISION_FAILED');
        throw error;
      }
      const calls = Array.isArray(decision?.capabilityCalls) ? decision.capabilityCalls : [];
      return calls.map((call, index) => {
        const nextInput = { ...(call?.input || {}) };
        if (
          nextInput.sessionIdFromPreviousCall !== undefined &&
          Number(nextInput.sessionIdFromPreviousCall) >= 0
        ) {
          nextInput.__sessionIdFromPreviousCallIndex = Number(nextInput.sessionIdFromPreviousCall);
          delete nextInput.sessionIdFromPreviousCall;
        }
        if (index === 0 && !nextInput.worktreePath) {
          nextInput.worktreePath = preparedContext?.payload?.worktreePath || '';
        }
        return {
          capabilityId: 'session.runtime',
          title: call?.title || 'Session runtime action',
          input: nextInput,
        };
      });
    },
    resolveCapabilityInput({ call, capabilityResults }) {
      const nextInput = { ...(call?.input || {}) };
      const sourceIndex = Number(nextInput.__sessionIdFromPreviousCallIndex);
      if (Number.isFinite(sourceIndex) && sourceIndex >= 0) {
        const sourceCall = capabilityResults[sourceIndex];
        const createdSessionId =
          sourceCall?.response?.data?.session?.id ||
          sourceCall?.summary?.data?.session?.id ||
          '';
        delete nextInput.__sessionIdFromPreviousCallIndex;
        nextInput.sessionId = createdSessionId;
      }
      return nextInput;
    },
    finalize({ capabilityResults, preparedContext, decision, providerDecision }) {
      const primaryCall = capabilityResults[0] || {};
      const primaryData = primaryCall?.response?.data || {};
      const childSession =
        primaryData?.session ||
        capabilityResults.find((item) => item?.response?.data?.session)?.response?.data?.session ||
        null;
      const launchCall =
        capabilityResults.find((item) => item?.input?.intent === 'dispatch_input') || null;
      const launch =
        primaryData?.launch ||
        (launchCall
          ? {
              command: launchCall.input?.text || '',
            }
          : null);
      return {
        mode: String(decision?.mode || primaryData?.mode || '').trim() || 'tool_native_fork',
        session: childSession,
        sourceSession: primaryData?.sourceSession || preparedContext?.sourceSession || null,
        sourceRuntime: primaryData?.sourceRuntime || preparedContext?.sourceRuntime || null,
        metadata: {
          ...(primaryData?.metadata || {}),
          providerThreadId: providerDecision?.threadId || '',
          providerFallbackUsed: Boolean(providerDecision?.fallbackUsed),
          providerFallbackReason: providerDecision?.fallbackReason || '',
          fallback:
            String(decision?.mode || '').trim().startsWith('create_child') ||
            String(primaryData?.mode || '').trim() === 'create_child',
        },
        launch,
        specialization: {
          strategy: 'tool_native_fork',
          driver:
            primaryData?.profileFork?.driver ||
            primaryData?.profileId ||
            preparedContext?.profile?.fork?.driver ||
            providerDecision?.providerId ||
            '',
        },
      };
    },
  };
}

module.exports = {
  createSessionToolNativeForkSkillPack,
  resolveProfileForRuntime,
};
