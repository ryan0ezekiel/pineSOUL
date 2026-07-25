// Pinecil V2 BLE Protocol Implementation
// Handles encoding/decoding of BLE characteristics

const {
  SERVICES,
  SETTINGS_V221,
  SETTINGS_V220,
  BULK_DATA_V221,
  BULK_DATA_V220,
  LIVE_DATA_FIELDS,
} = require('./constants.js');

class PinecilProtocol {
  constructor() {
    this.version = null;       // 'v220' | 'v221'
    this.settingsUUID = null;
    this.bulkDataUUID = null;
    this.settingsMap = null;
    this.bulkDataMap = null;
  }

  /**
   * Detect firmware version by checking which service UUIDs exist
   */
  detectVersion(serviceUUIDs) {
    if (serviceUUIDs.includes(SERVICES.SETTINGS_V221)) {
      this.version = 'v221';
      this.settingsUUID = SERVICES.SETTINGS_V221;
      this.bulkDataUUID = SERVICES.BULK_DATA_V221;
      this.settingsMap = SETTINGS_V221;
      this.bulkDataMap = BULK_DATA_V221;
      return 'v2.21'; // match PWA format
    }
    if (serviceUUIDs.includes(SERVICES.SETTINGS_V220)) {
      this.version = 'v220';
      this.settingsUUID = SERVICES.SETTINGS_V220;
      this.bulkDataUUID = SERVICES.BULK_DATA_V220;
      this.settingsMap = SETTINGS_V220;
      this.bulkDataMap = BULK_DATA_V220;
      return 'v2.20'; // match PWA format
    }
    return null;
  }

  /**
   * Parse the 56-byte BulkData into live values
   * Format: 14 × uint32 little-endian
   */
  parseLiveData(buffer) {
    if (!buffer || buffer.length < 56) return null;

    // Handle Node.js Buffer: create DataView from the actual buffer content,
    // not the underlying ArrayBuffer (which may have offset/size mismatch)
    const raw = new Uint8Array(buffer);
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const values = {};
    const numValues = Math.floor(buffer.length / 4);

    for (let i = 0; i < Math.min(numValues, LIVE_DATA_FIELDS.length); i++) {
      values[LIVE_DATA_FIELDS[i]] = view.getUint32(i * 4, true); // little-endian
    }

    return values;
  }

  /**
   * Parse a setting value from a 2-byte buffer
   */
  parseSetting(buffer) {
    if (!buffer || buffer.length < 2) return null;
    const raw = new Uint8Array(buffer);
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    return view.getUint16(0, true); // little-endian uint16
  }

  /**
   * Encode a setting value to a 2-byte buffer
   */
  encodeSetting(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      console.warn('[Protocol] encodeSetting: rejecting non-numeric value', value);
      return null;
    }
    if (num < 0 || num > 65535 || num !== Math.floor(num)) {
      console.warn('[Protocol] encodeSetting: clamping out-of-range value', value, 'to [0, 65535]');
    }
    const clamped = Math.max(0, Math.min(65535, Math.floor(num)));
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(clamped, 0);
    return buffer;
  }

  /**
   * Find the characteristic UUID for a setting name
   */
  getSettingUUID(name) {
    if (!this.settingsMap) return null;
    for (const [uuid, settingName] of Object.entries(this.settingsMap)) {
      if (settingName === name) return uuid;
    }
    return null;
  }

  /**
   * Find the setting name for a characteristic UUID
   */
  getSettingName(uuid) {
    if (!this.settingsMap) return uuid;
    return this.settingsMap[uuid] || uuid;
  }

  /**
   * Find the BulkData characteristic UUID
   */
  getBulkDataCharUUID() {
    if (!this.bulkDataMap) return null;
    const entry = Object.entries(this.bulkDataMap).find(([_, n]) => n === 'BulkData');
    return entry ? entry[0] : null;
  }
}

module.exports = { PinecilProtocol };
