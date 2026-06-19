const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const generator = require('./src/generator');

// Hot reload en desarrollo
try {
  require('electron-reload')(__dirname, {
    electron: path.resolve(__dirname, 'node_modules/electron/dist/electron.exe'),
    hardResetMethod: 'exit',
    watched: [path.join(__dirname, 'src'), path.join(__dirname, 'main.js'), path.join(__dirname, 'preload.js')],
  });
} catch (e) { console.log('Hot reload disabled:', e.message); }

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 820,
    minWidth: 860,
    minHeight: 700,
    resizable: true,
    backgroundColor: '#0e0e12',
    title: 'Scaffold Modulo - Backoffice Transactional',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── IPC handlers ──

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('generate-module', async (_event, config) => {
  try {
    const result = await generator.generate(config);
    return { success: true, logs: result.logs };
  } catch (err) {
    return { success: false, logs: [err.message], error: err.stack };
  }
});
