#!/usr/bin/env node
/**
 * pineSOUL BLE Hardware Test v4
 * Uses discoverServicesAsync() + per-service discoverCharacteristicsAsync()
 * (The only approach that works with noble + Pinecil)
 * 
 * 1. Scan & connect
 * 2. Backup ALL settings
 * 3. Read live data
 * 4. Test write (set temp to 350°C)
 * 5. Restore ALL original settings
 * 6. Save to flash
 * 7. Verify restoration
 */
const noble = require('@abandonware/noble');
const { SERVICES, SETTINGS_V221 } = require('./electron/ble/constants.js');
const { PinecilProtocol } = require('./electron/ble/protocol.js');

const BULK_DATA_UUID = '9eae10019d0d48c5aa5533e27f9bc533';
const SAVE_FLASH_UUID = 'f6d7ffff5a104ebaaa5533e27f9bc533';

// All known settings UUIDs from constants (with dashes)
const SETTINGS_UUIDS = Object.values(SERVICES.V221 || {}).flat().filter(Boolean);
// Plus extras we found on the real device
const EXTRA_SETTINGS = ['f6d700355a104ebaaa5533e27f9bc533', 'f6d700365a104ebaaa5533e27f9bc533'];
const ALL_SETTINGS_UUIDS = [...new Set([...SETTINGS_UUIDS, ...EXTRA_SETTINGS])];

function log(msg) { console.log(`[${new Date().toISOString().slice(11,23)}] ${msg}`); }

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`Timeout: ${label} (> ${ms}ms)`)), ms); });
  try { return await Promise.race([promise, timeout]); }
  finally { clearTimeout(timer); }
}

