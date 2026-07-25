// Pinecil V2 BLE Protocol Constants
// Based on IronOS firmware and PineSAM reference implementation

// ─── Service UUIDs ───────────────────────────────────────────────────
export const SERVICES = {
  SETTINGS_V220:  'f6d75f91-5a10-4eba-a233-47d3f26a907f',
  SETTINGS_V221:  'f6d80000-5a10-4eba-aa55-33e27f9bc533',
  BULK_DATA_V220: '9eae1adb-9d0d-48c5-a6e7-ae93f0ea37b0',
  BULK_DATA_V221: '9eae1000-9d0d-48c5-aa55-33e27f9bc533',
};

// ─── Settings UUID → Name Map (v2.21+) ──────────────────────────────
export const SETTINGS_V221 = {
  'f6d70000-5a10-4eba-aa55-33e27f9bc533': 'SetTemperature',
  'f6d70001-5a10-4eba-aa55-33e27f9bc533': 'SleepTemperature',
  'f6d70002-5a10-4eba-aa55-33e27f9bc533': 'SleepTimeout',
  'f6d70003-5a10-4eba-aa55-33e27f9bc533': 'DCInCutoff',
  'f6d70004-5a10-4eba-aa55-33e27f9bc533': 'MinVolCell',
  'f6d70005-5a10-4eba-aa55-33e27f9bc533': 'QCMaxVoltage',
  'f6d70006-5a10-4eba-aa55-33e27f9bc533': 'DisplayRotation',
  'f6d70007-5a10-4eba-aa55-33e27f9bc533': 'MotionSensitivity',
  'f6d70008-5a10-4eba-aa55-33e27f9bc533': 'AnimLoop',
  'f6d70009-5a10-4eba-aa55-33e27f9bc533': 'AnimSpeed',
  'f6d7000a-5a10-4eba-aa55-33e27f9bc533': 'AutoStart',
  'f6d7000b-5a10-4eba-aa55-33e27f9bc533': 'ShutdownTimeout',
  'f6d7000c-5a10-4eba-aa55-33e27f9bc533': 'CooldownBlink',
  'f6d7000d-5a10-4eba-aa55-33e27f9bc533': 'AdvancedIdle',
  'f6d7000e-5a10-4eba-aa55-33e27f9bc533': 'AdvancedSoldering',
  'f6d7000f-5a10-4eba-aa55-33e27f9bc533': 'TemperatureUnit',
  'f6d70010-5a10-4eba-aa55-33e27f9bc533': 'ScrollingSpeed',
  'f6d70011-5a10-4eba-aa55-33e27f9bc533': 'LockingMode',
  'f6d70012-5a10-4eba-aa55-33e27f9bc533': 'PowerPulsePower',
  'f6d70013-5a10-4eba-aa55-33e27f9bc533': 'PowerPulseWait',
  'f6d70014-5a10-4eba-aa55-33e27f9bc533': 'PowerPulseDuration',
  'f6d70015-5a10-4eba-aa55-33e27f9bc533': 'VoltageCalibration',
  'f6d70016-5a10-4eba-aa55-33e27f9bc533': 'BoostTemperature',
  'f6d70017-5a10-4eba-aa55-33e27f9bc533': 'CalibrationOffset',
  'f6d70018-5a10-4eba-aa55-33e27f9bc533': 'PowerLimit',
  'f6d70019-5a10-4eba-aa55-33e27f9bc533': 'ReverseButtonTempChange',
  'f6d7001a-5a10-4eba-aa55-33e27f9bc533': 'TempChangeLongStep',
  'f6d7001b-5a10-4eba-aa55-33e27f9bc533': 'TempChangeShortStep',
  'f6d7001c-5a10-4eba-aa55-33e27f9bc533': 'HallEffectSensitivity',
  'f6d7001d-5a10-4eba-aa55-33e27f9bc533': 'AccelMissingWarningCounter',
  'f6d7001e-5a10-4eba-aa55-33e27f9bc533': 'PDMissingWarningCounter',
  'f6d7001f-5a10-4eba-aa55-33e27f9bc533': 'UILanguage',
  'f6d70020-5a10-4eba-aa55-33e27f9bc533': 'PDNegTimeout',
  'f6d70021-5a10-4eba-aa55-33e27f9bc533': 'ColourInversion',
  'f6d70022-5a10-4eba-aa55-33e27f9bc533': 'Brightness',
  'f6d70023-5a10-4eba-aa55-33e27f9bc533': 'LOGOTime',
  'f6d70024-5a10-4eba-aa55-33e27f9bc533': 'CalibrateCJC',
  'f6d70025-5a10-4eba-aa55-33e27f9bc533': 'BLEEnabled',
  'f6d70026-5a10-4eba-aa55-33e27f9bc533': 'PDVpdoEnabled',
  'f6d7ffff-5a10-4eba-aa55-33e27f9bc533': 'save_to_flash',
  'f6d7fffe-5a10-4eba-aa55-33e27f9bc533': 'SettingsReset',
};

