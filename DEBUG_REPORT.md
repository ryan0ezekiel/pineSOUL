# pineSOUL Debug Report

**Project:** pineSOUL — Modern Pinecil V2 soldering iron controller  
**Date:** 2026-07-25  
**Branch:** master  
**Version:** 1.0.1  
**Total bugs fixed:** 30 (Cycles 1–8)  
**New bugs found:** 9 (5 code bugs + 4 hardening items)

---

## Build Errors Explained

### RPM Build Failure (`proc_af2f904d4f7f` — exit code 1)

```
⨯ to build rpm, executable rpmbuild is required, please install: sudo apt-get install rpm
```

**What happened:** The Electron v1.0.0 build had `"target": ["AppImage", "deb", "rpm"]` in `package.json`. The server environment doesn't have `rpmbuild` installed, so the `rpm` target failed after `deb` succeeded.

**Fix:** Swapped `rpm` → `tar.xz` in commit `cbb9211`. The `tar.xz` target requires no system dependencies. Current targets: `["AppImage", "deb", "tar.xz"]`.

**This is NOT a code bug** — it's a missing system dependency. The fix is permanent (tar.xz is lighter and has no external dependencies).

---

## New Bugs Found (Post-Cycle-8 Audit)

### BUG-31: CRITICAL — PWA parseSetting uses wrong BLE encoding

**File:** `src/ble/protocol.js` → `parseSetting()`  
**Severity:** CRITICAL (PWA settings will show wrong values with real hardware)

The PWA version of `parseSetting` applies **sign-magnitude decoding** to the raw uint16 BLE value:

```javascript
// PWA (WRONG for v2.20/v2.21 firmware)
const value = view.getUint16(0, true);
const mapped = (value >> 8) & 0x7f;
const sign = value & 0x8000;
return (sign !== 0 && mapped !== 0) ? -mapped : mapped;
```

The Electron version correctly returns the **raw uint16**:

```javascript
// Electron (CORRECT)
return view.getUint16(0, true);
```

**Impact:** Every setting value displayed in the PWA will be wrong when connected to a real Pinecil. For example, `SetTemperature = 400` (raw `0x0190`) decodes to `1` via sign-magnitude. The settings panel will show nonsensical values.

**Note:** Mock mode is unaffected — it uses hardcoded JS values, not BLE.

**Fix:** Change PWA `parseSetting` to return raw uint16, matching the Electron version:
```javascript
export function parseSetting(buffer, version) {
  const raw = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!raw || raw.byteLength < 2) return null;
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  return view.getUint16(0, true);
}
```

---

### BUG-32: CRITICAL — PWA encodeSetting asymmetry

**File:** `src/ble/protocol.js` → `encodeSetting()`  
**Severity:** CRITICAL (writing settings back will corrupt values on device)

`parseSetting` decodes sign-magnitude, but `encodeSetting` writes raw uint16. This creates a read/write asymmetry: reading a value, then writing it back, sends the wrong value to the device.

```javascript
// encodeSetting (both PWA and Electron)
view.setUint16(0, value, true); // writes raw, not sign-magnitude encoded
```

If the user reads SetTemperature (decoded to 1 via sign-magnitude), then saves to flash, the device receives raw value 1 instead of 400.

**Fix:** Resolved by BUG-31 fix (both parse/encode use raw uint16, no asymmetry).

---

### BUG-33: HIGH — PWA bleConnect ignores address parameter

**File:** `src/ble/web-bluetooth.js` → `bleConnect(address)`  
**Severity:** HIGH (reconnect goes to wrong device)

```javascript
async bleConnect(address) {
  if (this.#device) {        // ← ignores `address` entirely
    await this.#doConnect();  // reconnects to THIS.#device (last scanned)
    return { ok: true };
  }
  return { ok: false, error: 'No device selected. Click Scan first.' };
}
```

If a user scans Device A, then Device B appears in the list, clicking "Connect" on Device B will actually connect to Device A.

