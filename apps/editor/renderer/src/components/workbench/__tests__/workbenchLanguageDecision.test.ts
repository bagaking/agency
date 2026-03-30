import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveWorkbenchLanguageDecision } from '../workbenchLanguageDecision';

test('resolveWorkbenchLanguageDecision prefers manual override over project and builtin', () => {
  const decision = resolveWorkbenchLanguageDecision({
    targetPath: 'Tiltfile',
    manualLanguage: 'yml',
    projectRules: [{ match: 'Tiltfile', language: 'python' }],
  });

  assert.equal(decision.language, 'yaml');
  assert.equal(decision.source, 'manual');
  assert.equal(decision.sourceLabel, 'Local Override');
});

test('resolveWorkbenchLanguageDecision applies project basename and path rules before builtin', () => {
  const byBasename = resolveWorkbenchLanguageDecision({
    targetPath: 'Tiltfile',
    projectRules: [{ match: 'Tiltfile', language: 'python' }],
  });
  assert.equal(byBasename.language, 'python');
  assert.equal(byBasename.source, 'project');

  const byPath = resolveWorkbenchLanguageDecision({
    targetPath: 'configs/service.foo',
    projectRules: [{ match: 'configs/*.foo', language: 'yaml' }],
  });
  assert.equal(byPath.language, 'yaml');
  assert.equal(byPath.source, 'project');

  const rootLevel = resolveWorkbenchLanguageDecision({
    targetPath: '.env.local',
    projectRules: [{ match: '**/*.env.local', language: 'sh' }],
  });
  assert.equal(rootLevel.language, 'shell');
  assert.equal(rootLevel.source, 'project');
});

test('resolveWorkbenchLanguageDecision falls back to builtin detection when no override matches', () => {
  const decision = resolveWorkbenchLanguageDecision({
    targetPath: 'Dockerfile.dev',
    projectRules: [],
  });

  assert.equal(decision.language, 'dockerfile');
  assert.equal(decision.source, 'builtin');
  assert.equal(decision.sourceLabel, 'Auto');
  assert.equal(decision.matchedRule, null);
});
