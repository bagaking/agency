type ReplyTargetMeta = {
  type: string;
  at: string;
  cellId: string;
  sessionId: string;
  cellName: string;
  sessionName: string;
  avatar: string;
};

const buildReplyTargetMeta = ({
  type,
  target,
  cell,
  session,
}: {
  type: string;
  target: any;
  cell: any;
  session: any;
}): ReplyTargetMeta => ({
  type,
  at: new Date().toISOString(),
  cellId: target?.cellId || cell?.id || '',
  sessionId: target?.sessionId || session?.id || '',
  cellName: target?.cellName || cell?.name || '',
  sessionName: target?.sessionName || session?.name || '',
  avatar: target?.avatar || session?.avatar || '',
});

export const resolveReplyDispatchTarget = ({
  action,
  selectedTarget,
  cell,
  session,
}: {
  action: string;
  selectedTarget: any;
  cell: any;
  session: any;
}) => {
  if (action === 'record') {
    return {
      effectiveAction: 'record',
      targetMeta: buildReplyTargetMeta({
        type: 'record',
        target: null,
        cell,
        session,
      }),
    };
  }

  if (action === 'send' && selectedTarget) {
    return {
      effectiveAction: 'other',
      targetMeta: buildReplyTargetMeta({
        type: 'other',
        target: selectedTarget,
        cell,
        session,
      }),
    };
  }

  if (action === 'send') {
    return {
      effectiveAction: 'current',
      targetMeta: buildReplyTargetMeta({
        type: 'current',
        target: {
          cellId: cell?.id,
          sessionId: session?.id,
          cellName: cell?.name,
          sessionName: session?.name,
          avatar: session?.avatar,
        },
        cell,
        session,
      }),
    };
  }

  return {
    effectiveAction: action,
    targetMeta: null,
  };
};

export const sendReplyPayload = ({
  effectiveAction,
  targetMeta,
  payload,
  onSendSessionText,
  cell,
  session,
  normalizePayload,
}: {
  effectiveAction: string;
  targetMeta: ReplyTargetMeta | null;
  payload: string;
  onSendSessionText?: (payload: { cellId: string; sessionId: string; text: string }) => void;
  cell: any;
  session: any;
  normalizePayload: (value: string) => string;
}) => {
  if (effectiveAction === 'current') {
    onSendSessionText?.({
      cellId: cell?.id,
      sessionId: session?.id,
      text: normalizePayload(payload),
    });
    return;
  }

  if (effectiveAction === 'other' && targetMeta?.cellId && targetMeta?.sessionId) {
    onSendSessionText?.({
      cellId: targetMeta.cellId,
      sessionId: targetMeta.sessionId,
      text: normalizePayload(payload),
    });
  }
};

