import React, { Suspense } from 'react';
import { HilDrawer } from '../hil/HilDrawer';
import { DeferredMount } from '../ui/DeferredMount';
import { lazyNamedComponent } from '../ui/lazyNamedComponent';

const LazyHilCommentsPanel = lazyNamedComponent(
  () => import('../hil/HilCommentsPanel'),
  'HilCommentsPanel'
);
const LazyPromoteModal = lazyNamedComponent(
  () => import('../hil/HilPromoteModal'),
  'PromoteModal'
);
const LazyHilDraftsPanel = lazyNamedComponent(
  () => import('../hil/HilDraftsPanel'),
  'HilDraftsPanel'
);
const LazyHilMemoDrawer = lazyNamedComponent(
  () => import('../hil/HilMemoDrawer'),
  'HilMemoDrawer'
);
const LazySessionReplyPanel = lazyNamedComponent(
  () => import('../SessionReplyPanel'),
  'SessionReplyPanel'
);

const drawerPanelFallback = <div className="h-full w-full bg-transparent" />;

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
  const useSharedReplyLauncher = meta.isAgentCellsView;

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
        showToggleButton={!useSharedReplyLauncher}
        collapsedWidth={useSharedReplyLauncher ? 0 : 6}
      >
        <DeferredMount active={hilDrawerOpen} strategy="retain">
          <Suspense fallback={drawerPanelFallback}>
            {meta.isMemoView ? (
              <LazyHilMemoDrawer {...memoDrawerProps} />
            ) : meta.isAgentCellsView && hilDrawerPanel === 'reply' ? (
              <LazySessionReplyPanel {...hilReplyProps} />
            ) : hilDrawerPanel === 'comments' ? (
              <LazyHilCommentsPanel {...hilCommentsProps} />
            ) : hilDrawerPanel === 'drafts' ? (
              <LazyHilDraftsPanel {...hilDraftsProps} />
            ) : null}
          </Suspense>
        </DeferredMount>
      </HilDrawer>

      {hilCommentsProps?.promoteModalOpen ? (
        <Suspense fallback={null}>
          <LazyPromoteModal
            open={hilCommentsProps.promoteModalOpen}
            description={hilCommentsProps.promoteDescription}
            error={hilCommentsProps.promoteError}
            loading={hilCommentsProps.promoteLoading}
            items={hilCommentsProps.promoteItems}
            selectedIds={hilCommentsProps.promoteSelectedIds}
            previewById={hilCommentsProps.promotePreviewById}
            promoteStep={hilCommentsProps.promoteStep}
            promoteDraft={hilCommentsProps.promoteDraft}
            promoteMode={hilCommentsProps.promoteMode}
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
            onSelectMode={hilCommentsProps.onSelectPromoteMode}
            onCreateSession={hilCommentsProps.onCreatePromoteSession}
            onFocusSession={hilCommentsProps.onFocusPromoteSession}
            onClose={hilCommentsProps.onClosePromote}
            onDispatch={hilCommentsProps.onDispatchPromote}
            onConfirm={hilCommentsProps.onConfirmPromote}
            onOpenTimeline={hilCommentsProps.onOpenPromoteTimeline}
            onDispatchActionSheet={hilCommentsProps.onDispatchActionSheet}
            onCancelActionSheet={hilCommentsProps.onCancelActionSheet}
            onArchiveActionSheet={hilCommentsProps.onArchiveActionSheet}
            onDeleteActionSheet={hilCommentsProps.onDeleteActionSheet}
            onOpenActionSheets={hilCommentsProps.onOpenActionSheets}
          />
        </Suspense>
      ) : null}
    </>
  );
}
