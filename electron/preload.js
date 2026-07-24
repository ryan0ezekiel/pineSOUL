const { contextBridge, ipcRenderer } = require('electron');

// Helper: return a cleanup function for each listener
function onChannel(channel, callback) {
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
  bleConnect: (address) => ipcRenderer.invoke('ble:connect', address),
  bleDisconnect: () => ipcRenderer.invoke('ble:disconnect'),
  bleGetLiveData: () => ipcRenderer.invoke('ble:getLiveData'),
  bleGetSettings: () => ipcRenderer.invoke('ble:getSettings'),
  bleSetSetting: (name, value) => ipcRenderer.invoke('ble:setSetting', name, value),
  bleSaveToFlash: () => ipcRenderer.invoke('ble:saveToFlash'),
  bleReconnect: (address) => ipcRenderer.invoke('ble:reconnect', address),

  // Event listeners (returns cleanup function)
  onLiveData: (callback) => onChannel('ble:liveData', callback),
  onConnectionChange: (callback) => onChannel('ble:connectionChange', callback),
  onDeviceFound: (callback) => onChannel('ble:deviceFound', callback),
  onSettingsLoaded: (callback) => onChannel('ble:settingsLoaded', callback),
  onError: (callback) => onChannel('ble:error', callback),

  // Remove all listeners from a channel
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
