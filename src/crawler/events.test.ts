/**
 * Events Crawler Tests
 * 大会一覧クローラーのユニットテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Page } from 'playwright';
import { ParsedEvent } from './types.js';
import { createDatabase, closeDatabase, getDatabase } from '../db/index.js';
import { getAllEvents, findEventByEventId } from '../db/operations.js';

import {
  parseEventsFromPage,
  extractTcgEventId,
  saveNewEvents,
  EVENTS_URL,
  PAST_EVENTS_TABLE_SELECTOR,
} from './events.js';

describe('Events Crawler', () => {
  describe('extractTcgEventId', () => {
    it('should extract event ID from tournament URL', () => {
      const href = '/tournament/ST01bmgM9jIqCvBYdzy3';
      const result = extractTcgEventId(href);
      expect(result).toBe('ST01bmgM9jIqCvBYdzy3');
    });

    it('should extract short event ID', () => {
      const href = '/tournament/worlds';
      const result = extractTcgEventId(href);
      expect(result).toBe('worlds');
    });

    it('should return null for invalid URL', () => {
      const href = '/event/some-event';
      const result = extractTcgEventId(href);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = extractTcgEventId('');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = extractTcgEventId(null);
      expect(result).toBeNull();
    });
  });

  describe('Constants', () => {
    it('should have correct EVENTS_URL', () => {
      expect(EVENTS_URL).toBe('https://rk9.gg/events/pokemon');
    });

    it('should have correct PAST_EVENTS_TABLE_SELECTOR', () => {
      expect(PAST_EVENTS_TABLE_SELECTOR).toBe('#dtPastEvents');
    });
  });

  describe('parseEventsFromPage', () => {
    let mockPage: Partial<Page>;

    beforeEach(() => {
      mockPage = {
        $$eval: vi.fn(),
      };
    });

    it('should parse TCG events from page', async () => {
      const mockEvents: ParsedEvent[] = [
        {
          eventId: 'ST01bmgM9jIqCvBYdzy3',
          name: '2026 Santiago Pokémon Regional Championships',
          date: 'February 7-8, 2026',
          city: 'Huechuraba, CL',
        },
        {
          eventId: 'SY01X6aiblBgAp8tfhjx',
          name: '2026 Sydney Pokémon Regional Championships',
          date: 'January 25-26, 2026',
          city: 'Sydney, AU',
        },
      ];

      (mockPage.$$eval as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvents);

      const result = await parseEventsFromPage(mockPage as Page);

      expect(result).toHaveLength(2);
      expect(result[0].eventId).toBe('ST01bmgM9jIqCvBYdzy3');
      expect(result[1].name).toBe('2026 Sydney Pokémon Regional Championships');
    });

    it('should filter out events without TCG link', async () => {
      const mockEvents: ParsedEvent[] = [
        {
          eventId: 'ST01bmgM9jIqCvBYdzy3',
          name: 'TCG Event',
          date: 'February 7-8, 2026',
          city: 'Santiago, CL',
        },
      ];

      (mockPage.$$eval as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvents);

      const result = await parseEventsFromPage(mockPage as Page);

      expect(result).toHaveLength(1);
      expect(result[0].eventId).toBe('ST01bmgM9jIqCvBYdzy3');
    });

    it('should handle empty table', async () => {
      (mockPage.$$eval as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await parseEventsFromPage(mockPage as Page);

      expect(result).toHaveLength(0);
    });

    it('should handle events with null date', async () => {
      const mockEvents: ParsedEvent[] = [
        {
          eventId: 'test123',
          name: 'Test Event',
          date: null,
          city: 'Tokyo, JP',
        },
      ];

      (mockPage.$$eval as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvents);

      const result = await parseEventsFromPage(mockPage as Page);

      expect(result[0].date).toBeNull();
    });

    it('should handle events with null city', async () => {
      const mockEvents: ParsedEvent[] = [
        {
          eventId: 'test123',
          name: 'Test Event',
          date: 'February 1, 2026',
          city: null,
        },
      ];

      (mockPage.$$eval as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvents);

      const result = await parseEventsFromPage(mockPage as Page);

      expect(result[0].city).toBeNull();
    });
  });

  describe('saveNewEvents', () => {
    beforeEach(() => {
      // インメモリDBを作成
      createDatabase(':memory:');
    });

    afterEach(() => {
      closeDatabase();
    });

    it('should save new events to database', async () => {
      const events: ParsedEvent[] = [
        {
          eventId: 'TEST001',
          name: 'Test Regional Championships',
          date: 'February 1, 2026',
          city: 'Tokyo, JP',
        },
        {
          eventId: 'TEST002',
          name: 'Test Special Event',
          date: 'March 15, 2026',
          city: 'Osaka, JP',
        },
      ];

      const result = await saveNewEvents(events);

      expect(result.eventsAdded).toBe(2);
      expect(result.eventsSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      // DBに保存されていることを確認
      const allEvents = getAllEvents();
      expect(allEvents).toHaveLength(2);
      expect(allEvents[0].eventId).toBe('TEST001');
      expect(allEvents[1].eventId).toBe('TEST002');
    });

    it('should skip existing events', async () => {
      const events: ParsedEvent[] = [
        {
          eventId: 'EXISTING001',
          name: 'Existing Event',
          date: 'January 1, 2026',
          city: 'Nagoya, JP',
        },
      ];

      // 1回目の保存
      await saveNewEvents(events);

      // 2回目の保存（同じイベント + 新規イベント）
      const events2: ParsedEvent[] = [
        {
          eventId: 'EXISTING001',
          name: 'Existing Event',
          date: 'January 1, 2026',
          city: 'Nagoya, JP',
        },
        {
          eventId: 'NEW001',
          name: 'New Event',
          date: 'April 1, 2026',
          city: 'Fukuoka, JP',
        },
      ];

      const result = await saveNewEvents(events2);

      expect(result.eventsAdded).toBe(1);
      expect(result.eventsSkipped).toBe(1);
      expect(result.errors).toHaveLength(0);

      // DBには3件（1回目1件 + 2回目1件新規）
      const allEvents = getAllEvents();
      expect(allEvents).toHaveLength(2);
    });

    it('should handle empty events array', async () => {
      const result = await saveNewEvents([]);

      expect(result.eventsAdded).toBe(0);
      expect(result.eventsSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle events with null date and city', async () => {
      const events: ParsedEvent[] = [
        {
          eventId: 'NULLTEST',
          name: 'Event with null fields',
          date: null,
          city: null,
        },
      ];

      const result = await saveNewEvents(events);

      expect(result.eventsAdded).toBe(1);
      expect(result.errors).toHaveLength(0);

      const saved = findEventByEventId('NULLTEST');
      expect(saved).not.toBeNull();
      expect(saved!.date).toBeNull();
      expect(saved!.city).toBeNull();
    });
  });
});
