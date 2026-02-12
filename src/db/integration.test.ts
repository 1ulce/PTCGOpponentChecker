/**
 * DB Integration Tests
 * スキーママイグレーション、UNIQUE制約、FK制約の統合テスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase, getDatabase } from './index.js';
import {
  createEvent,
  findOrCreatePlayer,
  createParticipation,
} from './operations.js';

const TEST_DB_PATH = './data/test-integration.db';

describe('DB Integration Tests', () => {
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

  describe('Schema Migration', () => {
    it('should create all required tables', () => {
      const rawDb = new Database(TEST_DB_PATH);

      // テーブル一覧を取得
      const tables = rawDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[];

      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('events');
      expect(tableNames).toContain('players');
      expect(tableNames).toContain('participations');

      rawDb.close();
    });

    it('should have WAL mode enabled', () => {
      const rawDb = new Database(TEST_DB_PATH);
      const result = rawDb.prepare('PRAGMA journal_mode').get() as { journal_mode: string };

      expect(result.journal_mode).toBe('wal');

      rawDb.close();
    });

    it('should have foreign keys enabled', () => {
      const rawDb = new Database(TEST_DB_PATH);
      const result = rawDb.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };

      expect(result.foreign_keys).toBe(1);

      rawDb.close();
    });
  });

  describe('UNIQUE Constraints', () => {
    it('should reject duplicate event_id', () => {
      // 1つ目のイベントを作成
      createEvent({
        eventId: 'UNIQUE_TEST',
        name: 'First Event',
        date: '2026-01-01',
        dateStart: '2026-01-01',
        city: 'Tokyo',
      });

      // 同じevent_idで2つ目を作成しようとするとエラー
      expect(() => {
        createEvent({
          eventId: 'UNIQUE_TEST',
          name: 'Duplicate Event',
          date: '2026-01-02',
          dateStart: '2026-01-02',
          city: 'Osaka',
        });
      }).toThrow();
    });

    it('should allow same player composite key to return existing player', () => {
      // 同じ複合キーでfindOrCreatePlayerを2回呼ぶ
      const first = findOrCreatePlayer({
        playerIdMasked: '1....9',
        firstName: 'Test',
        lastName: 'Player',
        country: 'JP',
      });

      const second = findOrCreatePlayer({
        playerIdMasked: '1....9',
        firstName: 'Test',
        lastName: 'Player',
        country: 'JP',
      });

      // 同じプレイヤーが返される
      expect(first.player.id).toBe(second.player.id);
      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
    });

    it('should reject duplicate participation (same player + event)', () => {
      const event = createEvent({
        eventId: 'PART_UNIQUE',
        name: 'Participation Unique Test',
        date: null,
        dateStart: null,
        city: null,
      });

      const { player } = findOrCreatePlayer({
        playerIdMasked: '5....5',
        firstName: 'Unique',
        lastName: 'Test',
        country: 'US',
      });

      // 1つ目の参加記録
      const first = createParticipation({
        playerId: player.id,
        eventId: event.id,
        division: 'Masters',
        deckListUrl: null,
        standing: 1,
      });

      // 同じplayer+eventで2つ目はnullを返す（スキップ）
      const second = createParticipation({
        playerId: player.id,
        eventId: event.id,
        division: 'Masters',
        deckListUrl: null,
        standing: 1,
      });

      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should reject participation with non-existent player_id', () => {
      const event = createEvent({
        eventId: 'FK_TEST_EVENT',
        name: 'FK Test Event',
        date: null,
        dateStart: null,
        city: null,
      });

      const rawDb = new Database(TEST_DB_PATH);

      // 存在しないplayer_idで参加記録を作成
      expect(() => {
        rawDb.prepare(`
          INSERT INTO participations (player_id, event_id, division, created_at, updated_at)
          VALUES (99999, ?, 'Masters', datetime('now'), datetime('now'))
        `).run(event.id);
      }).toThrow(/FOREIGN KEY constraint failed/);

      rawDb.close();
    });

    it('should reject participation with non-existent event_id', () => {
      const { player } = findOrCreatePlayer({
        playerIdMasked: '6....6',
        firstName: 'FK',
        lastName: 'Test',
        country: 'JP',
      });

      const rawDb = new Database(TEST_DB_PATH);

      // 存在しないevent_idで参加記録を作成
      expect(() => {
        rawDb.prepare(`
          INSERT INTO participations (player_id, event_id, division, created_at, updated_at)
          VALUES (?, 99999, 'Masters', datetime('now'), datetime('now'))
        `).run(player.id);
      }).toThrow(/FOREIGN KEY constraint failed/);

      rawDb.close();
    });
  });

  describe('Data Integrity', () => {
    it('should link same player across multiple events', () => {
      // 2つのイベントを作成
      const event1 = createEvent({
        eventId: 'INTEGRITY_E1',
        name: 'Event 1',
        date: null,
        dateStart: null,
        city: null,
      });
      const event2 = createEvent({
        eventId: 'INTEGRITY_E2',
        name: 'Event 2',
        date: null,
        dateStart: null,
        city: null,
      });

      // 同じプレイヤーが両方のイベントに参加
      const { player } = findOrCreatePlayer({
        playerIdMasked: '7....7',
        firstName: 'Multi',
        lastName: 'Event',
        country: 'JP',
      });

      const part1 = createParticipation({
        playerId: player.id,
        eventId: event1.id,
        division: 'Masters',
        deckListUrl: 'https://example.com/deck1',
        standing: 10,
      });

      const part2 = createParticipation({
        playerId: player.id,
        eventId: event2.id,
        division: 'Masters',
        deckListUrl: 'https://example.com/deck2',
        standing: 5,
      });

      expect(part1).not.toBeNull();
      expect(part2).not.toBeNull();
      expect(part1!.playerId).toBe(part2!.playerId);
      expect(part1!.playerId).toBe(player.id);
    });

    it('should store timestamps correctly', () => {
      const beforeCreate = new Date().toISOString();

      const event = createEvent({
        eventId: 'TIMESTAMP_TEST',
        name: 'Timestamp Test',
        date: null,
        dateStart: null,
        city: null,
      });

      const afterCreate = new Date().toISOString();

      // タイムスタンプが現在時刻の範囲内にあることを確認
      expect(event.createdAt >= beforeCreate).toBe(true);
      expect(event.createdAt <= afterCreate).toBe(true);
      expect(event.updatedAt >= beforeCreate).toBe(true);
      expect(event.updatedAt <= afterCreate).toBe(true);
    });
  });
});
