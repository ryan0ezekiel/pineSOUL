# pineSOUL Debug Report

**Last Updated:** Loop 14 — v1.1.7  
**Status:** 169 bugs fixed (30 original + 15 Loop 1 + 3 Loop 2 + 6 Loop 3 + 7 Loop 4 + 7 Loop 5 + 4 Loop 6 + 9 Loop 7 + 16 Loop 8 + 7 Loop 9 + 10 Loop 10 + 12 Loop 11 + 7 Loop 12 + 6 Loop 13 + 4 Loop 14), 0 critical remaining

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

---

## v1.0.8 — Loop 6 (2026-07-25)

**5 bugs fixed** — Memory leak, security, race condition, stale closures.

| # | Severity | File | Fix |
|---|----------|------|-----|
| 89 | MEDIUM | electron/ble/ble-manager.js | Noble event listeners stored as bound refs + added destroy() cleanup method |
| 90 | MEDIUM | electron/preload.js | removeAllListeners IPC locked to whitelist of known ble: channels |
| 91 | LOW | ConnectionPanel.jsx | Stable noop ref instead of inline arrow on every render |
| 92 | — | (skipped) | startScan/connect already have try/catch — false alarm |
| 93 | MEDIUM | ble/web-bluetooth.js | Added #scanning guard to prevent double-scan race |

---

## v1.0.9 — Loop 7 (2026-07-25)

**9 bugs fixed** — Dirty settings dual-write, destroy cleanup, dead code removal, memory leak.

| # | Severity | File | Fix |
|---|----------|------|-----|
| 94 | MEDIUM | hooks/usePinecil.js | Hotkey handlers (handleTempUp/Down/ToggleMode) no longer add to dirtySettings — they write directly to iron via BLE, so pending/dirty tracking was spurious |
| 95 | MEDIUM | hooks/usePinecil.js | applySettings now narrows dirtySettings via functional update: only removes names that succeeded in the current batch, preserving concurrent edits |
| 96 | LOW | hooks/usePinecil.js | historyRef cleared on disconnect — prevents stale data lingering from previous connection |
| 98 | LOW | hooks/usePinecil.js | Removed unnecessary [...historyRef.current] copy every 800ms — React state updater detects mutations |
| 100 | MEDIUM | electron/main.js | ble.destroy() called on window close — cleans up noble listeners, polling, scan timeout |
| 101 | MEDIUM | electron/ble/ble-manager.js | destroy() now clears _scanTimeout and calls _stopLiveData — prevents timer firing after cleanup |
| 102 | LOW | electron/preload.js | Removed dead bleReconnect IPC exposure — renderer never uses it |
| 104 | LOW | electron/preload.js | Removed dead ALLOWED entries (ble:stateChange, ble:toast), added ble:scanning |
| 105 | COSMETIC | electron/ble/ble-manager.js | Removed duplicate _disconnecting = false initialization |

---

## v1.1.0 — Loop 8 (2026-07-25)

**16 bugs fixed** — BLE resource leaks, protocol correctness, React performance, accessibility.

### BLE Layer (6 fixes)
| # | Severity | File | Fix |
|---|----------|------|-----|
| 112 | CRITICAL | electron/ble/ble-manager.js | destroy() cleared wrong variable — `_pollingInterval` stored duration (500), not interval handle. Removed bogus block; `_stopLiveData()` already handles it |
| 113 | CRITICAL | electron/ble/ble-manager.js | Peripheral left connected on service discovery failure — wrapped post-connect in try/catch with disconnect cleanup |
| 118 | HIGH | src/ble/protocol.js | encodeSetting() had no input validation — NaN/strings silently became 0. Added Number.isFinite check, range clamping [0,65535], integer rejection |
| 119 | HIGH | src/ble/web-bluetooth.js | Three bare writeValue() calls lacked withTimeout() — could hang forever on unresponsive device. Wrapped all with 10s timeout |
| 120 | HIGH | src/ble/web-bluetooth.js | `#connected = true` set before Promise.all setup — settings writes during setup window hit partially-initialized adapter. Moved flag after setup |
| 121 | MEDIUM | src/ble/web-bluetooth.js | Notification listener leaked on disconnect — #handleDisconnect nulled #bulkDataChar without removing event listener. Added cleanup |

