// Pinecil V2 Protocol Parser — ESM version for PWA/web build
// Uses DataView + Uint8Array instead of Node.js Buffer

import { SETTINGS_V221, SETTINGS_V220, BULK_DATA_V221, BULK_DATA_V220, SERVICES, LIVE_DATA_FIELDS } from './constants.js';

// ─── UUID ↔ Name Lookups ────────────────────────────────────────────
const SETTINGS_MAP_V220 = Object.fromEntries(
  Object.entries(SETTINGS_V220).map(([k, v]) => [v, k])
);
const SETTINGS_MAP_V221 = Object.fromEntries(
  Object.entries(SETTINGS_V221).map(([k, v]) => [v, k])
);
const BULK_MAP_V220 = Object.fromEntries(
  Object.entries(BULK_DATA_V220).map(([k, v]) => [v, k])
);
const BULK_MAP_V221 = Object.fromEntries(
  Object.entries(BULK_DATA_V221).map(([k, v]) => [v, k])
);

// ─── Detect firmware version from GATT service UUIDs ────────────────
export function detectVersion(serviceUUIDs) {
  if (serviceUUIDs.includes(SERVICES.SETTINGS_V221)) {
    return 'v2.21';
  } else if (serviceUUIDs.includes(SERVICES.SETTINGS_V220)) {
    return 'v2.20';
  }
  return null;
}

// ─── Live Data Parser (56 bytes = 14 × uint32 LE) ──────────────────
export function parseLiveData(buffer) {
  if (!buffer || buffer.byteLength < 56) return null;
  const raw = new Uint8Array(buffer);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const fields = LIVE_DATA_FIELDS;
  const values = {};
  for (let i = 0; i < Math.min(14, fields.length); i++) {
    values[fields[i]] = view.getUint32(i * 4, true);
  }
  return values;
}

// ─── Setting Parser (2 bytes = uint16 LE) ───────────────────────────
export function parseSetting(buffer, version) {
  if (!buffer || buffer.byteLength < 2) return null;
  const raw = new Uint8Array(buffer);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const value = view.getUint16(0, true);
  const mapped = (value >> 8) & 0x7f;
  const sign = value & 0x8000;
  return (sign !== 0 && mapped !== 0) ? -mapped : mapped;
}

// ─── Setting Encoder ─────────────────────────────────────────────────
export function encodeSetting(value) {
  const buf = new Uint8Array(2);
  const view = new DataView(buf.buffer);
  view.setUint16(0, value, true);
  return buf;
}

// ─── Settings Map for a given firmware version ──────────────────────
export function getSettingsMap(version) {
  return version === 'v2.21' ? SETTINGS_MAP_V221 : SETTINGS_MAP_V220;
}

// ─── Bulk Data Map for a given firmware version ─────────────────────
export function getBulkMap(version) {
  return version === 'v2.21' ? BULK_MAP_V221 : BULK_MAP_V220;
}
