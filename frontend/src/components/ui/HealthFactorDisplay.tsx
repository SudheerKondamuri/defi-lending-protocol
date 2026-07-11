import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { formatUnits } from 'viem';

interface HealthFactorDisplayProps {
  /** Raw health factor from contract (18 decimals bigint) or undefined if loading */
  healthFactor?: bigint;
  /** Show compact inline version */
  compact?: boolean;
  className?: string;
}

type HealthStatus = 'safe' | 'warning' | 'critical' | 'unknown';

function getHealthStatus(value: number): HealthStatus {
  if (value >= 1.5) return 'safe';
  if (value >= 1.0) return 'warning';
  return 'critical';
}

const statusConfig: Record<
  HealthStatus,
  { color: string; bgColor: string; icon: typeof Shield; label: string; barColor: string }
> = {
  safe: {
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: Shield,
    label: 'Healthy',
    barColor: 'bg-success',
  },
  warning: {
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    icon: AlertTriangle,
    label: 'At Risk',
    barColor: 'bg-warning',
  },
  critical: {
    color: 'text-error',
    bgColor: 'bg-error/10',
    icon: XCircle,
    label: 'Liquidation Risk',
    barColor: 'bg-error',
  },
  unknown: {
    color: 'text-text-muted',
    bgColor: 'bg-white/5',
    icon: Shield,
    label: 'No Position',
    barColor: 'bg-text-muted',
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
      return { displayValue: '∞', numericValue: 999, status: 'safe' as HealthStatus };
    }

    const formatted = parseFloat(formatUnits(healthFactor, 18));
    return {
      displayValue: formatted >= 100 ? '99.99+' : formatted.toFixed(2),
      numericValue: formatted,
      status: getHealthStatus(formatted),
    };
  }, [healthFactor]);

  const config = statusConfig[status];
  const Icon = config.icon;

  // Gauge fill: maps health factor to 0-100% bar width (capped at HF=3)
  const gaugePercent = Math.min(Math.max((numericValue / 3) * 100, 0), 100);

  if (compact) {
    return (
      <span className={clsx('inline-flex items-center gap-1.5', config.color, className)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="font-mono font-bold tabular-nums">{displayValue}</span>
      </span>
    );
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Numeric display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx('rounded-lg p-2', config.bgColor)}>
            <Icon className={clsx('h-5 w-5', config.color)} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Health Factor</p>
            <p className={clsx('text-2xl font-bold font-mono tabular-nums', config.color)}>
              {displayValue}
            </p>
          </div>
        </div>
        <span
          className={clsx(
            'rounded-full px-2.5 py-1 text-xs font-medium',
            config.bgColor,
            config.color,
          )}
        >
          {config.label}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="h-2 w-full rounded-full bg-bg-4 overflow-hidden" role="progressbar"
        aria-valuenow={numericValue}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label={`Health factor: ${displayValue}`}
      >
        <motion.div
          className={clsx('h-full rounded-full', config.barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${gaugePercent}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {/* Warning text */}
      {status === 'warning' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-warning"
        >
          Your position is approaching liquidation. Consider repaying some debt or adding collateral.
        </motion.p>
      )}
      {status === 'critical' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-error animate-pulse"
        >
          Critical: Your position can be liquidated. Repay debt immediately or add collateral.
        </motion.p>
      )}
    </div>
  );
}
