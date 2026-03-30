import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AttentionLayerProvider } from '../../attention/AttentionLayerContext';
import { AgentCellsSessionsPanel } from '../agentCells/AgentCellsSessionsPanel';
import { ModalProvider } from '../modals/ModalSystem';

const attentionValue = {
  localItems: [
    {
      id: 'run-failed',
      kind: 'failed',
      ownerKind: 'run',
      severity: 'critical',
      label: 'Create Child Agent via Fork',
      detail: 'Source session is blocked.',
      refs: {
        cellId: 'cell-a',
        sessionId: 'session-main',
        runId: 'run-failed',
      },
      source: 'local',
      updatedAtMs: 1,
      count: 1,
    },
  ],
  windowItems: [],
  allItems: [],
  primaryItem: null,
  localSummary: {
    version: 1,
    itemCount: 1,
    highestSeverity: 'critical',
    countsByKind: {
      failed: 1,
    },
    primary: null,
    updatedAt: '',
  },
  byCellId: {
    'cell-a': {
      count: 1,
      strongest: {
        id: 'cell-failed',
        kind: 'failed',
        ownerKind: 'cell',
        severity: 'critical',
        label: 'Cell Action Failed',
        detail: 'Cell needs intervention.',
        refs: {
          cellId: 'cell-a',
        },
        source: 'local',
        updatedAtMs: 1,
        count: 1,
      },
    },
  },
  bySessionKey: {
    'cell-a:session-main': {
      id: 'session-failed',
      kind: 'failed',
      ownerKind: 'session',
      severity: 'critical',
      label: 'Main',
      detail: 'Session needs intervention.',
      refs: {
        cellId: 'cell-a',
        sessionId: 'session-main',
      },
      source: 'local',
      updatedAtMs: 1,
      count: 1,
    },
  },
  jumpToAttention: () => undefined,
};

test('AgentCellsSessionsPanel keeps attention inline instead of rendering a queue card', () => {
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
      <ModalProvider>
        <AttentionLayerProvider value={attentionValue as any}>
          <AgentCellsSessionsPanel
            cells={[
              {
                id: 'cell-a',
                name: 'alpha',
                state: 'active',
                worktreePath: '/repo/alpha',
              },
            ]}
            selectedId="cell-a"
            projectReady={true}
            sessionsByCellId={{
              'cell-a': [
                {
                  id: 'session-main',
                  name: 'Main',
                  status: 'active',
                },
              ],
            }}
            activeSessionByCellId={{
              'cell-a': 'session-main',
            }}
            sessionActivityByKey={{
              'cell-a:session-main': Date.now(),
            }}
            recentProjects={[]}
            terminusProfiles={[]}
            onSelect={() => undefined}
            onOpenExplorer={() => undefined}
            onSelectProject={() => undefined}
            onOpenRecentProject={() => undefined}
            onSelectSession={() => undefined}
            onCreateSession={async () => null}
            onDispatchCommand={() => undefined}
            onCloseSession={() => undefined}
            onDetachSession={() => undefined}
            onRenameSession={() => undefined}
            onUpdateSessionAvatar={() => undefined}
            onMoveSessionNode={async () => undefined}
            onContinueSessionOnMobile={() => undefined}
            onTrackPendingHarnessRun={() => undefined}
            onClearTrackedHarnessRun={() => undefined}
            onSettleTrackedHarnessRun={async () => false}
            onFocusSessionInUi={() => undefined}
            onConfigureProfile={() => undefined}
          />
        </AttentionLayerProvider>
      </ModalProvider>
    );

    assert.doesNotMatch(html, /data-attention-queue="true"/);
    assert.match(html, /Cell Action Failed/);
    assert.match(html, /Session needs intervention\./);
    assert.match(html, /data-testid="session-tab-session-main"/);
  } finally {
    console.error = originalConsoleError;
  }
});
