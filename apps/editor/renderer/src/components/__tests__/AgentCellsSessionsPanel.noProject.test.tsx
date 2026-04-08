import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AttentionLayerProvider } from '../../attention/AttentionLayerContext';
import { AgentCellsSessionsPanel } from '../agentCells/AgentCellsSessionsPanel';
import { ModalProvider } from '../modals/ModalSystem';

const attentionValue = {
  localItems: [],
  windowItems: [],
  allItems: [],
  primaryItem: null,
  localSummary: {
    version: 1,
    itemCount: 0,
    highestSeverity: '',
    countsByKind: {},
    primary: null,
    updatedAt: '',
  },
  byCellId: {},
  bySessionKey: {},
  jumpToAttention: () => undefined,
};

test('AgentCellsSessionsPanel keeps no-project placeholder out of session creation affordances', () => {
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
                id: 'local-terminal',
                name: 'Local Terminal',
                ownerKind: 'window-home',
                isVirtual: true,
                worktreePath: '/Users/bytedance',
              },
            ]}
            selectedId="local-terminal"
            projectReady={false}
            sessionsByCellId={{}}
            activeSessionByCellId={{}}
            sessionActivityByKey={{}}
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

    assert.match(html, /No project selected/);
    assert.doesNotMatch(html, /New Session/);
    assert.doesNotMatch(html, /Local Terminal/);
    assert.match(html, /No tracked cells yet/);
  } finally {
    console.error = originalConsoleError;
  }
});
