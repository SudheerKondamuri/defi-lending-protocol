import clsx from 'clsx';
import wethSvg from '../../assets/tokens/weth.svg';
import usdcSvg from '../../assets/tokens/usdc.svg';

interface TokenIconProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 w-5 text-[9px]',
  md: 'h-6 w-6 text-[10px]',
  lg: 'h-8 w-8 text-xs',
  xl: 'h-10 w-10 text-sm',
};

const tokenSvgs: Record<string, string> = {
  weth: wethSvg,
  eth: wethSvg,
  usdc: usdcSvg,
};

export default function TokenIcon({ symbol, size = 'md', className }: TokenIconProps) {
  const normalizedSymbol = symbol.toLowerCase().replace(/^w/, '');
  const svgSrc = tokenSvgs[symbol.toLowerCase()] || tokenSvgs[normalizedSymbol];

  if (svgSrc) {
    return (
      <img
        src={svgSrc}
        alt={`${symbol} token`}
        className={clsx('rounded-full object-contain shrink-0 select-none border border-paper-200', sizeClasses[size], className)}
        aria-hidden="true"
      />
    );
  }

  // Fallback disc with muted saturation
  const initials = symbol.slice(0, 3).toUpperCase();
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = (hash * 137) % 360;

  return (
    <div
      style={{ backgroundColor: `hsl(${hue}, 35%, 45%)` }}
      className={clsx(
        'rounded-full flex items-center justify-center font-mono font-bold text-white shrink-0 select-none',
        sizeClasses[size],
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