async function run() {
  log('═══ pineSOUL BLE Hardware Test v4 ═══');
  log('');

  // ─── STEP 1: Scan ───
  log('STEP 1: Scanning for Pinecil...');
  let device = null;
  
  await new Promise(async (resolve) => {
    noble.on('discover', (p) => {
      if (p.advertisement?.localName?.toLowerCase().includes('pinecil') && !device) {
        device = p;
      }
    });
    await noble.startScanningAsync([], false);
    await new Promise(r => {
      const check = setInterval(() => { if (device) { clearInterval(check); r(); } }, 100);
      setTimeout(() => { clearInterval(check); r(); }, 15000);
    });
    await noble.stopScanningAsync().catch(() => {});
    resolve();
  });

  if (!device) { log('❌ No Pinecil found. Is it powered on?'); process.exit(1); }
  log(`  ✅ Found: ${device.advertisement.localName} (${device.address}) RSSI: ${device.rssi}dBm`);
  log('');

  // ─── STEP 2: Connect ───
  log('STEP 2: Connecting...');
  await withTimeout(device.connectAsync(), 60000, 'connect');
  log('  ✅ Connected');
  log('');

  try {
    // ─── Discover services (using the working approach) ───
    log('STEP 2.5: Discovering services...');
    const services = await withTimeout(device.discoverServicesAsync(), 60000, 'discoverServices');
    log(`  Found ${services.length} services`);

    // Discover characteristics for each service
    const allChars = [];
    const serviceCharsMap = {};
    for (const svc of services) {
      const chars = await svc.discoverCharacteristicsAsync();
      serviceCharsMap[svc.uuid] = chars;
      allChars.push(...chars);
      log(`  Service ${svc.uuid.slice(0,8)}... → ${chars.length} chars`);
    }
    log('');

    // Find BulkData and Settings chars
    const bulkDataChar = allChars.find(c => c.uuid === BULK_DATA_UUID);
    const settingsChars = allChars.filter(c => 
      ALL_SETTINGS_UUIDS.includes(c.uuid) || c.uuid.includes('f6d7')
    );
    const saveFlashChar = allChars.find(c => c.uuid === SAVE_FLASH_UUID);

    log(`  BulkData char: ${bulkDataChar ? 'found' : 'NOT FOUND'}`);
    log(`  Settings chars: ${settingsChars.length}`);
    log(`  Save to flash char: ${saveFlashChar ? 'found' : 'NOT FOUND'}`);
    log('');

    // ─── STEP 3: Backup all settings ───
    log('STEP 3: Backing up current settings...');
    const backup = {};
    const settingsToBackUp = [
      'f6d70000', 'f6d70001', 'f6d70002', 'f6d70003', 'f6d70004',
      'f6d70005', 'f6d70006', 'f6d70007', 'f6d70008', 'f6d70009',
      'f6d7000a', 'f6d7000b', 'f6d7000c', 'f6d7000d', 'f6d7000e',
      'f6d7000f', 'f6d70010', 'f6d70011', 'f6d70012', 'f6d70013',
      'f6d70014', 'f6d70015', 'f6d70016', 'f6d70017', 'f6d70018',
      'f6d70019', 'f6d7001a', 'f6d7001b', 'f6d7001c', 'f6d7001d',
      'f6d7001e', 'f6d7001f', 'f6d70020', 'f6d70021', 'f6d70022',
      'f6d70023', 'f6d70024', 'f6d70025', 'f6d70026',
      'f6d70035', 'f6d70036'
    ];

    let backedUp = 0;
    for (const prefix of settingsToBackUp) {
      const matchingChar = settingsChars.find(c => c.uuid.startsWith(prefix));
      if (matchingChar) {
        try {
          const val = await matchingChar.readAsync();
          backup[matchingChar.uuid] = Buffer.from(val);
          const raw = new Uint8Array(val);
          const v = val.length >= 2 ? new DataView(raw.buffer).getUint16(0, true) : raw[0];
          log(`    ✅ ${prefix}: ${v} (${val.length} bytes)`);
          backedUp++;
        } catch(e) {
          log(`    ⚠️ ${prefix}: read failed - ${e.message}`);
        }
      }
    }
    log(`  Backed up ${backedUp} settings`);
    log('');

    // ─── STEP 4: Read live data ───
    log('STEP 4: Reading live data...');
    if (bulkDataChar) {
      try {
        const data = await bulkDataChar.readAsync();
        const raw = new Uint8Array(data);
        const view = new DataView(raw.buffer);
        const fields = ['LiveTemp','SetTemp','Voltage','HandleTemp','PWMLevel','PowerSource',
                       'TipResistance','Uptime','MovementTime','MaxTipTempAbility','uVoltsTip',
                       'HallSensor','OperatingMode','Watts'];
        const modes = ['Standby','Soldering','Boost','Sleep'];
        
        log('  ┌─────────────────────────────────────┐');
        log('  │       PINECIL LIVE DATA              │');
        log('  ├─────────────────────────────────────┤');
        for (let i = 0; i < Math.min(14, fields.length); i++) {
          const offset = i * 4;
          if (offset + 4 <= raw.byteLength) {
            const v = view.getUint32(offset, true);
            let display = String(v);
            if (fields[i] === 'LiveTemp' || fields[i] === 'SetTemp')
              display = `${v}°C`;  // Raw is already in °C (PineSAM reference confirmed)
            else if (fields[i] === 'HandleTemp')
              display = `${(v/10).toFixed(1)}°C`;  // HandleTemp is in 0.1°C
            else if (fields[i] === 'Voltage')
              display = `${(v/10).toFixed(1)}V`;  // Voltage is in 0.1V units
            else if (fields[i] === 'OperatingMode')
              display = modes[v] || v;
            else if (fields[i] === 'PWMLevel')
              display = `${v}%`;
            else if (fields[i] === 'TipResistance')
              display = `${(v/10).toFixed(1)}Ω`;
            else if (fields[i] === 'Uptime' || fields[i] === 'MovementTime')
              display = `${(v/1000).toFixed(1)}s`;
            else if (fields[i] === 'MaxTipTempAbility')
              display = `${v}°C`;
            else if (fields[i] === 'Watts')
              display = `${(v/10).toFixed(1)}W`;  // Watts is in 0.1W units
            log(`  │ ${fields[i].padEnd(20)} ${display.padStart(15)} │`);
          }
        }
        log('  └─────────────────────────────────────┘');
      } catch(e) {
        log(`  ❌ BulkData read failed: ${e.message}`);
      }
    } else {
      log('  ❌ BulkData characteristic not found');
    }
    log('');

    // ─── STEP 5: Test write — set temperature to 350°C ───
    log('STEP 5: Test write — setting temperature to 350°C...');
    const setTempChar = settingsChars.find(c => c.uuid.startsWith('f6d70000'));
    if (setTempChar) {
      const originalTemp = backup[setTempChar.uuid];
      const originalVal = originalTemp ? new DataView(new Uint8Array(originalTemp).buffer).getUint16(0, true) : '???';
      log(`  Original SetTemp: ${originalVal}`);
      
      // Write 3500 (350.0°C × 10)
      const buf = Buffer.alloc(2);
      buf.writeUInt16LE(3500, 0);
      await setTempChar.writeAsync(buf, true); // writeWithoutResponse
      
      // Read back
      await new Promise(r => setTimeout(r, 500));
      const readBack = await setTempChar.readAsync();
      const readBackVal = new DataView(new Uint8Array(readBack).buffer).getUint16(0, true);
      log(`  Write sent: 3500 (350°C)`);
      log(`  Read back: ${readBackVal} (${(readBackVal/10).toFixed(1)}°C)`);
      log(`  ✅ Write verified: ${readBackVal === 3500 ? 'MATCH' : 'MISMATCH'}`);
    } else {
      log('  ❌ SetTemperature char not found');
    }
    log('');

    // ─── STEP 6: Restore ALL original settings ───
    log('STEP 6: Restoring original settings...');
    let restored = 0;
    for (const [uuid, originalBuf] of Object.entries(backup)) {
      const matchingChar = settingsChars.find(c => c.uuid === uuid);
      if (matchingChar && uuid !== SAVE_FLASH_UUID) { // Don't write save_to_flash
        try {
          // Restore original SetTemperature if we changed it
          await matchingChar.writeAsync(originalBuf, true);
          const v = originalBuf.length >= 2 ? new DataView(new Uint8Array(originalBuf).buffer).getUint16(0, true) : originalBuf[0];
          log(`    ✅ ${uuid.slice(0,8)}: restored to ${v}`);
          restored++;
        } catch(e) {
          log(`    ⚠️ ${uuid.slice(0,8)}: write failed - ${e.message}`);
        }
      }
    }
    log(`  Restored ${restored} settings`);
    log('');

    // ─── STEP 7: Save to flash ───
    log('STEP 7: Saving to flash...');
    if (saveFlashChar) {
      try {
        const saveBuf = Buffer.alloc(2);
        saveBuf.writeUInt16LE(1, 0);
        await saveFlashChar.writeAsync(saveBuf, true);
        log('  ✅ Saved to flash');
        await new Promise(r => setTimeout(r, 1000)); // Wait for flash write
      } catch(e) {
        log(`  ❌ Save to flash failed: ${e.message}`);
      }
    } else {
      log('  ❌ Save to flash char not found');
    }
    log('');

    // ─── STEP 8: Verify restoration ───
    log('STEP 8: Verifying restoration...');
    // Read SetTemperature again to confirm it's back to original
    if (setTempChar) {
      try {
        await new Promise(r => setTimeout(r, 500));
        const verify = await setTempChar.readAsync();
        const verifyVal = new DataView(new Uint8Array(verify).buffer).getUint16(0, true);
        const originalVal = backup[setTempChar.uuid] 
          ? new DataView(new Uint8Array(backup[setTempChar.uuid]).buffer).getUint16(0, true) 
          : '???';
        log(`  SetTemperature: ${verifyVal} (expected: ${originalVal}) — ${verifyVal === originalVal ? '✅ MATCH' : '❌ MISMATCH'}`);
      } catch(e) {
        log(`  ❌ Verify failed: ${e.message}`);
      }
    }
    log('');

    // ─── STEP 9: Disconnect ───
    log('STEP 9: Disconnecting...');
    await device.disconnectAsync();
    log('  ✅ Disconnected');
    log('');
    log('═══ TEST COMPLETE ═══');

  } catch(e) {
    log(`❌ Error: ${e.message}`);
    try { await device.disconnectAsync(); } catch(_) {}
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
