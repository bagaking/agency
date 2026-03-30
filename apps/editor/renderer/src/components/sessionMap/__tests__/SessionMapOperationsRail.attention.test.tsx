import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SessionMapOperationsRail } from '../SessionMapOperationsRail';

test('SessionMapOperationsRail stays focused on evidence instead of queue or commander chrome', () => {
  const html = renderToStaticMarkup(
    <SessionMapOperationsRail
      focusData={{
        cell: {
          id: 'cell-a',
          name: 'alpha',
        },
        session: {
          id: 'session-a',
          name: 'Main',
        },
      }}
      harnessRuns={[]}
      sessionError=""
      onClearSessionError={() => undefined}
      onCancelHarnessRun={() => undefined}
      onResumeHarnessRun={() => undefined}
    />
  );

  assert.match(html, /Ops Evidence/);
  assert.match(html, /No active backend directive/);
  assert.doesNotMatch(html, /Priority Queue/);
  assert.doesNotMatch(html, /data-attention-item-id=/);
  assert.doesNotMatch(html, /Open briefing/);
  assert.doesNotMatch(html, /Harness Run/);
});
