import React from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Clock, Thermometer, Gauge, Signal, Plug
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, unit, color = 'text-iron-300', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="glass-subtle p-3 flex flex-col gap-1"
    >
      <div className="flex items-center gap-1.5 text-iron-500">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-semibold tabular-nums ${color}`}>{value}</span>
        {unit && <span className="text-xs text-iron-500">{unit}</span>}
      </div>
    </motion.div>
  );
}

export default function LiveDataPanel({
  liveData,
  formatTemp,
  displayUnit,
  formatVoltage,
  formatUptime,
  formatHandleTemp,
  formatTipRes,
  formatPowerSource,
}) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
      <StatCard
        icon={Zap}
        label="Voltage"
        value={formatVoltage(liveData.Voltage)}
        unit="V"
        color="text-soul-400"
        delay={0.05}
      />
      <StatCard
        icon={Gauge}
        label="Power"
        value={liveData.Watts || 0}
        unit="W"
        color="text-soul-400"
        delay={0.1}
      />
      <StatCard
        icon={Plug}
        label="Source"
        value={formatPowerSource(liveData.PowerSource)}
        color="text-iron-200"
        delay={0.15}
      />
      <StatCard
        icon={Thermometer}
        label="Handle"
        value={formatHandleTemp(liveData.HandleTemp)}
        unit={displayUnit || '°C'}
        color="text-iron-200"
        delay={0.2}
      />
      <StatCard
        icon={Signal}
        label="Tip"
        value={formatTipRes(liveData.TipResistance)}
        unit="Ω"
        color="text-iron-200"
        delay={0.25}
      />
      <StatCard
        icon={Clock}
        label="Uptime"
        value={formatUptime(liveData.Uptime)}
        color="text-iron-200"
        delay={0.3}
      />
    </div>
  );
}
