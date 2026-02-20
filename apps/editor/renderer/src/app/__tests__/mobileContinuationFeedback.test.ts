import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMobileContinuationFeedback,
  resolveMobileContinuationErrorTitle,
} from '../mobileContinuationFeedback';

test('buildMobileContinuationFeedback returns direct success content', () => {
  const feedback = buildMobileContinuationFeedback({
    requestedMode: 'direct',
    sessionId: 'sess-1',
    result: {
      mode: 'direct',
      sessionName: 'Session 1',
      ssh: {
        ready: true,
        user: 'alice',
        host: '100.64.0.9',
        port: 22,
        autoEnabled: false,
      },
    },
  });

  assert.equal(feedback.kind, 'success');
  assert.equal(feedback.title, 'Mobile command copied');
  assert.match(feedback.description, /Session 1 -> alice@100\.64\.0\.9:22/);
});

test('buildMobileContinuationFeedback returns hub warning content', () => {
  const feedback = buildMobileContinuationFeedback({
    requestedMode: 'hub',
    sessionId: 'sess-1',
    result: {
      mode: 'hub',
      command: "ssh -p 22 user@host -t 'tmux ...'",
      hub: {
        tmuxSession: 'agency-mobile-hub-abcdef',
        catalogSummary: { projects: 2, cells: 3, sessions: 5 },
      },
      ssh: {
        ready: false,
        warnings: ['No listening SSH port was detected on this machine.'],
        manualEnableCommand: 'sudo launchctl load -w /System/Library/LaunchDaemons/ssh.plist',
      },
    },
  });

  assert.equal(feedback.kind, 'warning');
  assert.equal(feedback.title, 'Mobile Hub needs setup');
  assert.match(feedback.description, /Hub agency-mobile-hub-abcdef is not ready/);
  assert.match(feedback.description, /Detected issues:/);
  assert.match(feedback.description, /Hub catalog:\nprojects 2, cells 3, sessions 5/);
  assert.match(feedback.description, /Manual setup:/);
  assert.match(feedback.description, /Generated command:/);
});

test('resolveMobileContinuationErrorTitle is mode-aware', () => {
  assert.equal(resolveMobileContinuationErrorTitle('hub'), 'Mobile Hub failed');
  assert.equal(resolveMobileContinuationErrorTitle('direct'), 'Continue on Mobile failed');
  assert.equal(resolveMobileContinuationErrorTitle('unknown'), 'Continue on Mobile failed');
});

