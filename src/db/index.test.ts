import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { createDatabase, closeDatabase, events, players, participations } from './index.js';

const TEST_DB_PATH = './data/test.db';

describe('Database Connection', () => {
  beforeEach(() => {
    // テスト用DBを削除
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    // data ディレクトリが存在しない場合は作成
    if (!existsSync('./data')) {
      mkdirSync('./data', { recursive: true });
    }
  });

  afterEach(() => {
    // クリーンアップ
    closeDatabase();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  describe('createDatabase', () => {
    it('DBファイルが作成されること', () => {
      const db = createDatabase(TEST_DB_PATH);
      expect(db).toBeDefined();
      expect(existsSync(TEST_DB_PATH)).toBe(true);
    });

    it('eventsテーブルにクエリできること', () => {
      const db = createDatabase(TEST_DB_PATH);
      const result = db.select().from(events).all();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('playersテーブルにクエリできること', () => {
      const db = createDatabase(TEST_DB_PATH);
      const result = db.select().from(players).all();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('participationsテーブルにクエリできること', () => {
      const db = createDatabase(TEST_DB_PATH);
      const result = db.select().from(participations).all();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
