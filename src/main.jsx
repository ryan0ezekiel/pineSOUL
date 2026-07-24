import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Load BLE adapter — in Electron this is a no-op (preload.js already set window.electronAPI)
// In browser, this creates a WebBleAdapter if Web Bluetooth is available
import './ble/index.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
