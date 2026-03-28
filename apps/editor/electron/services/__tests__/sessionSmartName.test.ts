const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createSessionSmartNameSkillPack,
} = require('../mainAgentHarness/skillPacks/sessionSmartName');

test('session smart name deterministic fallback derives bounded candidates from context', () => {
  const skillPack = createSessionSmartNameSkillPack();

  const decision = skillPack.buildDeterministicDecision({
    preparedContext: {
      payload: {
        sessionName: 'CLI - codex',
        cellName: 'feat/agent_schedule',
        cellBranch: 'feat/agent_schedule',
      },
      runtime: {
        tool: 'codex',
      },
      projectName: 'arch-codinx',
      session: {
        name: 'CLI - codex',
      },
    },
  });

  assert.equal(decision.mode, 'suggest');
  assert.ok(Array.isArray(decision.candidates));
  assert.ok(decision.candidates.length >= 1);
  assert.ok(decision.candidates.length <= 3);
  assert.match(decision.candidates.join(' | '), /Agent Schedule|Arch Codinx|Codex/i);
});

export {};
