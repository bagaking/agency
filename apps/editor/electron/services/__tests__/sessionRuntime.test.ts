const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractCodexForkMetadata,
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
