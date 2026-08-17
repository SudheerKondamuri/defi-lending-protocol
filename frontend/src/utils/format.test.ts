import { describe, it, expect } from 'vitest';
import { parseUnits } from 'viem';
import { formatUSD, formatTokenAmount, formatAPY, calculateAPYNumber } from './format';

describe('formatUSD', () => {
  it('returns $0.00 for undefined input', () => {
    expect(formatUSD(undefined)).toBe('$0.00');
  });

  it('returns $0.00 for 0n input', () => {
    expect(formatUSD(0n)).toBe('$0.00');
  });

  it('formats standard 18-decimal USD amounts accurately', () => {
    const oneHundredDollars = parseUnits('100.50', 18);
    expect(formatUSD(oneHundredDollars, 18)).toBe('$100.50');
  });

  it('formats thousands with commas', () => {
    const fiveThousand = parseUnits('5432.10', 18);
    expect(formatUSD(fiveThousand, 18)).toBe('$5,432.10');
  });

  it('formats 6-decimal values (e.g. USDC)', () => {
    const usdcAmount = parseUnits('250.75', 6);
    expect(formatUSD(usdcAmount, 6)).toBe('$250.75');
  });

  it('handles large billion-dollar values correctly', () => {
    const oneBillion = parseUnits('1000000000.00', 18);
    expect(formatUSD(oneBillion, 18)).toBe('$1,000,000,000.00');
  });
});

describe('formatTokenAmount', () => {
  it('returns "0" for undefined or 0n', () => {
    expect(formatTokenAmount(undefined)).toBe('0');
    expect(formatTokenAmount(0n)).toBe('0');
  });

  it('formats 18-decimal amounts without unnecessary trailing zeros', () => {
    const val = parseUnits('1.5', 18);
    expect(formatTokenAmount(val, 18)).toBe('1.5');
  });

  it('formats 6-decimal USDC amounts correctly', () => {
    const usdc = parseUnits('100.25', 6);
    expect(formatTokenAmount(usdc, 6)).toBe('100.25');
  });

  it('trims to maxDecimals without rounding errors', () => {
    const val = parseUnits('1.23456789', 18);
    expect(formatTokenAmount(val, 18, 4)).toBe('1.2345');
  });
});

describe('formatAPY & calculateAPYNumber', () => {
  it('returns "0.00%" and 0 for undefined or 0n rate', () => {
    expect(formatAPY(undefined)).toBe('0.00%');
    expect(formatAPY(0n)).toBe('0.00%');
    expect(calculateAPYNumber(undefined)).toBe(0);
    expect(calculateAPYNumber(0n)).toBe(0);
  });

  it('calculates compound interest correctly over blocks per year', () => {
    // 1e-8 per block (~2.6% annual)
    const ratePerBlock = 10_000_000_000n; // 1e10 out of 1e18 = 1e-8
    const apyNum = calculateAPYNumber(ratePerBlock);
    expect(apyNum).toBeGreaterThan(2.0);
    expect(apyNum).toBeLessThan(3.5);

    const apyStr = formatAPY(ratePerBlock);
    expect(apyStr).toMatch(/^\d+\.\d{2}%$/);
  });
});
