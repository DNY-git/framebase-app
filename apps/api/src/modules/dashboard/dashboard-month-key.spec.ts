import { describe, it, expect } from 'vitest';
import { monthKeyOf } from './dashboard.service';

describe('monthKeyOf', () => {
  it('zero-pads the month so keys match the Mongo %Y-%m aggregation format', () => {
    expect(monthKeyOf(new Date(2026, 7, 1))).toBe('2026-08');
    expect(monthKeyOf(new Date(2026, 10, 14))).toBe('2026-11');
    expect(monthKeyOf(new Date(2026, 0, 31))).toBe('2026-01');
    expect(monthKeyOf(new Date(2025, 11, 1))).toBe('2025-12');
  });
});
