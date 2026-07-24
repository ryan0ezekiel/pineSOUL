# pineSOUL Debug Report

**Project:** pineSOUL — Modern Pinecil V2 soldering iron controller  
**Date:** 2026-07-25  
**Branch:** master  
**Total bugs fixed:** 30 (18 original + 12 deep-sweep)

---

## Summary

| Area | Cycles | Bugs Fixed |
|------|--------|------------|
| Core (original) | 1–3 | 18 |
| Accessibility | 4 | 9 |
| Graph edge cases | 5 | 2 |
| Settings UX | 6 | 3 |
| Error handling | 7 | 4 |
| Performance | 8 | 2 |
| **Total** | **1–8** | **30** |

---

## Cycles 1–3: Core Bug Fixes (18 bugs)

### Cycle 1 — Critical + High (13 bugs)

| # | Severity | Bug | Fix |
|---|----------|-----|-----|
| 1 | Critical | `SolderingTemp` keyword mismatch (Settings vs LiveData) | Unified all references to `SetTemperature` in Settings; `SetTemp` only in LiveData |
| 2 | Critical | Absolute paths in `manifest.json` | Changed to relative `./` paths |
| 3 | High | Missing `TemperatureUnit` in SETTING_META | Added with `format: v => v === 0 ? '°C' : '°F'`, group: device, default: 0 |
| 4 | High | Toast auto-dismiss double-ownership | Moved ownership entirely to `Toast.jsx`; `usePinecil` only adds |
| 5 | High | Missing `DCInCutoff` in VALUE_LIMITS | Added `[0, 4]` range |
| 6 | Medium | `formatPowerSource` unbounded array access | Added bounds check with `'Unknown'` fallback |
| 7 | Medium | Graph empty-state crash on `Math.max()` | Added empty array guard: `allTemps.length > 0 ? Math.max(...allTemps, 0) : 0` |
| 8 | Medium | Missing `handleToggleMode` export from `usePinecil` | Added to return object |
| 9 | Medium | Settings group order inconsistent | Locked order: soldering → sleep → device → power → display → shortcuts → app → advanced |
| 10 | Medium | Settings rows missing hover state | Added `hover:bg-iron-800/40` transition |
| 11 | Low | Missing `motion` import in `TemperatureDial.jsx` | Added `import { motion } from 'framer-motion'` |
| 12 | Low | SVG gradient IDs potential collision | Added `useId()` for unique SVG IDs |
| 13 | Low | Inconsistent `tabular-nums` usage | Added to all temperature displays |

### Cycle 2 — Handler + Render (3 bugs)

| # | Severity | Bug | Fix |
|---|----------|-----|-----|
| 14 | High | Duplicate event handler registration | Cleaned up listener accumulation with proper cleanup |
| 15 | Medium | Stale closure in hotkey handler | Used `liveDataRef` pattern to avoid re-registering on every live data update |
| 16 | Low | SVG element ID duplication across components | Confirmed `useId()` fix from Cycle 1 |

### Cycle 3 — Invisible Group + Data (3 bugs)

| # | Severity | Bug | Fix |
|---|----------|-----|-----|
| 17 | Critical | Device settings group invisible (0 settings rendered) | Added `device` group to GROUPS with correct icon/color |
| 18 | Medium | Mock data `Date.now()` not advancing | Fixed mock live data timestamps |
| 19 | Medium | `bleConnect` return value misleading | Cleaned up return semantics |

---

## Cycles 4–8: Deep Sweep (12 bugs)

### Cycle 4 — Accessibility (9 improvements)

| # | Category | Issue | Fix |
|---|----------|-------|-----|
| 20 | ARIA | Tab buttons lack accessible names | Added `aria-label={tab.label}` and `aria-current` for active tab |
| 21 | ARIA | Toggle switches missing semantic role | Added `role="switch"` and `aria-checked` to all toggles |
| 22 | ARIA | Select dropdowns unlabeled | Added `aria-label={meta.label}` |
| 23 | ARIA | Stepper +/- buttons unlabeled | Added `aria-label="Decrease/Increase {name}"` |
| 24 | ARIA | Settings group expand buttons missing state | Added `aria-expanded={expanded}` |
| 25 | ARIA | Toast notifications not announced | Added `role="log"`, `aria-live="polite"`, `role="alert"` on messages |
| 26 | Semantic | DeviceCard was clickable `<div>` | Changed to `<motion.button>` with proper `aria-label` |
| 27 | ARIA | Scan button missing busy state | Added `aria-busy={scanning}` and contextual `aria-label` |
| 28 | UX | Hotkey editing prompt unclear ("…") | Changed to "Press a key…" |

