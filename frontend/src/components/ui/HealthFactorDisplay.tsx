import { useMemo } from 'react';
import clsx from 'clsx';
import { formatUnits } from 'viem';
import { type HealthStatus, getHealthStatus } from '../../utils/healthFactor';

interface HealthFactorDisplayProps {
  /** Raw health factor from contract (18 decimals bigint) or undefined if loading */
  healthFactor?: bigint;
  /** Show compact inline version */
  compact?: boolean;
  className?: string;
}

const statusConfig: Record<
  HealthStatus,
  { color: string; label: string; strokeColor: string; description: string }
> = {
  safe: {
    color: 'text-safe',
    strokeColor: '#3A6B4A',
    label: 'Solvent & Safe',
    description: 'Collateral position comfortably exceeds liquidation threshold (HF ≥ 1.50).',
  },
  warning: {
    color: 'text-caution',
    strokeColor: '#B8860B',
    label: 'Caution (Approaching Kink)',
    description: 'Position is approaching liquidation risk (1.00 ≤ HF < 1.50). Consider adding collateral.',
  },
  critical: {
    color: 'text-danger',
    strokeColor: '#A23B2E',
    label: 'Liquidation Risk',
    description: 'Undercollateralized (HF < 1.00). Position is subject to immediate third-party liquidation.',
  },
  unknown: {
    color: 'text-ink-600',
    strokeColor: '#9E988A',
    label: 'No Active Loan',
    description: 'No active debt liabilities recorded against collateral.',
  },
};

export default function HealthFactorDisplay({
  healthFactor,
  compact = false,
  className,
}: HealthFactorDisplayProps) {
  const { displayValue, numericValue, status } = useMemo(() => {
    if (healthFactor === undefined) {
      return { displayValue: '—', numericValue: 0, status: 'unknown' as HealthStatus };
    }

    // type(uint256).max indicates no borrows / infinite health
    if (healthFactor >= BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')) {
      return { displayValue: '∞', numericValue: 3.5, status: 'safe' as HealthStatus };
    }

    const formatted = parseFloat(formatUnits(healthFactor, 18));
    return {
      displayValue: formatted >= 100 ? '99.99+' : formatted.toFixed(2),
      numericValue: formatted,
      status: getHealthStatus(formatted),
    };
  }, [healthFactor]);

  const config = statusConfig[status];

  if (compact) {
    return (
      <span
        className={clsx('inline-flex items-center gap-1.5 font-mono text-xs', config.color, className)}
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.strokeColor }} />
        <span className="font-bold tabular-nums">HF: {displayValue}</span>
        <span className="text-ink-600">[{config.label}]</span>
      </span>
    );
  }

  // Dial Arc Calculations
  // Semicircle from angle 180° to 360° (or -180° to 0°)
  // Radius = 65, Center = (100, 80)
  const radius = 60;
  const cx = 100;
  const cy = 75;

  // Map HF (0 to 3.0) to angle across 180° arc: 0 -> -180°, 3.0 -> 0°
  const clampedHF = Math.min(Math.max(numericValue, 0), 3.0);
  const normalizedFraction = clampedHF / 3.0; // 0 to 1
  const needleAngle = Math.PI - normalizedFraction * Math.PI; // from PI to 0
  const needleX = cx + radius * Math.cos(needleAngle);
  const needleY = cy - radius * Math.sin(needleAngle);

  // Tick markers
  // HF = 1.0 (Liquidation threshold) -> fraction = 1/3 (angle = 2PI/3)
  const kink1X = cx + radius * Math.cos(Math.PI - (1 / 3) * Math.PI);
  const kink1Y = cy - radius * Math.sin(Math.PI - (1 / 3) * Math.PI);
  // HF = 1.5 (Safe threshold) -> fraction = 1.5/3 = 0.5 (angle = PI/2)
  const kink2X = cx + radius * Math.cos(Math.PI - 0.5 * Math.PI);
  const kink2Y = cy - radius * Math.sin(Math.PI - 0.5 * Math.PI);

  return (
    <div
      className={clsx('space-y-3', className)}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex flex-col items-center justify-center pt-2">
        {/* The Hand-Instrument SVG Ink Dial */}
        <div className="w-52 h-28 relative">
          <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
            {/* Background Arc Track (Thin ink stroke) */}
            <path
              d="M 40 75 A 60 60 0 0 1 160 75"
              fill="none"
              stroke="#E4DFD1"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Danger Zone Segment: HF 0.0 to 1.0 (Angle: 180° to 120°) */}
            <path
              d={`M 40 75 A 60 60 0 0 1 ${kink1X} ${kink1Y}`}
              fill="none"
              stroke="#A23B2E"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Caution Zone Segment: HF 1.0 to 1.5 (Angle: 120° to 90°) */}
            <path
              d={`M ${kink1X} ${kink1Y} A 60 60 0 0 1 ${kink2X} ${kink2Y}`}
              fill="none"
              stroke="#B8860B"
              strokeWidth="2.5"
            />

            {/* Safe Zone Segment: HF 1.5 to 3.0 (Angle: 90° to 0°) */}
            <path
              d={`M ${kink2X} ${kink2Y} A 60 60 0 0 1 160 75`}
              fill="none"
              stroke="#3A6B4A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Threshold Ticks */}
            <line x1={cx - 5} y1={cy - radius} x2={cx + 5} y2={cy - radius} stroke="#1B1A17" strokeWidth="1" />
            <text x={cx} y={cy - radius - 6} fill="#6B6558" fontSize="7" textAnchor="middle" className="font-mono">
              1.5 (SAFE)
            </text>

            <text x="35" y="90" fill="#A23B2E" fontSize="7" className="font-mono">
              0.0 (RISK)
            </text>
            <text x="165" y="90" fill="#3A6B4A" fontSize="7" textAnchor="end" className="font-mono">
              3.0+ (SOLVENT)
            </text>

            {/* Hand-drawn Needle Indicator */}
            {status !== 'unknown' && (
              <g>
                <line
                  x1={cx}
                  y1={cy}
                  x2={needleX}
                  y2={needleY}
                  stroke="#1B1A17"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx={needleX} cy={needleY} r="3.5" fill={config.strokeColor} stroke="#F7F5EF" strokeWidth="1" />
                <circle cx={cx} cy={cy} r="2.5" fill="#1B1A17" />
              </g>
            )}

            {/* Value in Center */}
            <text
              x={cx}
              y={cy - 12}
              textAnchor="middle"
              className="font-mono font-bold"
              fill="#1B1A17"
              fontSize="20"
            >
              {displayValue}
            </text>
            <text
              x={cx}
              y={cy + 2}
              textAnchor="middle"
              className="font-mono uppercase"
              fill={config.strokeColor}
              fontSize="7.5"
              fontWeight="600"
            >
              {config.label}
            </text>
          </svg>
        </div>

        <p className="text-[11px] text-ink-600 text-center max-w-xs mt-1 leading-relaxed">
          {config.description}
        </p>
      </div>
    </div>
  );
}
