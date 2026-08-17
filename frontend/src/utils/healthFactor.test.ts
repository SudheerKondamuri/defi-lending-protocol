import { describe, it, expect } from 'vitest';
import { getHealthStatus } from './healthFactor';

describe('getHealthStatus', () => {
  it('returns "safe" when health factor is >= 1.5', () => {
    expect(getHealthStatus(1.5)).toBe('safe');
    expect(getHealthStatus(2.0)).toBe('safe');
    expect(getHealthStatus(10.0)).toBe('safe');
  });

  it('returns "warning" when health factor is between 1.0 and 1.5', () => {
    expect(getHealthStatus(1.49)).toBe('warning');
    expect(getHealthStatus(1.2)).toBe('warning');
    expect(getHealthStatus(1.0)).toBe('warning');
  });

  it('returns "critical" when health factor is below 1.0', () => {
    expect(getHealthStatus(0.99)).toBe('critical');
    expect(getHealthStatus(0.5)).toBe('critical');
    expect(getHealthStatus(0)).toBe('critical');
  });
});
