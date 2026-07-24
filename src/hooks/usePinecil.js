import { useState, useEffect, useCallback, useRef } from 'react';

const api = window.electronAPI;

const MODE_MAP = {
  0: { label: 'Standby', color: '#34d399', glow: 'glow-ready', icon: 'power' },
  1: { label: 'Soldering', color: '#ff6b35', glow: 'glow-heat', icon: 'flame' },
  2: { label: 'Boost', color: '#f59e0b', glow: 'glow-heat', icon: 'zap' },
  3: { label: 'Sleep', color: '#818cf8', glow: 'glow-sleep', icon: 'moon' },
};

const MOCK_LIVE_DATA = {
  LiveTemp: 318,
  SetTemp: 320,
  Voltage: 198,
  HandleTemp: 324,
  PWMLevel: 64,
  PowerSource: 3,
  TipResistance: 84,
  Uptime: 1847000,
  MovementTime: 42000,
  MaxTipTempAbility: 450,
  uVoltsTip: 3120,
  HallSensor: 1,
  OperatingMode: 1,
  Watts: 65,
};

const MOCK_SETTINGS = {
  TemperatureUnit: 0,  // °C by default
  SolderingTemp: 320,
  BoostTemp: 400,
  AutoStart: 0,
  SleepTemp: 150,
  SleepDelay: 600,
  StandbyTemp: 25,
  StandbyTimeout: 0,
  ShutdownTimeout: 60,
  MotionSensitivity: 5,
  DisplayBrightness: 60,
  TempUnit: 1,
  AutoOff: 1,
  HallEffectSensitivity: 6,
};

const DEFAULT_LIVE_DATA = {
  LiveTemp: 25,
  SetTemp: 320,
  Voltage: 0,
  HandleTemp: 280,
  PWMLevel: 0,
  PowerSource: 0,
  TipResistance: 0,
  Uptime: 0,
  MovementTime: 0,
  MaxTipTempAbility: 450,
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

  const pendingSettings = useRef({});
  const historyRef = useRef([]);
  const listenersRef = useRef([]);

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
      const baseTemp = 310 + Math.sin(Date.now() / 5000) * 15;
      const noise = (Math.random() - 0.5) * 8;
      historyRef.current = [
        ...historyRef.current.slice(-(MAX_HISTORY - 1)),
        { timestamp: now, liveTemp: Math.round(baseTemp + noise), setTemp: 320, watts: 45 + Math.random() * 20 }
      ];
      setTempHistory([...historyRef.current]);
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
    const interval = setInterval(() => {
      setTempHistory([...historyRef.current]);
    }, 800);
    return () => clearInterval(interval);
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

  // ─── Keyboard actions ────────────────────────────────
  const handleTempUp = useCallback((step) => {
    const current = liveData.SetTemp || 320;
    const stepVal = step || 10;
    const newTemp = Math.min(current + stepVal, liveData.MaxTipTempAbility || 450);
    updateSetting('SolderingTemp', newTemp);
    // Optimistically update SetTemp in liveData
    setLiveData(prev => ({ ...prev, SetTemp: newTemp }));
    // Send immediately if connected
    if (!mock && api) {
      api.bleSetSetting('SolderingTemp', newTemp).catch(() => {});
    }
  }, [liveData.SetTemp, liveData.MaxTipTempAbility, updateSetting, mock]);

  const handleTempDown = useCallback((step) => {
    const current = liveData.SetTemp || 320;
    const stepVal = step || 10;
    const newTemp = Math.max(current - stepVal, 10);
    updateSetting('SolderingTemp', newTemp);
    setLiveData(prev => ({ ...prev, SetTemp: newTemp }));
    if (!mock && api) {
      api.bleSetSetting('SolderingTemp', newTemp).catch(() => {});
    }
  }, [liveData.SetTemp, updateSetting, mock]);

  const handleToggleMode = useCallback((targetTemp) => {
    const toggleTarget = targetTemp || 200;
    // If currently hot (mode 1, temp > 50), go cold
    // If currently cold, go to target
    if (liveData.OperatingMode === 1 && liveData.LiveTemp > 50) {
      // Go to cold/standby
      updateSetting('SolderingTemp', 25);
      setLiveData(prev => ({ ...prev, SetTemp: 25 }));
      if (!mock && api) api.bleSetSetting('SolderingTemp', 25).catch(() => {});
      addToast('❄️ Cooling down...', 'info');
    } else {
      // Go to target hot temperature
      updateSetting('SolderingTemp', toggleTarget);
      setLiveData(prev => ({ ...prev, SetTemp: toggleTarget }));
      if (!mock && api) api.bleSetSetting('SolderingTemp', toggleTarget).catch(() => {});
      addToast('🔥 Heating to ' + toggleTarget + '°', 'success');
    }
  }, [liveData.OperatingMode, liveData.LiveTemp, updateSetting, mock, addToast]);

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

  const formatTemp = useCallback((tempC) => {
    if (tempC == null) return '--';
    // TemperatureUnit: 0=C, 1=F
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
