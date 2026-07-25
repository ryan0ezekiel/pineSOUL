// BLE Manager — handles scanning, connecting, and communicating with Pinecil V2
// Uses @abandonware/noble for cross-platform BLE support

let noble;
try {
  noble = require('@abandonware/noble');
} catch (e) {
  console.warn('BLE library not available:', e.message);
}

const { PinecilProtocol } = require('./protocol.js');
const { VALUE_LIMITS } = require('./constants.js');

class BleManager {
  constructor(options = {}) {
    this.protocol = new PinecilProtocol();
    this.device = null;
    this.connected = false;
    this.scanning = false;
    this.settingsCharacteristics = [];
    this.bulkDataCharacteristic = null;
    this.deviceInfoCharacteristic = null;
    this.liveDataInterval = null;
    this._scanTimeout = null;
    this.window = null;
    this.deviceInfo = { id: '', build: '', name: '' };
    this._lastLiveData = null;
    this._lastSettings = null;
    this._pollingInterval = options.pollingInterval || 500;
    this._disconnecting = false; // guard against re-entrant disconnect
    this._boundHandlers = null; // stored for cleanup on destroy
    // Bind noble events (can be re-bound via reinitialize())
    this.#bindNobleEvents();
  }

  /**
   * Get the last live data reading
   * @returns {Object|null} Parsed live data values or null
   */
  getLiveData() {
    return this._lastLiveData;
  }

  /**
   * Get the last loaded settings
   * @returns {Object|null} Settings key-value map or null
   */
  getSettings() {
    return this._lastSettings;
  }

  /** Remove noble event listeners — call on app shutdown */
  async destroy() {
    // Disconnect any active peripheral first (BUG #5: macOS stays alive after close)
    await this.disconnect('window_closed');
    if (noble && this._boundHandlers) {
      noble.removeListener('stateChange', this._boundHandlers.stateChange);
      noble.removeListener('discover', this._boundHandlers.discover);
      this._boundHandlers = null;
    }
    if (this._scanTimeout) {
      clearTimeout(this._scanTimeout);
      this._scanTimeout = null;
    }
    this._stopLiveData();
  }

  setWindow(win) {
    this.window = win;
    // Re-bind noble events when a new window is created (BUG #4: macOS reopen)
    this.reinitialize();
  }
  /** Re-bind noble event listeners after destroy() — safe for singleton reuse */
  reinitialize() {
    this.#bindNobleEvents();
  }

