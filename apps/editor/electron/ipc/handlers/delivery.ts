const { ipcMain } = require('electron');
const delivery = require('../../services/delivery');

function setupDeliveryHandlers() {
  ipcMain.handle('delivery:start', async (_event, payload) =>
    delivery.startDelivery(payload || {})
  );
  ipcMain.handle('delivery:confirm', async (_event, payload) =>
    delivery.confirmDelivery(payload || {})
  );
  ipcMain.handle('delivery:status', async (_event, payload) =>
    delivery.getDeliveryStatus(payload || {})
  );
  ipcMain.handle('delivery:timeline', async (_event, payload) =>
    delivery.getDeliveryTimeline(payload || {})
  );
}

export { setupDeliveryHandlers };

