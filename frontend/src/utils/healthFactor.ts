export type HealthStatus = 'safe' | 'warning' | 'critical' | 'unknown';

/**
 * Categorize health factor status into standard protocol risk tiers.
 * @param value Health factor numeric value (e.g. 1.5, 0.9)
 * @returns 'safe' (>= 1.5), 'warning' (1.0 <= val < 1.5), or 'critical' (< 1.0)
 */
export function getHealthStatus(value: number): HealthStatus {
  if (value >= 1.5) return 'safe';
  if (value >= 1.0) return 'warning';
  return 'critical';
}
