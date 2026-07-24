// Web Bluetooth adapter — provides the same API as window.electronAPI from preload.js
// Uses navigator.bluetooth instead of noble. Works in Chrome/Edge/Opera on HTTPS or localhost.

import {
  SERVICES, SETTINGS_V221, BULK_DATA_V221,
  LIVE_DATA_FIELDS,
} from './constants.js';
import {
  parseLiveData, parseSetting, encodeSetting,
  detectVersion, getSettingsMap, getBulkMap,
} from './protocol.js';

export class WebBleAdapter {
  #device = null;
  #server = null;
  #version = null;
  #settingsMap = null;
  #bulkMap = null;
  #listeners = {};
  #bulkDataChar = null;
  #settingsChars = {};
  #saveChar = null;
  #connected = false;
  #settingsVersion = null; // for decode/encode on write

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

  // ── Scan (shows browser-native device picker) ─────────────────────
  async bleScan() {
    if (!navigator.bluetooth) {
      this.#emit('error', { message: 'Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera on HTTPS.' });
      return { ok: false, error: 'Web Bluetooth not supported' };
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [SERVICES.SETTINGS_V221] },
          { services: [SERVICES.SETTINGS_V220] },
        ],
        optionalServices: [
          SERVICES.SETTINGS_V220,
          SERVICES.SETTINGS_V221,
          SERVICES.BULK_DATA_V220,
          SERVICES.BULK_DATA_V221,
          '9eae1adb-9d0d-48c5-a6e7-ae93f0ea37b0',
          '9eae1000-9d0d-48c5-aa55-33e27f9bc533',
        ],
      });

      // Remove previous disconnect listener to prevent accumulation
      if (this.#device && this._disconnectHandler) {
        this.#device.removeEventListener('gattserverdisconnected', this._disconnectHandler);
      }

      this.#device = device;

      this.#emit('deviceFound', {
        name: device.name || 'Pinecil',
        address: device.id,
      });

      this._disconnectHandler = () => this.#handleDisconnect();
      device.addEventListener('gattserverdisconnected', this._disconnectHandler);

      // Auto-connect after browser picker
      await this.#doConnect();

      return { ok: true };
    } catch (e) {
      if (e.name === 'NotFoundError') {
        // User cancelled the picker — not an error
        return { ok: false, error: 'No device selected' };
      }
      console.error('BLE scan error:', e);
      this.#emit('error', { message: e.message || String(e) });
      return { ok: false, error: e.message || String(e) };
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

  async #doConnect() {
    try {
      this.#emit('connectionChange', { status: 'connecting' });

      // Clean up old notification handlers before reconnecting
      if (this.#bulkDataChar && this.#bulkDataChar._pwaHandler) {
        this.#bulkDataChar.removeEventListener('characteristicvaluechanged', this.#bulkDataChar._pwaHandler);
        this.#bulkDataChar._pwaHandler = null;
      }

      // Disconnect existing GATT connection if any
      if (this.#device?.gatt?.connected) {
        this.#device.gatt.disconnect();
      }

      this.#server = await this.#device.gatt.connect();

      // Detect firmware version from available services
      const services = await this.#server.getPrimaryServices();
      const serviceUUIDs = services.map(s => s.uuid);

      this.#version = detectVersion(serviceUUIDs);
      if (!this.#version) {
        throw new Error('Unsupported Pinecil firmware. Please update to v2.20+.');
      }

      this.#connected = true;
      this.#settingsMap = getSettingsMap(this.#version);
      this.#bulkMap = getBulkMap(this.#version);

      const deviceInfo = {
        name: this.#device.name || 'Pinecil',
        address: this.#device.id,
        firmwareVersion: this.#version,
      };

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
    this.#bulkDataChar = null;
    this.#settingsChars = {};
    this.#saveChar = null;
    this.#emit('connectionChange', { status: 'disconnected', reason });
  }

  // ── Live Data (subscribe to BulkData notifications) ────────────────
  async #setupBulkData() {
    try {
      const bulkUUID = Object.keys(this.#bulkMap).find(
        k => this.#bulkMap[k] === 'BulkData'
      );
      if (!bulkUUID) return;

      const bulkServiceUUID = this.#version === 'v2.21'
        ? SERVICES.BULK_DATA_V221
        : SERVICES.BULK_DATA_V220;
      const bulkService = await this.#server.getPrimaryService(bulkServiceUUID);
      this.#bulkDataChar = await bulkService.getCharacteristic(bulkUUID);

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

      const settingsService = await this.#server.getPrimaryService(settingsServiceUUID);
      const settings = {};

      const settingNames = Object.values(this.#settingsMap).filter(n => n !== 'save_to_flash' && n !== 'SettingsReset');

      // Read all settings in parallel
      const reads = await Promise.allSettled(
        settingNames.map(async (name) => {
          const uuid = Object.keys(this.#settingsMap).find(k => this.#settingsMap[k] === name);
          if (!uuid) return null;

          try {
            const char = await settingsService.getCharacteristic(uuid);
            const value = await char.readValue();
            const raw = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
            return { name, value: parseSetting(raw, this.#version), char };
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
        const saveUUID = Object.keys(this.#settingsMap).find(k => this.#settingsMap[k] === 'save_to_flash');
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
    try {
      const char = this.#settingsChars[name];
      if (!char) {
        // Try to get the characteristic on the fly
        const uuid = Object.keys(this.#settingsMap).find(k => this.#settingsMap[k] === name);
        if (!uuid) {
          this.#emit('error', { message: `Unknown setting: ${name}` });
          return { ok: false, error: `Unknown setting: ${name}` };
        }

        const settingsServiceUUID = this.#version === 'v2.21'
          ? SERVICES.SETTINGS_V221
          : SERVICES.SETTINGS_V220;
        const settingsService = await this.#server.getPrimaryService(settingsServiceUUID);
        this.#settingsChars[name] = await settingsService.getCharacteristic(uuid);
      }

      const encoded = encodeSetting(value);
      await this.#settingsChars[name].writeValue(encoded);
      return { ok: true };

    } catch (e) {
      console.error(`Failed to write setting ${name}:`, e);
      this.#emit('error', { message: `Failed to write ${name}: ${e.message || e}` });
      return { ok: false, error: e.message || String(e) };
    }
  }

  // ── Save to Flash ──────────────────────────────────────────────────
  async bleSaveToFlash() {
    try {
      if (this.#saveChar) {
        await this.#saveChar.writeValue(new Uint8Array([1]));
        return { ok: true };
      }

      // Try to find it on the fly
      const settingsServiceUUID = this.#version === 'v2.21'
        ? SERVICES.SETTINGS_V221
        : SERVICES.SETTINGS_V220;
      const settingsService = await this.#server.getPrimaryService(settingsServiceUUID);
      const saveUUID = Object.keys(this.#settingsMap).find(k => this.#settingsMap[k] === 'save_to_flash');
      if (saveUUID) {
        this.#saveChar = await settingsService.getCharacteristic(saveUUID);
        await this.#saveChar.writeValue(new Uint8Array([1]));
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
    };
    const event = eventMap[channel];
    if (event) this.#listeners[event] = [];
  }

  // ── bleGetLiveData / bleGetSettings (no-ops, PWA uses notifications) ──
  bleGetLiveData() { return null; }
  bleGetSettings() { return null; }

  // ── Window controls (no-ops for PWA) ───────────────────────────────
  minimize() {}
  maximize() {}
  close() {}

  // ── Hotkey config (localStorage for PWA) ──────────────────────────
  async getConfig() {
    try {
      const raw = localStorage.getItem('pinesoul_hotkeys');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  async saveConfig(config) {
    try {
      localStorage.setItem('pinesoul_hotkeys', JSON.stringify(config));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
}
