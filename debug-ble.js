#!/usr/bin/env node
// Minimal BLE test: scan → connect → discoverServices → discoverChars per service → read BulkData
const noble = require('@abandonware/noble');

async function run() {
  // Scan
  let device = null;
  console.log('Scanning...');
  
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
  
  if (!device) { console.log('Not found'); process.exit(1); }
  console.log(`Found: ${device.advertisement.localName}`);
  
  // Connect
  console.log('Connecting...');
  await device.connectAsync();
  console.log('Connected');
  
  // Step 1: discover services ONLY
  console.log('\nDiscovering services...');
  const services = await device.discoverServicesAsync();
  console.log(`Found ${services.length} services:`);
  for (const s of services) {
    console.log(`  ${s.uuid}`);
  }
  
  // Step 2: discover characteristics for each service
  console.log('\nDiscovering characteristics per service...');
  for (const s of services) {
    try {
      const chars = await s.discoverCharacteristicsAsync();
      console.log(`\nService ${s.uuid} (${chars.length} chars):`);
      for (const c of chars) {
        const props = [];
        if (c.properties.read) props.push('R');
        if (c.properties.write) props.push('W');
        if (c.properties.writeWithoutResponse) props.push('WnR');
        if (c.properties.notify) props.push('N');
        if (c.properties.indicate) props.push('I');
        console.log(`  ${c.uuid} [${props.join(',')}]`);
      }
      
      // If this looks like BulkData, try to read
      if (s.uuid.includes('9eae')) {
        for (const c of chars) {
          if (c.uuid.includes('9eae1001')) {
            console.log('\n  >>> Reading BulkData...');
            try {
              const val = await c.readAsync();
              console.log(`  BulkData: ${val.length} bytes`);
              
              // Parse as 14x uint32 LE
              const raw = new Uint8Array(val);
              const view = new DataView(raw.buffer);
              const fields = ['LiveTemp','SetTemp','Voltage','HandleTemp','PWMLevel','PowerSource',
                             'TipResistance','Uptime','MovementTime','MaxTipTempAbility','uVoltsTip',
                             'HallSensor','OperatingMode','Watts'];
              const modes = ['Standby','Soldering','Boost','Sleep'];
              
              for (let i = 0; i < Math.min(14, fields.length); i++) {
                const offset = i * 4;
                if (offset + 4 <= raw.byteLength) {
                  const v = view.getUint32(offset, true);
                  let display = String(v);
                  if (fields[i] === 'LiveTemp' || fields[i] === 'SetTemp' || fields[i] === 'HandleTemp')
                    display = `${(v/10).toFixed(1)}°C`;
                  else if (fields[i] === 'Voltage')
                    display = `${(v/100).toFixed(2)}V`;
                  else if (fields[i] === 'OperatingMode')
                    display = modes[v] || v;
                  else if (fields[i] === 'PWMLevel')
                    display = `${v}%`;
                  else if (fields[i] === 'TipResistance')
                    display = `${(v/10).toFixed(1)}Ω`;
                  else if (fields[i] === 'Uptime' || fields[i] === 'MovementTime')
                    display = `${(v/1000).toFixed(1)}s`;
                  console.log(`    ${fields[i]}: ${display}`);
                }
              }
            } catch(e) {
              console.log(`  Read failed: ${e.message}`);
            }
          }
        }
      }
      
      // If this looks like Settings, read a few
      if (s.uuid.includes('f6d8') || s.uuid.includes('f6d75')) {
        console.log('\n  >>> Reading key settings...');
        for (const c of chars) {
          if (c.uuid.includes('f6d70000') || // SetTemperature
              c.uuid.includes('f6d7000f') || // TemperatureUnit
              c.uuid.includes('f6d70022') || // Brightness
              c.uuid.includes('f6d7ffff')) { // save_to_flash
            const names = { 'f6d70000': 'SetTemperature', 'f6d7000f': 'TemperatureUnit', 
                           'f6d70022': 'Brightness', 'f6d7ffff': 'save_to_flash' };
            const shortId = c.uuid.slice(0,8);
            try {
              const val = await c.readAsync();
              const raw = new Uint8Array(val);
              const v = val.length >= 2 ? new DataView(raw.buffer).getUint16(0, true) : raw[0];
              console.log(`    ${names[shortId] || c.uuid}: ${v} (${val.length} bytes)`);
            } catch(e) {
              console.log(`    ${c.uuid}: read failed - ${e.message}`);
            }
          }
        }
      }
    } catch(e) {
      console.log(`  Service ${s.uuid}: char discovery failed - ${e.message}`);
    }
  }
  
  // Disconnect
  console.log('\nDisconnecting...');
  await device.disconnectAsync();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
