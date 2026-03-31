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

test('SessionMapOperationsRail prefers an explicitly focused run when it matches the focused session', () => {
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
      focusedRunId="run-focused"
      harnessRuns={[
        {
          runId: 'run-default',
          status: 'running',
          goal: { title: 'Default Run' },
          currentStep: { title: 'Default Step' },
          attentionRefs: {
            cellId: 'cell-a',
            sourceSessionId: 'session-a',
          },
        },
        {
          runId: 'run-focused',
          status: 'failed',
          goal: { title: 'Focused Run' },
          currentStep: { title: 'Focused Step' },
          attentionRefs: {
            cellId: 'cell-a',
            sourceSessionId: 'session-a',
          },
        },
      ]}
      sessionError=""
      onClearSessionError={() => undefined}
      onCancelHarnessRun={() => undefined}
      onResumeHarnessRun={() => undefined}
    />
  );

  assert.match(html, /Focused Run/);
  assert.match(html, /Focused Step/);
  assert.doesNotMatch(html, /Default Run/);
});

test('SessionMapOperationsRail ignores a focused run that belongs to another session', () => {
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
      focusedRunId="run-foreign"
      harnessRuns={[
        {
          runId: 'run-local',
          status: 'running',
          goal: { title: 'Local Run' },
          currentStep: { title: 'Local Step' },
          attentionRefs: {
            cellId: 'cell-a',
            sourceSessionId: 'session-a',
          },
        },
        {
          runId: 'run-foreign',
          status: 'failed',
          goal: { title: 'Foreign Run' },
          currentStep: { title: 'Foreign Step' },
          attentionRefs: {
            cellId: 'cell-b',
            sourceSessionId: 'session-b',
          },
        },
      ]}
      sessionError=""
      onClearSessionError={() => undefined}
      onCancelHarnessRun={() => undefined}
      onResumeHarnessRun={() => undefined}
    />
  );

  assert.match(html, /Local Run/);
  assert.match(html, /Local Step/);
  assert.doesNotMatch(html, /Foreign Run/);
});