  /** (private) Bind noble stateChange and discover handlers */
  #bindNobleEvents() {
    if (!noble) return;
    // Remove any existing bindings first to avoid duplicates
    if (this._boundHandlers) {
      noble.removeListener('stateChange', this._boundHandlers.stateChange);
      noble.removeListener('discover', this._boundHandlers.discover);
    }
    this._boundHandlers = {
      stateChange: (state) => {
        console.debug('BLE state:', state);
        this._emit('stateChange', state);
      },
      discover: (peripheral) => {
        if (peripheral.advertisement?.localName?.toLowerCase().includes('pinecil')) {
          this._emit('deviceFound', {
            name: peripheral.advertisement.localName,
            address: peripheral.address,
            rssi: peripheral.rssi,
            id: peripheral.id,
          });
        }
      },
    };
    noble.on('stateChange', this._boundHandlers.stateChange);
    noble.on('discover', this._boundHandlers.discover);
  }

  _emit(channel, data) {
    try {
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send(`ble:${channel}`, data);
      }
    } catch (e) {
      console.warn(`Failed to emit ble:${channel}:`, e.message);
    }
  }

  async scan() {
    if (!noble) throw new Error('BLE not available');

    // Clear any pending scan timeout
    if (this._scanTimeout) {
      clearTimeout(this._scanTimeout);
      this._scanTimeout = null;
    }

    this.scanning = true;
    this._emit('scanning', true);

    // Stop any previous scan
    try { noble.stopScanning(); } catch (e) {}

    // Start scanning for BLE devices
    await noble.startScanningAsync([], false);

    // Auto-stop after 10 seconds
    this._scanTimeout = setTimeout(() => {
      try { noble.stopScanning(); } catch (e) {}
      this.scanning = false;
      this._scanTimeout = null;
      this._emit('scanning', false);
    }, 10000);
  }

  async connect(address) {
    if (!noble) throw new Error('BLE not available');
    if (!address || typeof address !== 'string') throw new Error('Invalid address');

    // Disconnect existing connection before attempting a new one
    if (this.connected && this.device) {
      console.debug('Disconnecting existing device before new connection');
      await this.disconnect('reconnecting');
    }

    // Clear any pending scan timeout — we're connecting now
    if (this._scanTimeout) {
      clearTimeout(this._scanTimeout);
      this._scanTimeout = null;
    }

    this._emit('connectionChange', { status: 'connecting', address });

    try {
      // Find the peripheral
      const peripheral = await noble.findPeripheralAsync(address);
      if (!peripheral) {
        const err = new Error(`Device not found: ${address}`);
        this._emit('error', { type: 'connection', message: err.message, address });
        throw err;
      }

      // Connect
      await peripheral.connectAsync();
      this.device = peripheral;

      try {
        // Discover services
        const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync([], []);

        // Detect firmware version
        const serviceUUIDs = peripheral.services?.map(s => s.uuid) || [];
        const version = this.protocol.detectVersion(serviceUUIDs);

        if (!version) {
          const err = new Error('Unrecognized Pinecil firmware — could not detect BLE services');
          this._emit('error', { type: 'firmware', message: err.message, address });
          throw err;
        }

        // Find settings characteristics
        this.settingsCharacteristics = [];
        this.bulkDataCharacteristic = null;

        for (const char of (characteristics || [])) {
          const uuid = char.uuid;

          // Check if it's a settings characteristic
          if (this.protocol.getSettingName(uuid) !== uuid) {
            this.settingsCharacteristics.push(char);
          }

          // Check if it's the BulkData characteristic
          const bulkDataUUID = this.protocol.getBulkDataCharUUID();
          if (bulkDataUUID && uuid === bulkDataUUID) {
            this.bulkDataCharacteristic = char;
          }
        }

        // Get device info
        this.deviceInfo = {
          name: peripheral.advertisement?.localName || `Pinecil-${address}`,
          address: address,
          build: version,
          rssi: peripheral.rssi,
        };

        this.connected = true;
        this._emit('connectionChange', {
          status: 'connected',
          address,
          deviceInfo: this.deviceInfo,
        });

        // Start live data polling
        this._startLiveData();

        // Load settings
        await this._loadSettings();

        return this.deviceInfo;
      } catch (discoverErr) {
        // Disconnect peripheral so it doesn't stay connected on failure
        try { await peripheral.disconnectAsync(); } catch (_) { /* best-effort */ }
        throw discoverErr;
      }
    } catch (e) {
      // Emit 'error' for connection failures (avoid double-emit for cases
      // already handled above like device-not-found and firmware detection)
      if (e.message && !e.message.startsWith('Device not found') && !e.message.includes('firmware')) {
        this._emit('error', { type: 'connection', message: e.message, address });
      }
      throw e;
    }
  }


  async disconnect(reason = 'user') {
    if (this._disconnecting) return; // prevent re-entrant disconnect
    this._disconnecting = true;
    try {
      this._stopLiveData();

      // Clear scan timeout
      if (this._scanTimeout) {
        clearTimeout(this._scanTimeout);
        this._scanTimeout = null;
      }

      if (this.device) {
        try {
          await this.device.disconnectAsync();
        } catch (e) {
          console.warn('Disconnect error:', e);
        }
      }

      this.device = null;
      this.connected = false;
      this._lastLiveData = null;
      this._lastSettings = null;
      this.settingsCharacteristics = [];
      this.bulkDataCharacteristic = null;

      this._emit('connectionChange', { status: 'disconnected', reason });
    } finally {
      this._disconnecting = false;
    }
  }

  async _loadSettings() {
    if (!this.connected) return;

    const settings = {};

    try {
      // Read all settings in parallel
      const reads = this.settingsCharacteristics.map(async (char) => {
        try {
          const value = await char.readAsync();
          const name = this.protocol.getSettingName(char.uuid);
          const parsed = this.protocol.parseSetting(value);
          if (parsed !== null) {
            settings[name] = parsed;
          }
        } catch (e) {
          // Individual setting read failure — skip
        }
      });

      await Promise.all(reads);
      this._lastSettings = settings;
      this._emit('settingsLoaded', settings);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  _startLiveData() {
    this._stopLiveData();

    if (!this.bulkDataCharacteristic) return;

    let readInFlight = false;

    this.liveDataInterval = setInterval(async () => {
      if (!this.connected || !this.bulkDataCharacteristic) return;
      if (readInFlight) return; // skip if previous read still in-flight

      readInFlight = true;
      try {
        const value = await this.bulkDataCharacteristic.readAsync();
        const data = this.protocol.parseLiveData(value);
        if (data) {
          this._lastLiveData = data;
          this._emit('liveData', data);
        }
      } catch (e) {
        console.warn('Live data read error:', e);
        // If device disconnects, handle it
        if (!this.device?.connected) {
          this.disconnect('connection_lost');
        }
      } finally {
        readInFlight = false;
      }
    }, this._pollingInterval);
  }

  _stopLiveData() {
    if (this.liveDataInterval) {
      clearInterval(this.liveDataInterval);
      this.liveDataInterval = null;
    }
  }

  async setSetting(name, value) {
    if (!this.connected) throw new Error('Not connected');

    const uuid = this.protocol.getSettingUUID(name);
    if (!uuid) throw new Error(`Unknown setting: ${name}`);

    // Validate value is numeric before range check
    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw new Error(`Invalid value for ${name}: not a number`);
    }

    const limits = VALUE_LIMITS[name];
    if (limits) {
      const [min, max] = limits;
      if (num < min || num > max) {
        throw new Error(`Value ${num} out of range for ${name}: [${min}, ${max}]`);
      }
    }

    const char = this.settingsCharacteristics.find(c => c.uuid === uuid);
    if (!char) throw new Error(`Setting characteristic not found: ${name}`);

    const encoded = this.protocol.encodeSetting(num);
    if (!encoded) throw new Error(`Failed to encode value for ${name}`);
    await char.writeAsync(encoded, false);

    return true;
  }

  async saveToFlash() {
    if (!this.connected) throw new Error('Not connected');
    const uuid = this.protocol.getSettingUUID('save_to_flash');
    if (!uuid) throw new Error('save_to_flash characteristic not found');
    const char = this.settingsCharacteristics.find(c => c.uuid === uuid);
    if (!char) throw new Error('save_to_flash characteristic not found');
    // Write single byte 0x01 (matches PineSAM protocol spec)
    const buf = Buffer.alloc(1);
    buf.writeUInt8(1, 0);
    await char.writeAsync(buf, false);
    return true;
  }
}

module.exports = { BleManager };
