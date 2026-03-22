const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SESSION_NODE_KINDS,
  SESSION_REGISTRY_VERSION,
  normalizeSessionRegistry,
  moveSessionNodeInRegistry,
} = require('../sessionTopology.ts');

test('normalizeSessionRegistry migrates flat registries to version 2 root topology', () => {
  const result = normalizeSessionRegistry({
    version: 1,
    sessions: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ],
  });

  assert.equal(result.registry.version, SESSION_REGISTRY_VERSION);
  assert.deepEqual(
    result.registry.sessions.map((session) => ({
      id: session.id,
      parentSessionId: session.parentSessionId,
      order: session.order,
      nodeKind: session.nodeKind,
    })),
    [
      { id: 'a', parentSessionId: null, order: 1000, nodeKind: SESSION_NODE_KINDS.ROOT },
      { id: 'b', parentSessionId: null, order: 2000, nodeKind: SESSION_NODE_KINDS.ROOT },
    ]
  );
});

test('normalizeSessionRegistry repairs missing parents and cycles', () => {
  const result = normalizeSessionRegistry({
    version: 2,
    sessions: [
      { id: 'root', parentSessionId: null, order: 1000, nodeKind: 'root' },
      { id: 'orphan', parentSessionId: 'missing', order: 1000, nodeKind: 'fork' },
      { id: 'cycle-a', parentSessionId: 'cycle-b', order: 1000, nodeKind: 'sub_terminal' },
      { id: 'cycle-b', parentSessionId: 'cycle-a', order: 2000, nodeKind: 'sub_terminal' },
    ],
  });

  const sessionsById = new Map<string, any>(
    result.registry.sessions.map((session) => [session.id, session] as const)
  );
  assert.equal(sessionsById.get('orphan').parentSessionId, null);
  assert.equal(sessionsById.get('cycle-a').parentSessionId, 'cycle-b');
  assert.equal(sessionsById.get('cycle-b').parentSessionId, null);
});

test('moveSessionNodeInRegistry reparents and renumbers siblings', () => {
  const result = moveSessionNodeInRegistry(
    {
      version: 2,
      sessions: [
        { id: 'root-a', parentSessionId: null, order: 1000, nodeKind: 'root' },
        { id: 'root-b', parentSessionId: null, order: 2000, nodeKind: 'root' },
        { id: 'child-a', parentSessionId: 'root-a', order: 1000, nodeKind: 'sub_terminal' },
      ],
    },
    {
      sessionId: 'root-b',
      parentSessionId: 'root-a',
      beforeSessionId: 'child-a',
    }
  );

  const sessionsById = new Map<string, any>(
    result.registry.sessions.map((session) => [session.id, session] as const)
  );
  assert.equal(sessionsById.get('root-b').parentSessionId, 'root-a');
  assert.equal(sessionsById.get('root-b').order, 1000);
  assert.equal(sessionsById.get('child-a').order, 2000);
});

test('moveSessionNodeInRegistry rejects moving a node under its descendant', () => {
  assert.throws(
    () =>
      moveSessionNodeInRegistry(
        {
          version: 2,
          sessions: [
            { id: 'root-a', parentSessionId: null, order: 1000, nodeKind: 'root' },
            { id: 'child-a', parentSessionId: 'root-a', order: 1000, nodeKind: 'sub_terminal' },
          ],
        },
        {
          sessionId: 'root-a',
          parentSessionId: 'child-a',
          beforeSessionId: null,
        }
      ),
    /descendants/i
  );
});
