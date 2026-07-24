import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Moon, Power, Monitor, Settings2,
  Save, ChevronDown, Minus, Plus, Keyboard
} from 'lucide-react';
import { SETTING_META, VALUE_LIMITS } from '../constants.js';

const GROUPS = {
  soldering: { label: 'Soldering', icon: Flame, color: 'text-orange-400' },
  sleep:     { label: 'Sleep',     icon: Moon,   color: 'text-indigo-400' },
  power:     { label: 'Power',     icon: Power,  color: 'text-blue-400' },
  display:   { label: 'Display',   icon: Monitor, color: 'text-amber-400' },
  hotkeys:   { label: 'Shortcuts', icon: Keyboard, color: 'text-soul-400' },
  advanced:  { label: 'Advanced',  icon: Settings2, color: 'text-iron-400' },
};

const HIDDEN_SETTINGS = new Set([
  'VoltageCalibration', 'CalibrationOffset', 'CalibrateCJC',
  'AccelMissingWarningCounter', 'PDMissingWarningCounter',
  'save_to_flash', 'SettingsReset',
]);

function SettingRow({ name, value, meta, onChange }) {
  const limits = VALUE_LIMITS[name];
  const isToggle = meta.format && meta.format(0) === 'Off' && meta.format(1) === 'On';
  const isSelect = meta.format && !isToggle;
  const selectOptions = isSelect ? getSelectOptions(name) : null;

  if (isToggle) {
    const isOn = value >= 1;
    return (
      <div className="flex items-center justify-between py-2.5 px-3 hover:bg-iron-800/40 rounded-lg transition-colors">
        <span className="text-sm text-iron-300">{meta.label}</span>
        <button
          onClick={() => onChange(name, isOn ? 0 : 1)}
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
        <span className="text-sm text-iron-300">{meta.label}</span>
        <select
          value={value ?? 0}
          onChange={e => onChange(name, parseInt(e.target.value))}
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
    const step = (limits[1] - limits[0]) > 50 ? 10 : 1;
    return (
      <div className="flex items-center justify-between py-2.5 px-3 hover:bg-iron-800/40 rounded-lg transition-colors">
        <span className="text-sm text-iron-300">{meta.label}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(name, Math.max(limits[0], (value ?? 0) - step))}
            className="w-7 h-7 rounded-md bg-iron-800 hover:bg-iron-700 border border-iron-700/50 flex items-center justify-center text-iron-400 hover:text-iron-200 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <div className="w-14 text-center text-sm font-mono text-iron-200 tabular-nums">
            {value ?? 0}
            <span className="text-iron-500 text-[10px] ml-0.5">{meta.unit}</span>
          </div>
          <button
            onClick={() => onChange(name, Math.min(limits[1], (value ?? 0) + step))}
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
      <span className="text-sm text-iron-300">{meta.label}</span>
      <span className="text-sm font-mono text-iron-400 tabular-nums">
        {value ?? '—'} {meta.unit}
      </span>
    </div>
  );
}

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
        className={`relative min-w-[80px] px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
          editing
            ? 'bg-soul-500/20 border border-soul-500/50 text-soul-400 shadow-inner'
            : 'bg-iron-800 border border-iron-700/50 text-iron-300 hover:border-iron-600/50'
        }`}
        onKeyDown={editing ? handleKeyDown : undefined}
        tabIndex={0}
      >
        {editing ? '…' : (value || '—')}
      </button>
    </div>
  );
}

function SettingsGroup({ groupKey, settings, onChange, hotkeyConfig, onUpdateHotkeyConfig }) {
  const [expanded, setExpanded] = useState(groupKey === 'soldering' || groupKey === 'hotkeys');
  const group = GROUPS[groupKey];
  if (!group) return null;
  const Icon = group.icon;

  const isHotkeyGroup = groupKey === 'hotkeys';

  const groupSettings = !isHotkeyGroup
    ? Object.entries(SETTING_META)
        .filter(([_, m]) => m.group === groupKey && !HIDDEN_SETTINGS.has(_))
        .map(([name, meta]) => ({ name, meta }))
    : [];

  if (groupSettings.length === 0 && !isHotkeyGroup) return null;

  return (
    <div className="glass-subtle overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-iron-800/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${group.color}`} />
          <span className="text-sm font-medium text-iron-200">{group.label}</span>
          {!isHotkeyGroup && (
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
                    description={`Increases temperature by ${hotkeyConfig?.tempStep || 10}° step`}
                    value={hotkeyConfig?.tempUp}
                    onChange={(key) => onUpdateHotkeyConfig({ tempUp: key })}
                  />
                  <HotkeyRow
                    label="Temperature Down"
                    description={`Decreases temperature by ${hotkeyConfig?.tempStep || 10}° step`}
                    value={hotkeyConfig?.tempDown}
                    onChange={(key) => onUpdateHotkeyConfig({ tempDown: key })}
                  />
                  <HotkeyRow
                    label="Toggle Hot/Cold"
                    description={`Toggles between heating to ${hotkeyConfig?.toggleTemp || 200}° or cooldown`}
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
                        onClick={() => onUpdateHotkeyConfig({ tempStep: Math.max(1, (hotkeyConfig?.tempStep || 10) - 5) })}
                        className="w-7 h-7 rounded-md bg-iron-800 hover:bg-iron-700 border border-iron-700/50 flex items-center justify-center text-iron-400"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center text-sm font-mono text-iron-200 tabular-nums">{hotkeyConfig?.tempStep || 10}</span>
                      <button
                        onClick={() => onUpdateHotkeyConfig({ tempStep: Math.min(100, (hotkeyConfig?.tempStep || 10) + 5) })}
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
                        onClick={() => onUpdateHotkeyConfig({ toggleTemp: Math.max(50, (hotkeyConfig?.toggleTemp || 200) - 10) })}
                        className="w-7 h-7 rounded-md bg-iron-800 hover:bg-iron-700 border border-iron-700/50 flex items-center justify-center text-iron-400"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center text-sm font-mono text-iron-200 tabular-nums">{hotkeyConfig?.toggleTemp || 200}°</span>
                      <button
                        onClick={() => onUpdateHotkeyConfig({ toggleTemp: Math.min(450, (hotkeyConfig?.toggleTemp || 200) + 10) })}
                        className="w-7 h-7 rounded-md bg-iron-800 hover:bg-iron-700 border border-iron-700/50 flex items-center justify-center text-iron-400"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
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

export default function SettingsPanel({ settings, onChange, onSaveFlash, hasChanges, hotkeyConfig, onUpdateHotkeyConfig }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-iron-800/50">
        <h3 className="text-sm font-semibold text-iron-300 uppercase tracking-wider">Settings</h3>
        {hasChanges && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onSaveFlash}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-soul-500/20 hover:bg-soul-500/30 text-soul-400 text-xs font-medium rounded-lg border border-soul-500/30 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save to Flash
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
            hotkeyConfig={hotkeyConfig}
            onUpdateHotkeyConfig={onUpdateHotkeyConfig}
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
