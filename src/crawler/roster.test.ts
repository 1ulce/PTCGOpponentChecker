/**
 * Roster Crawler Tests
 * 大会参加者クローラーのユニットテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Page } from 'playwright';
import { ParsedParticipant } from './types.js';
import { createDatabase, closeDatabase } from '../db/index.js';
import { createEvent, findOrCreatePlayer, getParticipationsByEventId } from '../db/operations.js';

import {
  parseParticipantsFromPage,
  isValidParticipant,
  buildRosterUrl,
  ROSTER_URL_BASE,
  saveParticipants,
} from './roster.js';

describe('Roster Crawler', () => {
  describe('buildRosterUrl', () => {
    it('should build roster URL from event ID', () => {
      const eventId = 'ST01bmgM9jIqCvBYdzy3';
      const url = buildRosterUrl(eventId);
      expect(url).toBe('https://rk9.gg/roster/ST01bmgM9jIqCvBYdzy3');
    });

    it('should handle short event ID', () => {
      const url = buildRosterUrl('worlds');
      expect(url).toBe('https://rk9.gg/roster/worlds');
    });
  });

  describe('Constants', () => {
    it('should have correct ROSTER_URL_BASE', () => {
      expect(ROSTER_URL_BASE).toBe('https://rk9.gg/roster');
    });
  });

  describe('isValidParticipant', () => {
    it('should return true for valid participant', () => {
      const participant: ParsedParticipant = {
        playerIdMasked: '2....8',
        firstName: 'John',
        lastName: 'Doe',
        country: 'US',
        division: 'Masters',
        deckListUrl: '/decklist/public/abc/xyz',
        standing: 1,
      };
      expect(isValidParticipant(participant)).toBe(true);
    });

    it('should return false for empty playerIdMasked', () => {
      const participant: ParsedParticipant = {
        playerIdMasked: '',
        firstName: 'John',
        lastName: 'Doe',
        country: 'US',
        division: 'Masters',
        deckListUrl: null,
        standing: null,
      };
      expect(isValidParticipant(participant)).toBe(false);
    });

    it('should return false for empty firstName', () => {
      const participant: ParsedParticipant = {
        playerIdMasked: '2....8',
        firstName: '',
        lastName: 'Doe',
        country: 'US',
        division: 'Masters',
        deckListUrl: null,
        standing: null,
      };
      expect(isValidParticipant(participant)).toBe(false);
    });

    it('should return false for empty lastName', () => {
      const participant: ParsedParticipant = {
        playerIdMasked: '2....8',
        firstName: 'John',
        lastName: '',
        country: 'US',
        division: 'Masters',
        deckListUrl: null,
        standing: null,
      };
      expect(isValidParticipant(participant)).toBe(false);
    });

    it('should return false for empty country', () => {
      const participant: ParsedParticipant = {
        playerIdMasked: '2....8',
        firstName: 'John',
        lastName: 'Doe',
        country: '',
        division: 'Masters',
        deckListUrl: null,
        standing: null,
      };
      expect(isValidParticipant(participant)).toBe(false);
    });

    it('should return true when optional fields are null', () => {
      const participant: ParsedParticipant = {
        playerIdMasked: '2....8',
        firstName: 'John',
        lastName: 'Doe',
        country: 'US',
        division: null,
        deckListUrl: null,
        standing: null,
      };
      expect(isValidParticipant(participant)).toBe(true);
    });
  });

  describe('parseParticipantsFromPage', () => {
    let mockPage: Partial<Page>;

    beforeEach(() => {
      mockPage = {
        $$eval: vi.fn(),
        selectOption: vi.fn(),
        waitForTimeout: vi.fn(),
      };
    });

    it('should parse participants from page', async () => {
      const mockParticipants: ParsedParticipant[] = [
        {
          playerIdMasked: '2....8',
          firstName: 'Taro',
          lastName: 'Yamada',
          country: 'JP',
          division: 'Masters',
          deckListUrl: '/decklist/public/abc/xyz',
          standing: 1,
        },
        {
          playerIdMasked: '5....9',
          firstName: 'Hanako',
          lastName: 'Suzuki',
          country: 'JP',
          division: 'Masters',
          deckListUrl: null,
          standing: 2,
        },
      ];

      (mockPage.$$eval as ReturnType<typeof vi.fn>).mockResolvedValue(mockParticipants);

      const result = await parseParticipantsFromPage(mockPage as Page);

      expect(result).toHaveLength(2);
      expect(result[0].playerIdMasked).toBe('2....8');
      expect(result[1].firstName).toBe('Hanako');
    });

    it('should handle empty table', async () => {
      (mockPage.$$eval as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await parseParticipantsFromPage(mockPage as Page);

      expect(result).toHaveLength(0);
    });

    it('should handle participants with special characters', async () => {
      const mockParticipants: ParsedParticipant[] = [
        {
          playerIdMasked: '3....7',
          firstName: 'Adrián',
          lastName: 'García',
          country: 'ES',
          division: 'Masters',
          deckListUrl: null,
          standing: 1,
        },
        {
          playerIdMasked: '4....5',
          firstName: 'コウキ',
          lastName: 'ヤブタニ',
          country: 'JP',
          division: 'Masters',
          deckListUrl: null,
          standing: 2,
        },
      ];

      (mockPage.$$eval as ReturnType<typeof vi.fn>).mockResolvedValue(mockParticipants);

      const result = await parseParticipantsFromPage(mockPage as Page);

      expect(result[0].firstName).toBe('Adrián');
      expect(result[1].lastName).toBe('ヤブタニ');
    });

    it('should handle participants without deck list', async () => {
      const mockParticipants: ParsedParticipant[] = [
        {
          playerIdMasked: '2....8',
          firstName: 'John',
          lastName: 'Doe',
          country: 'US',
          division: 'Masters',
          deckListUrl: null,
          standing: 10,
        },
      ];

      (mockPage.$$eval as ReturnType<typeof vi.fn>).mockResolvedValue(mockParticipants);

      const result = await parseParticipantsFromPage(mockPage as Page);

      expect(result[0].deckListUrl).toBeNull();
    });

    it('should handle participants without standing', async () => {
      const mockParticipants: ParsedParticipant[] = [
        {
          playerIdMasked: '2....8',
          firstName: 'John',
          lastName: 'Doe',
          country: 'US',
          division: 'Masters',
          deckListUrl: '/decklist/public/abc/xyz',
          standing: null,
        },
      ];

      (mockPage.$$eval as ReturnType<typeof vi.fn>).mockResolvedValue(mockParticipants);

      const result = await parseParticipantsFromPage(mockPage as Page);

      expect(result[0].standing).toBeNull();
    });
  });

  describe('saveParticipants', () => {
    beforeEach(() => {
      createDatabase(':memory:');
    });

    afterEach(() => {
      closeDatabase();
    });

    it('should save participants to database', async () => {
      // イベントを先に作成
      const event = createEvent({
        eventId: 'TEST001',
        name: 'Test Event',
        date: 'February 1, 2026',
        dateStart: '2026-02-01',
        city: 'Tokyo, JP',
      });

      const participants: ParsedParticipant[] = [
        {
          playerIdMasked: '2....8',
          firstName: 'Taro',
          lastName: 'Yamada',
          country: 'JP',
          division: 'Masters',
          deckListUrl: '/decklist/public/TEST001/abc',
          standing: 1,
        },
        {
          playerIdMasked: '5....9',
          firstName: 'Hanako',
          lastName: 'Suzuki',
          country: 'JP',
          division: 'Masters',
          deckListUrl: null,
          standing: 2,
        },
      ];

      const result = await saveParticipants('TEST001', participants);

      expect(result.playersAdded).toBe(2);
      expect(result.playersReused).toBe(0);
      expect(result.participationsAdded).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should reuse existing players', async () => {
      // イベント1を作成
      createEvent({
        eventId: 'EVENT001',
        name: 'Event 1',
        date: 'January 1, 2026',
        dateStart: '2026-01-01',
        city: 'Tokyo, JP',
      });

      // 最初の参加者を保存
      const participants1: ParsedParticipant[] = [
        {
          playerIdMasked: '2....8',
          firstName: 'Taro',
          lastName: 'Yamada',
          country: 'JP',
          division: 'Masters',
          deckListUrl: null,
          standing: 1,
        },
      ];

      await saveParticipants('EVENT001', participants1);

      // イベント2を作成
      createEvent({
        eventId: 'EVENT002',
        name: 'Event 2',
        date: 'February 1, 2026',
        dateStart: '2026-02-01',
        city: 'Osaka, JP',
      });

      // 同じプレイヤーが別イベントに参加
      const participants2: ParsedParticipant[] = [
        {
          playerIdMasked: '2....8',
          firstName: 'Taro',
          lastName: 'Yamada',
          country: 'JP',
          division: 'Masters',
          deckListUrl: null,
          standing: 3,
        },
      ];

      const result = await saveParticipants('EVENT002', participants2);

      expect(result.playersAdded).toBe(0);
      expect(result.playersReused).toBe(1);
      expect(result.participationsAdded).toBe(1);
    });

    it('should skip duplicate participations', async () => {
      createEvent({
        eventId: 'EVENT003',
        name: 'Event 3',
        date: 'March 1, 2026',
        dateStart: '2026-03-01',
        city: 'Nagoya, JP',
      });

      const participants: ParsedParticipant[] = [
        {
          playerIdMasked: '3....7',
          firstName: 'Jiro',
          lastName: 'Tanaka',
          country: 'JP',
          division: 'Masters',
          deckListUrl: null,
          standing: 1,
        },
      ];

      // 1回目
      await saveParticipants('EVENT003', participants);

      // 2回目（同じイベント・同じプレイヤー）
      const result = await saveParticipants('EVENT003', participants);

      expect(result.playersAdded).toBe(0);
      expect(result.playersReused).toBe(1);
      expect(result.participationsAdded).toBe(0); // 重複なのでスキップ
    });

    it('should handle empty participants array', async () => {
      createEvent({
        eventId: 'EMPTY001',
        name: 'Empty Event',
        date: 'April 1, 2026',
        dateStart: '2026-04-01',
        city: 'Fukuoka, JP',
      });

      const result = await saveParticipants('EMPTY001', []);

      expect(result.playersAdded).toBe(0);
      expect(result.playersReused).toBe(0);
      expect(result.participationsAdded).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should filter out invalid participants', async () => {
      createEvent({
        eventId: 'FILTER001',
        name: 'Filter Event',
        date: 'May 1, 2026',
        dateStart: '2026-05-01',
        city: 'Sapporo, JP',
      });

      const participants: ParsedParticipant[] = [
        {
          playerIdMasked: '1....1',
          firstName: 'Valid',
          lastName: 'Player',
          country: 'JP',
          division: 'Masters',
          deckListUrl: null,
          standing: 1,
        },
        {
          playerIdMasked: '', // invalid
          firstName: 'Invalid',
          lastName: 'Player',
          country: 'JP',
          division: 'Masters',
          deckListUrl: null,
          standing: 2,
        },
      ];

      const result = await saveParticipants('FILTER001', participants);

      expect(result.playersAdded).toBe(1);
      expect(result.participationsAdded).toBe(1);
    });

    it('should return error when event not found', async () => {
      const participants: ParsedParticipant[] = [
        {
          playerIdMasked: '1....1',
          firstName: 'Test',
          lastName: 'Player',
          country: 'JP',
          division: 'Masters',
          deckListUrl: null,
          standing: 1,
        },
      ];

      const result = await saveParticipants('NONEXISTENT', participants);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('not found');
    });
  });
});
