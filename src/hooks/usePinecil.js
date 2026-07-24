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

export function usePinecil({ mock = false } = {}) {
  const [connection, setConnection] = useState('disconnected');
  const [devices, setDevices] = useState([]);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [liveData, setLiveData] = useState(DEFAULT_LIVE_DATA);
  const [settings, setSettings] = useState({});
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('control');
  const [settingsChanged, setSettingsChanged] = useState(false);
  const pendingSettings = useRef({});

  // Mock mode: simulate a connected iron for screenshots
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

  // Subscribe to BLE events
  useEffect(() => {
    if (!api || mock) return;

    const unsubConnection = api.onConnectionChange?.((status) => {
      if (typeof status === 'string') {
        setConnection(status);
      } else if (status?.status) {
        setConnection(status.status);
        if (status.deviceInfo) setDeviceInfo(status.deviceInfo);
      }
    });
    const unsubLive = api.onLiveData?.((data) => {
      setLiveData(data);
    });
    const unsubDevices = api.onDeviceFound?.((device) => {
      setDevices(prev => {
        if (prev.find(d => d.address === device.address)) return prev;
        return [...prev, device];
      });
    });
    const unsubSettings = api.onSettingsLoaded?.((s) => {
      setSettings(s);
      setSettingsChanged(false);
      pendingSettings.current = {};
    });

    return () => {};
  }, [mock]);

  // Scanning
  const startScan = useCallback(async () => {
    setDevices([]);
    setScanning(true);
    await api?.bleScan();
    setTimeout(() => setScanning(false), 10000);
  }, []);

  // Connect
  const connect = useCallback(async (address) => {
    setConnection('connecting');
    const result = await api?.bleConnect(address);
    if (!result?.ok) {
      setConnection('disconnected');
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(async () => {
    await api?.bleDisconnect();
    setConnection('disconnected');
    setDeviceInfo(null);
  }, []);

  // Update setting (local only, not sent yet)
  const updateSetting = useCallback((name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }));
    pendingSettings.current[name] = value;
    setSettingsChanged(true);
  }, []);

  // Apply all pending settings to the iron
  const applySettings = useCallback(async () => {
    const results = [];
    for (const [name, value] of Object.entries(pendingSettings.current)) {
      const result = await api?.bleSetSetting(name, value);
      results.push({ name, ...result });
    }
    pendingSettings.current = {};
    setSettingsChanged(false);
    return results;
  }, []);

  // Save to flash
  const saveToFlash = useCallback(async () => {
    await applySettings();
    return api?.bleSaveToFlash();
  }, [applySettings]);

  // Derived data
  const mode = MODE_MAP[liveData.OperatingMode] || MODE_MAP[0];
  const tempPercent = liveData.MaxTipTempAbility > 0
    ? (liveData.LiveTemp / liveData.MaxTipTempAbility) * 100
    : 0;
  const setTempPercent = liveData.MaxTipTempAbility > 0
    ? (liveData.SetTemp / liveData.MaxTipTempAbility) * 100
    : 0;

  // Format helpers
  const formatVoltage = (raw) => {
    if (raw === 0) return '--';
    return (raw / 100).toFixed(1);
  };
  const formatUptime = (ms) => {
    if (!ms || ms === 0) return '--';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };
  const formatHandleTemp = (raw) => {
    return (raw / 10).toFixed(0);
  };
  const formatTipRes = (raw) => {
    if (!raw || raw === 0) return '--';
    return (raw / 100).toFixed(1);
  };
  const formatPowerSource = (raw) => {
    return ['USB-C', 'DC Jack', 'QC', 'PD'][raw] || 'Unknown';
  };

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

    // Derived
    mode,
    tempPercent,
    setTempPercent,

    // Actions
    startScan,
    connect,
    disconnect,
    setActiveTab,
    updateSetting,
    applySettings,
    saveToFlash,

    // Formatters
    formatVoltage,
    formatUptime,
    formatHandleTemp,
    formatTipRes,
    formatPowerSource,
  };
}
