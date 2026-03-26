// @ts-nocheck
const {
  performFileIntent,
  performToolFileIntent,
} = require('../fileInteraction');
const { performSessionRuntimeIntent } = require('../sessionRuntime');

const FILE_INTENT_SCOPE = {
  open: 'file.read',
  reveal: 'file.read',
  classify: 'file.read',
  import_copy: 'file.write',
  move: 'file.write',
  copy: 'file.write',
  delete: 'file.write',
  create: 'file.write',
  rename: 'file.write',
};

function normalizeCapabilityId(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRequestedCapabilities(value) {
  const list = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      list
        .map((item) => normalizeCapabilityId(item))
        .filter(Boolean)
    )
  );
}

function createDeniedResult(capabilityId, code, message, data = null) {
  return {
    success: false,
    capabilityId,
    warnings: [],
    failures: [
      {
        code,
        message,
      },
    ],
    data,
  };
}

function summarizeSessionRuntimeResult(result) {
  return {
    success: Boolean(result?.success),
    intent: String(result?.intent || ''),
    warnings: Array.isArray(result?.warnings) ? result.warnings : [],
    failures: Array.isArray(result?.failures) ? result.failures : [],
    data: result?.data
      ? {
          operationId: result.data.operationId || '',
          mode: result.data.mode || '',
          session: result.data.session
            ? {
                id: result.data.session.id || '',
                profileId: result.data.session.profileId || '',
                nodeKind: result.data.session.nodeKind || '',
              }
            : null,
          sourceSession: result.data.sourceSession
            ? {
                id: result.data.sourceSession.id || '',
                profileId: result.data.sourceSession.profileId || '',
              }
            : null,
          sourceRuntime: result.data.sourceRuntime || null,
          metadata: result.data.metadata || null,
          launch: result.data.launch || null,
          steps: Array.isArray(result.data.steps) ? result.data.steps : [],
        }
      : null,
  };
}

function summarizeFileIntentResult(result) {
  return {
    success: Boolean(result?.success),
    intent: String(result?.intent || ''),
    affectedPaths: Array.isArray(result?.affectedPaths) ? result.affectedPaths : [],
    warnings: Array.isArray(result?.warnings) ? result.warnings : [],
    failures: Array.isArray(result?.failures) ? result.failures : [],
    data: result?.data || null,
  };
}

function createDefaultCapabilityRegistry() {
  const registry = new Map();

  registry.set('session.runtime', {
    id: 'session.runtime',
    title: 'Session Runtime Gateway',
    authorize({ run }) {
      const requested = normalizeRequestedCapabilities(run?.requestedCapabilities);
      if (!requested.includes('session.runtime')) {
        return createDeniedResult(
          'session.runtime',
          'PERMISSION_DENIED',
          'Harness run is not authorized to use session.runtime.'
        );
      }
      return null;
    },
    async invoke({ input, run, callId }) {
      const response = await performSessionRuntimeIntent({
        ...(input || {}),
        sourceSurface: input?.sourceSurface || run?.caller?.sourceSurface || 'main-agent-harness',
        callerType: 'harness',
        callerId: run?.runId || '',
        traceId: callId,
      });
      return {
        response,
        summary: summarizeSessionRuntimeResult(response),
      };
    },
    extractArtifacts({ response }) {
      const session = response?.data?.session;
      if (!session?.id) {
        return [];
      }
      return [
        {
          kind: 'session',
          sessionId: session.id,
          profileId: session.profileId || '',
          nodeKind: session.nodeKind || '',
        },
      ];
    },
  });

  registry.set('file.intent', {
    id: 'file.intent',
    title: 'File Intent Gateway',
    authorize({ input, run }) {
      const requested = normalizeRequestedCapabilities(run?.requestedCapabilities);
      if (!requested.includes('file.intent')) {
        return createDeniedResult(
          'file.intent',
          'PERMISSION_DENIED',
          'Harness run is not authorized to use file.intent.'
        );
      }
      const intent = normalizeCapabilityId(input?.intent);
      const requiredScope = FILE_INTENT_SCOPE[intent] || 'file.write';
      if (!requested.includes(requiredScope)) {
        return createDeniedResult(
          'file.intent',
          'PERMISSION_DENIED',
          `Harness run is missing required capability scope: ${requiredScope}.`
        );
      }
      return null;
    },
    async invoke({ input, run, callId }) {
      const intent = normalizeCapabilityId(input?.intent);
      const requested = normalizeRequestedCapabilities(run?.requestedCapabilities);
      const requiredScope = FILE_INTENT_SCOPE[intent] || 'file.write';
      const payload = {
        ...(input || {}),
        sourceSurface: input?.sourceSurface || run?.caller?.sourceSurface || 'main-agent-harness',
        callerType: 'harness',
        callerId: run?.runId || '',
        traceId: callId,
      };
      const response =
        requested.includes(requiredScope) && requested.includes('file.intent')
          ? await performToolFileIntent({
              ...payload,
              capabilities: [requiredScope],
            })
          : await performFileIntent(payload);
      return {
        response,
        summary: summarizeFileIntentResult(response),
      };
    },
    extractArtifacts({ response }) {
      const affectedPaths = Array.isArray(response?.affectedPaths) ? response.affectedPaths : [];
      return affectedPaths.map((itemPath) => ({
        kind: 'file-path',
        path: itemPath,
      }));
    },
  });

  return {
    get(capabilityId) {
      return registry.get(normalizeCapabilityId(capabilityId)) || null;
    },
    list() {
      return Array.from(registry.values()).map((item) => ({
        id: item.id,
        title: item.title,
      }));
    },
  };
}

module.exports = {
  createDefaultCapabilityRegistry,
  normalizeRequestedCapabilities,
};
