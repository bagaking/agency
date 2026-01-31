const { capturePane } = require('./tmux');
const { resolveSessionForPreview } = require('./sessions');

async function captureSessionPreview({ worktreePath, sessionId, lines }) {
  if (!worktreePath || !sessionId) {
    throw new Error('worktreePath and sessionId are required.');
  }
  const session = await resolveSessionForPreview({ worktreePath, sessionId });
  const output = await capturePane(session.tmuxSession, { lines });
  return {
    sessionId: session.id,
    tmuxSession: session.tmuxSession,
    data: output,
  };
}

module.exports = {
  captureSessionPreview,
};
