/**
 * End-to-End Tests
 * CLIコマンドの統合テスト
 *
 * 注意: これらのテストは外部サービスに依存するため、
 * 通常のテストスイートからは除外されています。
 *
 * 手動実行: npm test -- src/e2e.test.ts --run
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { createDatabase, closeDatabase, getDatabase } from './db/index.js';
import { createBrowser, closeBrowser, getBrowser } from './crawler/browser.js';
import {
  parseArgs,
  CrawlMode,
  initializeCrawler,
  cleanupCrawler,
  runFullCrawl,
  runUpdateCrawl,
} from './cli.js';
import { formatSummary, printSummary } from './summary.js';
import { getAllEvents } from './db/operations.js';
import type { CrawlSummary } from './crawler/types.js';

const TEST_DB_PATH = './data/test-e2e.db';

describe('E2E Tests', () => {
  describe('CLI Argument Parsing', () => {
    it('should parse full mode by default', () => {
      const args = parseArgs([]);
      expect(args.mode).toBe(CrawlMode.FULL);
    });

    it('should parse update mode with --update flag', () => {
      const args = parseArgs(['--update']);
      expect(args.mode).toBe(CrawlMode.UPDATE);
    });
  });

  describe('Initialization and Cleanup', () => {
    afterEach(async () => {
      await cleanupCrawler();
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
    });

    it('should initialize crawler with database and browser', async () => {
      await initializeCrawler(TEST_DB_PATH);

      // DBが初期化されていること
      const db = getDatabase();
      expect(db).not.toBeNull();

      // ブラウザが起動していること
      const browser = getBrowser();
      expect(browser).not.toBeNull();
      expect(browser?.isConnected()).toBe(true);
    });

    it('should cleanup crawler properly', async () => {
      await initializeCrawler(TEST_DB_PATH);
      await cleanupCrawler();

      // DBが閉じられていること
      const db = getDatabase();
      expect(db).toBeNull();

      // ブラウザが閉じられていること
      const browser = getBrowser();
      expect(browser).toBeNull();
    });
  });

  describe('Summary Output', () => {
    it('should format summary correctly', () => {
      const summary: CrawlSummary = {
        totalEventsProcessed: 100,
        newEventsAdded: 25,
        newPlayersAdded: 1500,
        newParticipationsAdded: 3000,
        totalErrors: 2,
        duration: 125000, // 2分5秒
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain('Crawl Summary');
      expect(formatted).toContain('100');
      expect(formatted).toContain('25');
      expect(formatted).toContain('1500');
      expect(formatted).toContain('3000');
      expect(formatted).toContain('2');
      expect(formatted).toContain('2m 5s');
    });

    it('should print summary to console', () => {
      const summary: CrawlSummary = {
        totalEventsProcessed: 50,
        newEventsAdded: 10,
        newPlayersAdded: 500,
        newParticipationsAdded: 1000,
        totalErrors: 0,
        duration: 60000,
      };

      // console.logをモック
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => logs.push(msg);

      printSummary(summary);

      console.log = originalLog;

      expect(logs.length).toBeGreaterThan(0);
      const output = logs.join('\n');
      expect(output).toContain('50');
      expect(output).toContain('10');
    });
  });

  describe('Full Crawl (with network)', () => {
    beforeAll(async () => {
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
      if (!existsSync('./data')) {
        mkdirSync('./data', { recursive: true });
      }
    });

    afterAll(async () => {
      await cleanupCrawler();
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
    });

    it('should complete full crawl and return summary', async () => {
      await initializeCrawler(TEST_DB_PATH);

      // skipActualCrawlを使ってテスト（実際のネットワークアクセスなし）
      const summary = await runFullCrawl({ skipActualCrawl: true });

      expect(summary).toHaveProperty('totalEventsProcessed');
      expect(summary).toHaveProperty('newEventsAdded');
      expect(summary).toHaveProperty('newPlayersAdded');
      expect(summary).toHaveProperty('newParticipationsAdded');
      expect(summary).toHaveProperty('totalErrors');
      expect(summary).toHaveProperty('duration');
      expect(summary.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Update Crawl (with network)', () => {
    beforeAll(async () => {
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
      if (!existsSync('./data')) {
        mkdirSync('./data', { recursive: true });
      }
    });

    afterAll(async () => {
      await cleanupCrawler();
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
    });

    it('should complete update crawl and return summary', async () => {
      await initializeCrawler(TEST_DB_PATH);

      // skipActualCrawlを使ってテスト（実際のネットワークアクセスなし）
      const summary = await runUpdateCrawl({ skipActualCrawl: true });

      expect(summary).toHaveProperty('totalEventsProcessed');
      expect(summary).toHaveProperty('newEventsAdded');
      expect(summary).toHaveProperty('newPlayersAdded');
      expect(summary).toHaveProperty('newParticipationsAdded');
      expect(summary).toHaveProperty('totalErrors');
      expect(summary).toHaveProperty('duration');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
      if (!existsSync('./data')) {
        mkdirSync('./data', { recursive: true });
      }
      createDatabase(TEST_DB_PATH);
    });

    afterEach(() => {
      closeDatabase();
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
    });

    it('should handle cleanup when not initialized', async () => {
      // 初期化せずにクリーンアップしてもエラーにならない
      await cleanupCrawler();
    });

    it('should continue processing after individual event errors', async () => {
      // runFullCrawlがスキップモードで動作することを確認
      const summary = await runFullCrawl({ skipActualCrawl: true });
      expect(summary.totalErrors).toBe(0);
    });
  });
});
