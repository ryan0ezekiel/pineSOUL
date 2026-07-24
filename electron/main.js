const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { BleManager } = require('./ble/ble-manager.js');

// ─── HiDPI / High-DPI support ───────────────────────────────────
// Enable per-pixel antialiasing and proper device-pixel-ratio detection
app.commandLine.appendSwitch('enable-high-dpi-support');
app.commandLine.appendSwitch('enable-features', 'UseSkiaRenderer');
app.commandLine.appendSwitch('high-dpi-support', '1');

let mainWindow;
const isDev = !app.isPackaged;
const ble = new BleManager();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  ble.setWindow(mainWindow);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; ble.setWindow(null); });
}

// ─── Window Controls ────────────────────────────────────────────────
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// ─── BLE Controls ───────────────────────────────────────────────────
ipcMain.handle('ble:scan', async () => {
  try { await ble.scan(); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('ble:connect', async (_, address) => {
  try {
    const info = await ble.connect(address);
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('ble:disconnect', async () => {
  try { await ble.disconnect(); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('ble:reconnect', async (_, address) => {
  try {
    const info = await ble.reconnect(address);
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('ble:getLiveData', () => {
  return ble.getLiveData();
});

ipcMain.handle('ble:getSettings', () => {
  return ble.getSettings();
});

ipcMain.handle('ble:setSetting', async (_, name, value) => {
  try { await ble.setSetting(name, value); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('ble:saveToFlash', async () => {
  try { await ble.saveToFlash(); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
