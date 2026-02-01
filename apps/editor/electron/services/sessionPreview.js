const { capturePane, getPaneSize } = require('./tmux');
const { getSessionSize } = require('./terminal');
const { resolveSessionForPreview } = require('./sessions');

async function captureSessionPreview({ worktreePath, sessionId, lines }) {
  if (!worktreePath || !sessionId) {
    throw new Error('worktreePath and sessionId are required.');
  }
  const session = await resolveSessionForPreview({ worktreePath, sessionId });
  const [output, size] = await Promise.all([
    capturePane(session.tmuxSession, { lines, joinWrapped: true }),
    getPaneSize(session.tmuxSession),
  ]);
  const liveSize = getSessionSize(session.tmuxSession);
  const resolvedCols = liveSize?.cols ?? size?.cols ?? null;
  const resolvedRows = liveSize?.rows ?? size?.rows ?? null;
  return {
    sessionId: session.id,
    tmuxSession: session.tmuxSession,
    data: output,
    cols: resolvedCols,
    rows: resolvedRows,
  };
}

module.exports = {
  captureSessionPreview,
};
