import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Disables the fade-in entrance animation */
  noAnimation?: boolean;
  /** Extra hover effect */
  hoverable?: boolean;
}

export default function Card({
  children,
  header,
  footer,
  className,
  noAnimation = false,
  hoverable = false,
}: CardProps) {
  const Wrapper = (noAnimation ? 'div' : motion.div) as any;

  const animationProps = noAnimation
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const },
      };

  return (
    <Wrapper
      className={clsx(
        hoverable ? 'paper-card-hover' : 'paper-card',
        'p-5',
        className,
      )}
      {...animationProps}
    >
      {header && (
        <div className="mb-4 pb-3 border-b border-paper-200">
          {header}
        </div>
      )}
      {children}
      {footer && (
        <div className="mt-4 pt-3 border-t border-paper-200">
          {footer}
        </div>
      )}
    </Wrapper>
  );
}