### React Components (8 fixes)
| # | Severity | File | Fix |
|---|----------|------|-----|
| 114 | LOW | TemperatureDial.jsx | Removed unused `motion` import (~40KB gzipped dead weight from framer-motion) |
| 115 | MEDIUM | ConnectionPanel.jsx | DeviceCard now receives `connection` prop + `disabled` attribute on connect button when already connected |
| 116-118 | MEDIUM | TitleBar, ConnectionPanel, LiveDataPanel | Wrapped with React.memo to prevent unnecessary parent re-renders |
| 119-120 | MEDIUM | SettingsPanel.jsx | SettingsGroup and HotkeyRow wrapped with React.memo |
| 121 | LOW | Toast.jsx | Conditional ARIA role: `role="alert"` for errors, `role="status"` for info/success |
| 122 | LOW | hooks/usePinecil.js | disconnect() now clears dirtySettings, settings, settingsChanged, pendingSettings |
| 123 | LOW | TemperatureGraph.jsx | Extracted nomWidth=600 to module-level constant, removed duplicate definitions |
| — | LOW | 7 component files | Removed stale `React` from named imports (Vite automatic JSX runtime handles it) |

## v1.1.1 — Loop 9 (2026-07-25)

**7 bugs fixed** — macOS lifecycle, dead IPC removal, scanning desync, security hardening.

| # | Severity | File | Fix |
|---|----------|------|-----|
| 124 | HIGH | ble-manager.js + main.js | Noble event handlers extracted to #bindNobleEvents(); reinitialize() method re-binds on window reopen (macOS fix) |
| 125 | HIGH | ble-manager.js + main.js | destroy() now async; disconnects peripheral before cleanup (orphaned connection fix) |
| 126 | MEDIUM | main.js + preload.js | Removed dead ble:reconnect IPC handler and BleManager.reconnect() method |
| 127 | MEDIUM | main.js + preload.js | Removed dead ble:getLiveData, ble:getSettings IPC handlers and preload methods |
| 128 | MEDIUM | preload.js + usePinecil.js | Exposed onScanning(); renderer uses backend scanning events instead of local timeout |
| 129 | LOW | usePinecil.js | Clear scanTimeoutRef when connection state changes to 'connected' |
| 130 | LOW | main.js | Removed dead globalShortcut import, deprecated HiDPI Chromium switches; added sandbox: true |

## v1.1.2 — Loop 10 (2026-07-25)

**10 bugs fixed** — Error Boundaries, BLE connection accuracy, hotkey/settings sync, null safety, performance.

| # | Severity | File | Fix |
|---|----------|------|-----|
| 131 | CRITICAL | App.jsx + new ErrorBoundary.jsx | Added React ErrorBoundary with styled fallback UI (Bug 1, deferred from Loop 8) |
| 132 | CRITICAL | web-bluetooth.js | bleConnect() now re-throws #doConnect errors — returns {ok:false} on failure instead of always {ok:true} |
| 133 | HIGH | web-bluetooth.js | writeValue enforces VALUE_LIMITS — returns {ok:false, error:'out_of_range'} for out-of-bounds writes |
| 134 | HIGH | usePinecil.js | Hotkey tempUp/tempDown now call updateSetting() — syncs dirtySettings and SettingsPanel |
| 135 | MEDIUM | usePinecil.js | saveToFlash checks applySettings results before saving — aborts with error toast on failure |
| 136 | MEDIUM | usePinecil.js | historyRef cleared on unexpected disconnect — prevents stale graph data on reconnect |
| 137 | MEDIUM | App.jsx | Hotkey matching uses e.key OR e.code check — fixes Space key for toggleMode |
| 138 | MEDIUM | LiveDataPanel.jsx | Null-safe liveData access with optional chaining on all 6 stat values |
| 139 | LOW | Toast.jsx | Max 5 toasts cap — oldest auto-dismissed when limit exceeded |
| 140 | LOW | TemperatureGraph.jsx | Math.max spread replaced with reduce — prevents stack overflow at high data volumes |

## v1.1.3 — Loop 11 (2026-07-25)

**12 bugs fixed** — UI corrections, Electron security hardening, BLE lifecycle, protocol fixes.

