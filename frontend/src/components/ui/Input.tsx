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
  sm: 'min-h-[34px] px-3 text-xs',
  md: 'min-h-[40px] px-3.5 text-sm',
  lg: 'min-h-[46px] px-4 text-base',
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
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-medium text-ink-600"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <input
            ref={ref}
            id={id}
            className={clsx(
              'w-full rounded-md bg-paper-100 border transition-colors duration-150',
              'text-ink-900 placeholder:text-ink-400',
              'font-mono tabular-nums',
              error
                ? 'border-danger focus:border-danger'
                : 'border-paper-200 focus:border-signal',
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
                className="!min-h-[26px] !px-1.5 text-[11px] font-bold text-signal hover:text-signal-hover !bg-paper-200/60"
                aria-label="Fill maximum amount"
              >
                MAX
              </Button>
            )}
            {tokenSymbol && (
              <span className="text-xs font-mono font-medium text-ink-600 select-none">
                {tokenSymbol}
              </span>
            )}
          </div>
        </div>

        {error && (
          <p id={`${id}-error`} className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${id}-helper`} className="text-[11px] text-ink-600">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
