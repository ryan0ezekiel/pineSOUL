import { useState, useEffect, useCallback, useRef } from 'react';

const api = window.electronAPI;

const MODE_MAP = {
  0: { label: 'Standby', color: '#34d399', glow: 'glow-ready', icon: 'power' },
  1: { label: 'Soldering', color: '#ff6b35', glow: 'glow-heat', icon: 'flame' },
  2: { label: 'Boost', color: '#f59e0b', glow: 'glow-heat', icon: 'zap' },
  3: { label: 'Sleep', color: '#818cf8', glow: 'glow-sleep', icon: 'moon' },
};

// BLE sends temps in 0.1°C (e.g. 3180 = 318°C, 4500 = 450°C)
const MOCK_LIVE_DATA = {
  LiveTemp: 3180,     // 318°C
  SetTemp: 3200,      // 320°C
  Voltage: 198,
  HandleTemp: 324,    // 32.4°C (handle is cooler)
  PWMLevel: 64,
  PowerSource: 3,
  TipResistance: 84,
  Uptime: 1847000,
  MovementTime: 42000,
  MaxTipTempAbility: 4500, // 450°C
  uVoltsTip: 3120,
  HallSensor: 1,
  OperatingMode: 1,
  Watts: 65,
};

const MOCK_SETTINGS = {
  SetTemperature: 3200,     // 320°C
  BoostTemperature: 4000,   // 400°C
  SleepTemperature: 1500,   // 150°C
  SleepTimeout: 6,
  ShutdownTimeout: 60,
  AutoStart: 0,
  MotionSensitivity: 5,
  LockingMode: 0,
  TemperatureUnit: 0,  // °C by default
  DisplayRotation: 0,
  Brightness: 80,
  ColourInversion: 0,
  AnimSpeed: 2,
  AnimLoop: 1,
  CooldownBlink: 1,
  ScrollingSpeed: 1,
  AdvancedIdle: 0,
  AdvancedSoldering: 0,
  PowerLimit: 60,
  DCInCutoff: 0,
  MinVolCell: 30,
  QCMaxVoltage: 120,
  PowerPulsePower: 10,
  PowerPulseWait: 3,
  PowerPulseDuration: 3,
  TempChangeShortStep: 10,  // 1°C
  TempChangeLongStep: 50,   // 5°C
  ReverseButtonTempChange: 0,
  HallEffectSensitivity: 6,
  BLEEnabled: 1,
  LOGOTime: 1,
  PDNegTimeout: 10,
};

const DEFAULT_LIVE_DATA = {
  LiveTemp: 250,       // 25°C (room temp)
  SetTemp: 3200,       // 320°C
  Voltage: 0,
  HandleTemp: 280,     // 28°C
  PWMLevel: 0,
  PowerSource: 0,
  TipResistance: 0,
  Uptime: 0,
  MovementTime: 0,
  MaxTipTempAbility: 4500, // 450°C
  uVoltsTip: 0,
  HallSensor: 0,
  OperatingMode: 0,
  Watts: 0,
};

// Temperature history — max buffer for 10 min at 100ms = 6000 samples
const MAX_HISTORY = 6000;

