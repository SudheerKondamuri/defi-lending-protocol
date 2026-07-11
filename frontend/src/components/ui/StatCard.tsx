import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  /** Optional sub-value or change indicator (e.g. "+2.4%") */
  change?: string;
  /** Whether the change is positive (green), negative (red), or neutral */
  changeType?: 'positive' | 'negative' | 'neutral';
  className?: string;
  /** Index for stagger animation */
  index?: number;
}

export default function StatCard({
  icon,
  label,
  value,
  change,
  changeType = 'neutral',
  className,
  index = 0,
}: StatCardProps) {
  const changeColors = {
    positive: 'text-success',
    negative: 'text-error',
    neutral: 'text-text-muted',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={clsx('glass-card-hover p-5', className)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-text-primary">
            {value}
          </p>
          {change && (
            <p className={clsx('text-xs font-medium', changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-brand-subtle p-2.5 text-brand" aria-hidden="true">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
