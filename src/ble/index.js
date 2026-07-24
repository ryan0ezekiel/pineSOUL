// BLE Adapter auto-loader
// In Electron: window.electronAPI is already set by preload.js
// In browser: if Web Bluetooth is available, create a WebBleAdapter
// If neither: window.electronAPI stays null → mock mode in usePinecil

import { WebBleAdapter } from './web-bluetooth.js';

function isElectron() {
  return !!(window.electronAPI && typeof window.electronAPI.bleScan === 'function');
}

function isWebBluetoothAvailable() {
  return !!(navigator.bluetooth && typeof navigator.bluetooth.requestDevice === 'function');
}

if (!isElectron()) {
  if (isWebBluetoothAvailable()) {
    console.log('[pineSOUL] Web Bluetooth detected — using WebBleAdapter');
    window.electronAPI = new WebBleAdapter();
  } else {
    console.log('[pineSOUL] Web Bluetooth not available — running in mock/demo mode');
  }
}
