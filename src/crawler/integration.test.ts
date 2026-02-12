/**
 * Crawler Integration Tests
 * 実際のrk9.ggへのアクセスを含む統合テスト
 *
 * 注意: これらのテストは外部サービスに依存するため、
 * 通常のテストスイートからは除外されています。
 *
 * 手動実行: npm test -- src/crawler/integration.test.ts --run
 * または: npx vitest run src/crawler/integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { createDatabase, closeDatabase } from '../db/index.js';
import { createBrowser, closeBrowser, getBrowser } from './browser.js';
import { fetchEventsFromRk9, saveNewEvents } from './events.js';
import { fetchRosterFromRk9, saveParticipants } from './roster.js';
import {
  getAllEvents,
  findEventByEventId,
  findOrCreatePlayer,
} from '../db/operations.js';

const TEST_DB_PATH = './data/test-crawler-integration.db';

// 既知の大会ID（spike検証で確認済み）
const KNOWN_EVENT_ID = 'ST01bmgM9jIqCvBYdzy3';

describe('Crawler Integration Tests', () => {
  describe('Events Crawler', () => {
    beforeAll(async () => {
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
      if (!existsSync('./data')) {
        mkdirSync('./data', { recursive: true });
      }
      createDatabase(TEST_DB_PATH);
      await createBrowser();
    }, 60000);

    afterAll(async () => {
      await closeBrowser();
      closeDatabase();
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
    });

    it('should fetch events from rk9.gg', async () => {
      const browser = getBrowser();
      expect(browser).not.toBeNull();

      const events = await fetchEventsFromRk9();

      // 少なくとも1つの大会が取得できること
      expect(events.length).toBeGreaterThan(0);

      // 各イベントが必要なフィールドを持つこと
      const firstEvent = events[0];
      expect(firstEvent.eventId).toBeDefined();
      expect(firstEvent.name).toBeDefined();
    }, 60000);

    it('should save new events to database', async () => {
      const events = await fetchEventsFromRk9();
      const result = saveNewEvents(events.slice(0, 5)); // 最初の5件のみテスト

      expect(result.eventsAdded).toBeGreaterThanOrEqual(0);
      expect(result.eventsSkipped).toBeGreaterThanOrEqual(0);
      expect(result.eventsAdded + result.eventsSkipped).toBe(5);
    }, 60000);

    it('should skip already saved events on re-crawl', async () => {
      const allEvents = getAllEvents();
      const existingCount = allEvents.length;

      // 既に保存されているイベントを再度保存しようとする
      if (existingCount > 0) {
        const eventsToResave = allEvents.slice(0, 3).map(e => ({
          eventId: e.eventId,
          name: e.name,
          date: e.date,
          city: e.city,
        }));

        const result = saveNewEvents(eventsToResave);

        // 全てスキップされるはず
        expect(result.eventsAdded).toBe(0);
        expect(result.eventsSkipped).toBe(eventsToResave.length);
      }
    });
  });

  describe('Roster Crawler', () => {
    beforeAll(async () => {
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
      if (!existsSync('./data')) {
        mkdirSync('./data', { recursive: true });
      }
      createDatabase(TEST_DB_PATH);
      await createBrowser();
    }, 60000);

    afterAll(async () => {
      await closeBrowser();
      closeDatabase();
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }
    });

    it('should fetch roster from a known event', async () => {
      const participants = await fetchRosterFromRk9(KNOWN_EVENT_ID);

      // 大規模大会なので多くの参加者がいるはず
      expect(participants.length).toBeGreaterThan(100);

      // 各参加者が必要なフィールドを持つこと
      const firstParticipant = participants[0];
      expect(firstParticipant.playerIdMasked).toBeDefined();
      expect(firstParticipant.firstName).toBeDefined();
      expect(firstParticipant.lastName).toBeDefined();
      expect(firstParticipant.country).toBeDefined();
    }, 120000);

    it('should save participants with correct player deduplication', async () => {
      // まずイベントを作成
      const { createEvent } = await import('../db/operations.js');
      createEvent({
        eventId: KNOWN_EVENT_ID,
        name: 'Test Event for Roster',
        date: '2026-01-15',
        dateStart: '2026-01-15',
        city: 'Test City',
      });

      // 最初の100人だけ取得してテスト
      const participants = await fetchRosterFromRk9(KNOWN_EVENT_ID);
      const limitedParticipants = participants.slice(0, 100);

      // saveParticipantsはrk9のeventId（文字列）を受け取る
      const result = await saveParticipants(KNOWN_EVENT_ID, limitedParticipants);

      expect(result.playersAdded).toBeGreaterThan(0);
      expect(result.participationsAdded).toBe(result.playersAdded + result.playersReused);
      expect(result.errors.length).toBe(0);
    }, 120000);
  });

  describe('Player Deduplication', () => {
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

    it('should correctly identify same player across multiple events', () => {
      // 同じプレイヤー情報で複数回呼び出し
      const player1 = findOrCreatePlayer({
        playerIdMasked: '1....5',
        firstName: 'Taro',
        lastName: 'Yamada',
        country: 'JP',
      });

      const player2 = findOrCreatePlayer({
        playerIdMasked: '1....5',
        firstName: 'Taro',
        lastName: 'Yamada',
        country: 'JP',
      });

      expect(player1.created).toBe(true);
      expect(player2.created).toBe(false);
      expect(player1.player.id).toBe(player2.player.id);
    });

    it('should distinguish players with different masked IDs', () => {
      const player1 = findOrCreatePlayer({
        playerIdMasked: '1....1',
        firstName: 'John',
        lastName: 'Smith',
        country: 'US',
      });

      const player2 = findOrCreatePlayer({
        playerIdMasked: '2....2',
        firstName: 'John',
        lastName: 'Smith',
        country: 'US',
      });

      expect(player1.player.id).not.toBe(player2.player.id);
    });

    it('should distinguish players with different countries', () => {
      const player1 = findOrCreatePlayer({
        playerIdMasked: '1....1',
        firstName: 'Test',
        lastName: 'Player',
        country: 'JP',
      });

      const player2 = findOrCreatePlayer({
        playerIdMasked: '1....1',
        firstName: 'Test',
        lastName: 'Player',
        country: 'US',
      });

      expect(player1.player.id).not.toBe(player2.player.id);
    });
  });
});
