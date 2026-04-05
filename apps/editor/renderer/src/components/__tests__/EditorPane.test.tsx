import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorPane } from '../EditorPane';

test('EditorPane shows cell and session path chrome instead of the legacy agency label', () => {
  const html = renderToStaticMarkup(
    <EditorPane
      cell={{
        id: 'cell-main',
        name: 'main',
        branch: 'feat/top-chrome',
        attachmentState: 'attached',
        state: 'active',
      }}
      projectReady={true}
      projectError=""
      terminalMode="shell"
      terminalOpen={false}
      sessionId="child"
      sessionTargets={[]}
      sessions={[
        { id: 'root', name: 'browser', status: 'active', parentSessionId: null },
        { id: 'child', name: 'easy-cell', status: 'active', parentSessionId: 'root' },
      ]}
      sessionLoading={false}
      sessionError=""
      onCreateSession={() => undefined}
      terminusBindings={[]}
      gateResultsByStage={{}}
      gatesCheckingByStage={{}}
      gateDisplayStage="active"
      idleSince={Date.now() - 19_000}
      terminalFontSize={13}
      isVisible={true}
      onRefreshSessions={() => undefined}
      onStateChange={() => undefined}
      onTurnGateCreate={() => undefined}
      onTurnGateExecute={() => undefined}
      onOpenTerminal={() => undefined}
      onClearCellAttachment={() => undefined}
      onDeleteCell={() => undefined}
      onZoomIn={() => undefined}
      onZoomOut={() => undefined}
      onZoomReset={() => undefined}
      pendingCommand={null}
      onCommandSent={() => undefined}
      onSessionActivity={() => undefined}
      onSessionAttached={() => undefined}
      onSendSessionText={() => undefined}
      onSelectProject={() => undefined}
      onUpdateCellAvatar={() => undefined}
      onRenameSession={() => undefined}
      onOpenWorkbenchFile={() => undefined}
      onJumpToSession={() => undefined}
      activityDiffThreshold={12}
      onSelectionContext={() => undefined}
      onReplySelection={() => undefined}
    />
  );

  assert.match(html, />main</);
  assert.match(html, />browser</);
  assert.match(html, />easy-cell</);
  assert.match(html, /Session path mirrors the left tree/);
  assert.match(html, /Text 13/);
  assert.match(html, />Refresh</);
  assert.doesNotMatch(html, />AGENCY</);
});
