import { formatUnits } from 'viem';

export const BLOCKS_PER_YEAR = 2_628_000n; // ~12s per block (365.25 days)

/**
 * Format a 18-decimal (or custom decimal) bigint USD value to currency string.
 * @param value BigInt in specified decimals or undefined
 * @param decimals Decimals of the value (defaults to 18)
 * @returns Formatted USD string e.g. "$1,234.56"
 */
export function formatUSD(value: bigint | undefined, decimals = 18): string {
  if (value === undefined) return '$0.00';
  const num = parseFloat(formatUnits(value, decimals));
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format token amounts for clean display without trailing zeros or scientific notation.
 * @param value BigInt in specified token decimals
 * @param decimals Token decimals (defaults to 18)
 * @param maxDecimals Max decimal places to keep (defaults to 4)
 * @returns Clean numeric string e.g. "1.2345"
 */
export function formatTokenAmount(
  value: bigint | undefined,
  decimals = 18,
  maxDecimals = 4,
): string {
  if (value === undefined || value === 0n) return '0';
  const formatted = formatUnits(value, decimals);
  const [intPart, decPart] = formatted.split('.');
  if (!decPart) return intPart;
  const trimmed = decPart.slice(0, maxDecimals).replace(/0+$/, '');
  return trimmed ? `${intPart}.${trimmed}` : intPart;
}

/**
 * Calculate compounding APY from a per-block interest rate in 18 decimals.
 * Formula: APY = (1 + ratePerBlock)^BLOCKS_PER_YEAR - 1
 * @param ratePerBlock Per-block interest rate scaled by 1e18
 * @returns Formatted percentage string e.g. "4.25%"
 */
export function formatAPY(ratePerBlock: bigint | undefined): string {
  if (ratePerBlock === undefined || ratePerBlock === 0n) return '0.00%';
  const rateNum = Number(ratePerBlock) / 1e18;
  const blocks = Number(BLOCKS_PER_YEAR);
  // (1 + rate)^blocks - 1
  // For standard rates, Math.pow or Math.expm1 provides accurate compounding
  const apy = Math.pow(1 + rateNum, blocks) - 1;
  if (!isFinite(apy) || apy < 0) return '0.00%';
  return `${(apy * 100).toFixed(2)}%`;
}

/**
 * Calculate numeric APY value as a percentage number (e.g. 4.25 for 4.25%).
 */
export function calculateAPYNumber(ratePerBlock: bigint | undefined): number {
  if (ratePerBlock === undefined || ratePerBlock === 0n) return 0;
  const rateNum = Number(ratePerBlock) / 1e18;
  const blocks = Number(BLOCKS_PER_YEAR);
  const apy = Math.pow(1 + rateNum, blocks) - 1;
  return isFinite(apy) && apy > 0 ? apy * 100 : 0;
}
