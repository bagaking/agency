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

test('buildMobileContinuationFeedback returns proxy success content', () => {
  const feedback = buildMobileContinuationFeedback({
    requestedMode: 'proxy',
    sessionId: 'sess-proxy',
    result: {
      mode: 'proxy',
      sessionName: 'Proxy Session',
      proxy: {
        ready: true,
        host: '100.64.0.9',
        port: 49152,
        tokenMasked: 'abc123...wxyz',
      },
    },
  });

  assert.equal(feedback.kind, 'success');
  assert.equal(feedback.title, 'Mobile proxy command copied');
  assert.match(feedback.description, /Proxy Session -> 100\.64\.0\.9:49152/);
  assert.match(feedback.description, /abc123\.\.\.wxyz/);
});

test('buildMobileContinuationFeedback returns proxy warning content', () => {
  const feedback = buildMobileContinuationFeedback({
    requestedMode: 'proxy',
    sessionId: 'sess-proxy',
    result: {
      mode: 'proxy',
      command: "bash -lc '...'",
      proxy: {
        ready: false,
        warnings: ['No reachable host was discovered for proxy continuation.'],
      },
    },
  });

  assert.equal(feedback.kind, 'warning');
  assert.equal(feedback.title, 'Mobile Proxy needs setup');
  assert.match(feedback.description, /proxy continuation is not ready yet/i);
  assert.match(feedback.description, /Detected issues:/);
  assert.match(feedback.description, /Generated command:/);
});

test('resolveMobileContinuationErrorTitle is mode-aware', () => {
  assert.equal(resolveMobileContinuationErrorTitle('hub'), 'Mobile Hub failed');
  assert.equal(resolveMobileContinuationErrorTitle('proxy'), 'Mobile Proxy failed');
  assert.equal(resolveMobileContinuationErrorTitle('direct'), 'Continue on Mobile failed');
  assert.equal(resolveMobileContinuationErrorTitle('unknown'), 'Continue on Mobile failed');
});
