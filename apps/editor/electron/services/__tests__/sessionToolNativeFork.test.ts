const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createSessionToolNativeForkSkillPack,
  resolveProfileForRuntime,
} = require('../mainAgentHarness/skillPacks/sessionToolNativeFork');

test('session tool-native fork fails instead of create_child_only when no launch path exists', () => {
  const skillPack = createSessionToolNativeForkSkillPack();

  const decision = skillPack.buildDeterministicDecision({
    preparedContext: {
      payload: {
        worktreePath: '/tmp/repo',
        cellId: 'cell-1',
        cellName: 'Cell 1',
        cellBranch: 'main',
        sessionId: 'source',
        profileId: 'shell',
      },
      sourceRuntime: {
        tool: 'unknown',
        readyForFork: false,
      },
      profile: {
        id: 'shell',
        startCommand: '',
        resumeCommand: '',
        fork: {
          enabled: false,
          driver: '',
          launchTemplate: '',
        },
      },
    },
  });

  assert.equal(decision.mode, 'fail');
  assert.equal(decision.failure.code, 'FORK_UNSUPPORTED_NO_LAUNCH_PATH');
  assert.match(decision.failure.message, /create_child_only/i);
});

test('session tool-native fork validateDecision rejects legacy create_child_only results', () => {
  const skillPack = createSessionToolNativeForkSkillPack();

  assert.throws(
    () =>
      skillPack.validateDecision({
        mode: 'create_child_only',
        capabilityCalls: [
          {
            capabilityId: 'session.runtime',
            input: {
              intent: 'create_child',
            },
          },
        ],
      }),
    /Invalid|decision/i
  );
});

test('resolveProfileForRuntime can match a codex runtime against a UUID profile via label and launch command', () => {
  const profile = resolveProfileForRuntime(
    [
      {
        id: 'shell',
        label: 'Shell',
        startCommand: '',
        resumeCommand: '',
        fork: {
          enabled: false,
          driver: '',
          launchTemplate: '',
        },
      },
      {
        id: 'ee735eb6-0676-46d9-b546-d4d19bb2e120',
        label: 'codex',
        startCommand: 'codexL --dangerously-bypass-approvals-and-sandbox',
        resumeCommand: 'codex resume',
        fork: {
          enabled: false,
          driver: '',
          launchTemplate: '',
        },
      },
    ],
    'shell',
    'codex'
  );

  assert.equal(profile?.id, 'ee735eb6-0676-46d9-b546-d4d19bb2e120');
});

test('session tool-native fork chooses smart_fork for a UUID codex profile when fork is enabled', () => {
  const skillPack = createSessionToolNativeForkSkillPack();

  const decision = skillPack.buildDeterministicDecision({
    preparedContext: {
      payload: {
        worktreePath: '/tmp/repo',
        cellId: 'cell-1',
        cellName: 'Cell 1',
        cellBranch: 'main',
        sessionId: 'source',
        profileId: 'ee735eb6-0676-46d9-b546-d4d19bb2e120',
        sourceSessionId: 'source',
      },
      sourceRuntime: {
        tool: 'codex',
        readyForFork: true,
      },
      profile: {
        id: 'ee735eb6-0676-46d9-b546-d4d19bb2e120',
        label: 'codex',
        startCommand: 'codexL --dangerously-bypass-approvals-and-sandbox',
        resumeCommand: 'codex --dangerously-bypass-approvals-and-sandbox resume',
        fork: {
          enabled: true,
          driver: 'codex',
          launchTemplate: 'codex --dangerously-bypass-approvals-and-sandbox resume {thread_id}',
        },
      },
    },
  });

  assert.equal(decision.mode, 'smart_fork');
  assert.equal(decision.capabilityCalls?.[0]?.input?.intent, 'smart_fork');
});

export {};
