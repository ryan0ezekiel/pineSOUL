# pineSOUL Debug Report

**Date:** 2026-07-24  
**Scope:** Full codebase audit — Electron + PWA  
**Method:** Line-by-line review of all source files, build verification, browser runtime testing (PWA on localhost:5174)

---

## Summary

| Severity | Found | Fixed | Remaining (needs hardware) |
|----------|-------|-------|---------------------------|
| 🔴 Critical | 2 | 2 | 0 |
| 🟠 High | 3 | 3 | 0 |
| 🟡 Medium | 5 | 5 | 0 |
| 🔵 Low | 2 | 2 | 0 |
| **Total** | **12** | **12** | **0** |

---

## Fixed Issues

### 🔴 Critical

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | **Hotkey temp changes used wrong setting name `SolderingTemp`** — Pinecil expects `SetTemperature`. Keyboard temp up/down/toggle would silently fail on real hardware. | `src/hooks/usePinecil.js` (lines 298, 303, 311, 314, 324, 326, 330, 332) | Changed all 8 occurrences of `'SolderingTemp'` to `'SetTemperature'` |
| 2 | **PWA keyboard handler referenced `hc` before declaration** — `const hc = hotkeyConfig` appeared after it was used, causing `ReferenceError` on every keydown. All hotkeys broken in PWA. | `src/App.jsx` (line 91–92) | Moved `const hc = hotkeyConfig` before usage |

### 🟠 High

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 3 | **PWA `#setupBulkData()` hardcoded V221 service UUID** — v2.20 Pinecil devices would fail to get live data notifications. | `src/ble/web-bluetooth.js` (line 179) | Added version-aware service UUID selection: `this.#version === 'v2.21' ? BULK_DATA_V221 : BULK_DATA_V220` |
| 4 | **PWA buffer offset bug** — `parseLiveData(raw.buffer)` and `parseSetting(raw.buffer)` passed the full underlying ArrayBuffer instead of the sliced view from Web Bluetooth notifications. Data would be corrupt or fail parsing. | `src/ble/web-bluetooth.js` (lines 187, 222), `src/ble/protocol.js` (lines 31–34, 44–47) | Changed calls to pass `raw` (Uint8Array) directly; updated parsers to accept both ArrayBuffer and Uint8Array via `buffer instanceof Uint8Array` check |
| 5 | **PWA manifest icon paths used absolute `/icons/...`** — On GitHub Pages (`/pineSOUL/`), `/icons/` resolves to root (404). PWA icons would not load. | `public/manifest.json` (lines 11, 16) | Changed to relative `./icons/icon-*.png` |

### 🟡 Medium

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 6 | **`gattserverdisconnected` listener accumulated** — Each scan call added a new disconnect listener without removing the previous one. Multiple handlers would fire. | `src/ble/web-bluetooth.js` (line 78) | Store handler in `this._disconnectHandler`, remove previous before adding new |
| 7 | **`TitleBar.jsx` InstallButton leaked `appinstalled` listener** — Added but never removed in cleanup. | `src/components/TitleBar.jsx` (lines 16–19) | Stored handler reference, added removal in useEffect cleanup |
| 8 | **`SleepTimeout` format incorrect for values ≥ 6** — Used `Math.floor(v/4)` minutes. Correct formula: `(v-5)` minutes per IronOS protocol. | `src/constants.js` (line 150), `electron/ble/constants.js` (line 159) | Changed to `${v - 5}m` for both ESM and CJS constants |
| 9 | **Mock settings keys didn't match real SETTING_META** — `SolderingTemp`, `BoostTemp`, etc. didn't match `SetTemperature`, `BoostTemperature`. Settings panel rendered empty in dev mode. | `src/hooks/usePinecil.js` (lines 29–44) | Replaced `MOCK_SETTINGS` with all 31 real setting names and plausible values |
| 10 | **TemperatureGraph NaN with single data point** — `xScale` divided by `(timeEnd - timeStart)` which could be 0. | `src/components/TemperatureGraph.jsx` (line 111) | Added `|| 1` guard: `const timeRange = timeEnd - timeStart || 1` |

### 🔵 Low

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 11 | **SVG filter/gradient IDs static** — `id="tempGlow"` and `id="areaGrad"` would collide if multiple graph instances rendered. | `src/components/TemperatureGraph.jsx` | Added `useId()` hook, prefixed all IDs with `${svgId}-` |
| 12 | **WebBleAdapter missing `removeAllListeners`, `bleGetLiveData`, `bleGetSettings`** — preload.js exposes these but WebBleAdapter didn't implement them. | `src/ble/web-bluetooth.js` | Added `removeAllListeners(channel)` (clears listener array) and no-op `bleGetLiveData()`/`bleGetSettings()` |

### Additional

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 13 | **Config files used ESM syntax without `"type": "module"`** — `postcss.config.js` and `tailwind.config.js` used `export default` but package.json lacked `"type": "module"`. Caused Node.js MODULE_TYPELESS_PACKAGE_JSON warning. | `postcss.config.js`, `tailwind.config.js` | Converted both to CommonJS (`module.exports`) |

---

## Verified Working

| Feature | Status | Notes |
|---------|--------|-------|
| Electron build | ✅ | `npm run build` clean, no warnings |
| PWA build | ✅ | `npm run build:pwa` clean, no warnings |
| PWA Control tab | ✅ | Offline state, "No iron connected" message |
| PWA Settings tab | ✅ | All 7 groups collapsed by default, correct order |
| PWA Connect tab | ✅ | Scan button, empty state message |
| PWA manifest | ✅ | Relative icon paths, service worker registered |
| Zero console errors | ✅ | All 3 tabs verified via browser console |
| Mock mode | ✅ | Only in dev (`import.meta.env.DEV`), production shows Connect tab |

---

## Remaining Items (require physical Pinecil)

1. **BLE read/write verification** — Settings sync, live data stream, save to flash
2. **BLE disconnect recovery** — Graceful handling when iron powers off
3. **BLE write debouncing** — Rapid setting changes could overwhelm the characteristic
4. **Firmware v2.20 end-to-end** — Both firmware paths need real-device testing

---

## File Change Summary

```
src/hooks/usePinecil.js       — Fixed setting names (SolderingTemp → SetTemperature), mock settings
src/App.jsx                   — Fixed hc variable hoisting order
src/ble/web-bluetooth.js      — V220 bulk data, buffer fix, disconnect listener, API completeness
src/ble/protocol.js           — Buffer offset fix (ArrayBuffer + Uint8Array input)
src/components/TitleBar.jsx   — Listener cleanup
src/components/TemperatureGraph.jsx — NaN guard, unique SVG IDs, useId import
src/constants.js              — SleepTimeout format fix
electron/ble/constants.js     — SleepTimeout format fix
public/manifest.json          — Relative icon paths
postcss.config.js             — ESM → CJS
tailwind.config.js            — ESM → CJS
README.md                     — Complete rewrite with PWA docs, architecture, project structure
DEBUG_REPORT.md               — This file
```
