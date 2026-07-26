import { useMemo, useId, memo } from 'react';

const RING_SIZE = 280;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MAX_TEMP = 450;

export default memo(function TemperatureDial({ liveData, mode, currentTempPercent, setTempPercent, formatTemp, formatWatts, displayUnit }) {
  const currentTemp = liveData?.LiveTemp || 0;
  const setTemp = liveData?.SetTemp || 0;

  const clampedCurrent = Math.min(100, Math.max(0, currentTempPercent || 0));
  const clampedSet = Math.min(100, Math.max(0, setTempPercent || 0));
  const currentOffset = CIRCUMFERENCE - (clampedCurrent / 100) * CIRCUMFERENCE;
  const setOffset = CIRCUMFERENCE - (clampedSet / 100) * CIRCUMFERENCE;

  // Background tick marks
  const ticks = useMemo(() => {
    const marks = [];
    for (let i = 0; i <= 45; i++) {
      const angle = (i / 45) * 360 - 90;
      const rad = (angle * Math.PI) / 180;
      const isMajor = i % 9 === 0;
      const innerR = RADIUS - (isMajor ? 20 : 12);
      const outerR = RADIUS - 6;
      marks.push({
        x1: RING_SIZE / 2 + Math.cos(rad) * innerR,
        y1: RING_SIZE / 2 + Math.sin(rad) * innerR,
        x2: RING_SIZE / 2 + Math.cos(rad) * outerR,
        y2: RING_SIZE / 2 + Math.sin(rad) * outerR,
        major: isMajor,
        temp: isMajor ? Math.round((i / 45) * MAX_TEMP) : null,
      });
    }
    return marks;
  }, []);

  const svgId = useId();
  const glowColor = mode?.color || '#34d399';

  return (
    <div className="relative flex items-center justify-center" style={{ width: RING_SIZE + 40, height: RING_SIZE + 40 }}>
      {/* Ambient glow behind the ring */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-3xl transition-all duration-1000"
        style={{ background: `radial-gradient(circle, ${glowColor}40, transparent 70%)` }}
      />

      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="relative z-10"
        role="img"
        aria-label={`Temperature dial: ${formatTemp ? formatTemp(currentTemp) : Math.round(currentTemp)}${displayUnit || '°C'}, target ${formatTemp ? formatTemp(setTemp) : Math.round(setTemp)}${displayUnit || '°C'}`}
      >
        <title>Temperature Dial</title>
        <defs>
          <linearGradient id={`${svgId}-setTempGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id={`${svgId}-currentTempGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="1" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0.7" />
          </linearGradient>
          <filter id={`${svgId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1}
            x2={t.x2} y2={t.y2}
            stroke={t.major ? '#475569' : '#334155'}
            strokeWidth={t.major ? 1.5 : 0.8}
            strokeLinecap="round"
          />
        ))}

        {/* Set temperature track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#${svgId}-setTempGrad)`}
          strokeWidth={STROKE_WIDTH - 2}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={setOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          className="transition-all duration-300"
          opacity={0.5}
        />

        {/* Current temperature ring */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#${svgId}-currentTempGrad)`}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={currentOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          filter={`url(#${svgId}-glow)`}
          className="transition-all duration-200 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <div
          className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1 transition-colors duration-500"
          style={{ color: mode?.color }}
        >
          {mode?.label || 'Offline'}
        </div>

        <div className="flex items-baseline gap-0.5">
          <span className="text-6xl font-light text-white tabular-nums tracking-tight leading-none">
            {formatTemp ? formatTemp(currentTemp) : Math.round(currentTemp)}
          </span>
          <span className="text-xl font-light text-iron-400">
            {displayUnit || '°C'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          <svg width="12" height="12" viewBox="0 0 12 12" className="opacity-40">
            <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="6" cy="6" r="2" fill="currentColor" />
          </svg>
          <span className="text-sm text-iron-400 tabular-nums font-mono">
            Target: {formatTemp ? formatTemp(setTemp) : Math.round(setTemp)}{displayUnit || '°C'}
          </span>
        </div>

        <div className="mt-1 text-[11px] text-iron-500 tabular-nums font-mono">
          {formatWatts ? formatWatts(liveData?.Watts ?? 0) : '0'}W
        </div>
      </div>
    </div>
  );
});
