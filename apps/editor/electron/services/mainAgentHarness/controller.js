// @ts-nocheck
const crypto = require('crypto');
const { EventEmitter } = require('events');

const { createDefaultCapabilityRegistry, normalizeRequestedCapabilities } = require('./capabilityRegistry');
const { createReferenceRunnerAdapter } = require('./runnerAdapters/referenceRunnerAdapter');
const { createFileHarnessRunStore } = require('./store');

function createId(prefix) {
  if (crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function cloneValue(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTerminalStatus(status) {
  return ['succeeded', 'failed', 'cancelled'].includes(String(status || '').trim().toLowerCase());
}

function createHarnessFailure(code, message, data = null) {
  const error = new Error(String(message || 'Harness run failed.'));
  error.code = String(code || 'FATAL');
  if (data !== undefined) {
    error.data = data;
  }
  return error;
}

function failureFromError(error, detail = {}) {
  return {
    code: String(error?.code || 'FATAL'),
    message: String(error?.message || 'Harness run failed.'),
    ...(error?.data !== undefined ? { data: error.data } : {}),
    ...detail,
  };
}

function normalizeCaller(payload = {}) {
  return {
    sourceSurface: String(payload?.sourceSurface || '').trim() || 'unknown',
    callerType: String(payload?.callerType || 'user').trim().toLowerCase() || 'user',
    callerId: String(payload?.callerId || '').trim(),
    traceId: String(payload?.traceId || '').trim(),
  };
}

function normalizeGoal(value) {
  if (typeof value === 'string') {
    return {
      type: 'custom',
      instruction: value.trim(),
    };
  }
  if (!isPlainObject(value)) {
    return {
      type: 'custom',
      instruction: '',
    };
  }
  return cloneValue(value);
}

function normalizeContextRefs(value) {
  return Array.isArray(value) ? value.map((item) => cloneValue(item)).filter(Boolean) : [];
}

function normalizeRunnerStep(step = {}, index = 0) {
  const id = String(step?.id || `step-${index + 1}`).trim();
  const kind = String(step?.kind || 'capability_call').trim().toLowerCase() || 'capability_call';
  return {
    id,
    kind,
    title: String(step?.title || step?.label || id).trim() || id,
    capabilityId: String(step?.capabilityId || '').trim(),
    input: isPlainObject(step?.input) ? cloneValue(step.input) : {},
    agent: isPlainObject(step?.agent) ? cloneValue(step.agent) : {},
    skillPackId: String(step?.skillPackId || '').trim(),
  };
}

function normalizeRunner(value = {}) {
  const raw = isPlainObject(value) ? value : {};
  const steps = Array.isArray(raw.steps) ? raw.steps.map((step, index) => normalizeRunnerStep(step, index)) : [];
  return {
    adapterId: String(raw.adapterId || 'reference').trim().toLowerCase() || 'reference',
    steps,
  };
}

function createTimelineEntry({ type, phase, status, title, detail = {}, stepId = '', callId = '' }) {
  return {
    id: createId('timeline'),
    type,
    phase,
    status,
    title,
    stepId: String(stepId || '').trim(),
    callId: String(callId || '').trim(),
    at: nowIso(),
    detail: cloneValue(detail) || {},
  };
}

function createCapabilityCallRecord({ capabilityId, title, stepId, input }) {
  return {
    callId: createId('cap'),
    capabilityId: String(capabilityId || '').trim(),
    title: String(title || capabilityId || 'Capability call').trim(),
    stepId: String(stepId || '').trim(),
    status: 'running',
    startedAt: nowIso(),
    completedAt: '',
    request: cloneValue(input) || {},
    summary: null,
    warnings: [],
    failures: [],
  };
}

function appendUnique(list, item, predicate) {
  const current = Array.isArray(list) ? list.slice() : [];
  if (!current.some((entry) => predicate(entry, item))) {
    current.push(item);
  }
  return current;
}

function createHarnessController({
  store = createFileHarnessRunStore(),
  capabilityRegistry = createDefaultCapabilityRegistry(),
  runnerAdapters = [createReferenceRunnerAdapter()],
  logRuntime = async () => undefined,
} = {}) {
  const progressEmitter = new EventEmitter();
  const activeRuns = new Map();
  const adapterMap = new Map(
    (Array.isArray(runnerAdapters) ? runnerAdapters : [])
      .filter(Boolean)
      .map((adapter) => [String(adapter.id || '').trim().toLowerCase(), adapter])
  );

  function emitProgress(runId, entry, extra = {}) {
    progressEmitter.emit('progress', {
      runId,
      entry: cloneValue(entry),
      ...cloneValue(extra),
    });
  }

  async function appendTimeline(runId, entry, extra = {}) {
    const next = await store.update(runId, (run) => {
      run.timeline = Array.isArray(run.timeline) ? run.timeline : [];
      run.timeline.push(entry);
      run.updatedAt = nowIso();
      return run;
    });
    emitProgress(runId, entry, {
      status: next.status,
      currentStep: next.currentStep,
      progress: next.progress,
      terminal: isTerminalStatus(next.status),
      ...extra,
    });
    return next;
  }

  async function startRun(payload = {}) {
    const runId = createId('run');
    const createdAt = nowIso();
    const run = {
      runId,
      goal: normalizeGoal(payload.goal),
      constraints: isPlainObject(payload.constraints) ? cloneValue(payload.constraints) : {},
      requestedCapabilities: normalizeRequestedCapabilities(payload.requestedCapabilities),
      contextRefs: normalizeContextRefs(payload.contextRefs),
      caller: normalizeCaller(payload),
      runner: normalizeRunner(payload.runner),
      status: 'queued',
      currentStep: null,
      timeline: [],
      capabilityCalls: [],
      artifacts: [],
      warnings: [],
      failures: [],
      result: null,
      progress: {
        completedStepIds: [],
        outputsByStepId: {},
        resumeCount: 0,
      },
      createdAt,
      updatedAt: createdAt,
      startedAt: '',
      finishedAt: '',
      cancelRequestedAt: '',
      cancelReason: '',
    };
    await store.create(run);
    await appendTimeline(
      runId,
      createTimelineEntry({
        type: 'run',
        phase: 'queued',
        status: 'queued',
        title: 'Harness run queued',
        detail: {
          adapterId: run.runner.adapterId,
          goalType: run.goal?.type || '',
        },
      })
    );
    queueExecution(runId);
    return inspectRun({ runId });
  }

  async function inspectRun({ runId } = {}) {
    const normalizedRunId = String(runId || '').trim();
    if (!normalizedRunId) {
      throw createHarnessFailure('USER_ERROR', 'runId is required.');
    }
    const run = await store.read(normalizedRunId);
    if (!run) {
      throw createHarnessFailure('RUN_NOT_FOUND', `Harness run not found: ${normalizedRunId}.`);
    }
    return run;
  }

  async function cancelRun({ runId, reason = '' } = {}) {
    const normalizedRunId = String(runId || '').trim();
    if (!normalizedRunId) {
      throw createHarnessFailure('USER_ERROR', 'runId is required.');
    }
    const current = await inspectRun({ runId: normalizedRunId });
    if (isTerminalStatus(current.status)) {
      return current;
    }

    const cancellationAt = nowIso();
    const next = await store.update(normalizedRunId, (run) => {
      run.cancelRequestedAt = cancellationAt;
      run.cancelReason = String(reason || '').trim();
      run.updatedAt = cancellationAt;
      if (run.status === 'queued') {
        run.status = 'cancelled';
        run.finishedAt = cancellationAt;
      } else {
        run.status = 'cancelling';
      }
      return run;
    });

    await appendTimeline(
      normalizedRunId,
      createTimelineEntry({
        type: 'run',
        phase: 'cancel_requested',
        status: next.status,
        title: 'Harness run cancellation requested',
        detail: {
          reason: String(reason || '').trim(),
        },
      })
    );

    const active = activeRuns.get(normalizedRunId);
    if (active?.abortController) {
      active.abortController.abort();
    }
    return inspectRun({ runId: normalizedRunId });
  }

  async function resumeRun({ runId } = {}) {
    const normalizedRunId = String(runId || '').trim();
    if (!normalizedRunId) {
      throw createHarnessFailure('USER_ERROR', 'runId is required.');
    }
    if (activeRuns.has(normalizedRunId)) {
      throw createHarnessFailure('RUN_ACTIVE', 'Cannot resume an active Harness run.');
    }
    const current = await inspectRun({ runId: normalizedRunId });
    if (!['failed', 'cancelled'].includes(String(current.status || '').trim().toLowerCase())) {
      throw createHarnessFailure(
        'RUN_NOT_RESUMABLE',
        `Harness run cannot be resumed from status: ${current.status || 'unknown'}.`
      );
    }

    const resumedAt = nowIso();
    await store.update(normalizedRunId, (run) => {
      run.status = 'queued';
      run.currentStep = null;
      run.failures = [];
      run.result = null;
      run.finishedAt = '';
      run.cancelRequestedAt = '';
      run.cancelReason = '';
      run.updatedAt = resumedAt;
      run.progress = isPlainObject(run.progress) ? run.progress : {};
      run.progress.resumeCount = Number(run.progress.resumeCount || 0) + 1;
      return run;
    });
    await appendTimeline(
      normalizedRunId,
      createTimelineEntry({
        type: 'run',
        phase: 'resumed',
        status: 'queued',
        title: 'Harness run resumed',
      })
    );
    queueExecution(normalizedRunId);
    return inspectRun({ runId: normalizedRunId });
  }

  async function updateCapabilityCall(runId, callId, updater) {
    return store.update(runId, (run) => {
      run.capabilityCalls = Array.isArray(run.capabilityCalls) ? run.capabilityCalls : [];
      const index = run.capabilityCalls.findIndex((item) => item.callId === callId);
      if (index === -1) {
        throw createHarnessFailure('CALL_NOT_FOUND', `Capability call not found: ${callId}.`);
      }
      const current = run.capabilityCalls[index];
      run.capabilityCalls[index] = updater(current) || current;
      run.updatedAt = nowIso();
      return run;
    });
  }

  function createExecutionContext(runId, abortSignal) {
    const completedSteps = new Set();

    async function loadRun() {
      const run = await inspectRun({ runId });
      run?.progress?.completedStepIds?.forEach((stepId) => completedSteps.add(stepId));
      return run;
    }

    async function ensureRunnable() {
      if (abortSignal?.aborted) {
        throw createHarnessFailure('RUN_CANCELLED', 'Harness run cancellation requested.');
      }
      const latest = await inspectRun({ runId });
      if (latest.cancelRequestedAt) {
        throw createHarnessFailure('RUN_CANCELLED', 'Harness run cancellation requested.');
      }
      return latest;
    }

    return {
      createFailure: createHarnessFailure,
      async getRun() {
        return loadRun();
      },
      isStepCompleted(stepId) {
        return completedSteps.has(String(stepId || '').trim());
      },
      async stepStarted(step, detail = {}) {
        await ensureRunnable();
        const entry = createTimelineEntry({
          type: 'step',
          phase: 'started',
          status: 'running',
          title: step.title || step.id,
          stepId: step.id,
          detail,
        });
        await store.update(runId, (run) => {
          run.status = 'running';
          run.currentStep = {
            id: step.id,
            title: step.title || step.id,
            kind: step.kind || 'capability_call',
          };
          run.updatedAt = nowIso();
          return run;
        });
        await appendTimeline(runId, entry);
      },
      async stepCompleted(step, output) {
        const stepId = String(step.id || '').trim();
        const entry = createTimelineEntry({
          type: 'step',
          phase: 'completed',
          status: 'completed',
          title: step.title || step.id,
          stepId,
          detail: {
            output,
          },
        });
        completedSteps.add(stepId);
        await store.update(runId, (run) => {
          run.currentStep = null;
          run.progress = isPlainObject(run.progress) ? run.progress : {};
          run.progress.completedStepIds = appendUnique(
            run.progress.completedStepIds,
            stepId,
            (current, item) => current === item
          );
          run.progress.outputsByStepId = isPlainObject(run.progress.outputsByStepId)
            ? run.progress.outputsByStepId
            : {};
          run.progress.outputsByStepId[stepId] = cloneValue(output);
          if (output?.session?.id) {
            run.artifacts = appendUnique(
              run.artifacts,
              {
                kind: 'session',
                sessionId: output.session.id,
                profileId: output.session.profileId || '',
                nodeKind: output.session.nodeKind || '',
                role: 'created-agent',
              },
              (current, item) => current?.kind === item?.kind && current?.sessionId === item?.sessionId
            );
          }
          run.updatedAt = nowIso();
          return run;
        });
        await appendTimeline(runId, entry);
      },
      async stepFailed(step, error) {
        const entry = createTimelineEntry({
          type: 'step',
          phase: 'failed',
          status: 'failed',
          title: step.title || step.id,
          stepId: step.id,
          detail: failureFromError(error),
        });
        await store.update(runId, (run) => {
          run.currentStep = {
            id: step.id,
            title: step.title || step.id,
            kind: step.kind || 'capability_call',
          };
          run.updatedAt = nowIso();
          return run;
        });
        await appendTimeline(runId, entry);
      },
      async invokeCapability({ step, capabilityId, title, input }) {
        await ensureRunnable();
        const run = await loadRun();
        const capability = capabilityRegistry.get(capabilityId);
        if (!capability) {
          throw createHarnessFailure(
            'CAPABILITY_NOT_FOUND',
            `Harness capability is not registered: ${capabilityId}.`
          );
        }

        const denied = capability.authorize ? capability.authorize({ run, step, input }) : null;
        if (denied?.success === false) {
          const failure = denied.failures?.[0] || {
            code: 'PERMISSION_DENIED',
            message: `Harness capability call denied: ${capabilityId}.`,
          };
          throw createHarnessFailure(failure.code, failure.message, denied.data || null);
        }

        const callRecord = createCapabilityCallRecord({
          capabilityId,
          title,
          stepId: step?.id,
          input,
        });

        await store.update(runId, (nextRun) => {
          nextRun.capabilityCalls = Array.isArray(nextRun.capabilityCalls) ? nextRun.capabilityCalls : [];
          nextRun.capabilityCalls.push(callRecord);
          nextRun.updatedAt = nowIso();
          return nextRun;
        });

        await appendTimeline(
          runId,
          createTimelineEntry({
            type: 'capability_call',
            phase: 'started',
            status: 'running',
            title: title || capabilityId,
            stepId: step?.id,
            callId: callRecord.callId,
            detail: {
              capabilityId,
            },
          })
        );

        try {
          const invoked = await capability.invoke({
            input: cloneValue(input) || {},
            run,
            step,
            callId: callRecord.callId,
          });
          const response = invoked?.response || null;
          const summary = invoked?.summary || null;
          const artifacts = capability.extractArtifacts
            ? capability.extractArtifacts({
                input,
                run,
                step,
                response,
                summary,
              })
            : [];

          await updateCapabilityCall(runId, callRecord.callId, (current) => ({
            ...current,
            status: response?.success === false ? 'failed' : 'completed',
            completedAt: nowIso(),
            summary,
            warnings: Array.isArray(response?.warnings) ? response.warnings : [],
            failures: Array.isArray(response?.failures) ? response.failures : [],
          }));

          if (artifacts.length > 0) {
            await store.update(runId, (nextRun) => {
              nextRun.artifacts = Array.isArray(nextRun.artifacts) ? nextRun.artifacts : [];
              artifacts.forEach((artifact) => {
                nextRun.artifacts = appendUnique(
                  nextRun.artifacts,
                  artifact,
                  (current, item) =>
                    current?.kind === item?.kind &&
                    (current?.sessionId || current?.path || current?.id || '') ===
                      (item?.sessionId || item?.path || item?.id || '')
                );
              });
              nextRun.updatedAt = nowIso();
              return nextRun;
            });
          }

          await appendTimeline(
            runId,
            createTimelineEntry({
              type: 'capability_call',
              phase: response?.success === false ? 'failed' : 'completed',
              status: response?.success === false ? 'failed' : 'completed',
              title: title || capabilityId,
              stepId: step?.id,
              callId: callRecord.callId,
              detail: {
                capabilityId,
                summary,
              },
            })
          );

          if (response?.success === false) {
            const failure = response.failures?.[0] || {
              code: 'CAPABILITY_FAILED',
              message: `Harness capability call failed: ${capabilityId}.`,
            };
            throw createHarnessFailure(failure.code, failure.message, {
              capabilityId,
              callId: callRecord.callId,
              summary,
            });
          }

          await ensureRunnable();
          return {
            callId: callRecord.callId,
            response,
            summary,
          };
        } catch (error) {
          await updateCapabilityCall(runId, callRecord.callId, (current) => ({
            ...current,
            status: 'failed',
            completedAt: nowIso(),
            failures: appendUnique(
              current.failures,
              failureFromError(error),
              (left, right) => left?.code === right?.code && left?.message === right?.message
            ),
          })).catch(() => undefined);
          throw error;
        }
      },
    };
  }

  async function finalizeRun(runId, status, detail = {}) {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    const finalAt = nowIso();
    await store.update(runId, (run) => {
      run.status = normalizedStatus;
      run.currentStep = null;
      run.finishedAt = finalAt;
      run.updatedAt = finalAt;
      if (normalizedStatus === 'failed') {
        run.failures = Array.isArray(detail.failures) ? detail.failures : [];
      }
      if (normalizedStatus === 'succeeded') {
        run.result = cloneValue(detail.result) || null;
        run.warnings = Array.isArray(detail.warnings) ? detail.warnings : [];
      }
      return run;
    });
    await appendTimeline(
      runId,
      createTimelineEntry({
        type: 'run',
        phase: normalizedStatus,
        status: normalizedStatus,
        title:
          normalizedStatus === 'succeeded'
            ? 'Harness run succeeded'
            : normalizedStatus === 'cancelled'
              ? 'Harness run cancelled'
              : 'Harness run failed',
        detail,
      })
    );
  }

  async function executeRun(runId) {
    if (activeRuns.has(runId)) {
      return activeRuns.get(runId).promise;
    }

    const abortController = new AbortController();
    const promise = (async () => {
      try {
        const current = await inspectRun({ runId });
        if (isTerminalStatus(current.status)) {
          return current;
        }
        if (current.cancelRequestedAt && current.status !== 'queued') {
          await finalizeRun(runId, 'cancelled', {
            reason: current.cancelReason || 'cancel-requested',
          });
          return inspectRun({ runId });
        }

        await store.update(runId, (run) => {
          run.status = 'running';
          run.startedAt = run.startedAt || nowIso();
          run.updatedAt = nowIso();
          return run;
        });
        await appendTimeline(
          runId,
          createTimelineEntry({
            type: 'run',
            phase: 'started',
            status: 'running',
            title: 'Harness run started',
          })
        );

        const run = await inspectRun({ runId });
        const adapter = adapterMap.get(String(run?.runner?.adapterId || '').trim().toLowerCase());
        if (!adapter) {
          throw createHarnessFailure(
            'RUNNER_NOT_FOUND',
            `Harness runner adapter is not registered: ${run?.runner?.adapterId || 'unknown'}.`
          );
        }

        const ctx = createExecutionContext(runId, abortController.signal);
        const result = await adapter.execute(ctx);
        const latest = await inspectRun({ runId });
        if (latest.cancelRequestedAt || abortController.signal.aborted) {
          await finalizeRun(runId, 'cancelled', {
            reason: latest.cancelReason || 'cancel-requested',
          });
        } else {
          await finalizeRun(runId, 'succeeded', {
            result,
          });
        }
      } catch (error) {
        const latest = await inspectRun({ runId }).catch(() => null);
        if (latest?.cancelRequestedAt || abortController.signal.aborted || error?.code === 'RUN_CANCELLED') {
          await finalizeRun(runId, 'cancelled', {
            reason: latest?.cancelReason || 'cancel-requested',
          }).catch(() => undefined);
          return;
        }

        const failure = failureFromError(error, latest?.currentStep?.id ? { stepId: latest.currentStep.id } : {});
        await logRuntime('warn', 'main agent harness run failed', {
          runId,
          code: failure.code,
          message: failure.message,
          callerType: latest?.caller?.callerType || '',
          callerId: latest?.caller?.callerId || '',
          sourceSurface: latest?.caller?.sourceSurface || '',
        }).catch(() => undefined);
        await finalizeRun(runId, 'failed', {
          failures: [failure],
        }).catch(() => undefined);
      } finally {
        activeRuns.delete(runId);
      }
    })();

    activeRuns.set(runId, {
      abortController,
      promise,
    });
    return promise;
  }

  function queueExecution(runId) {
    void executeRun(runId);
  }

  return {
    startRun,
    inspectRun,
    cancelRun,
    resumeRun,
    async listRuns(payload = {}) {
      return store.list(payload || {});
    },
    onProgress(handler) {
      progressEmitter.on('progress', handler);
      return () => {
        progressEmitter.off('progress', handler);
      };
    },
  };
}

module.exports = {
  createHarnessController,
  createHarnessFailure,
};
