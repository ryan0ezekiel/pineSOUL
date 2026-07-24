# pineSOUL Debug Report — Final

**Date:** 2026-07-24  
**Audit cycles:** 3 active cycles + deep sweep (cycles 4–10)  
**Scope:** Full codebase — all 25+ source files (Electron + PWA)  
**Method:** Line-by-line review, build verification, browser runtime testing (PWA on localhost:5174), static analysis sweep

---

## Summary

| Severity | Found | Fixed | Remaining (needs hardware) |
|----------|-------|-------|---------------------------|
| 🔴 Critical | 3 | 3 | 0 |
| 🟠 High | 3 | 3 | 0 |
| 🟡 Medium | 7 | 7 | 0 |
| 🔵 Low | 5 | 5 | 0 |
| **Total** | **18** | **18** | **0** |

---

## All Fixed Issues

### 🔴 Critical

| # | Issue | Files | Cycle |
|---|-------|-------|-------|
| 1 | **Hotkey temp changes used wrong setting name `SolderingTemp`** — Pinecil expects `SetTemperature`. All keyboard temp adjustments silently fail on real hardware. | `src/hooks/usePinecil.js` | 1 |
| 2 | **App.jsx `hc` variable referenced before declaration** — `const hc = hotkeyConfig` appeared after usage, causing `ReferenceError` on every keydown event. All PWA hotkeys broken. | `src/App.jsx` | 1 |
| 3 | **Device group missing from SettingsPanel** — 4 settings (`TemperatureUnit`, `DisplayRotation`, `MotionSensitivity`, `LockingMode`) had `group: 'device'` in `SETTING_META` but no `'device'` key in `GROUPS`. These settings were completely INVISIBLE in the UI. Users couldn't change temperature units, display rotation, motion sensitivity, or button lock. | `src/components/SettingsPanel.jsx` | 3 |

### 🟠 High

| # | Issue | Files | Cycle |
|---|-------|-------|-------|
| 4 | **PWA `#setupBulkData()` hardcoded V221** — v2.20 Pinecil devices would fail to get live data notifications. | `src/ble/web-bluetooth.js` | 1 |
| 5 | **PWA buffer offset bug** — `parseLiveData(raw.buffer)` and `parseSetting(raw.buffer)` passed the full underlying ArrayBuffer instead of the sliced view from Web Bluetooth notifications. Live data would be corrupt. | `src/ble/web-bluetooth.js`, `src/ble/protocol.js` | 1 |
| 6 | **PWA manifest icon paths absolute** — `/icons/...` resolves to root on GitHub Pages (`/pineSOUL/`), not the app subpath. Icons 404. | `public/manifest.json` | 1 |

### 🟡 Medium

| # | Issue | Files | Cycle |
|---|-------|-------|-------|
| 7 | **`gattserverdisconnected` listener accumulated** — Each scan call added a new disconnect handler without removing the previous one. | `src/ble/web-bluetooth.js` | 1 |
| 8 | **TitleBar InstallButton leaked `appinstalled` listener** — Added but never removed in cleanup. | `src/components/TitleBar.jsx` | 1 |
| 9 | **`SleepTimeout` format incorrect for v≥6** — Used `Math.floor(v/4)`. Correct: `(v-5)` minutes per IronOS protocol. | `src/constants.js`, `electron/ble/constants.js` | 1 |
| 10 | **Mock settings keys mismatched real SETTING_META** — `SolderingTemp` vs `SetTemperature`. Settings panel empty in dev mode. | `src/hooks/usePinecil.js` | 1 |
| 11 | **TemperatureGraph NaN with single data point** — `xScale` divided by zero. | `src/components/TemperatureGraph.jsx` | 1 |
| 12 | **WebBleAdapter duplicate notification handlers on reconnect** — Old `characteristicvaluechanged` handler persisted across reconnects. | `src/ble/web-bluetooth.js` | 2 |
| 13 | **Keyboard handler performance** — `handleTempUp`/`handleTempDown`/`handleToggleMode` recreated on every BLE update (~2-10Hz), causing constant event listener re-registration. | `src/hooks/usePinecil.js` | 2 |

### 🔵 Low

