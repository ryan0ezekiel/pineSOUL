import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Settings2, Bluetooth, Cpu,
  Wifi, WifiOff, Keyboard
} from 'lucide-react';
import { usePinecil } from './hooks/usePinecil';
import TitleBar from './components/TitleBar';
import TemperatureDial from './components/TemperatureDial';
import TemperatureGraph from './components/TemperatureGraph';
import LiveDataPanel from './components/LiveDataPanel';
import SettingsPanel from './components/SettingsPanel';
import ConnectionPanel from './components/ConnectionPanel';
import Toast from './components/Toast';

const TABS = [
  { key: 'control',  label: 'Control', icon: Flame },
  { key: 'settings', label: 'Settings', icon: Settings2 },
  { key: 'connect',  label: 'Connect', icon: Bluetooth },
];

// ─── Hotkey config (persisted in localStorage) ──────────────────────────
const DEFAULT_HOTKEY_CONFIG = {
  tempUp: '=',
  tempDown: '-',
  toggleMode: 'F2',
  tempStep: 10, // 0.1°C: 10 = 1°C step
  toggleTemp: 3200, // 0.1°C: 3200 = 320°C
};

const DEFAULT_APP_CONFIG = {
  pollingRate: 500,     // ms between mock data updates
  graphWindow: 300,     // seconds of history to show
};

function loadHotkeyConfig() {
  try {
    const saved = localStorage.getItem('pinesoul_hotkeys');
    return saved ? { ...DEFAULT_HOTKEY_CONFIG, ...JSON.parse(saved) } : DEFAULT_HOTKEY_CONFIG;
  } catch { return DEFAULT_HOTKEY_CONFIG; }
}

function saveHotkeyConfig(config) {
  localStorage.setItem('pinesoul_hotkeys', JSON.stringify(config));
}

function loadAppConfig() {
  try {
    const saved = localStorage.getItem('pinesoul_appconfig');
    return saved ? { ...DEFAULT_APP_CONFIG, ...JSON.parse(saved) } : DEFAULT_APP_CONFIG;
  } catch { return DEFAULT_APP_CONFIG; }
}

function saveAppConfig(config) {
  localStorage.setItem('pinesoul_appconfig', JSON.stringify(config));
}

