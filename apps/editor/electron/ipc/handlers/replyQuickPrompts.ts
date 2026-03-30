const { ipcMain } = require('electron');
const { getReplyQuickPrompts, setReplyQuickPrompts } = require('../../services/replyQuickPrompts');

function setupReplyQuickPromptsHandlers() {
  ipcMain.handle('reply-quick-prompts:get', async (_event, payload) => {
    const scope = payload?.scope || 'resolved';
    return getReplyQuickPrompts({
      scope,
      worktreePath: payload?.worktreePath,
      projectRoot: payload?.projectRoot,
      cellId: payload?.cellId,
    });
  });

  ipcMain.handle('reply-quick-prompts:set', async (_event, payload) => {
    const scope = payload?.scope || 'global';
    const prompts = payload?.prompts;
    if (!Array.isArray(prompts)) {
      throw new Error('reply quick prompts payload must be an array.');
    }
    return setReplyQuickPrompts({
      scope,
      worktreePath: payload?.worktreePath,
      projectRoot: payload?.projectRoot,
      cellId: payload?.cellId,
      prompts,
    });
  });
}

export { setupReplyQuickPromptsHandlers };