export function usePinecil({ mock = false, pollingRate = 500 } = {}) {
  const [connection, setConnection] = useState('disconnected');
  const [devices, setDevices] = useState([]);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [liveData, setLiveData] = useState(DEFAULT_LIVE_DATA);
  const [settings, setSettings] = useState({});
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('control');
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [tempHistory, setTempHistory] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [dirtySettings, setDirtySettings] = useState(new Set());

  const pendingSettings = useRef({});
  const historyRef = useRef([]);
  const listenersRef = useRef([]);
  const liveDataRef = useRef({ SetTemp: 3200, MaxTipTempAbility: 4500, OperatingMode: 0, LiveTemp: 250 });

  // Toast helper — just adds, Toast component handles auto-dismiss
  const addToast = useCallback((message, type = 'error') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Mock mode: simulate a connected iron
  useEffect(() => {
    if (!mock) return;
    const timer = setTimeout(() => {
      setConnection('connected');
      setDeviceInfo({ name: 'pinecil-42CF656F', firmwareVersion: 'v2.21' });
      setLiveData(MOCK_LIVE_DATA);
      setSettings(MOCK_SETTINGS);
    }, 500);
    return () => clearTimeout(timer);
  }, [mock]);

  // Mock mode: generate temperature history for the graph
  useEffect(() => {
    if (!mock) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const baseTemp = 3100 + Math.sin(now / 5000) * 150; // 0.1°C
      const noise = (Math.random() - 0.5) * 80;
      historyRef.current = [
        ...historyRef.current.slice(-(MAX_HISTORY - 1)),
        { timestamp: now, liveTemp: Math.round(baseTemp + noise), setTemp: 3200, watts: 45 + Math.random() * 20 }
      ];
      // Don't update state here — the 800ms sync interval handles it
    }, pollingRate);
    return () => clearInterval(interval);
  }, [mock, pollingRate]);

  // Subscribe to BLE events with proper cleanup
  useEffect(() => {
    if (!api || mock) return;
    const unsubs = [];

    const unsub1 = api.onConnectionChange?.((status) => {
      if (typeof status === 'string') {
        setConnection(status);
        if (status === 'connected') setConnectionError(null);
      } else if (status?.status) {
        setConnection(status.status);
        if (status.deviceInfo) setDeviceInfo(status.deviceInfo);
        if (status.error) setConnectionError(status.error);
        if (status.status === 'connected') setConnectionError(null);
      }
    });
    if (unsub1) unsubs.push(unsub1);

    const unsub2 = api.onLiveData?.((data) => {
      setLiveData(data);
      // Append to temperature history
      const entry = { timestamp: Date.now(), liveTemp: data.LiveTemp, setTemp: data.SetTemp, watts: data.Watts };
      historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), entry];
      // Batch-update state every second
    });
    if (unsub2) unsubs.push(unsub2);

    const unsub3 = api.onDeviceFound?.((device) => {
      setDevices(prev => {
        if (prev.find(d => d.address === device.address)) return prev;
        return [...prev, device];
      });
    });
    if (unsub3) unsubs.push(unsub3);

    const unsub4 = api.onSettingsLoaded?.((s) => {
      setSettings(s);
      setSettingsChanged(false);
      pendingSettings.current = {};
      setDirtySettings(new Set());
    });
    if (unsub4) unsubs.push(unsub4);

    const unsub5 = api.onError?.((err) => {
      addToast(err.message || String(err), 'error');
    });
    if (unsub5) unsubs.push(unsub5);

    listenersRef.current = unsubs;

    return () => {
      unsubs.forEach(fn => typeof fn === 'function' && fn());
      listenersRef.current = [];
    };
  }, [mock, addToast]);

  // Sync history to state every 800ms for the graph
  useEffect(() => {
    if (connection !== 'connected') {
      setTempHistory([]);
      return;
    }
    const syncInterval = setInterval(() => {
      setTempHistory([...historyRef.current]);
    }, 800);
    return () => clearInterval(syncInterval);
  }, [connection]);

  // Scanning
  const startScan = useCallback(async () => {
    setDevices([]);
    setScanning(true);
    setConnectionError(null);
    try {
      await api?.bleScan();
    } catch (e) {
      addToast('Scan failed: ' + (e.message || e), 'error');
    }
    setTimeout(() => setScanning(false), 10000);
  }, [addToast]);

  // Connect
  const connect = useCallback(async (address) => {
    setConnection('connecting');
    setConnectionError(null);
    try {
      const result = await api?.bleConnect(address);
      if (!result?.ok) {
        setConnection('disconnected');
        setConnectionError(result?.error || 'Connection failed');
        addToast(result?.error || 'Failed to connect to device', 'error');
      }
    } catch (e) {
      setConnection('disconnected');
      setConnectionError(e.message || String(e));
      addToast('Connection error: ' + (e.message || String(e)), 'error');
    }
  }, [addToast]);

  // Disconnect
  const disconnect = useCallback(async () => {
    try {
      await api?.bleDisconnect();
    } catch (e) {
      // ignore
    }
    setConnection('disconnected');
    setDeviceInfo(null);
    setLiveData(DEFAULT_LIVE_DATA);
    setConnectionError(null);
  }, []);

  // Reconnect
  const reconnect = useCallback(async () => {
    if (!deviceInfo?.address) return;
    addToast('Reconnecting...', 'info');
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
      try {
        const result = await api?.bleConnect(deviceInfo.address);
        if (result?.ok) {
          success = true;
          break;
        }
      } catch (e) {
        // try again
      }
    }
    if (!success) {
      addToast('Reconnection failed after 3 attempts', 'error');
    } else {
      addToast('Reconnected successfully', 'success');
    }
  }, [deviceInfo, addToast]);

  // Update setting (local)
  const updateSetting = useCallback((name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }));
    pendingSettings.current[name] = value;
    setSettingsChanged(true);
    setDirtySettings(prev => new Set([...prev, name]));
  }, []);

  // Apply all pending settings
  const applySettings = useCallback(async () => {
    if (!api) return [];
    const results = [];
    for (const [name, value] of Object.entries(pendingSettings.current)) {
      try {
        const result = await api.bleSetSetting(name, value);
        results.push({ name, ...result });
      } catch (e) {
        results.push({ name, ok: false, error: e.message });
      }
    }
    pendingSettings.current = {};
    setSettingsChanged(false);
    setDirtySettings(new Set());
    return results;
  }, []);

  // Save to flash
  const saveToFlash = useCallback(async () => {
    await applySettings();
    try {
      const result = await api?.bleSaveToFlash();
      if (result?.ok) addToast('Settings saved to flash!', 'success');
      else addToast('Failed to save settings', 'error');
      return result;
    } catch (e) {
      addToast('Save error: ' + (e.message || String(e)), 'error');
    }
  }, [applySettings, addToast]);

  // Keep liveDataRef in sync for keyboard handlers (avoids re-creating callbacks on every live data update)
  useEffect(() => {
    liveDataRef.current = liveData;
  }, [liveData]);

  // ─── Keyboard actions (stable refs, no re-registration) ────────────
  const handleTempUp = useCallback((step) => {
    const ld = liveDataRef.current;
    const current = ld.SetTemp || 3200;
    const stepVal = step || 10;
    const newTemp = Math.min(current + stepVal, ld.MaxTipTempAbility || 4500);
    updateSetting('SetTemperature', newTemp);
    setLiveData(prev => ({ ...prev, SetTemp: newTemp }));
    if (!mock && api) {
      api.bleSetSetting('SetTemperature', newTemp).catch(() => {});
    }
  }, [updateSetting, mock]);

  const handleTempDown = useCallback((step) => {
    const ld = liveDataRef.current;
    const current = ld.SetTemp || 3200;
    const stepVal = step || 10;
    const newTemp = Math.max(current - stepVal, 100); // min 100 = 10°C
    updateSetting('SetTemperature', newTemp);
    setLiveData(prev => ({ ...prev, SetTemp: newTemp }));
    if (!mock && api) {
      api.bleSetSetting('SetTemperature', newTemp).catch(() => {});
    }
  }, [updateSetting, mock]);

  const handleToggleMode = useCallback((targetTemp) => {
    const ld = liveDataRef.current;
    // 0.1°C: default target 3200=320°C, cooldown threshold 500=50°C, cooldown target 250=25°C
    const toggleTarget = targetTemp || 3200;
    if (ld.OperatingMode === 1 && ld.LiveTemp > 500) {
      updateSetting('SetTemperature', 250);
      setLiveData(prev => ({ ...prev, SetTemp: 250 }));
      if (!mock && api) api.bleSetSetting('SetTemperature', 250).catch(() => {});
      addToast('❄️ Cooling down...', 'info');
    } else {
      updateSetting('SetTemperature', toggleTarget);
      setLiveData(prev => ({ ...prev, SetTemp: toggleTarget }));
      if (!mock && api) api.bleSetSetting('SetTemperature', toggleTarget).catch(() => {});
      addToast('🔥 Heating to ' + formatTemp(toggleTarget) + '°', 'success');
    }
  }, [updateSetting, mock, addToast, formatTemp]);

  // ─── Format helpers (memoized) ──────────────────────────
  const formatVoltage = useCallback((raw) => {
    if (raw === 0) return '--';
    return (raw / 100).toFixed(1);
  }, []);

  const formatUptime = useCallback((ms) => {
    if (!ms || ms === 0) return '--';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }, []);

  const formatHandleTemp = useCallback((raw) => {
    const tempC = (raw / 10);
    if (settings.TemperatureUnit === 1) {
      return Math.round(tempC * 9/5 + 32);
    }
    return Math.round(tempC);
  }, [settings.TemperatureUnit]);

  const formatTipRes = useCallback((raw) => {
    if (!raw || raw === 0) return '--';
    return (raw / 100).toFixed(1);
  }, []);

  const formatPowerSource = useCallback((raw) => {
    return ['USB-C', 'DC Jack', 'QC', 'PD'][raw] || 'Unknown';
  }, []);

  const formatTemp = useCallback((raw) => {
    if (raw == null) return '--';
    const tempC = raw / 10; // BLE protocol sends 0.1°C units
    if (settings.TemperatureUnit === 1) {
      return Math.round(tempC * 9/5 + 32);
    }
    return Math.round(tempC);
  }, [settings.TemperatureUnit]);

  const tempUnitLabel = settings.TemperatureUnit === 1 ? '°F' : '°C';
  const displayUnit = tempUnitLabel;

  // Derived data
  const mode = MODE_MAP[liveData.OperatingMode] || MODE_MAP[0];
  const currentTempPercent = liveData.MaxTipTempAbility > 0
    ? (liveData.LiveTemp / liveData.MaxTipTempAbility) * 100
    : 0;
  const setTempPercent = liveData.MaxTipTempAbility > 0
    ? (liveData.SetTemp / liveData.MaxTipTempAbility) * 100
    : 0;

  return {
    // State
    connection,
    devices,
    deviceInfo,
    liveData,
    settings,
    scanning,
    activeTab,
    settingsChanged,
    toasts,
    tempHistory,
    connectionError,
    dirtySettings,

    // Derived
    mode,
    currentTempPercent,
    setTempPercent,
    displayUnit,

    // Actions
    startScan,
    connect,
    disconnect,
    reconnect,
    setActiveTab,
    updateSetting,
    applySettings,
    saveToFlash,
    addToast,
    removeToast,

    // Keyboard actions
    handleTempUp,
    handleTempDown,
    handleToggleMode,

    // Formatters
    formatTemp,
    formatVoltage,
    formatUptime,
    formatHandleTemp,
    formatTipRes,
    formatPowerSource,
  };
}
