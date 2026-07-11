import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import clsx from 'clsx';
import Button from './Button';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Shows a MAX button that fills the input with onMax value */
  onMax?: () => void;
  /** Token symbol displayed inside the input */
  tokenSymbol?: string;
  /** Size variant */
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'min-h-[36px] px-3 text-sm',
  md: 'min-h-[44px] px-4 text-base',
  lg: 'min-h-[52px] px-5 text-lg',
} as const;

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      onMax,
      tokenSymbol,
      inputSize = 'md',
      className,
      id: externalId,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <input
            ref={ref}
            id={id}
            className={clsx(
              'w-full rounded-xl bg-bg-3 border transition-colors duration-200',
              'text-text-primary placeholder:text-text-muted',
              'font-mono tabular-nums',
              error
                ? 'border-error/50 focus:border-error'
                : 'border-border-default focus:border-brand',
              sizeStyles[inputSize],
              tokenSymbol && 'pr-20',
              onMax && !tokenSymbol && 'pr-16',
              className,
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            {...props}
          />

          {/* Right-side addon: MAX button + token symbol */}
          <div className="absolute right-2 flex items-center gap-1.5">
            {onMax && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onMax}
                className="!min-h-[28px] !px-2 text-xs font-bold text-brand hover:text-brand-hover"
                aria-label="Fill maximum amount"
              >
                MAX
              </Button>
            )}
            {tokenSymbol && (
              <span className="text-sm font-medium text-text-muted select-none">
                {tokenSymbol}
              </span>
            )}
          </div>
        </div>

        {error && (
          <p id={`${id}-error`} className="text-xs text-error" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${id}-helper`} className="text-xs text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
