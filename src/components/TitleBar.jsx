import React from 'react';
import { Minus, Square, X, Wifi, WifiOff, Flame } from 'lucide-react';

export default function TitleBar({ connection, deviceInfo }) {
  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <div className="titlebar select-none">
      {/* Left: App branding */}
      <div className="flex items-center gap-2">
        <Flame className="w-3.5 h-3.5 text-soul-500" />
        <span className="font-semibold tracking-wider text-iron-300 text-[11px] uppercase">
          pineSOUL
        </span>
        {connection === 'connected' && deviceInfo && (
          <span className="text-iron-500 text-[10px] ml-1">
            · {deviceInfo.name || deviceInfo.address}
          </span>
        )}
      </div>

      {/* Center: connection indicator */}
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
          connection === 'connected' ? 'bg-emerald-400' :
          connection === 'connecting' ? 'bg-amber-400 animate-pulse' :
          'bg-iron-600'
        }`} />
        <span className="text-[10px] text-iron-500 uppercase tracking-wide">
          {connection === 'connected' ? 'Live' :
           connection === 'connecting' ? 'Connecting…' :
           'Offline'}
        </span>
      </div>

      {/* Right: window controls */}
      <div className="flex items-center gap-0.5">
        <button className="titlebar-btn" onClick={handleMinimize}>
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button className="titlebar-btn" onClick={handleMaximize}>
          <Square className="w-3 h-3" />
        </button>
        <button className="titlebar-btn hover:bg-red-500/80 hover:text-white" onClick={handleClose}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
