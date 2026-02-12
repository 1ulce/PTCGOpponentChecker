/**
 * CLI Tests
 * コマンドライン引数解析とメインエントリポイントのテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseArgs,
  CrawlMode,
  initializeCrawler,
  cleanupCrawler,
  runFullCrawl,
  runUpdateCrawl,
  getNewEventIds,
} from './cli.js';
import { createDatabase, closeDatabase, getDatabase } from './db/index.js';
import { getBrowser } from './crawler/browser.js';
import { createEvent } from './db/operations.js';
import type { CrawlSummary, ParsedEvent } from './crawler/types.js';

describe('CLI', () => {
  describe('parseArgs', () => {
    it('should return full mode with no arguments', () => {
      const result = parseArgs([]);
      expect(result.mode).toBe(CrawlMode.FULL);
    });

    it('should return update mode with --update flag', () => {
      const result = parseArgs(['--update']);
      expect(result.mode).toBe(CrawlMode.UPDATE);
    });

    it('should handle multiple arguments', () => {
      const result = parseArgs(['--verbose', '--update', '--dry-run']);
      expect(result.mode).toBe(CrawlMode.UPDATE);
    });

    it('should be case sensitive for flags', () => {
      const result = parseArgs(['--UPDATE']);
      expect(result.mode).toBe(CrawlMode.FULL); // 大文字は認識しない
    });
  });

  describe('initializeCrawler', () => {
    afterEach(async () => {
      await cleanupCrawler();
    });

    it('should initialize database connection', async () => {
      await initializeCrawler(':memory:');

      const db = getDatabase();
      expect(db).not.toBeNull();
    });

    it('should initialize browser instance', async () => {
      await initializeCrawler(':memory:');

      const browser = getBrowser();
      expect(browser).not.toBeNull();
      expect(browser?.isConnected()).toBe(true);
    });
  });

  describe('cleanupCrawler', () => {
    it('should close database connection', async () => {
      await initializeCrawler(':memory:');
      await cleanupCrawler();

      const db = getDatabase();
      expect(db).toBeNull();
    });

    it('should close browser instance', async () => {
      await initializeCrawler(':memory:');
      const browserBefore = getBrowser();
      expect(browserBefore).not.toBeNull();

      await cleanupCrawler();

      const browserAfter = getBrowser();
      expect(browserAfter).toBeNull();
    });

    it('should handle cleanup when not initialized', async () => {
      // エラーなく完了すること
      await cleanupCrawler();
    });
  });

  describe('runFullCrawl', () => {
    beforeEach(() => {
      createDatabase(':memory:');
    });

    afterEach(() => {
      closeDatabase();
    });

    it('should return CrawlSummary structure', async () => {
      // モックされた関数を使用（実際のクロールはスキップ）
      const result = await runFullCrawl({ skipActualCrawl: true });

      expect(result).toHaveProperty('totalEventsProcessed');
      expect(result).toHaveProperty('newEventsAdded');
      expect(result).toHaveProperty('newPlayersAdded');
      expect(result).toHaveProperty('newParticipationsAdded');
      expect(result).toHaveProperty('totalErrors');
      expect(result).toHaveProperty('duration');
    });

    it('should measure duration', async () => {
      const result = await runFullCrawl({ skipActualCrawl: true });

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should return zero counts when skipping actual crawl', async () => {
      const result = await runFullCrawl({ skipActualCrawl: true });

      expect(result.totalEventsProcessed).toBe(0);
      expect(result.newEventsAdded).toBe(0);
      expect(result.newPlayersAdded).toBe(0);
      expect(result.newParticipationsAdded).toBe(0);
      expect(result.totalErrors).toBe(0);
    });
  });

  describe('runUpdateCrawl', () => {
    beforeEach(() => {
      createDatabase(':memory:');
    });

    afterEach(() => {
      closeDatabase();
    });

    it('should return CrawlSummary structure', async () => {
      const result = await runUpdateCrawl({ skipActualCrawl: true });

      expect(result).toHaveProperty('totalEventsProcessed');
      expect(result).toHaveProperty('newEventsAdded');
      expect(result).toHaveProperty('newPlayersAdded');
      expect(result).toHaveProperty('newParticipationsAdded');
      expect(result).toHaveProperty('totalErrors');
      expect(result).toHaveProperty('duration');
    });

    it('should handle existing events in database', async () => {
      // 既存イベントを追加
      createEvent({
        eventId: 'EXISTING001',
        name: 'Existing Event',
        date: 'January 1, 2026',
        dateStart: '2026-01-01',
        city: 'Tokyo, JP',
      });

      const result = await runUpdateCrawl({ skipActualCrawl: true });

      // skipActualCrawlなので0だが、構造は正しい
      expect(result.totalEventsProcessed).toBe(0);
    });
  });

  describe('getNewEventIds', () => {
    beforeEach(() => {
      createDatabase(':memory:');
    });

    afterEach(() => {
      closeDatabase();
    });

    it('should return all event IDs when database is empty', () => {
      const parsedEvents: ParsedEvent[] = [
        { eventId: 'EVENT001', name: 'Event 1', date: null, city: null },
        { eventId: 'EVENT002', name: 'Event 2', date: null, city: null },
        { eventId: 'EVENT003', name: 'Event 3', date: null, city: null },
      ];

      const newIds = getNewEventIds(parsedEvents);

      expect(newIds).toHaveLength(3);
      expect(newIds).toContain('EVENT001');
      expect(newIds).toContain('EVENT002');
      expect(newIds).toContain('EVENT003');
    });

    it('should filter out existing event IDs', () => {
      // 既存イベントを追加
      createEvent({
        eventId: 'EXISTING001',
        name: 'Existing Event',
        date: 'January 1, 2026',
        dateStart: '2026-01-01',
        city: 'Tokyo, JP',
      });

      const parsedEvents: ParsedEvent[] = [
        { eventId: 'EXISTING001', name: 'Existing Event', date: null, city: null },
        { eventId: 'NEW001', name: 'New Event 1', date: null, city: null },
        { eventId: 'NEW002', name: 'New Event 2', date: null, city: null },
      ];

      const newIds = getNewEventIds(parsedEvents);

      expect(newIds).toHaveLength(2);
      expect(newIds).not.toContain('EXISTING001');
      expect(newIds).toContain('NEW001');
      expect(newIds).toContain('NEW002');
    });

    it('should return empty array when all events exist', () => {
      // 全イベントを追加
      createEvent({ eventId: 'EVENT001', name: 'Event 1', date: null, dateStart: null, city: null });
      createEvent({ eventId: 'EVENT002', name: 'Event 2', date: null, dateStart: null, city: null });

      const parsedEvents: ParsedEvent[] = [
        { eventId: 'EVENT001', name: 'Event 1', date: null, city: null },
        { eventId: 'EVENT002', name: 'Event 2', date: null, city: null },
      ];

      const newIds = getNewEventIds(parsedEvents);

      expect(newIds).toHaveLength(0);
    });

    it('should handle empty parsed events array', () => {
      const newIds = getNewEventIds([]);

      expect(newIds).toHaveLength(0);
    });
  });
});
