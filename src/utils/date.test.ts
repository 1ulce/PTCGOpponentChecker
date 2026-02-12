import { describe, it, expect } from 'vitest';
import { parseDateToISO } from './date.js';

describe('parseDateToISO', () => {
  it('should parse "February 7-8, 2026" to "2026-02-07"', () => {
    expect(parseDateToISO('February 7-8, 2026')).toBe('2026-02-07');
  });

  it('should parse "January 24-25, 2026" to "2026-01-24"', () => {
    expect(parseDateToISO('January 24-25, 2026')).toBe('2026-01-24');
  });

  it('should parse "November 29-30, 2025" to "2025-11-29"', () => {
    expect(parseDateToISO('November 29-30, 2025')).toBe('2025-11-29');
  });

  it('should parse cross-month ranges like "September 30–October 2, 2022"', () => {
    expect(parseDateToISO('September 30–October 2, 2022')).toBe('2022-09-30');
  });

  it('should handle en-dash character (–)', () => {
    expect(parseDateToISO('September 30–October 2, 2022')).toBe('2022-09-30');
  });

  it('should handle three-day events like "January 16-18, 2026"', () => {
    expect(parseDateToISO('January 16-18, 2026')).toBe('2026-01-16');
  });

  it('should pad single-digit days', () => {
    expect(parseDateToISO('March 1-2, 2025')).toBe('2025-03-01');
  });

  it('should return null for null input', () => {
    expect(parseDateToISO(null)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseDateToISO('')).toBeNull();
  });

  it('should return null for invalid format', () => {
    expect(parseDateToISO('Invalid date')).toBeNull();
  });

  it('should be case-insensitive for month names', () => {
    expect(parseDateToISO('FEBRUARY 7-8, 2026')).toBe('2026-02-07');
    expect(parseDateToISO('february 7-8, 2026')).toBe('2026-02-07');
  });
});