| # | Issue | Files | Cycle |
|---|-------|-------|-------|
| 14 | **SVG filter/gradient IDs static** — `id="tempGlow"`, `id="areaGrad"`, `id="glow"` etc. would collide if multiple instances rendered. | `src/components/TemperatureGraph.jsx`, `src/components/TemperatureDial.jsx` | 1, 2 |
| 15 | **WebBleAdapter missing API methods** — `removeAllListeners`, `bleGetLiveData`, `bleGetSettings` exposed by preload.js but not implemented. | `src/ble/web-bluetooth.js` | 1 |
| 16 | **Config files ESM syntax without `"type": "module"`** — Caused Node.js MODULE_TYPELESS_PACKAGE_JSON warning. | `postcss.config.js`, `tailwind.config.js` | 1 |
| 17 | **Mock data `Date.now()` redundancy** — Used `Date.now()` instead of already-defined `now` variable. | `src/hooks/usePinecil.js` | 3 |
| 18 | **`bleConnect` returned `{ok:true}` on failure** — `#doConnect` errors emitted via events but `bleConnect` always returned success. | `src/ble/web-bluetooth.js` | 3 |

---

## Deep Sweep Results (Cycles 4–10)

Static analysis sweep across all source files:

| Check | Result |
|-------|--------|
| Remaining `SolderingTemp` refs | 0 ✅ |
| Absolute `/icons/` paths | 0 ✅ |
| ESM in config files | `vite.config.js` only — Vite handles natively ✅ |
| `console.log` in src/ | 2 in `ble/index.js` — intentional adapter detection ✅ |
| TODO/FIXME/HACK comments | 0 ✅ |
| Empty catch blocks | 0 ✅ |
| Unsafe `window.electronAPI` access | 0 — uses `&&` short-circuit ✅ |
| Electron protocol buffer handling | Correct — uses `DataView(raw.buffer, raw.byteOffset, raw.byteLength)` ✅ |

**No additional fixable bugs found without hardware.**

---

## Verified Working

| Feature | Status | Notes |
|---------|--------|-------|
| Electron build | ✅ | `npm run build` clean, zero warnings |
| PWA build | ✅ | `npm run build:pwa` clean, zero warnings |
| PWA Control tab | ✅ | Offline state, "No iron connected" message |
| PWA Settings tab | ✅ | **8 groups** collapsed by default, correct order |
| PWA Connect tab | ✅ | Scan button, empty state message |
| Settings: Device group | ✅ | TemperatureUnit, DisplayRotation, MotionSensitivity, LockingMode visible |
| Settings: All groups | ✅ | Soldering(3), Sleep(3), Device(4), Power(5), Display(9), Shortcuts, App, Advanced(8) |
| PWA manifest | ✅ | Relative icon paths, service worker registered |
| Zero console errors | ✅ | All 3 tabs verified via browser console |
| Mock mode | ✅ | Only in dev, production shows Connect tab |

---

## Remaining Items (require physical Pinecil)

1. **BLE read/write verification** — Settings sync, live data stream, save to flash
2. **BLE disconnect recovery** — Graceful handling when iron powers off mid-session
3. **BLE write debouncing** — Rapid setting changes could overwhelm the characteristic
4. **Firmware v2.20 end-to-end** — Both firmware paths need real-device testing
5. **BLE reconnect flow** — Full disconnect → reconnect cycle with real hardware

---

## Git Log (this session)

```
d736412 fix: cycle 3 — missing Device group, mock data, bleConnect return
6a77b62 fix: cycle 2 — duplicate handlers, keyboard perf, Dial SVG IDs
2944df1 fix: cycle 2 — duplicate handlers, keyboard perf, SVG IDs (TemperatureDial only)
8f3282e fix: cycle 1 — 13 bugs fixed (2 critical, 3 high, 5 medium, 3 low)
abb9881 fix: collapse all settings groups by default, move Advanced to last
```

---

## File Change Summary (all cycles)

```
src/hooks/usePinecil.js          — Setting names, mock settings, liveDataRef, Date.now fix
src/App.jsx                      — hc variable hoisting fix
src/ble/web-bluetooth.js         — V220 bulk data, buffer fix, disconnect cleanup, API methods, bleConnect
src/ble/protocol.js              — ArrayBuffer + Uint8Array input support
src/components/SettingsPanel.jsx — Added Device group (Cpu icon), 4 missing settings now visible
src/components/TitleBar.jsx      — Listener cleanup
src/components/TemperatureGraph.jsx — NaN guard, unique SVG IDs, useId import
src/components/TemperatureDial.jsx  — Unique SVG IDs, useId import
src/constants.js                 — SleepTimeout format fix
electron/ble/constants.js        — SleepTimeout format fix
public/manifest.json             — Relative icon paths
postcss.config.js                — ESM → CJS
tailwind.config.js               — ESM → CJS
README.md                        — Complete rewrite
DEBUG_REPORT.md                  — This file
```
