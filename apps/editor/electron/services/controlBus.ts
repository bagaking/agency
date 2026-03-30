// @ts-nocheck
const path = require('path');
const {
  listCells,
} = require('./cells');
const {
  listSessions,
} = require('./sessions');
const {
  getProjectContext,
  resolveProjectRoot,
} = require('./projectRoot');
const {
  describeEditorWindows,
  focusEditorWindow,
  broadcastWindowShellUpdated,
} = require('./windowShell');
const {
  performFileIntent,
  performToolFileIntent,
  classifyAgentFiles,
} = require('./fileInteraction');
const {
  performSessionRuntimeIntent,
} = require('./sessionRuntime');
const {
  startMainAgentHarnessRun,
  inspectMainAgentHarnessRun,
  cancelMainAgentHarnessRun,
  resumeMainAgentHarnessRun,
  listMainAgentHarnessRuns,
} = require('./mainAgentHarness');
const {
  logRuntime,
} = require('./runtimeLog');

const CONTROL_BUS_OPS = Object.freeze({
  projectGet: 'project.get',
  cellList: 'cell.list',
  sessionList: 'session.list',
  windowList: 'window.list',
  windowNew: 'window.new',
  windowFocus: 'window.focus',
  fileIntent: 'file.intent',
  fileToolIntent: 'file.tool_intent',
  fileClassify: 'file.classify',
  sessionPerform: 'session.perform',
  runStart: 'run.start',
  runInspect: 'run.inspect',
  runCancel: 'run.cancel',
  runResume: 'run.resume',
  runList: 'run.list',
});

const SUPPORTED_OPS = new Set(Object.values(CONTROL_BUS_OPS));
const DEFAULT_SOURCE_SURFACE = 'control-bus';
const DEFAULT_CALLER_TYPE = 'tool';
const DEFAULT_TRANSPORT_TRUST = 'trusted_host_socket';

function normalizeText(value) {
  return String(value || '').trim();
}

function hasText(value) {
  return normalizeText(value).length > 0;
}

function normalizeInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.floor(parsed);
}

function hasInteger(value) {
  return normalizeInteger(value) > 0;
}

function normalizeOp(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeRefs(value = {}) {
  return {
    windowId: normalizeInteger(value?.windowId),
    windowStateId: normalizeText(value?.windowStateId),
    projectRoot: normalizeText(value?.projectRoot),
    cellId: normalizeText(value?.cellId),
    sessionId: normalizeText(value?.sessionId),
    runId: normalizeText(value?.runId),
    worktreePath: normalizeText(value?.worktreePath),
  };
}

function normalizeCaller(value = {}) {
  const capabilities = Array.isArray(value?.capabilities)
    ? value.capabilities
        .map((item) => normalizeText(item).toLowerCase())
        .filter(Boolean)
    : [];
  return {
    callerType: normalizeText(value?.callerType) || DEFAULT_CALLER_TYPE,
    callerId: normalizeText(value?.callerId),
    traceId: normalizeText(value?.traceId),
    sourceSurface: normalizeText(value?.sourceSurface) || DEFAULT_SOURCE_SURFACE,
    capabilities,
  };
}

function normalizePathRef(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '';
  }
  return path.resolve(normalized);
}

function buildSuccess(op, data = null, warnings = []) {
  return {
    success: true,
    op,
    warnings: Array.isArray(warnings) ? warnings : [],
    failures: [],
    data,
  };
}

function buildFailure(op, code, message, data = null, failures = null) {
  const normalizedFailures =
    Array.isArray(failures) && failures.length
      ? failures
      : [
          {
            code: normalizeText(code || 'FATAL') || 'FATAL',
            message: normalizeText(message || 'Control bus request failed.') || 'Control bus request failed.',
          },
        ];
  return {
    success: false,
    op,
    warnings: [],
    failures: normalizedFailures,
    data,
  };
}

function createControlBusError(code, message, data = null) {
  const error = new Error(normalizeText(message || 'Control bus error.'));
  error.code = normalizeText(code || 'FATAL') || 'FATAL';
  if (data !== undefined) {
    error.data = data;
  }
  return error;
}

