import type { ReactNode } from 'react';
import clsx from 'clsx';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  /** Optional leading dot indicator */
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-safe/10 text-safe border-safe/25',
  warning: 'bg-caution/10 text-caution border-caution/25',
  error: 'bg-danger/10 text-danger border-danger/25',
  info: 'bg-info/10 text-info border-info/25',
  neutral: 'bg-paper-100 text-ink-600 border-paper-200',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-safe',
  warning: 'bg-caution',
  error: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-ink-600',
};

export default function Badge({ variant = 'neutral', children, className, dot }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5',
        'text-[11px] font-mono font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 rounded-full', dotStyles[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
