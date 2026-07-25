import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Moon, Power, Monitor, Settings2, Cpu,
  Save, ChevronDown, Minus, Plus, Keyboard, Gauge, Clock
} from 'lucide-react';
import { SETTING_META, VALUE_LIMITS } from '../constants.js';

const GROUPS = {
  soldering: { label: 'Soldering', icon: Flame, color: 'text-orange-400' },
  sleep:     { label: 'Sleep',     icon: Moon,   color: 'text-indigo-400' },
  device:    { label: 'Device',    icon: Cpu,    color: 'text-sky-400' },
  power:     { label: 'Power',     icon: Power,  color: 'text-blue-400' },
  display:   { label: 'Display',   icon: Monitor, color: 'text-amber-400' },
  hotkeys:   { label: 'Shortcuts', icon: Keyboard, color: 'text-soul-400' },
  app:       { label: 'App',       icon: Gauge,   color: 'text-emerald-400' },
  advanced:  { label: 'Advanced',  icon: Settings2, color: 'text-iron-400' },
};

const HIDDEN_SETTINGS = new Set([
  'VoltageCalibration', 'CalibrationOffset', 'CalibrateCJC',
  'AccelMissingWarningCounter', 'PDMissingWarningCounter',
  'save_to_flash', 'SettingsReset',
]);

