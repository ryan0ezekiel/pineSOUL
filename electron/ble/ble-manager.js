// BLE Manager — handles scanning, connecting, and communicating with Pinecil V2
// Uses @abandonware/noble for cross-platform BLE support

let noble;
try {
  noble = require('@abandonware/noble');
} catch (e) {
  console.warn('BLE library not available:', e.message);
}

const { PinecilProtocol } = require('./protocol.js');

class BleManager {
  constructor() {
    this.protocol = new PinecilProtocol();
    this.device = null;
    this.connected = false;
    this.scanning = false;
    this.settingsCharacteristics = [];
    this.bulkDataCharacteristic = null;
    this.deviceInfoCharacteristic = null;
    this.liveDataInterval = null;
    this.window = null;
    this.deviceInfo = { id: '', build: '', name: '' };

    // Bind noble events
    if (noble) {
      noble.on('stateChange', (state) => {
        console.log('BLE state:', state);
        this._emit('stateChange', state);
      });

      noble.on('discover', (peripheral) => {
        if (peripheral.advertisement?.localName?.toLowerCase().includes('pinecil')) {
          this._emit('deviceFound', {
            name: peripheral.advertisement.localName,
            address: peripheral.address,
            rssi: peripheral.rssi,
            id: peripheral.id,
          });
        }
      });
    }
  }

  setWindow(win) {
    this.window = win;
  }

  _emit(channel, data) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  async scan() {
    if (!noble) throw new Error('BLE not available');
    
    this.scanning = true;
    this._emit('scanning', true);
    
    // Stop any previous scan
    try { noble.stopScanning(); } catch (e) {}
    
    // Start scanning for BLE devices
    await noble.startScanningAsync([], false);
    
    // Auto-stop after 10 seconds
    setTimeout(() => {
      noble.stopScanning();
      this.scanning = false;
      this._emit('scanning', false);
    }, 10000);
  }

  async connect(address) {
    if (!noble) throw new Error('BLE not available');

    this._emit('connectionChange', { status: 'connecting', address });

    // Find the peripheral
    const peripheral = await noble.findPeripheralAsync(address);
    if (!peripheral) throw new Error(`Device not found: ${address}`);

    // Connect
    await peripheral.connectAsync();
    this.device = peripheral;

    // Discover services
    const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync([], []);

    // Detect firmware version
    const serviceUUIDs = peripheral.services?.map(s => s.uuid) || [];
    const version = this.protocol.detectVersion(serviceUUIDs);

    if (!version) {
      throw new Error('Unrecognized Pinecil firmware — could not detect BLE services');
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
  }

  async disconnect() {
    this._stopLiveData();

    if (this.device) {
      try {
        await this.device.disconnectAsync();
      } catch (e) {
        console.warn('Disconnect error:', e);
      }
    }

    this.device = null;
    this.connected = false;
    this.settingsCharacteristics = [];
    this.bulkDataCharacteristic = null;

    this._emit('connectionChange', { status: 'disconnected' });
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
      this._emit('settingsLoaded', settings);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  _startLiveData() {
    this._stopLiveData();

    if (!this.bulkDataCharacteristic) return;

    this.liveDataInterval = setInterval(async () => {
      if (!this.connected || !this.bulkDataCharacteristic) return;

      try {
        const value = await this.bulkDataCharacteristic.readAsync();
        const data = this.protocol.parseLiveData(value);
        if (data) {
          this._emit('liveData', data);
        }
      } catch (e) {
        console.warn('Live data read error:', e);
        // If device disconnects, handle it
        if (!this.device?.connected) {
          this.disconnect();
        }
      }
    }, 500); // 2Hz update rate
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

    const char = this.settingsCharacteristics.find(c => c.uuid === uuid);
    if (!char) throw new Error(`Setting characteristic not found: ${name}`);

    const encoded = this.protocol.encodeSetting(value);
    await char.writeAsync(encoded, false);

    return true;
  }

  async saveToFlash() {
    return this.setSetting('save_to_flash', 1);
  }
}

module.exports = { BleManager };
