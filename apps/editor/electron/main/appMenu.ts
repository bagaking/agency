import { Menu, app, type MenuItemConstructorOptions } from 'electron';

type AppMenuOptions = {
  onSelectProject: () => void;
  onNewWindow: () => void;
};

function buildFileMenu({ onSelectProject, onNewWindow }: AppMenuOptions): MenuItemConstructorOptions {
  return {
    label: 'File',
    submenu: [
      {
        label: 'Open Project...',
        accelerator: 'CmdOrCtrl+O',
        click: onSelectProject,
      },
      {
        label: 'Switch Project...',
        accelerator: 'CmdOrCtrl+Shift+O',
        click: onSelectProject,
      },
      { type: 'separator' },
      {
        label: 'New Window',
        accelerator: 'CmdOrCtrl+Shift+N',
        click: onNewWindow,
      },
      { type: 'separator' },
      process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
    ],
  };
}

function buildMacApplicationMenu(): MenuItemConstructorOptions[] {
  if (process.platform !== 'darwin') {
    return [];
  }
  return [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
  ];
}

export function applyAppMenu(options: AppMenuOptions): void {
  const template: MenuItemConstructorOptions[] = [
    ...buildMacApplicationMenu(),
    buildFileMenu(options),
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