const SettingRow = memo(function SettingRow({ name, value, meta, onChange, isDirty }) {
  const limits = VALUE_LIMITS[name];
  const isToggle = meta.format && meta.format(0) === 'Off' && meta.format(1) === 'On';
  const isSelect = meta.format && !isToggle;
  const selectOptions = isSelect ? getSelectOptions(name) : null;

  if (isToggle) {
    const isOn = value >= 1;
    return (
      <div className="flex items-center justify-between py-2.5 px-3 hover:bg-iron-800/40 rounded-lg transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm text-iron-300">{meta.label}</span>
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-soul-400" title="Modified" />}
        </div>
        <button
          onClick={() => onChange(name, isOn ? 0 : 1)}
          role="switch"
          aria-checked={isOn}
          aria-label={`${meta.label}: ${isOn ? 'On' : 'Off'}`}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
            isOn ? 'bg-soul-500' : 'bg-iron-700'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
              isOn ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    );
  }

  if (selectOptions) {
    return (
      <div className="flex items-center justify-between py-2.5 px-3 hover:bg-iron-800/40 rounded-lg transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm text-iron-300">{meta.label}</span>
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-soul-400" title="Modified" />}
        </div>
        <select
          value={value ?? 0}
          onChange={e => onChange(name, parseInt(e.target.value))}
          aria-label={meta.label}
          className="bg-iron-800 border border-iron-700/50 rounded-lg px-3 py-1 text-sm text-iron-200 focus:outline-none focus:border-soul-500/50 appearance-none cursor-pointer"
        >
          {selectOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (limits) {
    // Smart step: temperature settings (unit °) use 10 (=1°C), others use 1
    const isTemp = meta.unit === '°';
    const step = isTemp && (limits[1] - limits[0]) > 50 ? 10 : 1;
    // BLE sends temps in 0.1°C; display as °C for temperature settings
    const displayValue = meta.format
      ? meta.format(value ?? 0)
      : isTemp ? Math.round((value ?? 0) / 10) : (value ?? 0);
    const displayMin = isTemp ? Math.round(limits[0] / 10) : limits[0];
    const displayMax = isTemp ? Math.round(limits[1] / 10) : limits[1];
    return (
      <div className="flex items-center justify-between py-2.5 px-3 hover:bg-iron-800/40 rounded-lg transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm text-iron-300">{meta.label}</span>
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-soul-400" title="Modified" />}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(name, Math.max(limits[0], (value ?? 0) - step))}
            aria-label={`Decrease ${meta.label}`}
            className="w-7 h-7 rounded-md bg-iron-800 hover:bg-iron-700 border border-iron-700/50 flex items-center justify-center text-iron-400 hover:text-iron-200 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <div className="w-14 text-center text-sm font-mono text-iron-200 tabular-nums">
            {displayValue}
            {!meta.format && <span className="text-iron-500 text-[10px] ml-0.5">{meta.unit}</span>}
          </div>
          <button
            onClick={() => onChange(name, Math.min(limits[1], (value ?? 0) + step))}
            aria-label={`Increase ${meta.label}`}
            className="w-7 h-7 rounded-md bg-iron-800 hover:bg-iron-700 border border-iron-700/50 flex items-center justify-center text-iron-400 hover:text-iron-200 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2.5 px-3 hover:bg-iron-800/40 rounded-lg transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-sm text-iron-300">{meta.label}</span>
        {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-soul-400" title="Modified" />}
      </div>
      <span className="text-sm font-mono text-iron-400 tabular-nums">
        {value ?? '—'} {meta.unit}
      </span>
    </div>
  );
});

// ─── Hotkey configuration rows ──────────────────────────────────
function HotkeyRow({ label, description, value, onChange }) {
  const [editing, setEditing] = useState(false);

  const handleKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      setEditing(false);
      return;
    }
    // Use the key value or code for special keys
    const key = e.key === ' ' ? 'Space' :
                e.code?.startsWith('F') ? e.code :
                e.key;
    if (key && key.length <= 10) {
      onChange(key);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-2.5 px-3 hover:bg-iron-800/40 rounded-lg transition-colors">
      <div>
        <span className="text-sm text-iron-300">{label}</span>
        {description && (
          <p className="text-[10px] text-iron-600 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        aria-label={`${label}: ${editing ? 'Press a key' : value || 'Not set'}`}
        className={`relative min-w-[80px] px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
          editing
            ? 'bg-soul-500/20 border border-soul-500/50 text-soul-400 shadow-inner'
            : 'bg-iron-800 border border-iron-700/50 text-iron-300 hover:border-iron-600/50'
        }`}
        onKeyDown={editing ? handleKeyDown : undefined}
        tabIndex={0}
      >
        {editing ? 'Press a key…' : (value || '—')}
      </button>
    </div>
  );
}

function SettingsGroup({ groupKey, settings, onChange, pendingChanges, hotkeyConfig, onUpdateHotkeyConfig, appConfig, onUpdateAppConfig }) {
  const [expanded, setExpanded] = useState(false);
  const group = GROUPS[groupKey];
  if (!group) return null;
  const Icon = group.icon;

  const isSpecialGroup = groupKey === 'hotkeys' || groupKey === 'app';
  const isHotkeyGroup = groupKey === 'hotkeys';
  const isAppGroup = groupKey === 'app';

  const groupSettings = !isSpecialGroup
    ? Object.entries(SETTING_META)
        .filter(([_, m]) => m.group === groupKey && !HIDDEN_SETTINGS.has(_))
        .map(([name, meta]) => ({ name, meta }))
    : [];

  if (groupSettings.length === 0 && !isSpecialGroup) return null;

  return (
    <div className="glass-subtle overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-iron-800/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${group.color}`} />
          <span className="text-sm font-medium text-iron-200">{group.label}</span>
          {!isSpecialGroup && (
            <span className="text-[10px] text-iron-500">{groupSettings.length} settings</span>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-iron-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 divide-y divide-iron-800/50">
              {isHotkeyGroup ? (
                <>
                  <div className="px-3 py-2">
                    <p className="text-[11px] text-iron-500 leading-relaxed">
                      Configure keyboard shortcuts for controlling your iron. Click a key binding, then press the desired key. Works when the app window is focused.
                    </p>
                  </div>
                  <HotkeyRow
                    label="Temperature Up"
                    description={`Increases temperature by ${Math.round((hotkeyConfig?.tempStep || 10) / 10)}° step`}
                    value={hotkeyConfig?.tempUp}
                    onChange={(key) => onUpdateHotkeyConfig({ tempUp: key })}
                  />
                  <HotkeyRow
                    label="Temperature Down"
                    description={`Decreases temperature by ${Math.round((hotkeyConfig?.tempStep || 10) / 10)}° step`}
                    value={hotkeyConfig?.tempDown}
                    onChange={(key) => onUpdateHotkeyConfig({ tempDown: key })}
                  />
                  <HotkeyRow
                    label="Toggle Hot/Cold"
                    description={`Toggles between heating to ${Math.round((hotkeyConfig?.toggleTemp || 3200) / 10)}° or cooldown`}
                    value={hotkeyConfig?.toggleMode}
                    onChange={(key) => onUpdateHotkeyConfig({ toggleMode: key })}
                  />
                  <div className="flex items-center justify-between py-2.5 px-3">
                    <div>
                      <span className="text-sm text-iron-300">Temp Step</span>
                      <p className="text-[10px] text-iron-600 mt-0.5">Increment for up/down keys</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateHotkeyConfig({ tempStep: Math.max(10, (hotkeyConfig?.tempStep || 10) - 50) })}
                        className="w-7 h-7 rounded-md bg-iron-800 hover:bg-iron-700 border border-iron-700/50 flex items-center justify-center text-iron-400"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center text-sm font-mono text-iron-200 tabular-nums">{Math.round((hotkeyConfig?.tempStep || 10) / 10)}</span>
                      <button
                        onClick={() => onUpdateHotkeyConfig({ tempStep: Math.min(1000, (hotkeyConfig?.tempStep || 10) + 50) })}
                        className="w-7 h-7 rounded-md bg-iron-800 hover:bg-iron-700 border border-iron-700/50 flex items-center justify-center text-iron-400"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3">
                    <div>
                      <span className="text-sm text-iron-300">Toggle Target Temp</span>
                      <p className="text-[10px] text-iron-600 mt-0.5">Temperature when toggling to hot mode</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateHotkeyConfig({ toggleTemp: Math.max(500, (hotkeyConfig?.toggleTemp || 3200) - 100) })}
                        className="w-7 h-7 rounded-md bg-iron-800 hover:bg-iron-700 border border-iron-700/50 flex items-center justify-center text-iron-400"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center text-sm font-mono text-iron-200 tabular-nums">{Math.round((hotkeyConfig?.toggleTemp || 3200) / 10)}°</span>
                      <button
                        onClick={() => onUpdateHotkeyConfig({ toggleTemp: Math.min(4500, (hotkeyConfig?.toggleTemp || 3200) + 100) })}
                        className="w-7 h-7 rounded-md bg-iron-800 hover:bg-iron-700 border border-iron-700/50 flex items-center justify-center text-iron-400"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </>
              ) : isAppGroup ? (
                <>
                  <div className="px-3 py-2">
                    <p className="text-[11px] text-iron-500 leading-relaxed">
                      Local app display settings. These only affect how data is shown in pineSOUL — not sent to the iron.
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3">
                    <div>
                      <span className="text-sm text-iron-300">Graph Time Window</span>
                      <p className="text-[10px] text-iron-600 mt-0.5">How much history to show on the graph</p>
                    </div>
                    <select
                      value={appConfig?.graphWindow || 300}
                      onChange={e => onUpdateAppConfig({ graphWindow: parseInt(e.target.value) })}
                      className="bg-iron-800 border border-iron-700/50 rounded-lg px-3 py-1 text-sm text-iron-200 focus:outline-none focus:border-soul-500/50 appearance-none cursor-pointer"
                    >
                      <option value={60}>1 min</option>
                      <option value={180}>3 min</option>
                      <option value={300}>5 min</option>
                      <option value={600}>10 min</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3">
                    <div>
                      <span className="text-sm text-iron-300">Polling Rate</span>
                      <p className="text-[10px] text-iron-600 mt-0.5">How often the graph updates (lower = smoother)</p>
                    </div>
                    <select
                      value={appConfig?.pollingRate || 500}
                      onChange={e => onUpdateAppConfig({ pollingRate: parseInt(e.target.value) })}
                      className="bg-iron-800 border border-iron-700/50 rounded-lg px-3 py-1 text-sm text-iron-200 focus:outline-none focus:border-soul-500/50 appearance-none cursor-pointer"
                    >
                      <option value={100}>100 ms</option>
                      <option value={250}>250 ms</option>
                      <option value={500}>500 ms</option>
                      <option value={1000}>1 s</option>
                      <option value={2000}>2 s</option>
                    </select>
                  </div>
                </>
              ) : (
                groupSettings.map(({ name, meta }) => (
                  <SettingRow
                    key={name}
                    name={name}
                    value={settings[name]}
                    meta={meta}
                    onChange={onChange}
                    isDirty={pendingChanges?.has(name)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SettingsPanel({ settings, onChange, onSaveFlash, hasChanges, dirtySettings, hotkeyConfig, onUpdateHotkeyConfig, appConfig, onUpdateAppConfig }) {
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSaveFlash();
    } finally {
      setSaving(false);
    }
  }, [onSaveFlash]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-iron-800/50">
        <h3 className="text-sm font-semibold text-iron-300 uppercase tracking-wider">Settings</h3>
        {hasChanges && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleSave}
            disabled={saving}
            aria-busy={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-soul-500/20 hover:bg-soul-500/30 text-soul-400 text-xs font-medium rounded-lg border border-soul-500/30 transition-colors"
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-soul-400/30 border-t-soul-400 rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save to Flash
              </>
            )}
          </motion.button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scroll-slim p-3 space-y-2">
        {Object.keys(GROUPS).map(groupKey => (
          <SettingsGroup
            key={groupKey}
            groupKey={groupKey}
            settings={settings}
            onChange={onChange}
            pendingChanges={dirtySettings}
            hotkeyConfig={hotkeyConfig}
            onUpdateHotkeyConfig={onUpdateHotkeyConfig}
            appConfig={appConfig}
            onUpdateAppConfig={onUpdateAppConfig}
          />
        ))}
      </div>
    </div>
  );
}

function getSelectOptions(name) {
  const map = {
    AutoStart:             [{ value: 0, label: 'Off' }, { value: 1, label: 'Heat' }, { value: 2, label: 'Sleep' }, { value: 3, label: 'Standby' }],
    DisplayRotation:       [{ value: 0, label: 'Right' }, { value: 1, label: 'Left' }, { value: 2, label: 'Auto' }],
    LockingMode:           [{ value: 0, label: 'Disabled' }, { value: 1, label: 'Boost Only' }, { value: 2, label: 'Full Lock' }],
    TemperatureUnit:       [{ value: 0, label: '°C' }, { value: 1, label: '°F' }],
    AnimSpeed:             [{ value: 0, label: 'Off' }, { value: 1, label: 'Slow' }, { value: 2, label: 'Medium' }, { value: 3, label: 'Fast' }],
    DCInCutoff:            [{ value: 0, label: '10V' }, { value: 1, label: '12V' }, { value: 2, label: '14V' }, { value: 3, label: '16V' }, { value: 4, label: '18V' }],
  };
  return map[name] || null;
}
