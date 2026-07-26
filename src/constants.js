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
  'LiveTemp',       // Current tip temperature in °C (raw value, PineSAM confirmed)
  'SetTemp',        // Target temperature in °C (raw value)
  'Voltage',        // Input voltage in 0.1V units (divide by 10)
  'HandleTemp',     // Handle temperature in 0.1°C (divide by 10)
  'PWMLevel',       // PWM duty cycle (0-100)
  'PowerSource',    // Power source type (0=USB, 1=DC, 2=QC, 3=PD)
  'TipResistance',  // Tip resistance in 0.1Ω units (divide by 10)
  'Uptime',         // Uptime in milliseconds
  'MovementTime',   // Time since last movement (ms)
  'MaxTipTempAbility', // Maximum achievable tip temperature
  'uVoltsTip',      // Microvolts across the tip
  'HallSensor',     // Hall sensor reading
  'OperatingMode',  // 0=Standby, 1=Soldering, 2=Boost, 3=Sleep
  'Watts',          // Current power draw in 0.1W units (divide by 10)
];

// ─── Setting Value Limits ────────────────────────────────────
export const VALUE_LIMITS = {
  // Raw values are in °C directly (PineSAM reference confirmed)
  SetTemperature:        [10, 450],      // 10–450°C
  SleepTemperature:      [10, 300],      // 10–300°C
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
  BoostTemperature:      [250, 450],     // 250–450°C
  CalibrationOffset:     [100, 2500],
  PowerLimit:            [0, 220],
  ReverseButtonTempChange: [0, 1],
  TempChangeLongStep:    [1, 90],        // 1–90°C step
  TempChangeShortStep:   [1, 50],        // 1–50°C step
  HallEffectSensitivity: [0, 9],
  Brightness:            [0, 101],
  LOGOTime:              [0, 5],
  CalibrateCJC:          [0, 1],
  BLEEnabled:            [0, 1],
  PDVpdoEnabled:         [0, 1],
  PDNegTimeout:          [0, 50],
  ColourInversion:       [0, 1],
  UILanguage:            [0, 15],
};

// ─── Setting Display Metadata ────────────────────────────────────────
export const SETTING_META = {
  SetTemperature:      { label: 'Soldering Temp',     unit: '°',    group: 'soldering' },
  BoostTemperature:    { label: 'Boost Temp',         unit: '°',    group: 'soldering' },
  SleepTemperature:    { label: 'Sleep Temp',         unit: '°',    group: 'sleep' },
  SleepTimeout:        { label: 'Sleep Timeout',      unit: 's',    group: 'sleep',     format: v => v === 0 ? 'Off' : v < 6 ? `${v * 15}s` : `${v - 5}m` },
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
  PDVpdoEnabled:       { label: 'PD VPDO',            unit: '',     group: 'advanced',  format: v => v === 0 ? 'Off' : 'On' },
  VoltageCalibration:  { label: 'VIN Calibration',    unit: '',     group: 'calibration' },
  CalibrationOffset:   { label: 'CJC Offset',         unit: '',     group: 'calibration' },
  CalibrateCJC:        { label: 'Calibrate CJC',      unit: '',     group: 'calibration', format: v => 'Trigger' },
};

// ─── Setting Descriptions ──────────────────────────────────────────────
export const SETTING_DESCRIPTIONS = {
  SetTemperature: 'Target temperature for the soldering tip during active soldering.',
  BoostTemperature: 'Temperature during boost mode (activated by holding the button).',
  SleepTemperature: 'Temperature the tip cools to when iron enters sleep mode.',
  SleepTimeout: 'Time of inactivity before the iron enters sleep mode.',
  ShutdownTimeout: 'Time in sleep mode before the iron shuts down completely.',
  AutoStart: 'What mode to start in when the iron is powered on.',
  MotionSensitivity: 'How sensitive the motion sensor is for detecting movement. 0=Off, 9=Most sensitive.',
  LockingMode: 'Lock the buttons to prevent accidental temperature changes.',
  TemperatureUnit: 'Temperature display unit. Affects all temperature readings.',
  DisplayRotation: 'Rotate the iron display for left or right-handed use.',
  PowerLimit: 'Maximum power draw in watts. Limits the iron from drawing more than your supply can provide.',
  DCInCutoff: 'DC input voltage cutoff. Set to match your power supply. When set to DC, hides MinVolCell.',
  MinVolCell: 'Minimum voltage per cell for battery/solar operation. Only visible when DC mode is selected.',
  QCMaxVoltage: 'Maximum voltage the iron will request from a QC charger.',
  PDNegTimeout: 'PD negotiation timeout. How long to wait for USB-PD negotiation.',
  Brightness: 'Screen brightness level.',
  ColourInversion: 'Invert the display colors for better visibility in bright conditions.',
  LOGOTime: 'How long to show the boot logo on startup.',
  AnimSpeed: 'Speed of display animations.',
  AnimLoop: 'Whether display animations loop continuously.',
  CooldownBlink: 'Flash the temperature display while the tip is cooling down.',
  ScrollingSpeed: 'Speed of scrolling text on the display.',
  AdvancedIdle: 'Show detailed information on the idle screen.',
  AdvancedSoldering: 'Show detailed information during soldering.',
  PowerPulsePower: 'Power level for the anti-idle pulse (prevents sleep during use).',
  PowerPulseWait: 'Delay between anti-idle pulses (×2.5 seconds).',
  PowerPulseDuration: 'Duration of each anti-idle pulse (×250ms).',
  TempChangeShortStep: 'Temperature increment for short button press.',
  TempChangeLongStep: 'Temperature increment for long button press.',
  ReverseButtonTempChange: 'Swap the +/- button temperature change direction.',
  HallEffectSensitivity: 'Hall effect sensor sensitivity for magnetic stands. 0=Off.',
  BLEEnabled: 'Enable or disable Bluetooth Low Energy.',
  PDVpdoEnabled: 'Enable USB-PD Variable PDO negotiation for higher voltages.',
  VoltageCalibration: 'VIN voltage calibration offset. Do not change unless calibrating.',
  CalibrationOffset: 'Cold Junction Compensation offset. Do not change unless calibrating.',
  CalibrateCJC: 'Trigger CJC calibration. Write 1 to save new calibration.',
};

// ─── Fahrenheit Temperature Ranges ─────────────────────────────────────
export const TEMPERATURE_RANGES = {
  0: { // Celsius
    SetTemperature: [10, 450],
    BoostTemperature: [250, 450],
    SleepTemperature: [10, 300],
  },
  1: { // Fahrenheit
    SetTemperature: [60, 850],
    BoostTemperature: [480, 840],
    SleepTemperature: [60, 580],
  },
};
