import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-signal text-white hover:bg-signal-hover active:bg-[#162B44] border border-signal',
  secondary:
    'bg-paper-100 text-ink-900 border border-paper-200 hover:bg-paper-200 active:bg-paper-300',
  danger:
    'bg-danger/10 text-danger border border-danger/25 hover:bg-danger/15 active:bg-danger/20',
  ghost:
    'text-ink-600 hover:text-ink-900 hover:bg-paper-100 active:bg-paper-200',
};

const sizeStyles: Record<Size, string> = {
  sm: 'min-h-[34px] px-3 text-xs gap-1.5 rounded-md font-medium',
  md: 'min-h-[40px] px-4 text-xs gap-2 rounded-md font-semibold',
  lg: 'min-h-[46px] px-5 text-sm gap-2.5 rounded-md font-semibold',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref as any}
        whileHover={isDisabled ? undefined : { scale: 1.01 }}
        whileTap={isDisabled ? undefined : { scale: 0.99 }}
        transition={{ duration: 0.1 }}
        className={clsx(
          'inline-flex items-center justify-center cursor-pointer select-none',
          'transition-colors duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={isDisabled}
        {...(props as any)}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : icon ? (
          <span className="shrink-0" aria-hidden="true">{icon}</span>
        ) : null}
        {children}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
