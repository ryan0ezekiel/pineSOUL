import { memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bluetooth, Search, Link2, Unlink, RefreshCw, Plug, Signal, Loader2 } from 'lucide-react';

function DeviceCard({ device, onConnect, connection }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="w-full glass-subtle p-4 flex items-center justify-between hover:border-soul-500/30 transition-all cursor-pointer group text-left"
      onClick={() => onConnect(device.address)}
      disabled={connection === 'connected'}
      aria-label={`Connect to ${device.name || 'Pinecil'} ${device.address || ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-soul-500/10 border border-soul-500/20 flex items-center justify-center">
          <Plug className="w-5 h-5 text-soul-400" />
        </div>
        <div>
          <div className="text-sm font-medium text-iron-200">{device.name || 'Pinecil'}</div>
          <div className="text-[11px] text-iron-500 font-mono">{device.address || device.id}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {device.rssi != null && (
          <div className="text-right">
            <div className="flex items-center gap-1 text-iron-500">
              <Signal className="w-3 h-3" />
              <span className="text-[11px] font-mono">{device.rssi} dBm</span>
            </div>
          </div>
        )}
        <div className="w-8 h-8 rounded-lg bg-soul-500/10 group-hover:bg-soul-500/20 flex items-center justify-center transition-colors">
          <Link2 className="w-4 h-4 text-soul-400" />
        </div>
      </div>
    </motion.button>
  );
}

export default memo(function ConnectionPanel({ connection, devices, scanning, deviceInfo, onScan, onConnect, onDisconnect, connectionError }) {
  const noop = useRef(() => {}).current;
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-iron-800/50">
        <h3 className="text-sm font-semibold text-iron-300 uppercase tracking-wider mb-3">Connection</h3>

        {connection === 'connected' ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 glass-subtle p-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-sm font-medium text-iron-200">{deviceInfo?.name || 'Pinecil'}</div>
                <div className="text-[10px] text-iron-500">{deviceInfo?.address} · Firmware {deviceInfo?.build}</div>
              </div>
            </div>
            <button
              onClick={onDisconnect}
              aria-label="Disconnect from Pinecil"
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg border border-red-500/20 transition-colors"
            >
              <Unlink className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={onScan}
              disabled={scanning}
              aria-busy={scanning}
              aria-label={scanning ? 'Scanning for devices' : 'Scan for Pinecil devices'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-soul-500/15 hover:bg-soul-500/25 text-soul-400 text-sm font-medium rounded-xl border border-soul-500/30 transition-all disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scan for devices
                </>
              )}
            </button>
            {connectionError && (
              <p className="text-xs text-red-400 text-center" role="alert" aria-live="assertive">{connectionError}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scroll-slim p-3 space-y-2">
        <AnimatePresence>
          {devices.length > 0 ? (
            devices.map(device => (
              <DeviceCard
                key={device.address || device.id}
                device={device}
                onConnect={connection === 'connected' ? noop : onConnect}
                connection={connection}
              />
            ))
          ) : !scanning ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Bluetooth className="w-12 h-12 text-iron-700 mb-3" />
              <p className="text-sm text-iron-500">
                {connection === 'connected'
                  ? 'Connected to your Pinecil'
                  : 'No devices found. Make sure your Pinecil is powered on.'}
              </p>
              <p className="text-xs text-iron-600 mt-1">
                The Pinecil broadcasts via BLE whenever it has power.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12" role="status">
              <RefreshCw className="w-8 h-8 text-soul-500/50 animate-spin mb-3" aria-hidden="true" />
              <p className="text-sm text-iron-400">Searching for Pinecil devices…</p>
              <p className="text-xs text-iron-600 mt-1">Make sure your iron is powered on nearby.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
