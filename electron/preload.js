const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // BLE controls (placeholders — will be wired up)
  bleScan: () => ipcRenderer.invoke('ble:scan'),
  bleConnect: (address) => ipcRenderer.invoke('ble:connect', address),
  bleDisconnect: () => ipcRenderer.invoke('ble:disconnect'),
  bleGetLiveData: () => ipcRenderer.invoke('ble:getLiveData'),
  bleGetSettings: () => ipcRenderer.invoke('ble:getSettings'),
  bleSetSetting: (name, value) => ipcRenderer.invoke('ble:setSetting', name, value),
  bleSaveToFlash: () => ipcRenderer.invoke('ble:saveToFlash'),

  // Event listeners
  onLiveData: (callback) => ipcRenderer.on('ble:liveData', (_, data) => callback(data)),
  onConnectionChange: (callback) => ipcRenderer.on('ble:connectionChange', (_, status) => callback(status)),
  onDeviceFound: (callback) => ipcRenderer.on('ble:deviceFound', (_, device) => callback(device)),
  onSettingsLoaded: (callback) => ipcRenderer.on('ble:settingsLoaded', (_, settings) => callback(settings)),

  // Remove all listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
