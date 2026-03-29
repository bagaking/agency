const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractCodexForkMetadata,
  normalizeForkConfig,
  renderTemplate,
  performSessionRuntimeIntent,
} = require('../sessionRuntime');

test('extractCodexForkMetadata captures acknowledgement and thread id', () => {
  const metadata = extractCodexForkMetadata(
    ['Thread forked from Planning Thread', 'thread_id: thr-12345'].join('\n')
  );

  assert.equal(metadata.acknowledged, true);
  assert.equal(metadata.threadId, 'thr-12345');
  assert.equal(metadata.threadName, 'Planning Thread');
  assert.equal(metadata.variables.thread_id, 'thr-12345');
});

test('renderTemplate reports missing placeholders', () => {
  const rendered = renderTemplate('codex --thread {thread_id} --name {thread_name}', {
    thread_id: 'thr-1',
  });

  assert.equal(rendered.text, 'codex --thread thr-1 --name');
  assert.deepEqual(rendered.missing, ['thread_name']);
});

test('performSessionRuntimeIntent smart_fork falls back to plain child creation without a driver', async () => {
  const createdChildren = [];

  const result = await performSessionRuntimeIntent(
    {
      intent: 'smart_fork',
      worktreePath: '/tmp/repo',
      cellId: 'cell-1',
      cellBranch: 'feat/source',
      sessionId: 'source',
    },
    {
      inspectSessionPane: async () => ({
        session: {
          id: 'source',
          profileId: 'shell',
          cellName: 'Cell 1',
        },
        pane: {
          currentCommand: 'zsh',
        },
        output: '',
        lastActivityAt: null,
      }),
      getResolvedTerminusSettings: async () => ({
        profiles: [
          {
            id: 'shell',
            fork: {
              enabled: false,
            },
          },
        ],
      }),
      createChildSession: async (payload) => {
        createdChildren.push(payload);
        return {
          id: 'child-1',
          profileId: payload.profileId,
          nodeKind: payload.nodeKind,
        };
      },
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.data.mode, 'plain_fork');
  assert.equal(result.data.session.id, 'child-1');
  assert.equal(createdChildren.length, 1);
  assert.equal(createdChildren[0].profileId, 'shell');
  assert.equal(createdChildren[0].nodeKind, 'fork');
  assert.equal(createdChildren[0].cellBranch, 'feat/source');
});

test('performSessionRuntimeIntent smart_fork runs the codex driver and launches the child with thread_id', async () => {
  const dispatches = [];
  let sourcePhase = 'idle';
  let childPhase = 'shell';

  const result = await performSessionRuntimeIntent(
    {
      intent: 'smart_fork',
      worktreePath: '/tmp/repo',
      cellId: 'cell-1',
      sessionId: 'source',
    },
    {
      inspectSessionPane: async ({ sessionId }) => {
        if (sessionId === 'source') {
          return {
            session: {
              id: 'source',
              profileId: 'codex',
              cellName: 'Cell 1',
            },
            pane: {
              currentCommand: 'codex',
            },
            output:
              sourcePhase === 'acked'
                ? 'Thread forked from Main Thread\nthread_id: thr-4242'
                : 'Codex ready',
            lastActivityAt: null,
          };
        }
        return {
          session: {
            id: 'child-1',
            profileId: 'codex',
            cellName: 'Cell 1',
          },
          pane: {
            currentCommand: childPhase === 'ready' ? 'codex' : 'zsh',
          },
          output: childPhase === 'ready' ? 'Codex child ready' : '',
          lastActivityAt: null,
        };
      },
      dispatchSessionInput: async ({ sessionId, text }) => {
        dispatches.push({ sessionId, text });
        if (sessionId === 'source' && text === '/fork') {
          sourcePhase = 'acked';
        }
        if (sessionId === 'child-1' && text.includes('thr-4242')) {
          childPhase = 'ready';
        }
        return {};
      },
      createChildSession: async () => ({
        id: 'child-1',
        profileId: 'codex',
        nodeKind: 'fork',
      }),
      getResolvedTerminusSettings: async () => ({
        profiles: [
          {
            id: 'codex',
            fork: {
              enabled: true,
              driver: 'codex',
              launchTemplate: 'codex --thread {thread_id}',
              sourceIdleMs: 10,
              forkAckTimeoutMs: 100,
              childReadyTimeoutMs: 100,
            },
          },
        ],
      }),
      sleep: async () => undefined,
      logRuntime: async () => undefined,
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.data.mode, 'smart_fork');
  assert.equal(result.data.metadata.threadId, 'thr-4242');
  assert.equal(dispatches[0].text, '/fork');
  assert.equal(dispatches[1].text, 'codex --thread thr-4242');
});

test('performSessionRuntimeIntent smart_fork accepts alternate fork acknowledgement wording', async () => {
  const dispatches = [];
  let sourcePhase = 'idle';
  let childPhase = 'shell';

  const result = await performSessionRuntimeIntent(
    {
      intent: 'smart_fork',
      worktreePath: '/tmp/repo',
      cellId: 'cell-1',
      sessionId: 'source',
    },
    {
      inspectSessionPane: async ({ sessionId }) => {
        if (sessionId === 'source') {
          return {
            session: {
              id: 'source',
              profileId: 'codex',
              cellName: 'Cell 1',
            },
            pane: {
              currentCommand: 'codex',
            },
            output:
              sourcePhase === 'acked'
                ? 'Forked from thread Runtime Thread\nthread_id: thr-alt'
                : 'Codex ready',
            lastActivityAt: null,
          };
        }
        return {
          session: {
            id: 'child-1',
            profileId: 'codex',
            cellName: 'Cell 1',
          },
          pane: {
            currentCommand: childPhase === 'ready' ? 'codex' : 'zsh',
          },
          output: childPhase === 'ready' ? 'Codex child ready' : '',
          lastActivityAt: null,
        };
      },
      dispatchSessionInput: async ({ sessionId, text }) => {
        dispatches.push({ sessionId, text });
        if (sessionId === 'source' && text === '/fork') {
          sourcePhase = 'acked';
        }
        if (sessionId === 'child-1' && text.includes('thr-alt')) {
          childPhase = 'ready';
        }
        return {};
      },
      createChildSession: async () => ({
        id: 'child-1',
        profileId: 'codex',
        nodeKind: 'fork',
      }),
      getResolvedTerminusSettings: async () => ({
        profiles: [
          {
            id: 'codex',
            fork: {
              enabled: true,
              driver: 'codex',
              launchTemplate: 'codex --thread {thread_id}',
              sourceIdleMs: 0,
              forkAckTimeoutMs: 100,
              childReadyTimeoutMs: 100,
            },
          },
        ],
      }),
      sleep: async () => undefined,
      logRuntime: async () => undefined,
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.data.mode, 'smart_fork');
  assert.equal(result.data.metadata.threadId, 'thr-alt');
  assert.equal(result.data.metadata.threadName, 'Runtime Thread');
  assert.equal(dispatches[0].text, '/fork');
  assert.equal(dispatches[1].text, 'codex --thread thr-alt');
});

test('performSessionRuntimeIntent smart_fork selects the codex driver from runtime detection even when the stored profile is shell', async () => {
  const dispatches = [];
  let sourcePhase = 'ready';
  let childPhase = 'shell';
  let createdChildPayload = null;

  const result = await performSessionRuntimeIntent(
    {
      intent: 'smart_fork',
      worktreePath: '/tmp/repo',
      cellId: 'cell-1',
      sessionId: 'source',
    },
    {
      inspectSessionPane: async ({ sessionId }) => {
        if (sessionId === 'source') {
          return {
            session: {
              id: 'source',
              profileId: 'shell',
            },
            pane: {
              currentCommand: 'zsh',
              alternateOn: true,
              inMode: false,
              panePid: 100,
              paneTty: '/dev/ttys001',
            },
            output:
              sourcePhase === 'acked'
                ? 'Thread forked from Runtime Thread\nthread_id: thr-runtime'
                : 'Codex ready',
            lastActivityAt: null,
          };
        }
        return {
          session: {
            id: 'child-1',
            profileId: 'codex',
          },
          pane: {
            currentCommand: childPhase === 'ready' ? 'codex' : 'zsh',
          },
          output: childPhase === 'ready' ? 'Codex ready' : '',
          lastActivityAt: null,
        };
      },
      detectTerminalRuntime: async ({ inspection }) => {
        if (inspection?.session?.id === 'source') {
          return {
            tool: 'codex',
            mode: 'tui',
            busy: false,
            readyForFork: true,
            confidence: 'high',
            evidence: ['foreground-process=codex'],
            process: {
              command: 'codex',
              confidence: 'high',
            },
          };
        }
        return {
          tool: childPhase === 'ready' ? 'codex' : 'unknown',
          mode: childPhase === 'ready' ? 'tui' : 'shell',
          busy: false,
          readyForFork: childPhase === 'ready',
          confidence: 'high',
          evidence: [],
          process: {
            command: childPhase === 'ready' ? 'codex' : '',
            confidence: 'high',
          },
        };
      },
      dispatchSessionInput: async ({ sessionId, text }) => {
        dispatches.push({ sessionId, text });
        if (sessionId === 'source') {
          sourcePhase = 'acked';
        }
        if (sessionId === 'child-1') {
          childPhase = 'ready';
        }
        return {};
      },
      createChildSession: async (payload) => {
        createdChildPayload = payload;
        return {
          id: 'child-1',
          profileId: 'codex',
          nodeKind: 'fork',
        };
      },
      getResolvedTerminusSettings: async () => ({
        profiles: [
          {
            id: 'shell',
            fork: {
              enabled: false,
            },
          },
          {
            id: 'codex',
            fork: {
              enabled: true,
              driver: 'codex',
              launchTemplate: 'codex --thread {thread_id}',
              sourceIdleMs: 0,
              forkAckTimeoutMs: 100,
              childReadyTimeoutMs: 100,
            },
          },
        ],
      }),
      sleep: async () => undefined,
      logRuntime: async () => undefined,
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.data.mode, 'smart_fork');
  assert.equal(result.data.profileId, 'shell');
  assert.equal(result.data.sourceRuntime.tool, 'codex');
  assert.equal(createdChildPayload?.profileId, 'codex');
  assert.equal(dispatches[0].text, '/fork');
  assert.equal(dispatches[1].text, 'codex --thread thr-runtime');
});

test('normalizeForkConfig preserves zero-valued source idle and timeout settings', () => {
  const config = normalizeForkConfig({
    enabled: true,
    driver: 'codex',
    sourceIdleMs: 0,
    forkAckTimeoutMs: 0,
    childReadyTimeoutMs: 0,
  });

  assert.equal(config.sourceIdleMs, 0);
  assert.equal(config.forkAckTimeoutMs, 0);
  assert.equal(config.childReadyTimeoutMs, 0);
});

test('performSessionRuntimeIntent smart_fork skips source-idle wait when sourceIdleMs is 0', async () => {
  const dispatches = [];
  let sourcePhase = 'ready';
  let childPhase = 'shell';

  const result = await performSessionRuntimeIntent(
    {
      intent: 'smart_fork',
      worktreePath: '/tmp/repo',
      cellId: 'cell-1',
      sessionId: 'source',
    },
    {
      inspectSessionPane: async ({ sessionId }) => {
        if (sessionId === 'source') {
          return {
            session: {
              id: 'source',
              profileId: 'codex',
            },
            pane: {
              currentCommand: 'codex',
            },
            output:
              sourcePhase === 'acked'
                ? 'Thread forked from Main Thread\nthread_id: thr-zero'
                : `busy-${Math.random()}`,
            lastActivityAt: null,
          };
        }
        return {
          session: {
            id: 'child-1',
            profileId: 'codex',
          },
          pane: {
            currentCommand: childPhase === 'ready' ? 'codex' : 'zsh',
          },
          output: childPhase === 'ready' ? 'ready' : '',
          lastActivityAt: null,
        };
      },
      dispatchSessionInput: async ({ sessionId, text }) => {
        dispatches.push({ sessionId, text });
        if (sessionId === 'source') {
          sourcePhase = 'acked';
        }
        if (sessionId === 'child-1') {
          childPhase = 'ready';
        }
        return {};
      },
      createChildSession: async () => ({
        id: 'child-1',
        profileId: 'codex',
        nodeKind: 'fork',
      }),
      getResolvedTerminusSettings: async () => ({
        profiles: [
          {
            id: 'codex',
            fork: {
              enabled: true,
              driver: 'codex',
              launchTemplate: 'codex --thread {thread_id}',
              sourceIdleMs: 0,
              forkAckTimeoutMs: 0,
              childReadyTimeoutMs: 0,
            },
          },
        ],
      }),
      sleep: async () => undefined,
      logRuntime: async () => undefined,
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.data.steps[1]?.status, 'skipped');
  assert.equal(dispatches[0]?.text, '/fork');
  assert.equal(dispatches[1]?.text, 'codex --thread thr-zero');
});

test('performSessionRuntimeIntent smart_fork returns timeout diagnostics when fork acknowledgement is missing', async () => {
  let sourcePhase = 'ready';

  const result = await performSessionRuntimeIntent(
    {
      intent: 'smart_fork',
      worktreePath: '/tmp/repo',
      cellId: 'cell-1',
      sessionId: 'source',
    },
    {
      inspectSessionPane: async ({ sessionId }) => {
        if (sessionId !== 'source') {
          throw new Error('child session should not be inspected before fork acknowledgement');
        }
        return {
          session: {
            id: 'source',
            profileId: 'codex',
          },
          pane: {
            currentCommand: 'codex',
            paneTty: '/dev/ttys001',
          },
          output:
            sourcePhase === 'waiting'
              ? 'Codex is waiting for fork confirmation without exposing a thread id'
              : 'Codex ready',
          lastActivityAt: '2026-03-27T18:00:20.000Z',
        };
      },
      dispatchSessionInput: async ({ sessionId, text }) => {
        if (sessionId === 'source' && text === '/fork') {
          sourcePhase = 'waiting';
        }
        return {};
      },
      getResolvedTerminusSettings: async () => ({
        profiles: [
          {
            id: 'codex',
            fork: {
              enabled: true,
              driver: 'codex',
              launchTemplate: 'codex --thread {thread_id}',
              sourceIdleMs: 0,
              forkAckTimeoutMs: 50,
              childReadyTimeoutMs: 50,
            },
          },
        ],
      }),
      sleep: async () => undefined,
      logRuntime: async () => undefined,
    }
  );

  assert.equal(result.success, false);
  assert.equal(result.failures[0]?.code, 'FORK_ACK_TIMEOUT');
  assert.deepEqual(
    (result.data?.steps || []).map((step) => step.id),
    ['inspect-source', 'wait-source-idle', 'dispatch-source-fork']
  );
  assert.equal(result.data?.metadata?.condition?.type, 'pattern');
  assert.match(result.data?.metadata?.expectedAckPattern || '', /Forked from thread/);
  assert.match(
    result.data?.metadata?.lastSnapshot?.outputExcerpt || '',
    /waiting for fork confirmation/i
  );
});

test('performSessionRuntimeIntent smart_fork keeps created child session in failure data when child ready wait times out', async () => {
  let sourcePhase = 'idle';
  let childPhase = 'shell';

  const result = await performSessionRuntimeIntent(
    {
      intent: 'smart_fork',
      worktreePath: '/tmp/repo',
      cellId: 'cell-1',
      sessionId: 'source',
    },
    {
      inspectSessionPane: async ({ sessionId }) => {
        if (sessionId === 'source') {
          return {
            session: {
              id: 'source',
              profileId: 'codex',
              cellName: 'Cell 1',
            },
            pane: {
              currentCommand: 'codex',
            },
            output:
              sourcePhase === 'acked'
                ? 'Thread forked from Main Thread\nthread_id: thr-4242'
                : 'Codex ready',
            lastActivityAt: null,
          };
        }
        return {
          session: {
            id: 'child-1',
            profileId: 'codex',
            cellName: 'Cell 1',
          },
          pane: {
            currentCommand: 'zsh',
          },
          output: childPhase === 'ready' ? 'Codex child ready' : '',
          lastActivityAt: null,
        };
      },
      dispatchSessionInput: async ({ sessionId, text }) => {
        if (sessionId === 'source' && text === '/fork') {
          sourcePhase = 'acked';
        }
        return {};
      },
      createChildSession: async () => ({
        id: 'child-1',
        profileId: 'codex',
        nodeKind: 'fork',
      }),
      getResolvedTerminusSettings: async () => ({
        profiles: [
          {
            id: 'codex',
            fork: {
              enabled: true,
              driver: 'codex',
              launchTemplate: 'codex --thread {thread_id}',
              sourceIdleMs: 0,
              forkAckTimeoutMs: 100,
              childReadyTimeoutMs: 50,
            },
          },
        ],
      }),
      sleep: async () => undefined,
      logRuntime: async () => undefined,
    }
  );

  assert.equal(result.success, false);
  assert.equal(result.failures[0]?.code, 'CHILD_READY_TIMEOUT');
  assert.equal(result.data?.session?.id, 'child-1');
  assert.equal(result.data?.sourceRuntime?.tool, 'codex');
  assert.equal(result.data?.launch?.command, 'codex --thread thr-4242');
});

test('performSessionRuntimeIntent smart_fork returns a structured error when the source is not codex', async () => {
  const result = await performSessionRuntimeIntent(
    {
      intent: 'smart_fork',
      worktreePath: '/tmp/repo',
      cellId: 'cell-1',
      sessionId: 'source',
    },
    {
      inspectSessionPane: async () => ({
        session: {
          id: 'source',
          profileId: 'codex',
        },
        pane: {
          currentCommand: 'zsh',
        },
        output: '',
        lastActivityAt: null,
      }),
      getResolvedTerminusSettings: async () => ({
        profiles: [
          {
            id: 'codex',
            fork: {
              enabled: true,
              driver: 'codex',
              launchTemplate: 'codex --thread {thread_id}',
            },
          },
        ],
      }),
      sleep: async () => undefined,
      logRuntime: async () => undefined,
    }
  );

  assert.equal(result.success, false);
  assert.equal(result.failures[0]?.code, 'SOURCE_NOT_CODEX');
});

export {};
