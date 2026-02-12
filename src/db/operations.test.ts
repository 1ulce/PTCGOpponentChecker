import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { createDatabase, closeDatabase } from './index.js';
import {
  findEventByEventId,
  createEvent,
  findOrCreatePlayer,
  createParticipation,
  getAllEvents,
  getEventIdsByEventIds,
} from './operations.js';

const TEST_DB_PATH = './data/test-operations.db';

describe('Database Operations', () => {
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

  describe('Event operations', () => {
    it('createEvent: 新規イベントを作成できること', () => {
      const event = createEvent({
        eventId: 'TEST123',
        name: 'Test Tournament',
        date: '2026-01-15',
        dateStart: '2026-01-15',
        city: 'Tokyo',
      });

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.eventId).toBe('TEST123');
      expect(event.name).toBe('Test Tournament');
    });

    it('findEventByEventId: イベントをevent_idで検索できること', () => {
      createEvent({
        eventId: 'FIND123',
        name: 'Find Test',
        date: null,
        dateStart: null,
        city: null,
      });

      const found = findEventByEventId('FIND123');
      expect(found).toBeDefined();
      expect(found?.eventId).toBe('FIND123');
    });

    it('findEventByEventId: 存在しないイベントはnullを返すこと', () => {
      const notFound = findEventByEventId('NOTEXIST');
      expect(notFound).toBeNull();
    });

    it('getAllEvents: 全イベントを取得できること', () => {
      createEvent({ eventId: 'E1', name: 'Event 1', date: null, dateStart: null, city: null });
      createEvent({ eventId: 'E2', name: 'Event 2', date: null, dateStart: null, city: null });

      const all = getAllEvents();
      expect(all.length).toBe(2);
    });

    it('getEventIdsByEventIds: 複数のevent_idで存在確認できること', () => {
      createEvent({ eventId: 'E1', name: 'Event 1', date: null, dateStart: null, city: null });
      createEvent({ eventId: 'E2', name: 'Event 2', date: null, dateStart: null, city: null });

      const existing = getEventIdsByEventIds(['E1', 'E2', 'E3']);
      expect(existing).toContain('E1');
      expect(existing).toContain('E2');
      expect(existing).not.toContain('E3');
    });
  });

  describe('Player operations', () => {
    it('findOrCreatePlayer: 新規プレイヤーを作成できること', () => {
      const result = findOrCreatePlayer({
        playerIdMasked: '1....5',
        firstName: 'Taro',
        lastName: 'Yamada',
        country: 'JP',
      });

      expect(result.player).toBeDefined();
      expect(result.created).toBe(true);
      expect(result.player.firstName).toBe('Taro');
    });

    it('findOrCreatePlayer: 既存プレイヤーを再利用すること', () => {
      // 1回目: 作成
      const first = findOrCreatePlayer({
        playerIdMasked: '2....8',
        firstName: 'Hanako',
        lastName: 'Suzuki',
        country: 'JP',
      });

      // 2回目: 同じ複合キーで検索
      const second = findOrCreatePlayer({
        playerIdMasked: '2....8',
        firstName: 'Hanako',
        lastName: 'Suzuki',
        country: 'JP',
      });

      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(first.player.id).toBe(second.player.id);
    });

    it('findOrCreatePlayer: 異なる複合キーは別プレイヤーになること', () => {
      const player1 = findOrCreatePlayer({
        playerIdMasked: '1....1',
        firstName: 'John',
        lastName: 'Smith',
        country: 'US',
      });

      // 同名だがマスクIDが異なる
      const player2 = findOrCreatePlayer({
        playerIdMasked: '2....2',
        firstName: 'John',
        lastName: 'Smith',
        country: 'US',
      });

      expect(player1.player.id).not.toBe(player2.player.id);
    });
  });

  describe('Participation operations', () => {
    it('createParticipation: 参加記録を作成できること', () => {
      const event = createEvent({
        eventId: 'PART_TEST',
        name: 'Participation Test',
        date: null,
        dateStart: null,
        city: null,
      });

      const { player } = findOrCreatePlayer({
        playerIdMasked: '3....3',
        firstName: 'Test',
        lastName: 'Player',
        country: 'JP',
      });

      const participation = createParticipation({
        playerId: player.id,
        eventId: event.id,
        division: 'Masters',
        deckListUrl: 'https://example.com/deck',
        standing: 5,
      });

      expect(participation).not.toBeNull();
      expect(participation!.division).toBe('Masters');
      expect(participation!.standing).toBe(5);
    });

    it('createParticipation: 同一プレイヤー・イベントの重複はnullを返すこと', () => {
      const event = createEvent({
        eventId: 'DUP_TEST',
        name: 'Duplicate Test',
        date: null,
        dateStart: null,
        city: null,
      });

      const { player } = findOrCreatePlayer({
        playerIdMasked: '4....4',
        firstName: 'Dup',
        lastName: 'Test',
        country: 'JP',
      });

      // 1回目: 成功
      const first = createParticipation({
        playerId: player.id,
        eventId: event.id,
        division: 'Masters',
        deckListUrl: null,
        standing: null,
      });

      // 2回目: 重複なのでnull
      const second = createParticipation({
        playerId: player.id,
        eventId: event.id,
        division: 'Masters',
        deckListUrl: null,
        standing: null,
      });

      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });
  });
});
