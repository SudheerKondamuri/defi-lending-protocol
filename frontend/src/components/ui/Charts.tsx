import { useMemo, useState } from 'react';

// ── Shared Types ──────────────────────────────────────────────────────
interface ChartPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: ChartPoint[];
  height?: number;
  color?: string;
  prefix?: string;
  suffix?: string;
}

// ── 1. Ink-Line Area/Trend Chart ──────────────────────────────────────
export function AreaChart({
  data,
  height = 200,
  color = '#1B1A17',
  prefix = '',
  suffix = '',
}: AreaChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const stats = useMemo(() => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return { min, max, range };
  }, [data]);

  const points = useMemo(() => {
    const width = 500;
    const padding = 30;
    const activeWidth = width - padding * 2;
    const activeHeight = height - padding * 2;

    const coords = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * activeWidth;
      const pct = (d.value - stats.min) / stats.range;
      const y = padding + activeHeight - pct * activeHeight;
      return { x, y, ...d };
    });

    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

    return { coords, linePath, padding, activeWidth, activeHeight };
  }, [data, height, stats]);

  return (
    <div className="relative w-full">
      {/* Tooltip Overlay */}
      {hoveredIdx !== null && (
        <div
          className="absolute bg-paper-100 px-3 py-1.5 rounded text-xs pointer-events-none z-10 flex flex-col gap-0.5 border border-paper-200 shadow-sm"
          style={{
            left: `${(points.coords[hoveredIdx].x / 500) * 100}%`,
            top: `${(points.coords[hoveredIdx].y / height) * 100 - 55}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-ink-600 text-[10px] uppercase font-mono">
            {points.coords[hoveredIdx].label}
          </span>
          <span className="font-mono font-bold text-ink-900">
            {prefix}
            {points.coords[hoveredIdx].value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            {suffix}
          </span>
        </div>
      )}

      {/* SVG Ink-Line Container */}
      <svg
        viewBox={`0 0 500 ${height}`}
        className="w-full overflow-visible"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Hairline Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = points.padding + pct * points.activeHeight;
          return (
            <line
              key={i}
              x1={points.padding}
              y1={y}
              x2={500 - points.padding}
              y2={y}
              stroke="#E4DFD1"
              strokeDasharray="2 4"
              strokeWidth="1"
            />
          );
        })}

        {/* Quiet Ink Line */}
        {points.linePath && (
          <path
            d={points.linePath}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hover Hotspots & Ink Points */}
        {points.coords.map((c, i) => (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r="15"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
            />
            <circle
              cx={c.x}
              cy={c.y}
              r={hoveredIdx === i ? '4' : '2'}
              fill={hoveredIdx === i ? '#1F3B5C' : color}
              stroke="#F7F5EF"
              strokeWidth="1"
              className="pointer-events-none transition-all duration-150"
            />
          </g>
        ))}

        {/* X Axis Labels */}
        <text
          x={points.padding}
          y={height - 5}
          fill="#6B6558"
          fontSize="9"
          className="font-mono text-left"
        >
          {data[0]?.label}
        </text>
        <text
          x={500 - points.padding}
          y={height - 5}
          fill="#6B6558"
          fontSize="9"
          className="font-mono text-right"
          textAnchor="end"
        >
          {data[data.length - 1]?.label}
        </text>
      </svg>
    </div>
  );
}

// ── 2. Interest Rate Model Piecewise Kinked Curve ─────────────────────
interface RateCurveChartProps {
  kink?: number; // default 0.8 (80%)
  baseRate?: number; // default 2%
  rateAtKink?: number; // default 6%
  maxRate?: number; // default 50%
}

export function RateCurveChart({
  kink = 0.8,
  baseRate = 2.0,
  rateAtKink = 6.0,
  maxRate = 50.0,
}: RateCurveChartProps) {
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  // Generate curve coordinates
  const points = useMemo(() => {
    const width = 500;
    const height = 200;
    const padding = 30;
    const activeWidth = width - padding * 2;
    const activeHeight = height - padding * 2;

    const getBorrowRate = (util: number) => {
      if (util <= kink) {
        return baseRate + (util / kink) * (rateAtKink - baseRate);
      } else {
        return rateAtKink + ((util - kink) / (1.0 - kink)) * (maxRate - rateAtKink);
      }
    };

    const curvePoints: { x: number; y: number; u: number; rate: number }[] = [];
    for (let i = 0; i <= 100; i++) {
      const u = i / 100;
      const rate = getBorrowRate(u);
      const x = padding + u * activeWidth;
      const y = padding + activeHeight - (rate / maxRate) * activeHeight;
      curvePoints.push({ x, y, u, rate });
    }

    const path = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const kinkX = padding + kink * activeWidth;
    const kinkRate = getBorrowRate(kink);
    const kinkY = padding + activeHeight - (kinkRate / maxRate) * activeHeight;

    return { curvePoints, path, padding, activeWidth, activeHeight, kinkX, kinkY, height, getBorrowRate };
  }, [kink, baseRate, rateAtKink, maxRate]);

  const hoverDetails = useMemo(() => {
    if (hoverPct === null) return null;
    const rate = points.getBorrowRate(hoverPct);
    const x = points.padding + hoverPct * points.activeWidth;
    const y = points.padding + points.activeHeight - (rate / maxRate) * points.activeHeight;
    return { x, y, rate, util: hoverPct };
  }, [hoverPct, points, maxRate]);

  return (
    <div className="relative w-full">
      {/* Tooltip Overlay */}
      {hoverDetails && (
        <div
          className="absolute bg-paper-100 px-3 py-1.5 rounded text-xs pointer-events-none z-10 flex flex-col gap-0.5 border border-paper-200 shadow-sm"
          style={{
            left: `${(hoverDetails.x / 500) * 100}%`,
            top: `${(hoverDetails.y / points.height) * 100 - 55}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-[10px] text-ink-600 font-mono uppercase">
            Utilization: {(hoverDetails.util * 100).toFixed(0)}%
          </span>
          <span className="font-bold font-mono text-ink-900">
            Borrow APY: {hoverDetails.rate.toFixed(2)}%
          </span>
        </div>
      )}

      <svg
        viewBox="0 0 500 200"
        className="w-full overflow-visible cursor-crosshair"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clientX = e.clientX - rect.left;
          const u = Math.max(0, Math.min(1, (clientX - 30) / (rect.width * (440 / 500))));
          setHoverPct(u);
        }}
        onMouseLeave={() => setHoverPct(null)}
      >
        {/* Hairline Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = points.padding + pct * points.activeHeight;
          return (
            <line
              key={i}
              x1={points.padding}
              y1={y}
              x2={500 - points.padding}
              y2={y}
              stroke="#E4DFD1"
              strokeDasharray="2 4"
              strokeWidth="1"
            />
          );
        })}

        {/* Kink marker line (Muted Caution Ochre) */}
        <line
          x1={points.kinkX}
          y1={points.padding}
          x2={points.kinkX}
          y2={200 - points.padding}
          stroke="#B8860B"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* The Piecewise Ink Curve */}
        <path
          d={points.path}
          fill="none"
          stroke="#1F3B5C"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Kink point marker */}
        <circle cx={points.kinkX} cy={points.kinkY} r="4" fill="#B8860B" stroke="#F7F5EF" strokeWidth="1" />
        <text
          x={points.kinkX}
          y={points.kinkY - 8}
          fill="#B8860B"
          fontSize="7.5"
          fontWeight="600"
          textAnchor="middle"
          className="font-mono"
        >
          KINK ({kink * 100}%)
        </text>

        {/* Hover marker */}
        {hoverDetails && (
          <circle cx={hoverDetails.x} cy={hoverDetails.y} r="4.5" fill="#1F3B5C" stroke="#F7F5EF" strokeWidth="1.5" />
        )}

        {/* Axis Labels (IBM Plex Mono) */}
        <text x="30" y="195" fill="#6B6558" fontSize="8" className="font-mono">0% Util</text>
        <text x="470" y="195" fill="#6B6558" fontSize="8" textAnchor="end" className="font-mono">100% Util</text>
        <text x="25" y="35" fill="#6B6558" fontSize="8" className="font-mono">{maxRate}% APY</text>
        <text x="25" y="170" fill="#6B6558" fontSize="8" className="font-mono">{baseRate}% APY</text>
      </svg>
    </div>
  );
}

// ── 3. Ink-Outlined Bar Chart ─────────────────────────────────────────
interface BarChartProps {
  data: ChartPoint[];
  color?: string;
}

export function BarChart({ data, color = '#1F3B5C' }: BarChartProps) {
  const max = useMemo(() => {
    return Math.max(...data.map((d) => d.value)) || 1;
  }, [data]);

  return (
    <div className="flex h-48 items-end gap-3 px-2 pt-6">
      {data.map((d, i) => {
        const heightPct = `${(d.value / max) * 100}%`;
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center gap-2">
            {/* Tooltip */}
            <div className="absolute -top-9 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 bg-paper-100 border border-paper-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-ink-900 shadow-sm z-10">
              ${d.value.toLocaleString()}
            </div>

            {/* Outlined Bar with subtle paper fill */}
            <div
              className="w-full rounded-t border transition-all duration-200 group-hover:opacity-80"
              style={{
                height: heightPct,
                backgroundColor: '#EFEBE0',
                borderColor: color,
                borderWidth: '1.5px',
              }}
            />

            {/* Label */}
            <span className="text-[10px] text-ink-600 font-mono truncate max-w-full">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