function defaultGetAllWindows() {
  try {
    const electron = require('electron');
    const BrowserWindow = electron?.BrowserWindow;
    if (!BrowserWindow?.getAllWindows) {
      return [];
    }
    return BrowserWindow.getAllWindows();
  } catch (_error) {
    return [];
  }
}

function normalizeTransportContext(context = {}, refs = {}) {
  const transportTrust = normalizeText(context?.transportTrust) || DEFAULT_TRANSPORT_TRUST;
  const accessScope = normalizeText(context?.accessScope) || (refs.windowStateId ? 'window' : 'process');
  return {
    transportTrust,
    accessScope,
    ownerWindowStateId:
      normalizeText(context?.ownerWindowStateId) || normalizeText(refs.windowStateId),
  };
}

function normalizeRequestEnvelope(request = {}) {
  return {
    op: normalizeOp(request?.op),
    refs: normalizeRefs(request?.refs),
    args:
      request?.args && typeof request.args === 'object' && !Array.isArray(request.args)
        ? request.args
        : {},
    caller: normalizeCaller(request?.caller),
  };
}

function selectScopeRefs(refs = {}, keys = []) {
  const normalizedRefs = normalizeRefs(refs);
  const next = {};
  (keys || []).forEach((key) => {
    next[key] = normalizedRefs[key];
  });
  return normalizeRefs(next);
}

function hasAnyScopeRef(refs = {}) {
  return Boolean(
    hasInteger(refs.windowId) ||
      hasText(refs.windowStateId) ||
      hasText(refs.projectRoot) ||
      hasText(refs.cellId) ||
      hasText(refs.sessionId) ||
      hasText(refs.worktreePath)
  );
}

function assertCanonicalAuthority({
  label,
  refValue,
  argValue,
  normalizer = normalizeText,
}) {
  const normalizedRefValue = normalizer(refValue);
  const normalizedArgValue = normalizer(argValue);
  if (!normalizedRefValue || !normalizedArgValue) {
    return;
  }
  if (normalizedRefValue !== normalizedArgValue) {
    throw createControlBusError(
      'REF_MISMATCH',
      `${label} in args must match canonical refs.`
    );
  }
}

function normalizeContextRefs(value = []) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((entry) => {
      const normalized = {
        type: normalizeText(entry?.type),
      };
      const projectRoot = normalizeText(entry?.projectRoot);
      const cellId = normalizeText(entry?.cellId);
      const worktreePath = normalizeText(entry?.worktreePath);
      const sessionId = normalizeText(entry?.sessionId);
      if (projectRoot) {
        normalized.projectRoot = projectRoot;
      }
      if (cellId) {
        normalized.cellId = cellId;
      }
      if (worktreePath) {
        normalized.worktreePath = worktreePath;
      }
      if (sessionId) {
        normalized.sessionId = sessionId;
      }
      return normalized;
    })
    .filter((entry) => entry.type);
}

function buildCanonicalContextRefs(scope, refs) {
  const contextRefs = [];
  if (scope.projectRoot) {
    contextRefs.push({
      type: 'project',
      projectRoot: scope.projectRoot,
    });
  }
  if (scope.cell) {
    contextRefs.push({
      type: 'cell',
      cellId: scope.cell.id,
      worktreePath: scope.cell.worktreePath,
    });
  }
  if (refs.sessionId) {
    contextRefs.push({
      type: 'session',
      sessionId: refs.sessionId,
    });
  }
  return contextRefs;
}

function assertCanonicalContextRefs(args, scope, refs) {
  const argContextRefs = normalizeContextRefs(args?.contextRefs);
  const canonicalContextRefs = normalizeContextRefs(buildCanonicalContextRefs(scope, refs));
  if (!argContextRefs.length || !canonicalContextRefs.length) {
    return canonicalContextRefs;
  }
  if (JSON.stringify(argContextRefs) !== JSON.stringify(canonicalContextRefs)) {
    throw createControlBusError(
      'REF_MISMATCH',
      'args.contextRefs must match canonical refs.'
    );
  }
  return canonicalContextRefs;
}

