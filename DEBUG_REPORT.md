# pineSOUL Debug Report

**Last Updated:** Cycle 4 — v1.0.6  
**Status:** 61 bugs fixed (30 original + 15 Loop 1 + 3 Loop 2 + 6 Loop 3 + 7 Loop 4), 0 critical remaining

---

## Cycle 4 Fixes (v1.0.6)

| # | Severity | Bug | File | Fix |
|---|----------|-----|------|-----|
| 52 | **CRITICAL** | IPC channel name mismatch — BleManager `_emit()` sent events on bare channel names (`'liveData'`, `'connectionChange'`, etc.) but preload.js listened on `ble:`-prefixed channels. ALL Electron BLE events silently lost. Electron mode was non-functional for live data, settings loading, connection state, and errors. | `electron/ble/ble-manager.js:70-73` | Added `ble:` prefix in `_emit()` method: `webContents.send(\`ble:${channel}\`, data)` |
| 53 | **HIGH** | Double disconnect re-entrancy — in-flight `readAsync()` callbacks could call `disconnect('connection_lost')` while the first `disconnect()` was still running, emitting duplicate `disconnected` events | `electron/ble/ble-manager.js:218-243` | Added `_disconnecting` guard flag with try/finally |
| 54 | **HIGH** | Stale characteristic references after PWA reconnect — `#doConnect()` didn't reset `#settingsChars`, `#saveChar`, or `#bulkDataChar` before new connection. Old Web Bluetooth characteristic objects become invalid after GATT disconnect. | `src/ble/web-bluetooth.js:135-140` | Reset all characteristic refs at start of `#doConnect()` |
| 55 | MEDIUM | `withTimeout` leaked timers on every successful call — `setTimeout` was never cleared when the wrapped promise resolved first, leaving pending closures for up to 10s | `src/ble/web-bluetooth.js:14-21` | Use `Promise.race().finally(() => clearTimeout(timer))` pattern |
| 56 | MEDIUM | Version string format inconsistency — Electron `detectVersion()` returned `'2.21+'`/`'2.20'` while PWA returned `'v2.21'`/`'v2.20'`. Any version comparison logic would break cross-platform. | `electron/ble/protocol.js:32,40` | Normalized to `'v2.21'`/`'v2.20'` matching PWA |
| 57 | MEDIUM | `ShutdownTimeout` value 0 displayed "0 min" instead of "Off" — inconsistent with other off-able settings like SleepTimeout, AutoStart | `src/constants.js:152` | Added format function: `v => v === 0 ? 'Off' : \`${v} min\`` |
| 58 | LOW | `SleepTimeout` format showed "60s" and "75s" instead of "1m" and "1m 15s" | `src/constants.js:151` | Improved format: values 1-3 show seconds, 4-5 show mixed, 6+ show minutes |
| 59 | LOW | Dead exports `TEMP_LIMITS`, `OPERATING_MODES`, `OPERATING_MODE_COLORS` never imported anywhere | `src/constants.js:84-104` | Removed dead code |
| 60 | LOW | SettingsPanel `displayValue` didn't use `format()` function — settings with format functions (ShutdownTimeout, SleepTimeout) showed raw numeric values in the +/- row | `src/components/SettingsPanel.jsx:84-86` | Prioritize `meta.format(value)` over raw display |

---

## Cycle 3 Fixes (v1.0.5)

| # | Severity | Bug | File | Fix |
|---|----------|-----|------|-----|
| 46 | MEDIUM | PWA `getPrimaryServices()` and `gatt.connect()` had no timeout — indefinite hang on unresponsive devices | `src/ble/web-bluetooth.js:132-138` | Added `withTimeout()` wrapper (10s) |
| 47 | LOW | TemperatureGraph useMemo missing `formatTemp` dependency | `src/components/TemperatureGraph.jsx:167` | Added to dep array |
| 48 | MEDIUM | Settings step too coarse for non-temperature settings | `src/components/SettingsPanel.jsx:81` | Step 10 only for `unit === '°'`, step 1 otherwise |
| 49 | LOW | WebBleAdapter missing `bleReconnect()` | `src/ble/web-bluetooth.js:120` | Added delegating method |
| 50 | LOW | Dead `#settingsVersion` field | `src/ble/web-bluetooth.js:24` | Removed |
| 51 | LOW | Scanning timeout not tracked/cleaned | `src/hooks/usePinecil.js:211-222` | Stored in ref, cleanup on unmount |

---

## Cycle 2 Fixes (v1.0.4)

| # | Severity | Bug | File | Fix |
|---|----------|-----|------|-----|
| 43 | **CRITICAL** | TDZ ReferenceError — `formatTemp` used before declaration | `src/hooks/usePinecil.js:322-404` | Moved helpers above keyboard actions |
| 44 | MEDIUM | Electron `VALUE_LIMITS` stale °C scale | `electron/ble/constants.js:116-152` | Synced to 0.1°C |
| 45 | LOW | Mock `TipResistance: 84` unrealistic | `src/hooks/usePinecil.js:20` | Changed to 840 |

---

## Previous Fixed Bugs (Cycles 1)

### CRITICAL — PWA Protocol
| # | Bug | Fix |
|---|-----|-----|
| 31-32 | `parseSetting` sign-magnitude decoding wrong | Changed to `getUint16(0, true)` |

### MEDIUM — Temperature Protocol
| # | Bug | Fix |
|---|-----|-----|
| 33-42 | 0.1°C protocol scale mismatches across 10 files | All temperature values scaled to 0.1°C |

---

## Build Artifacts

| Platform | File | Notes |
|----------|------|-------|
| Linux | `pineSOUL-1.0.6.AppImage` | AppImage portable |
| Linux | `pineSOUL-1.0.6.deb` | Debian package |
| Linux | `pineSOUL-1.0.6.tar.xz` | Tarball |
| Windows | `pineSOUL Setup 1.0.6.exe` | NSIS installer |
| Windows | `pineSOUL 1.0.6.exe` | Portable exe |
| macOS | `pineSOUL-1.0.6-mac-x64.zip` | x64 only |

---

## Known Limitations

1. **macOS arm64**: `@abandonware/noble` native module can't cross-compile on x64 Linux
2. **macOS DMG**: Requires `hdiutil` (macOS-only). Zip workaround used instead.
3. **No code signing**: All builds unsigned
4. **Three-way constants duplication**: BLE UUIDs defined in 3 files — fragile but currently in sync

---

## v1.0.7 — Loop 5 (2026-07-25)

**7 bugs fixed** — Race conditions, validation, accessibility, dead code.

| # | Severity | File | Fix |
|---|----------|------|-----|
| 81 | MEDIUM | hooks/usePinecil.js | Settings loss race: snapshot+clear pending map atomically before iterating |
| 82 | MEDIUM | Toast.jsx | Timer reset race: track creation timestamps so dismissing one toast doesn't reset all others |
| 83 | MEDIUM | electron/ble/protocol.js | encodeSetting: validate+clamp input to uint16 range, prevent NaN/overflow writes |
| 84 | LOW | electron/ble/ble-manager.js | connect(): clear pending scan timeout when connecting — prevents scan-stop interfering |
| 85 | LOW | ble/web-bluetooth.js | bleSetSetting/bleSaveToFlash: early-return if not connected |
| 86 | LOW | TemperatureGraph.jsx | Dead ternary removed — both branches were identical |
| 87 | MEDIUM | TitleBar.jsx, SettingsPanel.jsx | Added aria-labels on window controls (minimize/maximize/close) and hotkey +/- buttons |
