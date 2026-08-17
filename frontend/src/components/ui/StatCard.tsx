import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LedgerRowProps {
  label: string;
  value: string | ReactNode;
  subValue?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  loading?: boolean;
  className?: string;
}

export function LedgerRow({
  label,
  value,
  subValue,
  change,
  changeType = 'neutral',
  loading = false,
  className,
}: LedgerRowProps) {
  const changeColors = {
    positive: 'text-safe',
    negative: 'text-danger',
    neutral: 'text-ink-600',
  };

  return (
    <div className={clsx('flex items-baseline py-2.5 text-sm', className)}>
      <span className="text-xs uppercase font-medium tracking-wider text-ink-600 shrink-0">
        {label}
      </span>
      <span className="ledger-leader" aria-hidden="true" />
      <div className="flex items-baseline gap-2 shrink-0 font-mono">
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <span>Loading...</span>
          </span>
        ) : (
          <>
            <span className="font-bold text-ink-900 tabular-nums">{value}</span>
            {subValue && <span className="text-xs text-ink-600">{subValue}</span>}
            {change && (
              <span className={clsx('text-xs font-medium ml-1', changeColors[changeType])}>
                {change}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface LedgerGroupProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function LedgerGroup({ title, subtitle, children, className }: LedgerGroupProps) {
  return (
    <div className={clsx('paper-card p-5 space-y-2', className)}>
      {title && (
        <div className="border-b border-paper-200 pb-2 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-600 font-mono">
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-ink-600 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="divide-y divide-paper-200/60">{children}</div>
    </div>
  );
}

/**
 * Backward compatibility component for any direct StatCard usage.
 * Renders as a crisp ledger card.
 */
interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  className?: string;
  index?: number;
  loading?: boolean;
}

export default function StatCard({
  label,
  value,
  change,
  changeType = 'neutral',
  className,
  loading = false,
}: StatCardProps) {
  const changeColors = {
    positive: 'text-safe',
    negative: 'text-danger',
    neutral: 'text-ink-600',
  };

  return (
    <div className={clsx('paper-card p-4 space-y-1', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-600 font-mono">
        {label}
      </p>
      {loading ? (
        <div className="flex items-center gap-1.5 py-1">
          <Loader2 className="h-4 w-4 animate-spin text-ink-600" aria-hidden="true" />
          <span className="text-xs font-mono text-ink-600">Loading...</span>
        </div>
      ) : (
        <p className="text-2xl font-bold font-mono tabular-nums text-ink-900">
          {value}
        </p>
      )}
      {change && !loading && (
        <p className={clsx('text-xs font-medium font-mono', changeColors[changeType])}>
          {change}
        </p>
      )}
    </div>
  );
}
