import { useMemo, useRef, useState, useEffect, useId, memo } from 'react';
import { motion } from 'framer-motion';

// ── Cubic bezier interpolation ──────────────────────────────────────────
// Catmull-Rom → cubic bezier conversion for smooth SVG curves
function smoothPath(points, tension = 0.3) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// ── Time label formatting ───────────────────────────────────────────────
function formatTimeLabel(secondsAgo) {
  if (secondsAgo === 0) return 'now';
  if (secondsAgo < 60) return `${secondsAgo}s`;
  const m = Math.floor(secondsAgo / 60);
  const s = secondsAgo % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ── Y-axis tick generation ──────────────────────────────────────────────
function generateTicks(maxVal) {
  if (maxVal <= 0) return { ticks: [0], max: 100 };
  const rawStep = maxVal / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / mag;
  let niceStep;
  if (residual <= 1.5) niceStep = 1 * mag;
  else if (residual <= 3.5) niceStep = 2 * mag;
  else if (residual <= 7.5) niceStep = 5 * mag;
  else niceStep = 10 * mag;
  const niceMax = Math.ceil(maxVal / niceStep) * niceStep;
  const ticks = [];
  for (let v = 0; v <= niceMax; v += niceStep) ticks.push(v);
  return { ticks, max: niceMax };
}

// ── Component ────────────────────────────────────────────────────────────
const NOMINAL_WIDTH = 600;

export default memo(function TemperatureGraph({
  history = [],
  windowSeconds = 300, // 5 minutes
  formatTemp = (v) => Math.round(v),
  displayUnit = '°C',
}) {
  const svgId = useId();
  const containerRef = useRef(null);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (h > 0) setHeight(Math.round(h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const {
    pathData,
    areaData,
    targetPathData,
    xLabels,
    yTicks,
    yMax,
    bottom,
    left,
    right,
    top,
    plotWidth,
    plotHeight,
  } = useMemo(() => {
    const padding = { top: 16, right: 16, bottom: 28, left: 48 };
    const pTop = padding.top;
    const pRight = padding.right;
    const pBottom = padding.bottom;
    const pLeft = padding.left;

    const nomWidth = NOMINAL_WIDTH;
    const nomHeight = height;
    const plotW = nomWidth - pLeft - pRight;
    const plotH = nomHeight - pTop - pBottom;

    // ── Filter history to time window ──────────────────────────────────
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;
    const filtered = history.filter((d) => d.timestamp >= cutoff);
    const sorted = [...filtered].sort((a, b) => a.timestamp - b.timestamp);

    // ── Y range ────────────────────────────────────────────────────────
    const allTemps = sorted.flatMap((d) => [d.liveTemp ?? 0, d.setTemp ?? 0]);
    const dataMax = allTemps.length > 0
      ? allTemps.reduce((a, b) => Math.max(a, b), 0)
      : 0;
    const { ticks: yTickValues, max: computedMax } = generateTicks(dataMax || 4500);
    const finalMax = Math.max(computedMax, dataMax, 1);
    const yScale = (v) => pTop + plotH - (v / finalMax) * plotH;

    // ── X scale ────────────────────────────────────────────────────
    const timeEnd = sorted.length > 0 ? sorted[sorted.length - 1].timestamp : now;
    const timeStart = timeEnd - windowSeconds * 1000;
    const timeRange = timeEnd - timeStart || 1; // avoid div-by-zero with single point
    const xScale = (t) => pLeft + ((t - timeStart) / timeRange) * plotW;

    // ── Build points ───────────────────────────────────────────────────
    const tempPoints = sorted
      .filter((d) => d.liveTemp != null)
      .map((d) => ({ x: xScale(d.timestamp), y: yScale(d.liveTemp) }));
    const setPoints = sorted
      .filter((d) => d.setTemp != null)
      .map((d) => ({ x: xScale(d.timestamp), y: yScale(d.setTemp) }));

    const pathD = smoothPath(tempPoints);
    const targetD = smoothPath(setPoints);

    // ── Area fill ──────────────────────────────────────────────────────
    let areaD = '';
    if (tempPoints.length >= 2) {
      const bottomY = yScale(0);
      areaD = smoothPath(tempPoints);
      areaD += ` L ${tempPoints[tempPoints.length - 1].x} ${bottomY}`;
      areaD += ` L ${tempPoints[0].x} ${bottomY} Z`;
    }

    // ── X-axis time labels ─────────────────────────────────────────────
    const labelIntervals = [];
    const totalSec = windowSeconds;
    const stepSec = totalSec / 5;
    for (let i = 0; i <= 5; i++) {
      const secAgo = totalSec - i * stepSec;
      labelIntervals.push({
        label: formatTimeLabel(Math.round(secAgo)),
        x: pLeft + (i / 5) * plotW,
      });
    }

    // ── Y-axis grid / labels ───────────────────────────────────────────
    const yGridLines = yTickValues.map((v) => ({
      value: v,
      y: yScale(v),
    }));

    return {
      pathData: pathD,
      areaData: areaD,
      targetPathData: targetD,
      xLabels: labelIntervals,
      yTicks: yGridLines,
      yMax: finalMax,
      bottom: pBottom,
      left: pLeft,
      right: pRight,
      top: pTop,
      plotWidth: plotW,
      plotHeight: plotH,
    };
  }, [history, windowSeconds, height, formatTemp]);

  return (
    <motion.div
      ref={containerRef}
      className="w-full h-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <svg
        viewBox={`0 0 ${NOMINAL_WIDTH} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Temperature history graph over the last ${windowSeconds >= 60 ? Math.round(windowSeconds / 60) : windowSeconds}${windowSeconds >= 60 ? ' minutes' : ' seconds'}. Current unit: ${displayUnit}`}
      >
        <title>Temperature History</title>
        <desc>
          Line graph showing current temperature (orange) and target temperature (dashed yellow) over time.
          {pathData === '' ? ' No data available yet.' : ''}
        </desc>
        <defs>
          {/* Glow filter for current temp line */}
          <filter id={`${svgId}-tempGlow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Area gradient under temp line */}
          <linearGradient id={`${svgId}-areaGrad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ff6b35" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* ── Grid lines ─────────────────────────────────────────────── */}
        {yTicks.map((t, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={left}
              y1={t.y}
              x2={left + plotWidth}
              y2={t.y}
              stroke="#1e293b"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
            <text
              x={left - 8}
              y={t.y + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              {formatTemp(t.value)}
            </text>
          </g>
        ))}

        {/* ── Unit label ──────────────────────────────────────────────── */}
        <text
          x={left - 8}
          y={top + 4}
          textAnchor="end"
          fill="#6b7280"
          fontSize="8"
          fontFamily="JetBrains Mono, monospace"
        >
          {displayUnit}
        </text>

        {/* ── X-axis time labels ─────────────────────────────────────── */}
        {xLabels.map((l, i) => (
          <text
            key={`xlabel-${i}`}
            x={l.x}
            y={height - 6}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
          >
            {l.label}
          </text>
        ))}

        {/* ── Area fill under current temp ───────────────────────────── */}
        {areaData && (
          <path
            d={areaData}
            fill={`url(#${svgId}-areaGrad)`}
          />
        )}

        {/* ── Target temperature line (dim, dashed) ──────────────────── */}
        {targetPathData && (
          <path
            d={targetPathData}
            fill="none"
            stroke="#f9b33d"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeOpacity={0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* ── Current temperature line (bright, glowing) ─────────────── */}
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke="#ff6b35"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${svgId}-tempGlow)`}
          />
        )}
        {/* ── Empty state ──────────────────────────────────────── */}
        {pathData === '' && areaData === '' && targetPathData === '' && (
          <text
            x={NOMINAL_WIDTH / 2}
            y={height / 2}
            textAnchor="middle"
            fill="#64748b"
            fontSize="13"
            fontFamily="Inter, system-ui, sans-serif"
          >
            Waiting for temperature data…
          </text>
        )}
      </svg>
    </motion.div>
  );
});
