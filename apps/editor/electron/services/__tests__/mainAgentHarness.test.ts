const test = require('node:test');
const assert = require('node:assert/strict');

const { createHarnessController } = require('../mainAgentHarness/controller');
const { createMemoryHarnessRunStore } = require('../mainAgentHarness/store');

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function waitForStatus(controller, runId, expectedStatus, timeoutMs = 2000) {
  const startedAt = Date.now();
  for (;;) {
    const run = await controller.inspectRun({ runId });
    if (run.status === expectedStatus) {
      return run;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`Timed out waiting for status ${expectedStatus}; current=${run.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function createFakeCapabilityRegistry(overrides: any = {}) {
  const calls = [];
  const fileIntentInvoke = overrides.fileIntentInvoke || (async ({ input }) => ({
    response: {
      success: true,
      intent: input.intent,
      warnings: [],
      failures: [],
      affectedPaths: ['.agency/handoff.md'],
      data: {
        path: '.agency/handoff.md',
      },
    },
    summary: {
      success: true,
      intent: input.intent,
      affectedPaths: ['.agency/handoff.md'],
    },
  }));
  const sessionRuntimeInvoke = overrides.sessionRuntimeInvoke || (async ({ input }) => ({
    response: {
      success: true,
      intent: input.intent,
      warnings: [],
      failures: [],
      data: {
        session: {
          id: 'child-1',
          profileId: 'codex',
          nodeKind: 'fork',
        },
        sourceSession: {
          id: input.sessionId || 'source',
          profileId: 'codex',
        },
        sourceRuntime: {
          tool: 'codex',
        },
        metadata: {
          threadId: 'thr-1',
        },
        launch: {
          command: 'codex --thread thr-1',
        },
        profileFork: {
          driver: 'codex',
        },
      },
    },
    summary: {
      success: true,
      intent: input.intent,
      data: {
        session: {
          id: 'child-1',
        },
      },
    },
  }));

  const registry = {
    calls,
    get(capabilityId) {
      if (capabilityId === 'session.runtime') {
        return {
          id: 'session.runtime',
          title: 'Session Runtime Gateway',
          authorize: () => null,
          async invoke(payload) {
            calls.push({
              capabilityId,
              input: payload.input,
              callId: payload.callId,
            });
            return sessionRuntimeInvoke(payload);
          },
          extractArtifacts({ response }) {
            const session = response?.data?.session;
            return session?.id
              ? [
                  {
                    kind: 'session',
                    sessionId: session.id,
                  },
                ]
              : [];
          },
        };
      }
      if (capabilityId === 'file.intent') {
        return {
          id: 'file.intent',
          title: 'File Intent Gateway',
          authorize: ({ run, input }) => {
            const requested = Array.isArray(run?.requestedCapabilities)
              ? run.requestedCapabilities
              : [];
            if (!requested.includes('file.intent') || !requested.includes('file.write')) {
              return {
                success: false,
                failures: [
                  {
                    code: 'PERMISSION_DENIED',
                    message: 'Missing file intent permissions.',
                  },
                ],
                data: null,
              };
            }
            return null;
          },
          async invoke(payload) {
            calls.push({
              capabilityId,
              input: payload.input,
              callId: payload.callId,
            });
            return fileIntentInvoke(payload);
          },
          extractArtifacts({ response }) {
            return (response?.affectedPaths || []).map((itemPath) => ({
              kind: 'file-path',
              path: itemPath,
            }));
          },
        };
      }
      return null;
    },
  };
  return registry;
}

test('main agent harness records create_agent specialization and capability calls', async () => {
  const store = createMemoryHarnessRunStore();
  const registry = createFakeCapabilityRegistry();
  const controller = createHarnessController({
    store,
    capabilityRegistry: registry,
    logRuntime: async () => undefined,
  });
  const events = [];
  controller.onProgress((event) => events.push(event));

  const started = await controller.startRun({
    sourceSurface: 'unit-test',
    callerType: 'tool',
    callerId: 'main-agent-harness-test',
    goal: {
      type: 'create_agent',
      title: 'Create Agent via tool-native fork',
    },
    requestedCapabilities: ['session.runtime', 'file.intent', 'file.write'],
    runner: {
      adapterId: 'reference',
      steps: [
        {
          id: 'create-agent',
          kind: 'create_agent',
          title: 'Create Agent from selected session',
          skillPackId: 'session.tool-native-fork',
          agent: {
            strategy: 'tool_native_fork',
            sessionRuntime: {
              worktreePath: '/tmp/repo',
              cellId: 'cell-1',
              cellName: 'Cell 1',
              cellBranch: 'feat/test',
              sessionId: 'source',
            },
          },
        },
        {
          id: 'write-handoff',
          kind: 'capability_call',
          capabilityId: 'file.intent',
          title: 'Write handoff note',
          input: {
            intent: 'create',
            rootPath: '/tmp/repo',
            parentPath: '.agency',
            name: 'handoff.md',
            type: 'file',
          },
        },
      ],
    },
  });

  const settled = await waitForStatus(controller, started.runId, 'succeeded');
  assert.equal(settled.result.agent.session.id, 'child-1');
  assert.equal(settled.result.agent.specialization.strategy, 'tool_native_fork');
  assert.equal(settled.capabilityCalls.length, 2);
  assert.deepEqual(
    settled.capabilityCalls.map((item) => item.capabilityId),
    ['session.runtime', 'file.intent']
  );
  assert.ok(settled.timeline.some((entry) => entry.type === 'step' && entry.stepId === 'create-agent'));
  assert.ok(
    settled.timeline.some(
      (entry) =>
        entry.type === 'capability_call' &&
        entry.callId === settled.capabilityCalls[0].callId &&
        entry.phase === 'completed'
    )
  );
  assert.ok(settled.artifacts.some((item) => item.kind === 'session' && item.sessionId === 'child-1'));
  assert.ok(
    events.some(
      (event) =>
        event.runId === started.runId &&
        event.entry?.type === 'run' &&
        event.entry?.phase === 'succeeded'
    )
  );
});

test('main agent harness can cancel and resume a run', async () => {
  const store = createMemoryHarnessRunStore();
  const firstAttempt = createDeferred();
  let invocationCount = 0;
  const registry = createFakeCapabilityRegistry({
    fileIntentInvoke: async ({ input }) => {
      invocationCount += 1;
      if (invocationCount === 1) {
        await firstAttempt.promise;
      }
      return {
        response: {
          success: true,
          intent: input.intent,
          warnings: [],
          failures: [],
          affectedPaths: ['notes.md'],
          data: {
            path: 'notes.md',
          },
        },
        summary: {
          success: true,
          intent: input.intent,
          affectedPaths: ['notes.md'],
        },
      };
    },
  });
  const controller = createHarnessController({
    store,
    capabilityRegistry: registry,
    logRuntime: async () => undefined,
  });

  const started = await controller.startRun({
    sourceSurface: 'unit-test',
    requestedCapabilities: ['file.intent', 'file.write'],
    runner: {
      adapterId: 'reference',
      steps: [
        {
          id: 'write-handoff',
          kind: 'capability_call',
          capabilityId: 'file.intent',
          input: {
            intent: 'create',
            rootPath: '/tmp/repo',
            parentPath: '.',
            name: 'notes.md',
            type: 'file',
          },
        },
      ],
    },
  });

  await waitForStatus(controller, started.runId, 'running');
  const cancelling = await controller.cancelRun({
    runId: started.runId,
    reason: 'user-requested',
  });
  assert.equal(cancelling.status, 'cancelling');

  firstAttempt.resolve();
  const cancelled = await waitForStatus(controller, started.runId, 'cancelled');
  assert.equal(cancelled.cancelReason, 'user-requested');

  const resumed = await controller.resumeRun({ runId: started.runId });
  assert.equal(resumed.status, 'queued');
  const succeeded = await waitForStatus(controller, started.runId, 'succeeded');
  assert.equal(succeeded.progress.resumeCount, 1);
  assert.equal(invocationCount, 2);
  assert.equal(succeeded.capabilityCalls.length, 2);
  assert.ok(
    succeeded.timeline.some((entry) => entry.type === 'run' && entry.phase === 'resumed')
  );
});

export {};
