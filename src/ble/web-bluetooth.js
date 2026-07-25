// Web Bluetooth adapter — provides the same API as window.electronAPI from preload.js
// Uses navigator.bluetooth instead of noble. Works in Chrome/Edge/Opera on HTTPS or localhost.

import {
  SERVICES, SETTINGS_V221, BULK_DATA_V221,
  LIVE_DATA_FIELDS,
} from './constants.js';
import { VALUE_LIMITS } from '../constants.js';
import {
  parseLiveData, parseSetting, encodeSetting,
  detectVersion, getSettingsMap, getBulkMap,
} from './protocol.js';

// Timeout wrapper — prevents Web BLE calls from hanging indefinitely
function withTimeout(promise, ms, label = 'BLE operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export class WebBleAdapter {
  #device = null;
  #server = null;
  #version = null;
  #scanning = false; // prevent double-scan race
  #settingsMap = null;
  #liveChar = null;
  #bulkMap = null;
  #listeners = {};
  #bulkDataChar = null;
  #settingsChars = {};
  #saveChar = null;
  #connected = false;

  // ── Event system (matches Electron preload pattern) ────────────────
  on(event, callback) {
    if (!this.#listeners[event]) this.#listeners[event] = [];
    this.#listeners[event].push(callback);
    return () => {
      this.#listeners[event] = this.#listeners[event].filter(cb => cb !== callback);
    };
  }

  #emit(event, ...args) {
    (this.#listeners[event] || []).forEach(cb => {
      try { cb(...args); } catch (e) { console.error(`Event "${event}" handler error:`, e); }
    });
  }

  // ── Subscribe methods (match preload.js names) ─────────────────────
  onConnectionChange(cb) { return this.on('connectionChange', cb); }
  onLiveData(cb)         { return this.on('liveData', cb); }
  onDeviceFound(cb)      { return this.on('deviceFound', cb); }
  onSettingsLoaded(cb)   { return this.on('settingsLoaded', cb); }
  onError(cb)            { return this.on('error', cb); }
  onScanning(cb)         { return this.on('scanning', cb); }

  // ── Scan (shows browser-native device picker) ─────────────────────
  async bleScan() {
    if (this.#scanning) return { ok: false, error: 'Scan already in progress' };
    if (!navigator.bluetooth) {
      this.#emit('error', { message: 'Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera on HTTPS.' });
      return { ok: false, error: 'Web Bluetooth not supported' };
    }

    try {
      this.#scanning = true;
      this.#emit('scanning', true);

      // Remove previous disconnect listener to prevent accumulation
      if (this.#device && this._disconnectHandler) {
        this.#device.removeEventListener('gattserverdisconnected', this._disconnectHandler);
        this._disconnectHandler = null;
      }

      // Show browser-native BLE device picker
      // acceptAllDevices: true shows all nearby BLE devices (Pinecil has no standard filter service)
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          SERVICES.SETTINGS_V220,
          SERVICES.SETTINGS_V221,
          SERVICES.BULK_DATA_V220,
          SERVICES.BULK_DATA_V221,
        ],
      });

      this.#device = device;

      this.#emit('deviceFound', {
        name: device.name || 'Pinecil',
        address: device.id,
      });

      this._disconnectHandler = () => this.#handleDisconnect();
      device.addEventListener('gattserverdisconnected', this._disconnectHandler);

      // Auto-connect after browser picker
      await this.#doConnect();
      this.#scanning = false;
      this.#emit('scanning', false);
      return { ok: true };
    } catch (e) {
      this.#scanning = false;
      this.#emit('scanning', false);

      if (e.name === 'NotFoundError') {
        // User cancelled the picker — not an error
        return { ok: false, error: 'No device selected' };
      }

      // Sanitize error before emission
      const safeError = {
        message: e.message || String(e),
        stack: import.meta?.env?.MODE === 'development' ? e.stack : undefined
      };

      console.error('BLE scan error:', safeError);
      this.#emit('error', safeError);
      return { ok: false, error: safeError.message };
    }
  }

  // ── Connect (reconnect to previously scanned device) ──────────────
  async bleConnect(address) {
    if (this.#device) {
      try {
        await this.#doConnect();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || String(e) };
      }
    }
    return { ok: false, error: 'No device selected. Click Scan first.' };
  }

  // ── Reconnect (delegates to bleConnect for Web BLE) ──────────────
  async bleReconnect(address) {
    return this.bleConnect(address);
  }

  async #doConnect() {
    try {
      this.#emit('connectionChange', { status: 'connecting' });

      // Clean up old notification handlers before reconnecting
      if (this.#bulkDataChar && this.#bulkDataChar._pwaHandler) {
        this.#bulkDataChar.removeEventListener('characteristicvaluechanged', this.#bulkDataChar._pwaHandler);
        this.#bulkDataChar._pwaHandler = null;
      }

      // Reset stale characteristic references from previous connection
      this.#bulkDataChar = null;
      this.#settingsChars = {};
      this.#saveChar = null;

      // Disconnect existing GATT connection if any
      if (this.#device?.gatt?.connected) {
        this.#device.gatt.disconnect();
      }

      this.#server = await withTimeout(
        this.#device.gatt.connect(), 10000, 'GATT connect'
      );

      // Detect firmware version from available services (timeout: 10s)
      const services = await withTimeout(
        this.#server.getPrimaryServices(), 10000, 'Service discovery'
      );
      const serviceUUIDs = services.map(s => s.uuid);

      this.#version = detectVersion(serviceUUIDs);
      if (!this.#version) {
        throw new Error('Unsupported Pinecil firmware. Please update to v2.20+.');
      }

      this.#settingsMap = getSettingsMap(this.#version);
      this.#bulkMap = getBulkMap(this.#version);

      const deviceInfo = {
        name: this.#device.name || 'Pinecil',
        address: this.#device.id,
        firmwareVersion: this.#version,
      };

      this.#connected = true;

      this.#emit('connectionChange', {
        status: 'connected',
        deviceInfo,
      });

      // Set up live data notifications + load settings
      await Promise.all([
        this.#setupBulkData(),
        this.#loadSettings(),
      ]);

    } catch (e) {
      this.#connected = false;
      this.#server = null;
      this.#emit('connectionChange', { status: 'disconnected' });
      this.#emit('error', { message: e.message || String(e) });
      throw e;
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────────
  async bleDisconnect() {
    if (this.#device?.gatt?.connected) {
      this.#device.gatt.disconnect();
    }
    this.#handleDisconnect('user');
    return { ok: true };
  }

  #handleDisconnect(reason = 'unknown') {
    this.#connected = false;
    this.#server = null;
    // Remove bulk data notification listener before releasing the characteristic
    if (this.#bulkDataChar && this.#bulkDataChar._pwaHandler) {
      this.#bulkDataChar.removeEventListener('characteristicvaluechanged', this.#bulkDataChar._pwaHandler);
      this.#bulkDataChar._pwaHandler = null;
    }
    this.#bulkDataChar = null;
    this.#settingsChars = {};
    this.#saveChar = null;
    this.#emit('connectionChange', { status: 'disconnected', reason });
  }

  // ── Live Data (subscribe to BulkData notifications) ────────────────
  async #setupBulkData() {
    try {
      const bulkUUID = this.#bulkMap['BulkData'];
      if (!bulkUUID) return;

      const bulkServiceUUID = this.#version === 'v2.21'
        ? SERVICES.BULK_DATA_V221
        : SERVICES.BULK_DATA_V220;
      const bulkService = await withTimeout(
        this.#server.getPrimaryService(bulkServiceUUID), 10000, 'Bulk data service'
      );
      this.#bulkDataChar = await withTimeout(
        bulkService.getCharacteristic(bulkUUID), 10000, 'Bulk data characteristic'
      );

      await this.#bulkDataChar.startNotifications();

      const handler = (event) => {
        const dv = event.target.value;
        const raw = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
        const data = parseLiveData(raw);
        if (data) this.#emit('liveData', data);
      };

      this.#bulkDataChar.addEventListener('characteristicvaluechanged', handler);
      this.#bulkDataChar._pwaHandler = handler;

    } catch (e) {
      console.error('Failed to set up live data:', e);
      this.#emit('error', { message: 'Could not start live data stream: ' + (e.message || e) });
    }
  }

  // ── Load Settings (read all characteristics) ───────────────────────
  async #loadSettings() {
    try {
      const settingsServiceUUID = this.#version === 'v2.21'
        ? SERVICES.SETTINGS_V221
        : SERVICES.SETTINGS_V220;

      const settingsService = await withTimeout(
        this.#server.getPrimaryService(settingsServiceUUID), 10000, 'Settings service'
      );

      const settings = {};

      const settingNames = Object.keys(this.#settingsMap).filter(n => n !== 'save_to_flash' && n !== 'SettingsReset');

      // Read all settings in parallel
      const reads = await Promise.allSettled(
        settingNames.map(async (name) => {
          const uuid = this.#settingsMap[name];
          if (!uuid) return { name, value: null, char: null };

          try {
            const char = await settingsService.getCharacteristic(uuid);
            const value = await char.readValue();
            const raw = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
            return { name, value: parseSetting(raw), char };
          } catch (e) {
            return { name, value: null, char: null };
          }
        })
      );

      for (const result of reads) {
        if (result.status === 'fulfilled' && result.value) {
          const { name, value, char } = result.value;
          if (value !== null) settings[name] = value;
          if (char) this.#settingsChars[name] = char;
        }
      }

      // Store save_to_flash characteristic
      try {
        const saveUUID = this.#settingsMap['save_to_flash'];
        if (saveUUID) {
          this.#saveChar = await settingsService.getCharacteristic(saveUUID);
        }
      } catch (e) { /* not critical */ }

      this.#emit('settingsLoaded', settings);

    } catch (e) {
      console.error('Failed to load settings:', e);
      this.#emit('error', { message: 'Could not load settings: ' + (e.message || e) });
    }
  }

  // ── Write Setting ──────────────────────────────────────────────────
  async bleSetSetting(name, value) {
    if (!this.#connected) return { ok: false, error: 'Not connected' };
    try {
      const limits = VALUE_LIMITS[name];
      if (limits) {
        const [min, max] = limits;
        if (value < min || value > max) {
          this.#emit('error', { message: `Value ${value} out of range for ${name} (min ${min}, max ${max})` });
          return { ok: false, error: 'out_of_range' };
        }
      }

      const char = this.#settingsChars[name];
      if (!char) {
        // Try to get the characteristic on the fly
        const uuid = this.#settingsMap[name];
        if (!uuid) {
          this.#emit('error', { message: `Unknown setting: ${name}` });
          return { ok: false, error: `Unknown setting: ${name}` };
        }

        const settingsServiceUUID = this.#version === 'v2.21'
          ? SERVICES.SETTINGS_V221
          : SERVICES.SETTINGS_V220;
        const settingsService = await withTimeout(
          this.#server.getPrimaryService(settingsServiceUUID), 10000, 'Settings service'
        );
        this.#settingsChars[name] = await withTimeout(
          settingsService.getCharacteristic(uuid), 10000, `Get characteristic ${name}`
        );
      }

      const encoded = encodeSetting(value);
      if (!encoded) {
        this.#emit('error', { message: `Invalid value for ${name}` });
        return { ok: false, error: `Invalid value for ${name}` };
      }
      await withTimeout(this.#settingsChars[name].writeValue(encoded), 10000, `Write setting ${name}`);
      return { ok: true };

    } catch (e) {
      console.error(`Failed to write setting ${name}:`, e);
      this.#emit('error', { message: `Failed to write ${name}: ${e.message || e}` });
      return { ok: false, error: e.message || String(e) };
    }
  }

  // ── Save to Flash ──────────────────────────────────────────────────
  async bleSaveToFlash() {
    if (!this.#connected) return { ok: false, error: 'Not connected' };
    try {
      if (this.#saveChar) {
        await withTimeout(this.#saveChar.writeValue(new Uint8Array([1])), 10000, 'Save to flash');
        return { ok: true };
      }

      // Try to find it on the fly
      const settingsServiceUUID = this.#version === 'v2.21'
        ? SERVICES.SETTINGS_V221
        : SERVICES.SETTINGS_V220;
      const settingsService = await withTimeout(
        this.#server.getPrimaryService(settingsServiceUUID), 10000, 'Settings service'
      );
      const saveUUID = this.#settingsMap['save_to_flash'];
      if (saveUUID) {
        this.#saveChar = await withTimeout(
          settingsService.getCharacteristic(saveUUID), 10000, 'Get save characteristic'
        );
        await withTimeout(this.#saveChar.writeValue(new Uint8Array([1])), 10000, 'Save to flash');
        return { ok: true };
      }

      return { ok: false, error: 'Save characteristic not found' };
    } catch (e) {
      console.error('Failed to save to flash:', e);
      this.#emit('error', { message: 'Failed to save: ' + (e.message || e) });
      return { ok: false, error: e.message || String(e) };
    }
  }

  // ── removeAllListeners (for API completeness with preload.js) ──────
  removeAllListeners(channel) {
    const eventMap = {
      'ble:liveData': 'liveData',
      'ble:connectionChange': 'connectionChange',
      'ble:deviceFound': 'deviceFound',
      'ble:settingsLoaded': 'settingsLoaded',
      'ble:error': 'error',
      'ble:scanning': 'scanning',
    };
    const event = eventMap[channel];
    if (event) this.#listeners[event] = [];
  }

  // ── Window controls (no-ops for PWA) ───────────────────────────────
  minimize() {}
  maximize() {}
  close() {}
}