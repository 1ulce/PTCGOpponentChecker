/**
 * Summary Module Tests
 * 実行結果サマリーの集計・フォーマット・出力テスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDuration,
  formatSummary,
  printSummary,
} from './summary.js';
import type { CrawlSummary } from './crawler/types.js';

describe('Summary', () => {
  describe('formatDuration', () => {
    it('should format milliseconds under 1 second', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds under 1 minute', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(5500)).toBe('5.5s');
      expect(formatDuration(59999)).toBe('60.0s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('should format hours, minutes and seconds', () => {
      expect(formatDuration(3600000)).toBe('1h 0m 0s');
      expect(formatDuration(3661000)).toBe('1h 1m 1s');
      expect(formatDuration(7325000)).toBe('2h 2m 5s');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0ms');
    });
  });

  describe('formatSummary', () => {
    it('should format summary with all fields', () => {
      const summary: CrawlSummary = {
        totalEventsProcessed: 100,
        newEventsAdded: 25,
        newPlayersAdded: 1500,
        newParticipationsAdded: 3000,
        totalErrors: 2,
        duration: 125000,
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain('Events');
      expect(formatted).toContain('100');
      expect(formatted).toContain('25');
      expect(formatted).toContain('Players');
      expect(formatted).toContain('1500');
      expect(formatted).toContain('Participations');
      expect(formatted).toContain('3000');
      expect(formatted).toContain('Errors');
      expect(formatted).toContain('2');
      expect(formatted).toContain('Duration');
      expect(formatted).toContain('2m 5s');
    });

    it('should format summary with zero values', () => {
      const summary: CrawlSummary = {
        totalEventsProcessed: 0,
        newEventsAdded: 0,
        newPlayersAdded: 0,
        newParticipationsAdded: 0,
        totalErrors: 0,
        duration: 0,
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain('0');
      expect(formatted).toContain('0ms');
    });

    it('should include section header', () => {
      const summary: CrawlSummary = {
        totalEventsProcessed: 10,
        newEventsAdded: 5,
        newPlayersAdded: 100,
        newParticipationsAdded: 200,
        totalErrors: 0,
        duration: 5000,
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain('Crawl Summary');
    });
  });

  describe('printSummary', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should print summary to console', () => {
      const summary: CrawlSummary = {
        totalEventsProcessed: 50,
        newEventsAdded: 10,
        newPlayersAdded: 500,
        newParticipationsAdded: 1000,
        totalErrors: 1,
        duration: 30000,
      };

      printSummary(summary);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('50');
      expect(output).toContain('10');
      expect(output).toContain('500');
      expect(output).toContain('1000');
    });

    it('should print formatted duration', () => {
      const summary: CrawlSummary = {
        totalEventsProcessed: 1,
        newEventsAdded: 1,
        newPlayersAdded: 10,
        newParticipationsAdded: 10,
        totalErrors: 0,
        duration: 90000,
      };

      printSummary(summary);

      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('1m 30s');
    });
  });
});
