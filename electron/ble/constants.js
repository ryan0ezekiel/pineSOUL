// Pinecil V2 BLE Protocol Constants
// CommonJS version for Electron main process

// ─── Service UUIDs ───────────────────────────────────────────────────
const SERVICES = {
  SETTINGS_V220:  'f6d75f91-5a10-4eba-a233-47d3f26a907f',
  SETTINGS_V221:  'f6d80000-5a10-4eba-aa55-33e27f9bc533',
  BULK_DATA_V220: '9eae1adb-9d0d-48c5-a6e7-ae93f0ea37b0',
  BULK_DATA_V221: '9eae1000-9d0d-48c5-aa55-33e27f9bc533',
};

// ─── Settings UUID → Name Map (v2.21+) ──────────────────────────────
const SETTINGS_V221 = {
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
const BULK_DATA_V221 = {
  '9eae1001-9d0d-48c5-aa55-33e27f9bc533': 'BulkData',
  '9eae1002-9d0d-48c5-aa55-33e27f9bc533': 'Accelerometer',
  '9eae1003-9d0d-48c5-aa55-33e27f9bc533': 'Build',
  '9eae1004-9d0d-48c5-aa55-33e27f9bc533': 'DeviceID',
};

// ─── Live Data Fields ────────────────────────────────────────────────
const LIVE_DATA_FIELDS = [
  'LiveTemp', 'SetTemp', 'Voltage', 'HandleTemp', 'PWMLevel',
  'PowerSource', 'TipResistance', 'Uptime', 'MovementTime',
  'MaxTipTempAbility', 'uVoltsTip', 'HallSensor', 'OperatingMode', 'Watts',
];

module.exports = { SERVICES, SETTINGS_V221, BULK_DATA_V221, LIVE_DATA_FIELDS };
