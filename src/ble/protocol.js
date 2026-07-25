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
  // Accept both ArrayBuffer and Uint8Array (fixes offset bug with Web Bluetooth)
  const raw = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!raw || raw.byteLength < 56) return null;
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const fields = LIVE_DATA_FIELDS;
  const values = {};
  for (let i = 0; i < Math.min(14, fields.length); i++) {
    values[fields[i]] = view.getUint32(i * 4, true);
  }
  return values;
}

// ─── Setting Parser (2 bytes = uint16 LE) ───────────────────────────
export function parseSetting(buffer) {
  // Accept both ArrayBuffer and Uint8Array (fixes offset bug with Web Bluetooth)
  const raw = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!raw || raw.byteLength < 2) return null;
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  return view.getUint16(0, true); // little-endian uint16 (matches Electron)
}

// ─── Setting Encoder ─────────────────────────────────────────────────
export function encodeSetting(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 65535 || num !== Math.floor(num)) {
    console.warn('[Protocol] encodeSetting: clamping invalid value', value, 'to safe range');
  }
  const clamped = Math.max(0, Math.min(65535, Math.floor(num || 0)));
  const buf = new Uint8Array(2);
  const view = new DataView(buf.buffer);
  view.setUint16(0, clamped, true);
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
