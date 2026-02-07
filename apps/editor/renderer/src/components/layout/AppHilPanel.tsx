import React from 'react';
import { HilDrawer } from '../hil/HilDrawer';
import { HilCommentsPanel, PromoteModal } from '../hil/HilCommentsPanel';
import { HilDraftsPanel } from '../hil/HilDraftsPanel';
import { HilMemoDrawer } from '../hil/HilMemoDrawer';
import { SessionReplyPanel } from '../SessionReplyPanel';

const resolveHilDrawerMeta = ({
  activeView,
  hilDrawerPanel,
  hilReplyProps,
  hilSubtitle,
}: any) => {
  const isMemoView = activeView === 'memo';
  const isAgentCellsView = activeView === 'agent-cells';
  const panels = isMemoView
    ? []
    : isAgentCellsView
      ? [{ id: 'reply', label: 'Reply' }]
      : [
          { id: 'comments', label: 'Comments' },
          { id: 'drafts', label: 'Drafts' },
        ];
  const title = isMemoView
    ? 'Memo Inbox'
    : hilDrawerPanel === 'reply'
      ? 'Session Reply Relay'
      : hilDrawerPanel === 'drafts'
        ? 'HIL Drafts'
        : 'Neural Comments';
  const subtitle = isMemoView
    ? 'Shortcuts'
    : hilDrawerPanel === 'reply'
      ? hilReplyProps?.session?.name || hilReplyProps?.session?.id || ''
      : hilSubtitle;
  const contentScrollable = !(isAgentCellsView && hilDrawerPanel === 'reply');
  const contentClassName = isAgentCellsView && hilDrawerPanel === 'reply' ? 'p-0' : '';
  return {
    isMemoView,
    isAgentCellsView,
    panels,
    title,
    subtitle,
    contentScrollable,
    contentClassName,
  };
};

export function AppHilPanel({
  activeView,
  hilDrawerOpen,
  hilDrawerPanel,
  onToggleHilDrawer,
  onSelectHilDrawerPanel,
  onOpenHilPromote,
  hilCommentsProps,
  hilDraftsProps,
  hilReplyProps,
  memoDrawerProps,
  hilSubtitle,
}: any) {
  const meta = resolveHilDrawerMeta({
    activeView,
    hilDrawerPanel,
    hilReplyProps,
    hilSubtitle,
  });

  return (
    <>
      <HilDrawer
        open={hilDrawerOpen}
        activePanel={hilDrawerPanel}
        onToggle={onToggleHilDrawer}
        onSelectPanel={onSelectHilDrawerPanel}
        onOpenPromote={onOpenHilPromote}
        panels={meta.panels}
        title={meta.title}
        subtitle={meta.subtitle}
        contentScrollable={meta.contentScrollable}
        contentClassName={meta.contentClassName}
      >
        {meta.isMemoView ? (
          <HilMemoDrawer {...memoDrawerProps} />
        ) : meta.isAgentCellsView && hilDrawerPanel === 'reply' ? (
          <SessionReplyPanel {...hilReplyProps} />
        ) : hilDrawerPanel === 'comments' ? (
          <HilCommentsPanel {...hilCommentsProps} />
        ) : hilDrawerPanel === 'drafts' ? (
          <HilDraftsPanel {...hilDraftsProps} />
        ) : null}
      </HilDrawer>

      {hilCommentsProps?.promoteModalOpen ? (
        <PromoteModal
          open={hilCommentsProps.promoteModalOpen}
          description={hilCommentsProps.promoteDescription}
          error={hilCommentsProps.promoteError}
          loading={hilCommentsProps.promoteLoading}
          items={hilCommentsProps.promoteItems}
          selectedIds={hilCommentsProps.promoteSelectedIds}
          previewById={hilCommentsProps.promotePreviewById}
          promoteStep={hilCommentsProps.promoteStep}
          promoteDraft={hilCommentsProps.promoteDraft}
          promoteActionSheet={hilCommentsProps.promoteActionSheet}
          promoteGateStatus={hilCommentsProps.promoteGateStatus}
          promoteExecutionStatus={hilCommentsProps.promoteExecutionStatus}
          promoteSessionId={hilCommentsProps.promoteSessionId}
          sessions={hilCommentsProps.sessions}
          sessionActivityByKey={hilCommentsProps.sessionActivityByKey}
          selectedCellId={hilCommentsProps.selectedCellId}
          onChangeDescription={hilCommentsProps.onPromoteDescriptionChange}
          onToggleItem={hilCommentsProps.onTogglePromoteItem}
          onToggleGroup={hilCommentsProps.onTogglePromoteGroup}
          onPreviewItem={hilCommentsProps.onPromotePreview}
          onSelectSession={hilCommentsProps.onSelectPromoteSession}
          onCreateSession={hilCommentsProps.onCreatePromoteSession}
          onFocusSession={hilCommentsProps.onFocusPromoteSession}
          onClose={hilCommentsProps.onClosePromote}
          onDispatch={hilCommentsProps.onDispatchPromote}
          onConfirm={hilCommentsProps.onConfirmPromote}
          onDispatchActionSheet={hilCommentsProps.onDispatchActionSheet}
          onCancelActionSheet={hilCommentsProps.onCancelActionSheet}
          onArchiveActionSheet={hilCommentsProps.onArchiveActionSheet}
          onDeleteActionSheet={hilCommentsProps.onDeleteActionSheet}
          onOpenActionSheets={hilCommentsProps.onOpenActionSheets}
        />
      ) : null}
    </>
  );
}
