# pineSOUL Debug Report

**Last Updated:** Cycle 3 — v1.0.5  
**Status:** 51 bugs fixed (30 original + 15 Loop 1 + 3 Loop 2 + 3 Loop 3), 0 critical remaining

---

## Cycle 3 Fixes (v1.0.5)

| # | Severity | Bug | File | Fix |
|---|----------|-----|------|-----|
| 46 | **MEDIUM** | PWA `getPrimaryServices()` and `gatt.connect()` had no timeout — if device hangs during service discovery, the connection stalls indefinitely with no feedback | `src/ble/web-bluetooth.js:132-138` | Added `withTimeout()` wrapper (10s) on `gatt.connect()`, `getPrimaryServices()`, `getPrimaryService()`, and `getCharacteristic()` calls |
| 47 | LOW | `TemperatureGraph` useMemo missing `formatTemp` dependency — Y-axis labels don't update when user switches °C/°F until next data change | `src/components/TemperatureGraph.jsx:167` | Added `formatTemp` to useMemo dependency array |
| 48 | **MEDIUM** | Settings panel increment/decrement buttons used step=10 for ALL settings with range > 50 — `ShutdownTimeout` (0-60min), `PowerPulsePower` (0-99W), `Brightness` (0-100) all jumped by 10 per click | `src/components/SettingsPanel.jsx:81` | Changed heuristic: step 10 only for temperature settings (`unit === '°'`), step 1 for everything else |
| 49 | LOW | `WebBleAdapter` missing `bleReconnect()` method — preload.js exposes it but PWA adapter didn't implement it (API gap, not runtime crash since renderer uses `bleConnect()` for reconnect) | `src/ble/web-bluetooth.js:120` | Added `bleReconnect(address)` that delegates to `bleConnect()` |
| 50 | LOW | `WebBleAdapter` had dead `#settingsVersion` field — declared but never read or written | `src/ble/web-bluetooth.js:24` | Removed dead code |
| 51 | LOW | `usePinecil.js` scanning timeout (`setTimeout` 10s) not tracked — no cleanup on unmount, no dedup on rapid scan clicks | `src/hooks/usePinecil.js:211-222` | Stored timeout in ref, clear previous timeout on re-scan, clean up on unmount |

---

## Cycle 2 Fixes (v1.0.4)

| # | Severity | Bug | File | Fix |
|---|----------|-----|------|-----|
| 43 | **CRITICAL** | TDZ ReferenceError — `formatTemp` used in `handleToggleMode` dependency array but declared AFTER it. Accessing `const` before declaration throws `ReferenceError` on every render. | `src/hooks/usePinecil.js:322-404` | Moved all format helper declarations above keyboard action declarations |
| 44 | MEDIUM | Electron `VALUE_LIMITS` stale — temperature limits still in old °C scale while PWA uses 0.1°C. Maintenance hazard and inconsistency. | `electron/ble/constants.js:116-152` | Synced all temperature VALUE_LIMITS to 0.1°C protocol values |
| 45 | LOW | Mock `TipResistance: 84` displayed as 0.8Ω — unrealistic for a soldering iron tip | `src/hooks/usePinecil.js:20` | Changed to `840` (8.4Ω, realistic value) |

---

## Fixed Bugs (Previous Cycles)

### CRITICAL — PWA Protocol (Fixed)
| # | Bug | File | Fix |
|---|-----|------|-----|
| 31 | `parseSetting` used sign-magnitude decoding — returned wrong values for ALL settings on real hardware | `src/ble/protocol.js:50` | Changed to `view.getUint16(0, true)` — raw uint16, matches Electron |
| 32 | `parseSetting` corrupted ALL PWA settings reads | `src/ble/protocol.js:50` | Same fix as #31 |

### MEDIUM — Temperature Protocol (Fixed)
| # | Bug | File | Fix |
|---|-----|------|-----|
| 33 | `formatTemp` didn't divide by 10 — BLE sends 0.1°C but display expected °C | `src/hooks/usePinecil.js:395` | Added `/10` conversion, consistent with `formatHandleTemp` |
| 34 | Mock data used °C values instead of 0.1°C — didn't match real protocol | `src/hooks/usePinecil.js:12` | Multiplied all temperature mock values by 10 |
| 35 | `handleToggleMode` thresholds wrong scale (200→2000, 25→250) | `src/hooks/usePinecil.js:346` | Updated to 0.1°C: threshold 500=50°C, default 3200=320°C, cooldown 250=25°C |
| 36 | `DEFAULT_HOTKEY_CONFIG.toggleTemp` was 200 (°C), should be 3200 (0.1°C) | `src/App.jsx:28` | Changed to 3200 |
| 37 | `handleTempUp`/`handleTempDown` fallback values wrong scale | `src/hooks/usePinecil.js:322,334` | Updated fallbacks to 0.1°C values |
| 38 | `VALUE_LIMITS` for temperature settings were in °C, not 0.1°C | `src/constants.js:108` | SetTemperature [100,4500], SleepTemp [100,3000], BoostTemp [2500,4500] |
| 39 | Settings panel showed raw 0.1°C values (e.g. "3200°" instead of "320°") | `src/components/SettingsPanel.jsx:80` | Added `displayValue = Math.round(value / 10)` for temperature settings |
| 40 | Hotkey toggleTemp stepper min/max wrong scale | `src/components/SettingsPanel.jsx:275` | Updated min 500=50°C, max 4500=450°C, step 100=10°C |
| 41 | Hotkey tempStep display showed raw 0.1°C value | `src/components/SettingsPanel.jsx:259` | Added `/10` for display |
| 42 | TemperatureGraph fallback Y-axis max was 450, should be 4500 for 0.1°C | `src/components/TemperatureGraph.jsx:105` | Changed to 4500 |

### LOW — Previously Fixed (Cycles 1–10)
- All 30 bugs from cycles 1–10 (see git history)

---

## Build Artifacts

| Platform | File | Notes |
|----------|------|-------|
| Linux | `pineSOUL-1.0.5.AppImage` | AppImage portable |
| Linux | `pineSOUL-1.0.5.deb` | Debian package |
| Linux | `pineSOUL-1.0.5.tar.xz` | Tarball |
| Windows | `pineSOUL Setup 1.0.5.exe` | NSIS installer |
| Windows | `pineSOUL 1.0.5.exe` | Portable exe |
| macOS | `pineSOUL-1.0.5-mac-x64.zip` | x64 only (arm64 needs macOS runner) |

---

## Known Limitations

1. **macOS arm64**: `@abandonware/noble` native module can't cross-compile on x64 Linux
2. **macOS DMG**: Requires `hdiutil` (macOS-only). Zip workaround used instead.
3. **No code signing**: All builds unsigned (needs signing certs for production)
4. **PWA BLE reconnect**: Web Bluetooth reconnect by address relies on browser remembering the device
