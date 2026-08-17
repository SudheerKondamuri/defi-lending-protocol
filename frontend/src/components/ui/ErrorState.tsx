import { AlertCircle, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import Button from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  actionText?: string;
  variant?: 'inline' | 'card' | 'page';
  icon?: ReactNode;
  className?: string;
}

export default function ErrorState({
  title = 'Failed to load data',
  description = 'There was an error communicating with the network or smart contract.',
  onRetry,
  actionText = 'Retry',
  variant = 'card',
  icon,
  className,
}: ErrorStateProps) {
  if (variant === 'inline') {
    return (
      <div
        className={clsx(
          'flex items-center justify-between gap-3 p-3 rounded-md bg-danger/8 border border-danger/25 text-xs text-danger',
          className,
        )}
        role="alert"
      >
        <div className="flex items-center gap-2">
          {icon ?? <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />}
          <span>{description || title}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 font-semibold text-danger hover:underline cursor-pointer select-none"
            aria-label={actionText}
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            {actionText}
          </button>
        )}
      </div>
    );
  }

  if (variant === 'page') {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center text-center p-8 paper-card border-danger/30 my-6 space-y-3 max-w-md mx-auto',
          className,
        )}
        role="alert"
      >
        <div className="rounded-md bg-danger/10 border border-danger/25 p-3 text-danger">
          {icon ?? <AlertCircle className="h-6 w-6" aria-hidden="true" />}
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <p className="text-xs text-ink-600">{description}</p>
        </div>
        {onRetry && (
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={onRetry}
            className="mt-2"
          >
            {actionText}
          </Button>
        )}
      </div>
    );
  }

  // 'card' variant default
  return (
    <div
      className={clsx(
        'paper-card p-5 border-danger/25 flex flex-col items-center justify-center text-center space-y-2',
        className,
      )}
      role="alert"
    >
      <div className="rounded-md bg-danger/10 p-2 text-danger">
        {icon ?? <AlertCircle className="h-4 w-4" aria-hidden="true" />}
      </div>
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold text-ink-900">{title}</h3>
        <p className="text-[11px] text-ink-600 max-w-xs">{description}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="h-3 w-3" />}
          onClick={onRetry}
          className="text-xs mt-1"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
}
