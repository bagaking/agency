const { ipcMain } = require('electron');
const { getReplyQuickPrompts, setReplyQuickPrompts } = require('../../services/replyQuickPrompts');

function setupReplyQuickPromptsHandlers() {
  ipcMain.handle('reply-quick-prompts:get', async (_event, payload) => {
    const scope = payload?.scope || 'resolved';
    const worktreePath = payload?.worktreePath;
    return getReplyQuickPrompts({ scope, worktreePath });
  });

  ipcMain.handle('reply-quick-prompts:set', async (_event, payload) => {
    const scope = payload?.scope || 'global';
    const prompts = payload?.prompts;
    const worktreePath = payload?.worktreePath;
    if (!Array.isArray(prompts)) {
      throw new Error('reply quick prompts payload must be an array.');
    }
    return setReplyQuickPrompts({ scope, worktreePath, prompts });
  });
}

export { setupReplyQuickPromptsHandlers };
