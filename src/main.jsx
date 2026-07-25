import React from 'react';
import ReactDOM from 'react-dom/client';

// Load BLE adapter FIRST — in Electron this is a no-op (preload.js already set window.electronAPI)
// In browser, this creates a WebBleAdapter if Web Bluetooth is available
// Must be before App import so usePinecil.js captures the adapter (not undefined)
import './ble/index.js';

import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
