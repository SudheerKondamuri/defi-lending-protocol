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

// ── 1. Area Chart Component ───────────────────────────────────────────
export function AreaChart({
  data,
  height = 200,
  color = '#8251EE',
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
    const areaPath = coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`
      : '';

    return { coords, linePath, areaPath, padding, activeWidth, activeHeight };
  }, [data, height, stats]);

  return (
    <div className="relative w-full">
      {/* Tooltip Overlay */}
      {hoveredIdx !== null && (
        <div
          className="absolute glass px-3 py-1.5 rounded-lg text-xs pointer-events-none z-10 flex flex-col gap-0.5 border border-brand/20 shadow-lg shadow-black/40"
          style={{
            left: `${(points.coords[hoveredIdx].x / 500) * 100}%`,
            top: `${(points.coords[hoveredIdx].y / height) * 100 - 60}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-text-muted text-[10px] uppercase font-semibold">
            {points.coords[hoveredIdx].label}
          </span>
          <span className="font-mono font-bold text-text-primary">
            {prefix}
            {points.coords[hoveredIdx].value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            {suffix}
          </span>
        </div>
      )}

      {/* SVG Container */}
      <svg
        viewBox={`0 0 500 ${height}`}
        className="w-full overflow-visible"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = points.padding + pct * points.activeHeight;
          return (
            <line
              key={i}
              x1={points.padding}
              y1={y}
              x2={500 - points.padding}
              y2={y}
              stroke="var(--color-border-subtle)"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Paths */}
        {points.areaPath && (
          <path d={points.areaPath} fill="url(#areaGrad)" />
        )}
        {points.linePath && (
          <path
            d={points.linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hover Hotspots & Circles */}
        {points.coords.map((c, i) => (
          <g key={i}>
            {/* Invisibly large hover trigger circles */}
            <circle
              cx={c.x}
              cy={c.y}
              r="15"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
            />
            {/* The actual dot visible on hover */}
            <circle
              cx={c.x}
              cy={c.y}
              r={hoveredIdx === i ? '5' : '2'}
              fill={color}
              stroke={hoveredIdx === i ? 'rgba(255,255,255,0.8)' : 'transparent'}
              strokeWidth="1.5"
              className="pointer-events-none transition-all duration-150"
            />
          </g>
        ))}

        {/* X Axis Labels */}
        <text
          x={points.padding}
          y={height - 5}
          fill="var(--color-text-muted)"
          fontSize="10"
          className="font-mono text-left"
        >
          {data[0]?.label}
        </text>
        <text
          x={500 - points.padding}
          y={height - 5}
          fill="var(--color-text-muted)"
          fontSize="10"
          className="font-mono text-right"
          textAnchor="end"
        >
          {data[data.length - 1]?.label}
        </text>
      </svg>
    </div>
  );
}

// ── 2. Interest Rate Model Kinked Curve ──────────────────────────────
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

    // Generate 100 resolution points
    const curvePoints: { x: number; y: number; u: number; rate: number }[] = [];
    for (let i = 0; i <= 100; i++) {
      const u = i / 100;
      const rate = getBorrowRate(u);
      const x = padding + u * activeWidth;
      const y = padding + activeHeight - (rate / maxRate) * activeHeight;
      curvePoints.push({ x, y, u, rate });
    }

    const path = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Kink position
    const kinkX = padding + kink * activeWidth;
    const kinkRate = getBorrowRate(kink);
    const kinkY = padding + activeHeight - (kinkRate / maxRate) * activeHeight;

    return { curvePoints, path, padding, activeWidth, activeHeight, kinkX, kinkY, height, getBorrowRate };
  }, [kink, baseRate, rateAtKink, maxRate]);

  // Derived values for hover
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
          className="absolute glass px-3 py-1.5 rounded-lg text-xs pointer-events-none z-10 flex flex-col gap-0.5 border border-brand/20 shadow-lg"
          style={{
            left: `${(hoverDetails.x / 500) * 100}%`,
            top: `${(hoverDetails.y / points.height) * 100 - 60}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-[10px] text-text-muted font-mono uppercase">
            Utilization: {(hoverDetails.util * 100).toFixed(0)}%
          </span>
          <span className="font-bold font-mono text-brand">
            Borrow APY: {hoverDetails.rate.toFixed(2)}%
          </span>
        </div>
      )}

      <svg
        viewBox="0 0 500 200"
        className="w-full overflow-visible"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clientX = e.clientX - rect.left;
          const u = Math.max(0, Math.min(1, (clientX - 30) / (rect.width * (440 / 500))));
          setHoverPct(u);
        }}
        onMouseLeave={() => setHoverPct(null)}
      >
        {/* Grids */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = points.padding + pct * points.activeHeight;
          return (
            <line
              key={i}
              x1={points.padding}
              y1={y}
              x2={500 - points.padding}
              y2={y}
              stroke="var(--color-border-subtle)"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Kink line marker */}
        <line
          x1={points.kinkX}
          y1={points.padding}
          x2={points.kinkX}
          y2={200 - points.padding}
          stroke="rgba(130, 81, 238, 0.2)"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />

        {/* The Rate Curve line */}
        <path
          d={points.path}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Kink dot */}
        <circle cx={points.kinkX} cy={points.kinkY} r="5" fill="#EF4444" />
        <text
          x={points.kinkX}
          y={points.kinkY - 10}
          fill="#EF4444"
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
          className="font-mono"
        >
          KINK ({kink * 100}%)
        </text>

        {/* Hover dot */}
        {hoverDetails && (
          <circle cx={hoverDetails.x} cy={hoverDetails.y} r="6" fill="var(--color-brand)" stroke="#FFF" strokeWidth="1.5" />
        )}

        {/* X and Y labels */}
        <text x="30" y="195" fill="var(--color-text-muted)" fontSize="9" className="font-mono">0% Util</text>
        <text x="470" y="195" fill="var(--color-text-muted)" fontSize="9" textAnchor="end" className="font-mono">100% Util</text>
        <text x="25" y="35" fill="var(--color-text-muted)" fontSize="9" className="font-mono">{maxRate}% APY</text>
        <text x="25" y="170" fill="var(--color-text-muted)" fontSize="9" className="font-mono">{baseRate}% APY</text>
      </svg>
    </div>
  );
}

// ── 3. Vertical Bar Chart ─────────────────────────────────────────────
interface BarChartProps {
  data: ChartPoint[];
  color?: string;
}

export function BarChart({ data, color = '#3B82F6' }: BarChartProps) {
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
            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 glass px-2 py-1 rounded text-[10px] font-mono font-bold z-10">
              {d.value.toLocaleString()}
            </div>

            {/* Bar */}
            <div
              className="w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110"
              style={{
                height: heightPct,
                backgroundColor: color,
                boxShadow: `0 0 12px ${color}1A`,
              }}
            />

            {/* Label */}
            <span className="text-[10px] text-text-muted font-mono truncate max-w-full">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
