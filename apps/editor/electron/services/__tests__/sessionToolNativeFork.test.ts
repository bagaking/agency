const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createSessionToolNativeForkSkillPack,
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
