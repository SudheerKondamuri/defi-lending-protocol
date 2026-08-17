import { Inbox } from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import Button from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionText,
  onAction,
  actionIcon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'paper-card p-10 flex flex-col items-center justify-center text-center space-y-3',
        className,
      )}
    >
      <div className="rounded-md bg-paper-100 border border-paper-200 p-3 text-ink-600">
        {icon ?? <Inbox className="h-6 w-6 text-ink-600" aria-hidden="true" />}
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        <p className="text-xs text-ink-600 leading-relaxed">{description}</p>
      </div>
      {actionText && onAction && (
        <Button
          variant="primary"
          size="sm"
          onClick={onAction}
          icon={actionIcon}
          className="text-xs mt-2"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
}