// ─── Bulk Data Names ─────────────────────────────────────────────────
export const BULK_DATA_V221 = {
  '9eae1001-9d0d-48c5-aa55-33e27f9bc533': 'BulkData',
  '9eae1002-9d0d-48c5-aa55-33e27f9bc533': 'Accelerometer',
  '9eae1003-9d0d-48c5-aa55-33e27f9bc533': 'Build',
  '9eae1004-9d0d-48c5-aa55-33e27f9bc533': 'DeviceID',
};

// ─── Live Data Fields ────────────────────────────────────────────────
// 14 × uint32 little-endian values from BulkData characteristic
export const LIVE_DATA_FIELDS = [
  'LiveTemp',       // Current tip temperature (0.1°C or °F units)
  'SetTemp',        // Target temperature
  'Voltage',        // Input voltage (10mV units, so 200 = 2.00V → actually mV * 10)
  'HandleTemp',     // Handle temperature
  'PWMLevel',       // PWM duty cycle (0-100)
  'PowerSource',    // Power source type (0=USB, 1=DC, 2=QC, 3=PD)
  'TipResistance',  // Tip resistance in milliohms (80 = 8.0Ω)
  'Uptime',         // Uptime in milliseconds
  'MovementTime',   // Time since last movement (ms)
  'MaxTipTempAbility', // Maximum achievable tip temperature
  'uVoltsTip',      // Microvolts across the tip
  'HallSensor',     // Hall sensor reading
  'OperatingMode',  // 0=Standby, 1=Soldering, 2=Boost, 3=Sleep
  'Watts',          // Current power draw in watts
];

// ─── Setting Value Limits ────────────────────────────────────
export const VALUE_LIMITS = {
  // BLE protocol sends temps in 0.1°C (e.g. 100=10°C, 4500=450°C)
  SetTemperature:        [100, 4500],   // 10–450°C
  SleepTemperature:      [100, 3000],   // 10–300°C
  SleepTimeout:          [0, 15],
  DCInCutoff:            [0, 4],
  MinVolCell:            [24, 38],
  QCMaxVoltage:          [90, 220],
  DisplayRotation:       [0, 2],
  MotionSensitivity:     [0, 9],
  AnimLoop:              [0, 1],
  AnimSpeed:             [0, 3],
  AutoStart:             [0, 3],
  ShutdownTimeout:       [0, 60],
  CooldownBlink:         [0, 1],
  AdvancedIdle:          [0, 1],
  AdvancedSoldering:     [0, 1],
  TemperatureUnit:       [0, 1],
  ScrollingSpeed:        [0, 1],
  LockingMode:           [0, 2],
  PowerPulsePower:       [0, 99],
  PowerPulseWait:        [1, 9],
  PowerPulseDuration:    [1, 9],
  VoltageCalibration:    [360, 900],
  BoostTemperature:      [2500, 4500],  // 250–450°C
  CalibrationOffset:     [100, 2500],
  PowerLimit:            [0, 220],
  ReverseButtonTempChange: [0, 1],
  TempChangeLongStep:    [10, 900],     // 1–90°C in 0.1°C steps
  TempChangeShortStep:   [10, 500],     // 1–50°C in 0.1°C steps
  HallEffectSensitivity: [0, 9],
  Brightness:            [0, 101],
  LOGOTime:              [0, 5],
  CalibrateCJC:          [0, 1],
  BLEEnabled:            [0, 1],
  PDNegTimeout:          [0, 50],
  ColourInversion:       [0, 1],
};

