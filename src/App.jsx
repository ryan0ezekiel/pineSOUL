import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Settings2, Bluetooth, Cpu,
  Sliders, Wifi, WifiOff, Info
} from 'lucide-react';
import { usePinecil } from './hooks/usePinecil';
import TitleBar from './components/TitleBar';
import TemperatureDial from './components/TemperatureDial';
import LiveDataPanel from './components/LiveDataPanel';
import SettingsPanel from './components/SettingsPanel';
import ConnectionPanel from './components/ConnectionPanel';

const TABS = [
  { key: 'control',  label: 'Control', icon: Flame },
  { key: 'settings', label: 'Settings', icon: Settings2 },
  { key: 'connect',  label: 'Connect', icon: Bluetooth },
];

export default function App() {
  const mock = !window.electronAPI;
  const p = usePinecil({ mock });

  return (
    <div className="h-screen flex flex-col bg-iron-950 bg-mesh overflow-hidden">
      {/* Title Bar */}
      <TitleBar connection={p.connection} deviceInfo={p.deviceInfo} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — tabs */}
        <nav className="w-16 flex flex-col items-center py-4 gap-1 border-r border-iron-800/50 bg-iron-900/30">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = p.activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => p.setActiveTab(tab.key)}
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Connection indicator */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            p.connection === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-iron-800/50 text-iron-600'
          }`}>
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
                {/* Center: Temperature dial */}
                <div className="flex-1 flex items-center justify-center">
                  {p.connection === 'connected' ? (
                    <TemperatureDial
                      liveData={p.liveData}
                      mode={p.mode}
                      tempPercent={p.tempPercent}
                      setTempPercent={p.setTempPercent}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full bg-iron-800/50 border-2 border-dashed border-iron-700/50 flex items-center justify-center">
                        <Cpu className="w-10 h-10 text-iron-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-iron-400 font-medium">No iron connected</p>
                        <p className="text-xs text-iron-600 mt-1">
                          Go to <span className="text-soul-400">Connect</span> to scan and pair with your Pinecil
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom: Live data */}
                <div className="px-6 pb-4">
                  <LiveDataPanel
                    liveData={p.liveData}
                    formatVoltage={p.formatVoltage}
                    formatUptime={p.formatUptime}
                    formatHandleTemp={p.formatHandleTemp}
                    formatTipRes={p.formatTipRes}
                    formatPowerSource={p.formatPowerSource}
                  />
                </div>
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
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