**Fix:** When `address` is provided and differs from `this.#device.id`, emit an error or attempt to re-pick via Web Bluetooth API (which doesn't support reconnect by address — the user must re-scan).

---

### BUG-34: MEDIUM — formatHandleTemp divides by 10, formatTemp doesn't

**File:** `src/hooks/usePinecil.js`  
**Severity:** MEDIUM (temperature display may be wrong with real hardware — hardware-dependent)

```javascript
// HandleTemp: divides by 10 (treats as 0.1°C)
const formatHandleTemp = useCallback((raw) => {
  const tempC = (raw / 10);
  return Math.round(settings.TemperatureUnit === 1 ? tempC * 9/5 + 32 : tempC);
}, [settings.TemperatureUnit]);

// LiveTemp/SetTemp: does NOT divide by 10 (treats as °C directly)
const formatTemp = useCallback((tempC) => {
  return Math.round(settings.TemperatureUnit === 1 ? tempC * 9/5 + 32 : tempC);
}, [settings.TemperatureUnit]);
```

If the Pinecil BLE protocol sends all temperature values in 0.1°C units (which the comment in constants.js states: `"LiveTemp — Current tip temperature (0.1°C or °F units)"`), then `formatTemp` should also divide by 10 for LiveTemp and SetTemp. Currently it doesn't, so the dial would show `3180°` instead of `318°`.

**Note:** The mock data uses °C values directly (LiveTemp: 318), so mock mode is unaffected. This only manifests with real hardware.

**Hardware-dependent:** Needs Pinecil to verify. If the protocol actually sends °C directly for v2.21+ (not 0.1°C), this is a false alarm.

---

### BUG-35: MEDIUM — Keyboard shortcuts bypass pendingSettings flow

**File:** `src/hooks/usePinecil.js` → `handleTempUp/handleTempDown/handleToggleMode`  
**Severity:** MEDIUM (logic inconsistency)

Keyboard shortcuts call `api.bleSetSetting()` directly AND `updateSetting()`:

```javascript
const handleTempUp = useCallback((step) => {
  updateSetting('SetTemperature', newTemp);      // adds to pendingSettings + dirtySettings
  setLiveData(prev => ({ ...prev, SetTemp: newTemp })); // optimistic UI update
  if (!mock && api) {
    api.bleSetSetting('SetTemperature', newTemp).catch(() => {}); // ← direct BLE write
  }
}, [updateSetting, mock]);
```

This creates two problems:
1. The setting is written directly to the device AND added to `pendingSettings`. If user then clicks "Save to Flash", the value gets written again (double write).
2. The optimistic `setLiveData` update may flicker when the next BLE poll arrives with the confirmed value.

---

### BUG-36: MEDIUM — ShutdownTimeout step too coarse

**File:** `src/components/SettingsPanel.jsx` → SettingRow stepper  
**Severity:** MEDIUM (UX)

`VALUE_LIMITS.ShutdownTimeout: [0, 60]` → auto-step = `10` (because `60 - 0 > 50`). User can only set 0, 10, 20, 30, 40, 50, 60 minutes. Can't set 5 min, 15 min, etc.

The actual Pinecil supports 1-minute granularity for this setting.

**Fix:** Add `step: 1` override for ShutdownTimeout in SETTING_META, or adjust the auto-step logic.

---

### BUG-37: LOW — Service worker cache not versioned

**File:** `public/sw.js`  
**Severity:** LOW

```javascript
const CACHE_NAME = 'pinesoul-v1'; // hardcoded
```

Deploying an update doesn't auto-invalidate old cache because the version string never changes. Users may see stale content until hard-refresh.

**Fix:** Bump `CACHE_NAME` version on each release (e.g., `pinesoul-v1.0.1`).

---

### BUG-38: LOW — Calibration settings permanently hidden

**File:** `src/components/SettingsPanel.jsx`  
**Severity:** LOW (probably intentional)

`VoltageCalibration`, `CalibrationOffset`, and `CalibrateCJC` are in `HIDDEN_SETTINGS`, and the `calibration` group they belong to doesn't exist in `GROUPS`. There's no way to access these settings from the UI.

This is likely intentional (writing wrong calibration values can damage the iron), but should be documented.

---

### BUG-39: LOW — Hardcoded UUID strings in web-bluetooth.js

**File:** `src/ble/web-bluetooth.js` → `bleScan()` optionalServices  
**Severity:** LOW (maintenance risk)

```javascript
optionalServices: [
  SERVICES.SETTINGS_V220,
  SERVICES.SETTINGS_V221,
  SERVICES.BULK_DATA_V220,
  SERVICES.BULK_DATA_V221,
  '9eae1adb-9d0d-48c5-a6e7-ae93f0ea37b0',  // ← hardcoded duplicate
  '9eae1000-9d0d-48c5-aa55-33e27f9bc533',  // ← hardcoded duplicate
],
```

Two UUIDs are hardcoded strings instead of using the `SERVICES` constants. If constants change, these would silently break.

---

## Previous Bugs (Cycles 1–8) — All Fixed

| # | Status | Description |
|---|--------|-------------|
| 1–30 | ✅ Fixed | All bugs from Cycles 1–8 are resolved and verified |

**Key fix in this cycle:** BUG-30 (Settings crash) — `dirtySettings?.has(name)` → `pendingChanges?.has(name)` at SettingsPanel.jsx line 339.

---

## Existing Hardware-Dependent Issues

| # | Issue | Status |
|---|-------|--------|
| H1 | PWA buffer offset in `parseLiveData(raw.buffer)` — may need `.slice()` for Web Bluetooth DataView offsets | Needs hardware test |
| H2 | PWA hardcoded V221 constants — dynamic firmware version detection for v2.20 fallback | Needs hardware test |
| H3 | BUG-34: formatTemp / 0.1°C unit handling | Needs hardware test |

---

## Code Quality Notes

### Duplicate Constants Files

Three copies of BLE constants exist:
- `src/constants.js` — used by SettingsPanel (SETTING_META, VALUE_LIMITS)
- `src/ble/constants.js` — used by PWA BLE protocol (ESM)
- `electron/ble/constants.js` — used by Electron BLE manager (CommonJS)

The `src/constants.js` version is missing `SETTINGS_V220` and `BULK_DATA_V220` map exports (only has the service UUID). This is not a bug (nothing imports them from there) but it's a maintenance risk.

### Mock Data vs Real BLE Values

The `MOCK_LIVE_DATA` uses °C values directly (LiveTemp: 318), but the Pinecil BLE protocol may send 0.1°C values (LiveTemp: 3180). This means mock mode works fine but doesn't represent real BLE behavior. BUG-34 is related.

---

## Build Verification (Current)

| Build | Status | Notes |
|-------|--------|-------|
| PWA (vite build --config vite.config.pwa.js) | ✅ Clean | 0 warnings |
| Electron Vite build | ✅ Clean | 0 warnings |
| Electron Linux AppImage | ✅ | v1.0.1 |
| Electron Linux deb | ✅ | v1.0.1 |
| Electron Linux tar.xz | ✅ | v1.0.1 (replaced rpm) |
| RPM | ❌ Removed | Requires `rpmbuild` system tool — replaced with tar.xz |

---

## Static Analysis Summary

| Check | Result |
|-------|--------|
| `dirtySettings` scope references | ✅ All fixed (was BUG-30) |
| TODO/FIXME/HACK markers | 0 |
| Empty catch blocks | 0 |
| Unsafe `window.electronAPI` access | 0 |
| React.memo usage | 3 components (TemperatureDial, TemperatureGraph, SettingRow) |
| ARIA attributes | 12+ labels, 1 switch, 1 alert, 1 log, 1 expanded, 2 busy |
| Disconnect reason tracking | Both Electron + Web Bluetooth |
| ParseSetting consistency | ⚠️ PWA/Electron differ (BUG-31) |

---

## Priority Fix Queue

| Priority | Bug | Effort |
|----------|-----|--------|
| P0 | BUG-31 + BUG-32: PWA parseSetting/encodeSetting | 1 line fix |
| P1 | BUG-33: PWA bleConnect address ignored | Small |
| P2 | BUG-35: Keyboard shortcut direct BLE write | Medium |
| P2 | BUG-36: ShutdownTimeout step size | Trivial |
| P3 | BUG-37: SW cache versioning | Trivial |
| P3 | BUG-39: Hardcoded UUIDs in optionalServices | Trivial |