// ─── Setting Display Metadata ────────────────────────────────────────
export const SETTING_META = {
  SetTemperature:      { label: 'Soldering Temp',     unit: '°',    group: 'soldering' },
  BoostTemperature:    { label: 'Boost Temp',         unit: '°',    group: 'soldering' },
  SleepTemperature:    { label: 'Sleep Temp',         unit: '°',    group: 'sleep' },
  SleepTimeout:        { label: 'Sleep Timeout',      unit: 's',    group: 'sleep',     format: v => { if (v === 0) return 'Off'; if (v <= 5) { const sec = v * 15; const m = Math.floor(sec / 60); const s = sec % 60; if (m > 0 && s > 0) return `${m}m ${s}s`; if (m > 0) return `${m}m`; return `${sec}s`; } return `${v - 5}m`; } },
  ShutdownTimeout:     { label: 'Shutdown Timer',     unit: 'min',  group: 'sleep',     format: v => v === 0 ? 'Off' : `${v} min` },
  AutoStart:           { label: 'Start-up',           unit: '',     group: 'soldering', format: v => ['Off', 'Heat', 'Sleep', 'Standby'][v] || 'Off' },
  MotionSensitivity:   { label: 'Motion Sensitivity', unit: '',     group: 'device',    format: v => v === 0 ? 'Off' : v },
  LockingMode:         { label: 'Button Lock',        unit: '',     group: 'device',    format: v => ['Disable', 'Boost Only', 'Full'][v] || 'Disable' },
  TemperatureUnit:     { label: 'Temp Unit',          unit: '',     group: 'device',    format: v => v === 0 ? '°C' : '°F' },
  DisplayRotation:     { label: 'Display Rotation',   unit: '',     group: 'device',    format: v => ['Right', 'Left', 'Auto'][v] || 'Right' },
  PowerLimit:          { label: 'Power Limit',        unit: 'W',    group: 'power' },
  DCInCutoff:          { label: 'Power Source',       unit: '',     group: 'power',     format: v => ['DC 10V', 'DC 12V', 'DC 14V', 'DC 16V', 'DC 18V'][v] || 'DC 10V' },
  MinVolCell:          { label: 'Min Cell Voltage',   unit: '0.1V', group: 'power' },
  QCMaxVoltage:        { label: 'QC Max Voltage',     unit: '0.1V', group: 'power' },
  PDNegTimeout:        { label: 'PD Timeout',         unit: '×100ms', group: 'power' },
  Brightness:          { label: 'Screen Brightness',  unit: '',     group: 'display' },
  ColourInversion:     { label: 'Invert Screen',      unit: '',     group: 'display',   format: v => v === 0 ? 'Off' : 'On' },
  LOGOTime:            { label: 'Boot Logo',          unit: 's',    group: 'display' },
  AnimSpeed:           { label: 'Animation Speed',    unit: '',     group: 'display',   format: v => ['Off', 'Slow', 'Medium', 'Fast'][v] || 'Off' },
  AnimLoop:            { label: 'Animation Loop',     unit: '',     group: 'display',   format: v => v === 0 ? 'Off' : 'On' },
  CooldownBlink:       { label: 'Cooldown Flash',     unit: '',     group: 'display',   format: v => v === 0 ? 'Off' : 'On' },
  ScrollingSpeed:      { label: 'Scroll Speed',       unit: '',     group: 'display',   format: v => v === 0 ? 'Slow' : 'Fast' },
  AdvancedIdle:        { label: 'Detailed Idle',      unit: '',     group: 'display',   format: v => v === 0 ? 'Off' : 'On' },
  AdvancedSoldering:   { label: 'Detailed Solder',    unit: '',     group: 'display',   format: v => v === 0 ? 'Off' : 'On' },
  PowerPulsePower:     { label: 'Pulse Power',        unit: 'W',    group: 'advanced' },
  PowerPulseWait:      { label: 'Pulse Delay',        unit: '×2.5s', group: 'advanced' },
  PowerPulseDuration:  { label: 'Pulse Duration',     unit: '×250ms', group: 'advanced' },
  TempChangeShortStep: { label: 'Short Temp Step',    unit: '°',    group: 'advanced' },
  TempChangeLongStep:  { label: 'Long Temp Step',     unit: '°',    group: 'advanced' },
  ReverseButtonTempChange: { label: 'Swap +/-',       unit: '',     group: 'advanced',  format: v => v === 0 ? 'Normal' : 'Reversed' },
  HallEffectSensitivity: { label: 'Hall Sensitivity',  unit: '',    group: 'advanced',  format: v => v === 0 ? 'Off' : v },
  BLEEnabled:          { label: 'BLE Enabled',        unit: '',     group: 'advanced',  format: v => v === 0 ? 'Off' : 'On' },
  VoltageCalibration:  { label: 'VIN Calibration',    unit: '',     group: 'calibration' },
  CalibrationOffset:   { label: 'CJC Offset',         unit: '',     group: 'calibration' },
  CalibrateCJC:        { label: 'Calibrate CJC',      unit: '',     group: 'calibration', format: v => 'Trigger' },
};
