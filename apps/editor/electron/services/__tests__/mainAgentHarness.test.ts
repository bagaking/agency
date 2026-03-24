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

function createFakeProviderRegistry(decideStep) {
  return {
    get(providerId) {
      if (providerId !== 'codex_cli') {
        return null;
      }
      return {
        id: 'codex_cli',
        title: 'Fake Codex CLI Provider',
        async decideStep(payload) {
          const decision = await decideStep(payload);
          return {
            providerId: 'codex_cli',
            threadId: 'thread-provider-1',
            rawText: JSON.stringify(decision),
            events: [],
            decision,
          };
        },
      };
    },
  };
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
    sourceSurface: 'main-agent-harness-cli',
    callerType: 'cli',
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
  }, {
    transportTrust: 'trusted_host_cli',
    accessScope: 'process',
  });

  const settled = await waitForStatus(controller, started.runId, 'succeeded');
  assert.equal(settled.result.agent.session.id, 'child-1');
  assert.equal(settled.result.agent.specialization.strategy, 'tool_native_fork');
  assert.equal(settled.capabilityCalls.length, 3);
  assert.deepEqual(
    settled.capabilityCalls.map((item) => item.capabilityId),
    ['session.runtime', 'session.runtime', 'file.intent']
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
    sourceSurface: 'main-agent-harness-cli',
    callerType: 'cli',
    callerId: 'main-agent-harness-test',
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
  }, {
    transportTrust: 'trusted_host_cli',
    accessScope: 'process',
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

test('main agent harness policy strips renderer self-granted capabilities outside the fixed allowlist', async () => {
  const store = createMemoryHarnessRunStore();
  const controller = createHarnessController({
    store,
    capabilityRegistry: createFakeCapabilityRegistry(),
    logRuntime: async () => undefined,
  });

  const started = await controller.startRun({
    sourceSurface: 'agent-cells',
    callerType: 'renderer',
    callerId: 'agent-cells-fork',
    requestedCapabilities: ['session.runtime', 'file.intent', 'file.write'],
    runner: {
      adapterId: 'reference',
      steps: [
        {
          id: 'create-agent',
          kind: 'create_agent',
          skillPackId: 'session.tool-native-fork',
          agent: {
            strategy: 'tool_native_fork',
            sessionRuntime: {
              worktreePath: '/tmp/repo',
              cellId: 'cell-1',
              sessionId: 'source',
            },
          },
        },
      ],
    },
  }, {
    transportTrust: 'renderer_ipc',
    ownerWindowStateId: 'window-a',
    accessScope: 'window',
  });

  assert.deepEqual(started.requestedCapabilities, ['session.runtime']);
  assert.deepEqual(started.requestedCapabilitiesRequested, [
    'session.runtime',
    'file.intent',
    'file.write',
  ]);
  assert.deepEqual(started.policy.deniedCapabilities, ['file.intent', 'file.write']);
});

test('main agent harness window-scoped inspect denies access from a different window owner', async () => {
  const store = createMemoryHarnessRunStore();
  const controller = createHarnessController({
    store,
    capabilityRegistry: createFakeCapabilityRegistry(),
    logRuntime: async () => undefined,
  });

  const started = await controller.startRun(
    {
      sourceSurface: 'agent-cells',
      callerType: 'renderer',
      callerId: 'agent-cells-fork',
      requestedCapabilities: ['session.runtime'],
      runner: {
        adapterId: 'reference',
        steps: [
          {
            id: 'create-agent',
            kind: 'create_agent',
            skillPackId: 'session.tool-native-fork',
            agent: {
              strategy: 'tool_native_fork',
              sessionRuntime: {
                worktreePath: '/tmp/repo',
                cellId: 'cell-1',
                sessionId: 'source',
              },
            },
          },
        ],
      },
    },
    {
      transportTrust: 'renderer_ipc',
      ownerWindowStateId: 'window-a',
      accessScope: 'window',
    }
  );

  await assert.rejects(
    controller.inspectRun(
      { runId: started.runId },
      {
        ownerWindowStateId: 'window-b',
        accessScope: 'window',
      }
    ),
    /not owned by the current window/i
  );
});

test('main agent harness does not trust CLI identity claimed from renderer transport', async () => {
  const store = createMemoryHarnessRunStore();
  const controller = createHarnessController({
    store,
    capabilityRegistry: createFakeCapabilityRegistry(),
    logRuntime: async () => undefined,
  });

  const started = await controller.startRun(
    {
      sourceSurface: 'main-agent-harness-cli',
      callerType: 'cli',
      callerId: 'spoofed-renderer',
      requestedCapabilities: ['file.intent', 'file.write'],
      runner: {
        adapterId: 'reference',
        steps: [
          {
            id: 'write-note',
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
    },
    {
      transportTrust: 'renderer_ipc',
      ownerWindowStateId: 'window-a',
      accessScope: 'window',
    }
  );

  assert.deepEqual(started.requestedCapabilities, []);
  assert.equal(started.policy.strategy, 'deny_by_default');
});

test('main agent harness rejects duplicate active tool-native fork runs for the same source session', async () => {
  const store = createMemoryHarnessRunStore();
  const blocker = createDeferred();
  const controller = createHarnessController({
    store,
    capabilityRegistry: createFakeCapabilityRegistry({
      sessionRuntimeInvoke: async (payload) => {
        await blocker.promise;
        return {
          response: {
            success: true,
            intent: payload.input.intent,
            warnings: [],
            failures: [],
            data: {
              session: {
                id: 'child-1',
                profileId: 'codex',
                nodeKind: 'fork',
              },
            },
          },
          summary: {
            success: true,
            intent: payload.input.intent,
          },
        };
      },
    }),
    logRuntime: async () => undefined,
  });

  const runPayload = {
    sourceSurface: 'agent-cells',
    callerType: 'renderer',
    callerId: 'agent-cells-fork',
    requestedCapabilities: ['session.runtime'],
    runner: {
      adapterId: 'reference',
      steps: [
        {
          id: 'create-agent',
          kind: 'create_agent',
          skillPackId: 'session.tool-native-fork',
          agent: {
            strategy: 'tool_native_fork',
            sessionRuntime: {
              worktreePath: '/tmp/repo',
              cellId: 'cell-1',
              sessionId: 'source',
            },
          },
        },
      ],
    },
  };
  const runContext = {
    transportTrust: 'renderer_ipc',
    ownerWindowStateId: 'window-a',
    accessScope: 'window',
  };

  const started = await controller.startRun(runPayload, runContext);
  await waitForStatus(controller, started.runId, 'running');

  await assert.rejects(
    controller.startRun(runPayload, {
      transportTrust: 'renderer_ipc',
      ownerWindowStateId: 'window-b',
      accessScope: 'window',
    }),
    /already active/i
  );

  blocker.resolve();
  await waitForStatus(controller, started.runId, 'succeeded');
});

test('main agent harness hides process-scoped CLI runs from renderer callers', async () => {
  const store = createMemoryHarnessRunStore();
  const controller = createHarnessController({
    store,
    capabilityRegistry: createFakeCapabilityRegistry(),
    logRuntime: async () => undefined,
  });

  const started = await controller.startRun(
    {
      sourceSurface: 'main-agent-harness-cli',
      callerType: 'cli',
      callerId: 'main-agent-harness-test',
      requestedCapabilities: ['file.intent', 'file.write'],
      runner: {
        adapterId: 'reference',
        steps: [
          {
            id: 'write-note',
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
    },
    {
      transportTrust: 'trusted_host_cli',
      accessScope: 'process',
    }
  );

  await waitForStatus(controller, started.runId, 'succeeded');

  const rendererRuns = await controller.listRuns(
    { limit: 20 },
    {
      transportTrust: 'renderer_ipc',
      ownerWindowStateId: 'window-a',
      accessScope: 'window',
    }
  );
  assert.equal(rendererRuns.length, 0);

  await assert.rejects(
    controller.inspectRun(
      { runId: started.runId },
      {
        transportTrust: 'renderer_ipc',
        ownerWindowStateId: 'window-a',
        accessScope: 'window',
      }
    ),
    /not visible to renderer windows/i
  );
});

test('main agent harness defaults create-agent runs to agent_backed with codex provider decisions', async () => {
  const store = createMemoryHarnessRunStore();
  const registry = createFakeCapabilityRegistry({
    sessionRuntimeInvoke: async ({ input }) => {
      if (input.intent === 'inspect') {
        return {
          response: {
            success: true,
            intent: 'inspect',
            warnings: [],
            failures: [],
            data: {
              session: {
                id: input.sessionId || 'source',
                profileId: 'codex',
              },
              runtime: {
                tool: 'codex',
                mode: 'tui',
                readyForFork: true,
              },
            },
          },
          summary: {
            success: true,
            intent: 'inspect',
            data: {
              sourceRuntime: {
                tool: 'codex',
              },
            },
          },
        };
      }
      if (input.intent === 'create_child') {
        return {
          response: {
            success: true,
            intent: 'create_child',
            warnings: [],
            failures: [],
            data: {
              session: {
                id: 'child-create-agent',
                profileId: input.profileId || 'codex',
                nodeKind: input.nodeKind || 'fork',
              },
              sourceSession: {
                id: input.sourceSessionId || input.sessionId || 'source',
                profileId: 'codex',
              },
            },
          },
          summary: {
            success: true,
            intent: 'create_child',
            data: {
              session: {
                id: 'child-create-agent',
              },
            },
          },
        };
      }
      if (input.intent === 'dispatch_input') {
        return {
          response: {
            success: true,
            intent: 'dispatch_input',
            warnings: [],
            failures: [],
            data: {
              session: {
                id: input.sessionId,
                profileId: 'codex',
                nodeKind: 'fork',
              },
            },
          },
          summary: {
            success: true,
            intent: 'dispatch_input',
          },
        };
      }
      return {
        response: {
          success: true,
          intent: input.intent,
          warnings: [],
          failures: [],
          data: {},
        },
        summary: {
          success: true,
          intent: input.intent,
        },
      };
    },
  });
  const providerRegistry = createFakeProviderRegistry(async ({ preparedContext }) => ({
    mode: 'create_child_start',
    summary: 'Create a child session and start Codex in the child.',
    capabilityCalls: [
      {
        capabilityId: 'session.runtime',
        title: 'Create child session',
        input: {
          intent: 'create_child',
          worktreePath: preparedContext.payload.worktreePath,
          cellId: preparedContext.payload.cellId,
          cellName: preparedContext.payload.cellName,
          cellBranch: preparedContext.payload.cellBranch,
          sessionId: preparedContext.payload.sessionId,
          sourceSessionId: preparedContext.payload.sessionId,
          profileId: preparedContext.payload.profileId,
          nodeKind: 'fork',
        },
      },
      {
        capabilityId: 'session.runtime',
        title: 'Launch child session input',
        input: {
          intent: 'dispatch_input',
          worktreePath: preparedContext.payload.worktreePath,
          sessionIdFromPreviousCall: 0,
          text: 'codex',
          confirm: {
            mode: 'enter',
            settleMs: 64,
            keys: [],
          },
        },
      },
    ],
  }));
  const controller = createHarnessController({
    store,
    capabilityRegistry: registry,
    providerRegistry,
    logRuntime: async () => undefined,
  });

  const started = await controller.startRun(
    {
      sourceSurface: 'agent-cells',
      callerType: 'renderer',
      callerId: 'agent-cells-fork',
      requestedCapabilities: ['session.runtime'],
      runner: {
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
                cellBranch: 'main',
                sessionId: 'source',
                profileId: 'codex',
              },
            },
          },
        ],
      },
    },
    {
      transportTrust: 'trusted_host_cli',
      accessScope: 'process',
    }
  );

  const settled = await waitForStatus(controller, started.runId, 'succeeded');
  assert.equal(settled.runner.adapterId, 'agent_backed');
  assert.equal(settled.result.adapterId, 'agent_backed');
  assert.equal(settled.result.agent.session.id, 'child-create-agent');
  assert.equal(settled.result.agent.mode, 'create_child_start');
  assert.equal(settled.result.agent.launch.command, 'codex');
  assert.deepEqual(
    settled.capabilityCalls.map((item) => item.request.intent),
    ['inspect', 'create_child', 'dispatch_input']
  );
});

export {};