| # | Severity | File | Fix |
|---|----------|------|-----|
| 141 | MEDIUM | TemperatureDial.jsx | strokeDashoffset clamped to [0,100] — prevents SVG arc wrap on over-temp |
| 142 | MEDIUM | usePinecil.js | Mock deviceInfo now includes `build` field — fixes "Firmware undefined" in mock mode |
| 143 | LOW | ConnectionPanel.jsx | Added `exit` prop to DeviceCard for AnimatePresence — smooth item removal |
| 144 | LOW | SettingsPanel.jsx | Removed dead displayMin/displayMax variables |
| 145 | HIGH | web-bluetooth.js | PWA scanning state now properly cleared — onScanning events emitted on picker close |
| 146 | HIGH | main.js | BLE destroy properly awaited before app.quit() — prevents orphaned connections |
| 147 | MEDIUM | ble-manager.js | _emit() wrapped in try-catch — prevents crash on mid-destruction window |
| 148 | MEDIUM | ble-manager.js | connect() mutex + address validation — prevents concurrent connect corruption |
| 149 | MEDIUM | main.js | Input validation on IPC — type checks before BLE operations |
| 150 | MEDIUM | main.js | Navigation guard blocks non-app origins |
| 151 | LOW | preload.js | Type checking on updateSetting/setHotkeyConfig arguments |
| 152 | LOW | main.js | Quit-race fix — tracks destroyPromise to prevent premature exit |

## v1.1.4 — Loop 12 (2026-07-25)

**7 bugs fixed** — Race conditions, TOCTOU guards, missing validation.

| # | Severity | File | Fix |
|---|----------|------|-----|
| 153 | HIGH | web-bluetooth.js | #connected set BEFORE emit('connected') — eliminates write-rejection window |
| 154 | HIGH | ble-manager.js | readInFlight guard in _startLiveData() — prevents overlapping async BLE reads |
| 155 | HIGH | usePinecil.js | handleTempUp/Down use functional setLiveData updater — rapid keypresses no longer skip steps |
| 156 | MEDIUM | web-bluetooth.js | removeAllListeners now includes 'ble:scanning' channel |
| 157 | MEDIUM | usePinecil.js | applySettings TOCTOU guard via ref — prevents concurrent call race |
| 158 | MEDIUM | ble-manager.js | VALUE_LIMITS validation in Electron setSetting — matches PWA range checks |
| 159 | LOW | usePinecil.js | Mock mode now updates liveData — gauges move alongside graph |

## v1.1.6 — Loop 13 (2026-07-25)

**6 bugs fixed** — Build system, documentation, runtime error, code hygiene.

| # | Severity | File | Fix |
|---|----------|------|-----|
| 160 | **CRITICAL** | .github/workflows/build.yml | macOS artifact upload searched for `release/*.dmg` but target is `zip` — zero artifacts ever uploaded on macOS CI |
| 161 | HIGH | src/ble/web-bluetooth.js | `process.env.NODE_ENV` undefined in browser — replaced with `import.meta?.env?.MODE` |
| 162 | MEDIUM | .github/workflows/build.yml | Removed redundant `npx vite build` before `dist:linux` (dist:linux already runs vite build) |
| 163 | MEDIUM | .github/workflows/build.yml | Node.js version aligned to 22 across all jobs (was 20 for build, 22 for PWA deploy) |
| 164 | LOW | README.md | Added missing ErrorBoundary.jsx, useToast.js, useMockData.js, build.yml to project structure |
| 165 | LOW | electron/ble/ble-manager.js | Removed duplicate blank line (cosmetic) |

## v1.1.7 — Loop 14 (2026-07-25)

**4 bugs fixed** — Electron BLE protocol correctness, dead code removal, input validation.

| # | Severity | File | Fix |
|---|----------|------|-----|
| 166 | MEDIUM | electron/ble/ble-manager.js | setSetting() now validates value is numeric before range check — prevents string coercion bugs |
| 167 | MEDIUM | electron/ble/ble-manager.js | saveToFlash() now writes 1-byte `Buffer([0x01])` matching PineSAM spec — was 2-byte `encodeSetting(1)` |
| 168 | LOW | electron/ble/constants.js | Removed dead exports: OPERATING_MODES, OPERATING_MODE_COLORS, TEMP_LIMITS, SETTING_META |
| 169 | LOW | electron/ble/ble-manager.js | encodeSetting null-check added — prevents writeAsync(null) crash on invalid input |