export default function App() {
  // Mock mode: only in dev (Vite dev server) when no BLE adapter is available
  // Production PWA shows the Connect tab so users pair their real Pinecil
  const mock = !window.electronAPI && import.meta.env.DEV;
  const [hotkeyConfig, setHotkeyConfigState] = useState(loadHotkeyConfig);
  const [appConfig, setAppConfigState] = useState(loadAppConfig);

  const updateHotkeyConfig = useCallback((updates) => {
    setHotkeyConfigState(prev => {
      const next = { ...prev, ...updates };
      saveHotkeyConfig(next);
      return next;
    });
  }, []);

  const updateAppConfig = useCallback((updates) => {
    setAppConfigState(prev => {
      const next = { ...prev, ...updates };
      saveAppConfig(next);
      return next;
    });
  }, []);

  const p = usePinecil({ mock, pollingRate: appConfig.pollingRate });

  // ─── Global keyboard shortcut handler ─────────────────
  useEffect(() => {
    // Global unhandled promise rejection handler
    const handleUnhandledRejection = (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      e.preventDefault();
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const handleKeyDown = (e) => {
      // Ignore when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      // Ignore modifiers
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const hc = hotkeyConfig;
      const key = e.key === hc.toggleMode || e.code === hc.toggleMode ? hc.toggleMode : e.key;

      if (key === hc.tempUp) {
        e.preventDefault();
        p.handleTempUp(hc.tempStep);
      } else if (key === hc.tempDown) {
        e.preventDefault();
        p.handleTempDown(hc.tempStep);
      } else if (key === hc.toggleMode) {
        e.preventDefault();
        p.handleToggleMode(hc.toggleTemp);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [hotkeyConfig, p.handleTempUp, p.handleTempDown, p.handleToggleMode]);

  return (
    <div className="h-screen flex flex-col bg-iron-950 overflow-hidden">
      <TitleBar connection={p.connection} deviceInfo={p.deviceInfo} />

      {/* Toast overlay */}
      <Toast toasts={p.toasts} onDismiss={p.removeToast} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — tabs */}
        <nav className="w-16 flex flex-col items-center py-4 gap-1 border-r border-iron-800/50 bg-iron-900/30 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = p.activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => p.setActiveTab(tab.key)}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group ${
                  active
                    ? 'bg-soul-500/15 text-soul-400'
                    : 'text-iron-500 hover:text-iron-300 hover:bg-iron-800/50'
                }`}
                title={tab.label}
              >
                <Icon className="w-5 h-5" />
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 w-0.5 h-6 bg-soul-400 rounded-r"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

          <div className="flex-1" />

          {/* Connection indicator */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            p.connection === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-iron-800/50 text-iron-600'
          }`}
            role="status"
            aria-label={p.connection === 'connected' ? 'Connected' : 'Disconnected'}
          >
            {p.connection === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
        </nav>

        {/* Main panel */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {p.activeTab === 'control' && (
              <motion.div
                key="control"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                {p.connection === 'connected' ? (
                  <>
                    {/* Top area: graph left, dial right */}
                    <div className="flex-1 flex min-h-0 px-4 pt-4 gap-4">
                      {/* Temperature graph — takes remaining space */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span className="text-[11px] text-iron-500 uppercase tracking-wider font-medium">Temperature History</span>
                          <span className="text-[10px] text-iron-600">{appConfig.graphWindow / 60} min</span>
                        </div>
                        <div className="flex-1 min-h-0 px-5 pb-5">
                          <TemperatureGraph
                            history={p.tempHistory}
                            formatTemp={p.formatTemp}
                            displayUnit={p.displayUnit}
                            windowSeconds={appConfig.graphWindow}
                          />
                        </div>
                      </div>

                      {/* Temperature dial — right side, no shrink */}
                      <div className="shrink-0 flex items-center justify-center">
                        <TemperatureDial
                          liveData={p.liveData}
                          mode={p.mode}
                          currentTempPercent={p.currentTempPercent}
                          setTempPercent={p.setTempPercent}
                          formatTemp={p.formatTemp}
                          displayUnit={p.displayUnit}
                        />
                      </div>
                    </div>

                    {/* Bottom: live data panel */}
                    <div className="px-4 pb-3">
                      <LiveDataPanel
                        liveData={p.liveData}
                        formatTemp={p.formatTemp}
                        displayUnit={p.displayUnit}
                        formatVoltage={p.formatVoltage}
                        formatUptime={p.formatUptime}
                        formatHandleTemp={p.formatHandleTemp}
                        formatTipRes={p.formatTipRes}
                        formatPowerSource={p.formatPowerSource}
                      />
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full bg-iron-800/50 border-2 border-dashed border-iron-700/50 flex items-center justify-center">
                        <Cpu className="w-10 h-10 text-iron-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-iron-400 font-medium">No iron connected</p>
                        <p className="text-xs text-iron-600 mt-1">
                          Go to <span className="text-soul-400">Connect</span> to scan and pair with your Pinecil
                        </p>
                        {p.connectionError && (
                          <p className="text-xs text-red-400 mt-2">{p.connectionError}</p>
                        )}
                        {p.deviceInfo?.address && p.connection === 'disconnected' && (
                          <button
                            onClick={p.reconnect}
                            className="mt-3 px-3 py-1.5 bg-soul-500/15 hover:bg-soul-500/25 text-soul-400 text-xs font-medium rounded-lg border border-soul-500/30 transition-colors"
                          >
                            Reconnect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {p.activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <SettingsPanel
                  settings={p.settings}
                  onChange={p.updateSetting}
                  onSaveFlash={p.saveToFlash}
                  hasChanges={p.settingsChanged}
                  dirtySettings={p.dirtySettings}
                  hotkeyConfig={hotkeyConfig}
                  onUpdateHotkeyConfig={updateHotkeyConfig}
                  appConfig={appConfig}
                  onUpdateAppConfig={updateAppConfig}
                />
              </motion.div>
            )}

            {p.activeTab === 'connect' && (
              <motion.div
                key="connect"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <ConnectionPanel
                  connection={p.connection}
                  devices={p.devices}
                  scanning={p.scanning}
                  deviceInfo={p.deviceInfo}
                  onScan={p.startScan}
                  onConnect={p.connect}
                  onDisconnect={p.disconnect}
                  connectionError={p.connectionError}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
