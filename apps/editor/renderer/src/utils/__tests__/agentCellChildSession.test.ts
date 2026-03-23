import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAgentCellChildSessionOptions } from '../agentCellChildSession';

test('buildAgentCellChildSessionOptions creates shell child for sub terminal', () => {
  const options = buildAgentCellChildSessionOptions({
    parentSession: {
      id: 'agent-session',
      profileId: 'codex',
    },
    nodeKind: 'sub_terminal',
  });

  assert.deepEqual(options, {
    profileId: 'shell',
    parentSessionId: 'agent-session',
    nodeKind: 'sub_terminal',
    sourceSessionId: 'agent-session',
  });
});

test('buildAgentCellChildSessionOptions keeps parent profile for fork', () => {
  const options = buildAgentCellChildSessionOptions({
    parentSession: {
      id: 'agent-session',
      profileId: 'gemini',
    },
    nodeKind: 'fork',
  });

  assert.deepEqual(options, {
    profileId: 'gemini',
    parentSessionId: 'agent-session',
    nodeKind: 'fork',
    sourceSessionId: 'agent-session',
    smartFork: true,
  });
});

test('buildAgentCellChildSessionOptions falls back to shell when fork parent has no profile', () => {
  const options = buildAgentCellChildSessionOptions({
    parentSession: {
      id: 'plain-session',
    },
    nodeKind: 'fork',
  });

  assert.deepEqual(options, {
    profileId: 'shell',
    parentSessionId: 'plain-session',
    nodeKind: 'fork',
    sourceSessionId: 'plain-session',
    smartFork: true,
  });
});