function normalizeServiceWarnings(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeServiceFailures(value, fallbackMessage = 'Control bus operation failed.') {
  if (Array.isArray(value) && value.length) {
    return value;
  }
  return [
    {
      code: 'FATAL',
      message: fallbackMessage,
    },
  ];
}

function adaptUnderlyingEnvelope(op, result) {
  if (!result || typeof result !== 'object' || typeof result.success !== 'boolean') {
    return buildSuccess(op, result);
  }
  if (result.success === false) {
    return {
      success: false,
      op,
      warnings: normalizeServiceWarnings(result.warnings),
      failures: normalizeServiceFailures(result.failures, result?.message),
      data: result,
    };
  }
  return {
    success: true,
    op,
    warnings: normalizeServiceWarnings(result.warnings),
    failures: [],
    data: result,
  };
}

function findTargetWindow({ refs, args, getAllWindows = defaultGetAllWindows }) {
  const windows = (getAllWindows() || []).filter((window) => !window?.isDestroyed?.());
  assertCanonicalAuthority({
    label: 'windowId',
    refValue: refs?.windowId,
    argValue: args?.windowId,
    normalizer: normalizeInteger,
  });
  assertCanonicalAuthority({
    label: 'windowStateId',
    refValue: refs?.windowStateId,
    argValue: args?.windowStateId,
  });
  const targetWindowId = normalizeInteger(refs?.windowId || args?.windowId);
  const targetWindowStateId = normalizeText(refs?.windowStateId || args?.windowStateId);
  if (targetWindowId > 0) {
    const matched = windows.find((window) => window.id === targetWindowId);
    if (matched) {
      return matched;
    }
  }
  if (targetWindowStateId) {
    const matched = windows.find(
      (window) => normalizeText(window?.__agencyWindowStateId) === targetWindowStateId
    );
    if (matched) {
      return matched;
    }
  }
  return null;
}

async function resolveProjectRootFromRefs(refs, deps) {
  if (refs.projectRoot) {
    return normalizeText(
      await deps.resolveProjectRoot({
        rootPath: refs.projectRoot,
        windowStateId: refs.windowStateId,
      })
    );
  }
  if (refs.windowStateId) {
    const windows = deps.describeEditorWindows();
    const matched = windows.find((window) => normalizeText(window.windowStateId) === refs.windowStateId);
    if (matched?.projectRoot) {
      return normalizeText(matched.projectRoot);
    }
    const projectContext = await deps.getProjectContext({
      windowStateId: refs.windowStateId,
      allowStoredRoot: true,
    });
    return normalizeText(projectContext?.projectRoot);
  }
  return '';
}

async function resolveCellFromRefs(refs, deps, projectRoot) {
  if (!refs.cellId) {
    return null;
  }
  const cells = await deps.listCells({
    rootPath: projectRoot || undefined,
  });
  const matched = (cells || []).find((cell) => normalizeText(cell?.id) === refs.cellId);
  if (!matched) {
    throw createControlBusError('NOT_FOUND', `Cell not found: ${refs.cellId}.`);
  }
  return matched;
}

async function resolveSessionScopeFromRefs(refs, deps, cell, projectRoot) {
  if (!refs.sessionId) {
    return null;
  }
  const candidateWorktreePath = normalizeText(refs.worktreePath) || normalizeText(cell?.worktreePath);
  if (candidateWorktreePath) {
    const sessions = await deps.listSessions({ worktreePath: candidateWorktreePath });
    const matched = (sessions || []).find((session) => normalizeText(session?.id) === refs.sessionId);
    if (!matched) {
      throw createControlBusError('NOT_FOUND', `Session not found: ${refs.sessionId}.`);
    }
    return {
      session: matched,
      worktreePath: candidateWorktreePath,
      cell,
    };
  }

  if (!projectRoot) {
    throw createControlBusError(
      'USER_ERROR',
      'Session references require projectRoot, worktreePath, or cellId.'
    );
  }

  const cells = await deps.listCells({ rootPath: projectRoot });
  let match = null;
  for (const candidateCell of cells || []) {
    const worktreePath = normalizeText(candidateCell?.worktreePath);
    if (!worktreePath) {
      continue;
    }
    const sessions = await deps.listSessions({ worktreePath });
    const session = (sessions || []).find((item) => normalizeText(item?.id) === refs.sessionId);
    if (!session) {
      continue;
    }
    if (match) {
      throw createControlBusError(
        'AMBIGUOUS_REF',
        `Session reference resolved more than once: ${refs.sessionId}.`
      );
    }
    match = {
      session,
      worktreePath,
      cell: candidateCell,
    };
  }
  if (!match) {
    throw createControlBusError('NOT_FOUND', `Session not found: ${refs.sessionId}.`);
  }
  return match;
}

async function resolveControlBusScope(refs, deps) {
  const projectRoot = await resolveProjectRootFromRefs(refs, deps);
  const cell = await resolveCellFromRefs(refs, deps, projectRoot);
  if (cell && refs.worktreePath) {
    assertCanonicalAuthority({
      label: 'worktreePath',
      refValue: normalizeText(cell.worktreePath),
      argValue: refs.worktreePath,
      normalizer: normalizePathRef,
    });
  }
  const sessionScope = await resolveSessionScopeFromRefs(refs, deps, cell, projectRoot);
  return {
    projectRoot,
    cell: sessionScope?.cell || cell || null,
    session: sessionScope?.session || null,
    sessionWorktreePath:
      normalizeText(sessionScope?.worktreePath) ||
      normalizeText(cell?.worktreePath) ||
      normalizeText(refs.worktreePath),
  };
}

function buildCallerPayload(caller) {
  return {
    sourceSurface: caller.sourceSurface,
    callerType: caller.callerType,
    callerId: caller.callerId,
    traceId: caller.traceId,
  };
}

function buildHarnessContext(context, refs) {
  return normalizeTransportContext(context, refs);
}

function buildSessionRuntimePayload(args, refs, scope, caller) {
  const canonicalWorktreePath = normalizeText(scope.sessionWorktreePath);
  const canonicalSessionId = normalizeText(refs.sessionId);
  assertCanonicalAuthority({
    label: 'worktreePath',
    refValue: canonicalWorktreePath,
    argValue: args?.worktreePath,
    normalizer: normalizePathRef,
  });
  assertCanonicalAuthority({
    label: 'sessionId',
    refValue: canonicalSessionId,
    argValue: args?.sessionId,
  });
  const payload = {
    ...(args || {}),
    ...buildCallerPayload(caller),
  };
  if (canonicalWorktreePath) {
    payload.worktreePath = canonicalWorktreePath;
  }
  if (canonicalSessionId) {
    payload.sessionId = canonicalSessionId;
  }
  if (!payload.worktreePath) {
    throw createControlBusError(
      'USER_ERROR',
      'Session runtime operations require a resolvable worktreePath.'
    );
  }
  return payload;
}

function buildCanonicalFileRoot(scope) {
  return (
    normalizeText(scope?.sessionWorktreePath) ||
    normalizeText(scope?.cell?.worktreePath) ||
    normalizeText(scope?.projectRoot)
  );
}

function resolveFileRootPath(args, scope) {
  const canonicalRoot = buildCanonicalFileRoot(scope);
  assertCanonicalAuthority({
    label: 'rootPath',
    refValue: canonicalRoot,
    argValue: args?.rootPath,
    normalizer: normalizePathRef,
  });
  return canonicalRoot || normalizeText(args?.rootPath);
}

function sanitizeCapabilityCallInput({
  capabilityId,
  input,
  scope,
  refs,
}) {
  const normalizedCapabilityId = normalizeText(capabilityId).toLowerCase();
  const nextInput =
    input && typeof input === 'object' && !Array.isArray(input) ? { ...input } : {};

  if (normalizedCapabilityId === 'file.intent') {
    const canonicalRoot = buildCanonicalFileRoot(scope);
    assertCanonicalAuthority({
      label: 'runner.steps[*].input.rootPath',
      refValue: canonicalRoot,
      argValue: nextInput.rootPath,
      normalizer: normalizePathRef,
    });
    if (canonicalRoot) {
      nextInput.rootPath = canonicalRoot;
    }
    return nextInput;
  }

  if (normalizedCapabilityId === 'session.runtime') {
    const canonicalWorktreePath =
      normalizeText(scope.sessionWorktreePath) || normalizeText(scope.cell?.worktreePath);
    const canonicalCellId = normalizeText(scope.cell?.id || refs?.cellId);
    const canonicalSessionId = normalizeText(refs?.sessionId);

    if (hasText(nextInput.worktreePath) && !canonicalWorktreePath) {
      throw createControlBusError(
        'USER_ERROR',
        'runner.steps[*].input.worktreePath requires canonical refs.'
      );
    }
    if (hasText(nextInput.cellId) && !canonicalCellId) {
      throw createControlBusError(
        'USER_ERROR',
        'runner.steps[*].input.cellId requires canonical refs.'
      );
    }
    if ((hasText(nextInput.sessionId) || hasText(nextInput.sourceSessionId)) && !canonicalSessionId) {
      throw createControlBusError(
        'USER_ERROR',
        'runner.steps[*].input session refs require canonical refs.sessionId.'
      );
    }

    assertCanonicalAuthority({
      label: 'runner.steps[*].input.worktreePath',
      refValue: canonicalWorktreePath,
      argValue: nextInput.worktreePath,
      normalizer: normalizePathRef,
    });
    assertCanonicalAuthority({
      label: 'runner.steps[*].input.cellId',
      refValue: canonicalCellId,
      argValue: nextInput.cellId,
    });
    assertCanonicalAuthority({
      label: 'runner.steps[*].input.sessionId',
      refValue: canonicalSessionId,
      argValue: nextInput.sessionId,
    });
    assertCanonicalAuthority({
      label: 'runner.steps[*].input.sourceSessionId',
      refValue: canonicalSessionId,
      argValue: nextInput.sourceSessionId,
    });

    if (canonicalWorktreePath) {
      nextInput.worktreePath = canonicalWorktreePath;
    }
    if (canonicalCellId) {
      nextInput.cellId = canonicalCellId;
    }
    if (canonicalSessionId && hasText(nextInput.sessionId)) {
      nextInput.sessionId = canonicalSessionId;
    }
    if (canonicalSessionId && hasText(nextInput.sourceSessionId)) {
      nextInput.sourceSessionId = canonicalSessionId;
    }
    return nextInput;
  }

  return nextInput;
}

function buildHarnessPayload(args, refs, scope, caller) {
  assertCanonicalAuthority({
    label: 'runId',
    refValue: refs?.runId,
    argValue: args?.runId,
  });
  const payload = {
    ...(args || {}),
    ...buildCallerPayload(caller),
  };
  if (refs.runId) {
    payload.runId = refs.runId;
  }
  const canonicalContextRefs = assertCanonicalContextRefs(args, scope, refs);
  if (canonicalContextRefs.length) {
    payload.contextRefs = canonicalContextRefs;
  }
  if (payload.runner && typeof payload.runner === 'object' && Array.isArray(payload.runner.steps)) {
    const canonicalWorktreePath =
      normalizeText(scope.sessionWorktreePath) || normalizeText(scope.cell?.worktreePath);
    const canonicalCellId = normalizeText(scope.cell?.id || refs?.cellId);
    const canonicalSessionId = normalizeText(refs?.sessionId);
    payload.runner = {
      ...payload.runner,
      steps: payload.runner.steps.map((rawStep) => {
        const step = rawStep && typeof rawStep === 'object' ? rawStep : {};
        const agent = step.agent && typeof step.agent === 'object' ? step.agent : null;
        const sessionRuntime =
          agent?.sessionRuntime && typeof agent.sessionRuntime === 'object'
            ? agent.sessionRuntime
            : null;
        if (!sessionRuntime) {
          if (!normalizeText(step.capabilityId)) {
            return step;
          }
          return {
            ...step,
            input: sanitizeCapabilityCallInput({
              capabilityId: step.capabilityId,
              input: step.input,
              scope,
              refs,
            }),
          };
        }

        if (hasText(sessionRuntime.worktreePath) && !canonicalWorktreePath) {
          throw createControlBusError(
            'USER_ERROR',
            'runner.steps[*].agent.sessionRuntime.worktreePath requires canonical refs.'
          );
        }
        if (hasText(sessionRuntime.cellId) && !canonicalCellId) {
          throw createControlBusError(
            'USER_ERROR',
            'runner.steps[*].agent.sessionRuntime.cellId requires canonical refs.'
          );
        }
        if ((hasText(sessionRuntime.sessionId) || hasText(sessionRuntime.sourceSessionId)) && !canonicalSessionId) {
          throw createControlBusError(
            'USER_ERROR',
            'runner.steps[*].agent.sessionRuntime session refs require canonical refs.sessionId.'
          );
        }

        assertCanonicalAuthority({
          label: 'runner.steps[*].agent.sessionRuntime.worktreePath',
          refValue: canonicalWorktreePath,
          argValue: sessionRuntime.worktreePath,
          normalizer: normalizePathRef,
        });
        assertCanonicalAuthority({
          label: 'runner.steps[*].agent.sessionRuntime.cellId',
          refValue: canonicalCellId,
          argValue: sessionRuntime.cellId,
        });
        assertCanonicalAuthority({
          label: 'runner.steps[*].agent.sessionRuntime.sessionId',
          refValue: canonicalSessionId,
          argValue: sessionRuntime.sessionId,
        });
        assertCanonicalAuthority({
          label: 'runner.steps[*].agent.sessionRuntime.sourceSessionId',
          refValue: canonicalSessionId,
          argValue: sessionRuntime.sourceSessionId,
        });

        return {
          ...step,
          agent: {
            ...agent,
            sessionRuntime: {
              ...sessionRuntime,
              ...(canonicalWorktreePath ? { worktreePath: canonicalWorktreePath } : {}),
              ...(canonicalCellId ? { cellId: canonicalCellId } : {}),
              ...(canonicalSessionId ? { sessionId: canonicalSessionId } : {}),
              ...(canonicalSessionId && hasText(sessionRuntime.sourceSessionId)
                ? { sourceSessionId: canonicalSessionId }
                : {}),
            },
          },
        };
      }),
    };
  }
  return payload;
}

function createControlBusService(customDeps = {}) {
  const deps = {
    listCells,
    listSessions,
    getProjectContext,
    resolveProjectRoot,
    describeEditorWindows,
    focusEditorWindow,
    broadcastWindowShellUpdated,
    performFileIntent,
    performToolFileIntent,
    classifyAgentFiles,
    performSessionRuntimeIntent,
    startMainAgentHarnessRun,
    inspectMainAgentHarnessRun,
    cancelMainAgentHarnessRun,
    resumeMainAgentHarnessRun,
    listMainAgentHarnessRuns,
    logRuntime,
    getAllWindows: defaultGetAllWindows,
    createEditorWindow: null,
    ...customDeps,
  };

  const operationRegistry = {
    [CONTROL_BUS_OPS.projectGet]: {
      scopeRefKeys: ['windowStateId', 'projectRoot'],
      execute: async ({ refs, scope }) => {
      const context = await deps.getProjectContext({
        windowStateId: refs.windowStateId,
        allowStoredRoot: true,
      });
      return {
        ...context,
        projectRoot: normalizeText(scope.projectRoot || context?.projectRoot),
        valid: Boolean(scope.projectRoot || context?.projectRoot),
        windowStateId: refs.windowStateId || normalizeText(context?.windowStateId),
      };
      },
    },
    [CONTROL_BUS_OPS.cellList]: {
      scopeRefKeys: ['windowStateId', 'projectRoot'],
      execute: async ({ scope }) => {
      return deps.listCells({
        rootPath: scope.projectRoot || undefined,
      });
      },
    },
    [CONTROL_BUS_OPS.sessionList]: {
      scopeRefKeys: ['windowStateId', 'projectRoot', 'cellId', 'worktreePath'],
      execute: async ({ scope }) => {
      if (scope.cell?.worktreePath) {
        return {
          cell: scope.cell,
          sessions: await deps.listSessions({ worktreePath: scope.cell.worktreePath }),
        };
      }
      if (!scope.projectRoot) {
        throw createControlBusError(
          'USER_ERROR',
          'Session listing requires projectRoot or cellId.'
        );
      }
      const cells = await deps.listCells({ rootPath: scope.projectRoot });
      const items = [];
      for (const cell of cells || []) {
        const worktreePath = normalizeText(cell?.worktreePath);
        if (!worktreePath) {
          continue;
        }
        const sessions = await deps.listSessions({ worktreePath });
        items.push({
          cell,
          sessions,
        });
      }
      return {
        cells: items,
      };
      },
    },
    [CONTROL_BUS_OPS.windowList]: {
      scopeRefKeys: [],
      execute: async () => {
      return {
        windows: deps.describeEditorWindows(),
      };
      },
    },
    [CONTROL_BUS_OPS.windowNew]: {
      scopeRefKeys: ['projectRoot'],
      execute: async ({ scope, args, refs }) => {
      if (typeof deps.createEditorWindow !== 'function') {
        throw createControlBusError(
          'UNAVAILABLE',
          'Window creation is unavailable in this control bus context.'
        );
      }
      assertCanonicalAuthority({
        label: 'projectRoot',
        refValue: scope.projectRoot || refs.projectRoot,
        argValue: args?.projectRoot,
        normalizer: normalizePathRef,
      });
      const projectRoot =
        normalizeText(scope.projectRoot) || normalizeText(args?.projectRoot);
      const createdWindow = await deps.createEditorWindow({
        startEmpty: !projectRoot,
        projectRoot,
      });
      return {
        ok: Boolean(createdWindow),
        windows: deps.describeEditorWindows(),
        windowStateId: normalizeText(createdWindow?.__agencyWindowStateId),
      };
      },
    },
    [CONTROL_BUS_OPS.windowFocus]: {
      scopeRefKeys: [],
      execute: async ({ refs, args }) => {
      const targetWindow = findTargetWindow({ refs, args, getAllWindows: deps.getAllWindows });
      if (!targetWindow) {
        throw createControlBusError('NOT_FOUND', 'Target window was not found.');
      }
      deps.focusEditorWindow(targetWindow);
      if (typeof deps.broadcastWindowShellUpdated === 'function') {
        deps.broadcastWindowShellUpdated();
      }
      return {
        ok: true,
        windows: deps.describeEditorWindows(),
        windowStateId: normalizeText(targetWindow?.__agencyWindowStateId),
      };
      },
    },
    [CONTROL_BUS_OPS.fileIntent]: {
      scopeRefKeys: ['windowStateId', 'projectRoot', 'cellId', 'sessionId', 'worktreePath'],
      execute: async ({ args, scope }) => {
      const payload = {
        ...(args || {}),
        rootPath: resolveFileRootPath(args, scope),
      };
      return deps.performFileIntent(payload);
      },
    },
    [CONTROL_BUS_OPS.fileToolIntent]: {
      scopeRefKeys: ['windowStateId', 'projectRoot', 'cellId', 'sessionId', 'worktreePath'],
      execute: async ({ args, scope, caller }) => {
      const payload = {
        ...(args || {}),
        ...buildCallerPayload(caller),
        capabilities:
          Array.isArray(args?.capabilities) && args.capabilities.length
            ? args.capabilities
            : caller.capabilities,
        rootPath: resolveFileRootPath(args, scope),
      };
      return deps.performToolFileIntent(payload);
      },
    },
    [CONTROL_BUS_OPS.fileClassify]: {
      scopeRefKeys: ['windowStateId', 'projectRoot', 'cellId', 'sessionId', 'worktreePath'],
      execute: async ({ args, scope }) => {
      const payload = {
        ...(args || {}),
        rootPath: resolveFileRootPath(args, scope),
      };
      return deps.classifyAgentFiles(payload);
      },
    },
    [CONTROL_BUS_OPS.sessionPerform]: {
      scopeRefKeys: ['windowStateId', 'projectRoot', 'cellId', 'sessionId', 'worktreePath'],
      execute: async ({ args, refs, scope, caller }) => {
      const payload = buildSessionRuntimePayload(args, refs, scope, caller);
      return deps.performSessionRuntimeIntent(payload);
      },
    },
    [CONTROL_BUS_OPS.runStart]: {
      scopeRefKeys: ['windowStateId', 'projectRoot', 'cellId', 'sessionId', 'runId', 'worktreePath'],
      execute: async ({ args, refs, scope, caller, transportContext }) => {
      const payload = buildHarnessPayload(args, refs, scope, caller);
      return deps.startMainAgentHarnessRun(payload, buildHarnessContext(transportContext, refs));
      },
    },
    [CONTROL_BUS_OPS.runInspect]: {
      scopeRefKeys: ['windowStateId', 'projectRoot', 'cellId', 'sessionId', 'runId', 'worktreePath'],
      execute: async ({ args, refs, scope, caller, transportContext }) => {
      const payload = buildHarnessPayload(args, refs, scope, caller);
      return deps.inspectMainAgentHarnessRun(payload, buildHarnessContext(transportContext, refs));
      },
    },
    [CONTROL_BUS_OPS.runCancel]: {
      scopeRefKeys: ['windowStateId', 'projectRoot', 'cellId', 'sessionId', 'runId', 'worktreePath'],
      execute: async ({ args, refs, scope, caller, transportContext }) => {
      const payload = buildHarnessPayload(args, refs, scope, caller);
      return deps.cancelMainAgentHarnessRun(payload, buildHarnessContext(transportContext, refs));
      },
    },
    [CONTROL_BUS_OPS.runResume]: {
      scopeRefKeys: ['windowStateId', 'projectRoot', 'cellId', 'sessionId', 'runId', 'worktreePath'],
      execute: async ({ args, refs, scope, caller, transportContext }) => {
      const payload = buildHarnessPayload(args, refs, scope, caller);
      return deps.resumeMainAgentHarnessRun(payload, buildHarnessContext(transportContext, refs));
      },
    },
    [CONTROL_BUS_OPS.runList]: {
      scopeRefKeys: ['windowStateId', 'projectRoot', 'cellId', 'sessionId', 'runId', 'worktreePath'],
      execute: async ({ args, refs, scope, caller, transportContext }) => {
      const payload = buildHarnessPayload(args, refs, scope, caller);
      return deps.listMainAgentHarnessRuns(payload, buildHarnessContext(transportContext, refs));
      },
    },
  };

  async function dispatch(request = {}, transportContext = {}) {
    const envelope = normalizeRequestEnvelope(request);
    const op = envelope.op;
    const operationDefinition = operationRegistry[op];
    if (!SUPPORTED_OPS.has(op) || !operationDefinition) {
      return buildFailure(op || 'unknown', 'USER_ERROR', `Unsupported control-bus op: ${request?.op || 'unknown'}.`);
    }

    try {
      const scopedRefs = selectScopeRefs(
        envelope.refs,
        operationDefinition.scopeRefKeys || []
      );
      const scope = hasAnyScopeRef(scopedRefs)
        ? await resolveControlBusScope(scopedRefs, deps)
        : {
            projectRoot: '',
            cell: null,
            session: null,
            sessionWorktreePath: '',
          };
      const result = await operationDefinition.execute({
        op,
        refs: envelope.refs,
        args: envelope.args,
        caller: envelope.caller,
        scope,
        transportContext: normalizeTransportContext(transportContext, envelope.refs),
      });
      const adapted = adaptUnderlyingEnvelope(op, result);
      await deps.logRuntime?.('info', 'control bus request handled', {
        op,
        success: adapted.success,
        callerType: envelope.caller.callerType,
        callerId: envelope.caller.callerId,
        sourceSurface: envelope.caller.sourceSurface,
        transportTrust: normalizeTransportContext(transportContext, envelope.refs).transportTrust,
      });
      return adapted;
    } catch (error) {
      const failure = buildFailure(
        op,
        error?.code || 'FATAL',
        error?.message || String(error),
        error?.data || null
      );
      await deps.logRuntime?.('error', 'control bus request failed', {
        op,
        callerType: envelope.caller.callerType,
        callerId: envelope.caller.callerId,
        sourceSurface: envelope.caller.sourceSurface,
        transportTrust: normalizeTransportContext(transportContext, envelope.refs).transportTrust,
        error: failure.failures?.[0]?.message || 'Control bus failure',
      });
      return failure;
    }
  }

  return {
    dispatch,
  };
}

module.exports = {
  CONTROL_BUS_OPS,
  createControlBusService,
};