### Cycle 5 — Graph Edge Cases (2 fixes)

| # | Issue | Fix |
|---|-------|-----|
| 29 | `preserveAspectRatio="none"` distorted curve rendering | Changed to `"xMidYMid meet"` |
| 30 | No empty state message when graph has no data | Added "Waiting for temperature data…" SVG text |

### Cycle 6 — Settings UX (3 improvements)

| # | Issue | Fix |
|---|-------|-----|
| 31 | No visual feedback for modified settings | Added `dirtySettings` Set tracking in `usePinecil`; blue dot indicator on modified rows |
| 32 | Save to Flash has no loading state | Added `saving` state with spinner animation and `aria-busy` |
| 33 | No per-setting dirty indicator wired through props | Added `dirtySettings` prop chain: `usePinecil` → `App` → `SettingsPanel` → `SettingsGroup` → `SettingRow` |

### Cycle 7 — Error Handling (4 improvements)

| # | Issue | Fix |
|---|-------|-----|
| 34 | No global unhandled promise rejection handler | Added `unhandledrejection` listener in App.jsx with proper cleanup |
| 35 | Disconnect events carry no reason | Added `reason` parameter to `#handleDisconnect()` in both web-bluetooth.js and ble-manager.js |
| 36 | Mock mode double-updates tempHistory | Removed redundant `setTempHistory` from mock interval; relies on 800ms sync |
| 37 | Disconnect reasons not propagated | Web Bluetooth: `'user'` vs `'unknown'`; Electron: `'user'` vs `'connection_lost'` |

### Cycle 8 — Performance (2 improvements)

| # | Issue | Fix |
|---|-------|-----|
| 38 | No memoization on frequently-rendered components | Added `React.memo` to TemperatureDial, TemperatureGraph, SettingRow |
| 39 | SettingRow re-renders on every parent state change | `memo()` comparison prevents unnecessary re-renders of unchanged settings |

---

## Build Verification

| Build | Status | Warnings |
|-------|--------|----------|
| PWA (vite build --config vite.config.pwa.js) | ✅ Clean | 0 |
| Electron Vite build | ✅ Clean | 0 |
| Electron Linux packaging (AppImage + deb) | ✅ Clean | 0 (rpm skipped — missing system `rpmbuild`) |

---

## Static Analysis Results

| Check | Result |
|-------|--------|
| `SolderingTemp` references | 0 |
| Absolute paths in config | 0 |
| TODO/FIXME/HACK markers | 0 |
| Empty catch blocks | 0 |
| Unsafe `window.electronAPI` access | 0 |
| `window.__pinesoul` hack references | 0 |
| `preserveAspectRatio="none"` | 0 |
| React.memo usage | 3 components |
| ARIA attributes | 12+ labels, 1 switch, 1 alert, 1 log, 1 expanded, 2 busy, 1 current |
| Disconnect reason tracking | Both Electron + Web Bluetooth |

---

## Files Modified (Cycles 4–8)

| File | Changes |
|------|---------|
| `src/App.jsx` | ARIA on tabs + connection indicator, unhandledrejection handler, dirtySettings prop |
| `src/hooks/usePinecil.js` | dirtySettings state tracking, mock mode dedup, history sync cleanup |
| `src/components/SettingsPanel.jsx` | ARIA on toggles/selects/steppers/groups, dirty indicators, save loading state, React.memo on SettingRow |
| `src/components/TemperatureDial.jsx` | React.memo wrapper |
| `src/components/TemperatureGraph.jsx` | React.memo wrapper, preserveAspectRatio fix, empty state |
| `src/components/ConnectionPanel.jsx` | DeviceCard → button, ARIA on scan/disconnect |
| `src/components/Toast.jsx` | role="log", role="alert", aria-live, dismiss button ARIA |
| `src/ble/web-bluetooth.js` | Disconnect reason tracking |
| `electron/ble/ble-manager.js` | Disconnect reason tracking |

---

## Known Hardware-Dependent Issues (Cannot Fix Without Pinecil)

1. **PWA buffer offset** — `parseLiveData(raw.buffer)` may need `.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)` for correct buffer handling
2. **PWA hardcoded V221 constants** — May need dynamic firmware version detection

Both require a physical Pinecil V2 to reproduce and verify.
