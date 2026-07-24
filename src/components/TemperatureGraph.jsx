import React, { useMemo } from 'react';
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

// ── Temperature tick generator ───────────────────────────────────────────
function niceMax(value) {
  if (value <= 0) return 450;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function generateTicks(yMax) {
  const nice = niceMax(yMax);
  const step = nice <= 100 ? 10 : nice <= 200 ? 20 : nice <= 500 ? 50 : 100;
  const ticks = [];
  for (let v = 0; v <= nice; v += step) {
    ticks.push(v);
  }
  // always include 0 and max
  if (ticks[ticks.length - 1] < nice) ticks.push(nice);
  if (ticks[0] !== 0) ticks.unshift(0);
  return { ticks, max: nice };
}

// ── Time label helpers ───────────────────────────────────────────────────
function formatTimeLabel(secondsAgo) {
  if (secondsAgo === 0) return 'now';
  const m = Math.floor(secondsAgo / 60);
  const s = secondsAgo % 60;
  if (m === 0 && s > 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

// ── Component ────────────────────────────────────────────────────────────
export default function TemperatureGraph({
  history = [],
  windowSeconds = 300, // 5 minutes
  height = 200,
}) {
  const svgWidth = '100%';

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
    areaBottomRef,
  } = useMemo(() => {
    const padding = { top: 16, right: 16, bottom: 28, left: 48 };
    const pTop = padding.top;
    const pRight = padding.right;
    const pBottom = padding.bottom;
    const pLeft = padding.left;

    // We don't know the exact pixel width yet (responsive), but we compute
    // proportional positions using a nominal width. The SVG viewBox and
    // preserveAspectRatio handle the rest.
    const nomWidth = 600;
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
    const dataMax = allTemps.length > 0 ? Math.max(...allTemps, 0) : 0;
    const { ticks: yTickValues, max: computedMax } = generateTicks(dataMax || 450);
    const finalMax = Math.max(computedMax, dataMax, 1); // never divide by zero
    const yScale = (v) => pTop + plotH - (v / finalMax) * plotH;

    // ── X scale ────────────────────────────────────────────────────────
    const timeEnd = sorted.length > 0 ? sorted[sorted.length - 1].timestamp : now;
    const timeStart = timeEnd - windowSeconds * 1000;
    const xScale = (t) => pLeft + ((t - timeStart) / (timeEnd - timeStart)) * plotW;

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
    const stepSec = totalSec / 5; // 6 labels (including now)
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
      areaBottomRef: yScale(0),
    };
  }, [history, windowSeconds, height]);

  // Compute SVG viewBox from nominal dimensions
  const nomWidth = 600;

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <svg
        viewBox={`0 0 ${nomWidth} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow filter for current temp line */}
          <filter id="tempGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Area gradient under temp line */}
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
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
              {t.value}
            </text>
          </g>
        ))}

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
            fill="url(#areaGrad)"
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
            filter="url(#tempGlow)"
          />
        )}
      </svg>
    </motion.div>
  );
}
