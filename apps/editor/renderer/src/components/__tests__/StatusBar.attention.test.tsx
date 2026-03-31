import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AttentionLayerProvider } from '../../attention/AttentionLayerContext';
import { StatusBar } from '../StatusBar';

const attentionValue = {
  localItems: [],
  windowItems: [],
  allItems: [
    {
      id: 'run-running',
      kind: 'running',
      ownerKind: 'run',
      severity: 'high',
      label: 'Create Child Agent via Fork',
      detail: 'Create child agent from selected session',
      refs: {
        cellId: 'cell-a',
        sessionId: 'session-main',
        runId: 'run-running',
      },
      source: 'local',
      updatedAtMs: 0,
      count: 1,
    },
  ],
  primaryItem: {
    id: 'run-running',
    kind: 'running',
    ownerKind: 'run',
    severity: 'high',
    label: 'Create Child Agent via Fork',
    detail: 'Create child agent from selected session',
    refs: {
      cellId: 'cell-a',
      sessionId: 'session-main',
      runId: 'run-running',
    },
    source: 'local',
    updatedAtMs: 0,
    count: 1,
  },
  localSummary: {
    version: 1,
    itemCount: 1,
    highestSeverity: 'high',
    countsByKind: {
      running: 1,
    },
    primary: null,
    updatedAt: '',
  },
  byCellId: {},
  bySessionKey: {},
  jumpToAttention: () => undefined,
};

test('StatusBar renders a clickable primary attention item', () => {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const [firstArg] = args;
    if (
      typeof firstArg === 'string' &&
      firstArg.includes('useLayoutEffect does nothing on the server')
    ) {
      return;
    }
    originalConsoleError(...args);
  };

  try {
    const html = renderToStaticMarkup(
      <AttentionLayerProvider value={attentionValue as any}>
        <StatusBar
          loading={false}
          onRefresh={() => undefined}
          tmuxStatus={{ available: true, version: 'tmux 3.4' }}
          ipcAvailable={true}
        />
      </AttentionLayerProvider>
    );

    assert.match(html, /data-testid="statusbar-attention"/);
    assert.match(html, /Create Child Agent via Fork/);
    assert.match(html, /Running/);
    assert.match(
      html,
      /aria-label="Next: Running\. Create child agent from selected session\. Open Session Map evidence\."/
    );
    assert.doesNotMatch(
      html,
      /data-testid="statusbar-attention"[^>]*title=/
    );
  } finally {
    console.error = originalConsoleError;
  }
});
