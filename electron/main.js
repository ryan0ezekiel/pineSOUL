const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { BleManager } = require('./ble/ble-manager.js');

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
      sandbox: true,
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
  mainWindow.on('closed', async () => {
    mainWindow = null;
    ble.setWindow(null);
    destroyPromise = ble.destroy();
    try {
      await destroyPromise;
    } finally {
      destroyPromise = null;
    }
  });

  // Prevent navigation away from the app (XSS escalation mitigation)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = isDev
      ? new URL('http://localhost:5173')
      : new URL(`file://${path.join(__dirname, '..', 'dist', 'renderer', 'index.html')}`);
    const target = new URL(url);
    if (target.origin !== appUrl.origin) {
      console.warn(`Blocked navigation to ${url}`);
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`Blocked new window open: ${url}`);
    return { action: 'deny' };
  });
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
  if (typeof address !== 'string' || address.trim().length === 0) {
    return { ok: false, error: 'Invalid address' };
  }
  try {
    const info = await ble.connect(address.trim());
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('ble:disconnect', async () => {
  try { await ble.disconnect(); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('ble:setSetting', async (_, name, value) => {
  if (typeof name !== 'string') {
    return { ok: false, error: 'Invalid setting name' };
  }
  try { await ble.setSetting(name, value); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('ble:saveToFlash', async () => {
  try { await ble.saveToFlash(); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

let destroyPromise = null;

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('before-quit', () => {
  if (destroyPromise) {
    // BLE cleanup is in progress — defer quit
    console.log('Waiting for BLE cleanup before quit...');
  }
});
