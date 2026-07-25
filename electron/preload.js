const { contextBridge, ipcRenderer } = require('electron');

// Helper: return a cleanup function for each listener
function onChannel(channel, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('onChannel callback must be a function');
  }
  const handler = (_, data) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // BLE controls
  bleScan: () => ipcRenderer.invoke('ble:scan'),
  bleConnect: (address) => {
    if (typeof address === 'string' && address.trim().length > 0) {
      return ipcRenderer.invoke('ble:connect', address.trim());
    }
    return Promise.resolve({ ok: false, error: 'Invalid address' });
  },
  bleDisconnect: () => ipcRenderer.invoke('ble:disconnect'),

  bleSetSetting: (name, value) => ipcRenderer.invoke('ble:setSetting', name, value),
  bleSaveToFlash: () => ipcRenderer.invoke('ble:saveToFlash'),

  // Event listeners (returns cleanup function)
  onLiveData: (callback) => onChannel('ble:liveData', callback),
  onConnectionChange: (callback) => onChannel('ble:connectionChange', callback),
  onDeviceFound: (callback) => onChannel('ble:deviceFound', callback),
  onSettingsLoaded: (callback) => onChannel('ble:settingsLoaded', callback),
  onError: (callback) => onChannel('ble:error', callback),
  onScanning: (callback) => onChannel('ble:scanning', callback),

  // Remove all listeners from a known BLE channel
  removeAllListeners: (channel) => {
    const ALLOWED = ['ble:liveData', 'ble:connectionChange', 'ble:deviceFound', 'ble:settingsLoaded', 'ble:scanning', 'ble:error'];
    if (ALLOWED.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});
