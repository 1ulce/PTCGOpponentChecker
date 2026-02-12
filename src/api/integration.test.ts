import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, closeDatabase, events, players, participations } from '../db/index.js';
import { app } from './index.js';

describe('API Integration Tests', () => {
  beforeEach(() => {
    // テスト用DBを初期化
    closeDatabase();
    const db = createDatabase(':memory:');

    // テストデータを挿入
    db.insert(events).values([
      { eventId: 'event1', name: 'Tokyo Regional 2024', date: 'June 15-16, 2024', dateStart: '2024-06-15', city: 'Tokyo', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { eventId: 'event2', name: 'Osaka Regional 2024', date: 'May 10-11, 2024', dateStart: '2024-05-10', city: 'Osaka', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { eventId: 'event3', name: 'World Championship 2024', date: 'August 20-21, 2024', dateStart: '2024-08-20', city: 'Honolulu', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]).run();

    db.insert(players).values([
      { playerIdMasked: '1....5', firstName: 'Taro', lastName: 'Yamada', country: 'JP', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerIdMasked: '2....8', firstName: 'Hanako', lastName: 'Yamada', country: 'JP', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerIdMasked: '3....2', firstName: 'John', lastName: 'Smith', country: 'US', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerIdMasked: '4....5', firstName: 'Taro', lastName: 'Yamada', country: 'US', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, // 同名別人
    ]).run();

    db.insert(participations).values([
      { playerId: 1, eventId: 1, division: 'Masters', deckListUrl: 'https://rk9.gg/decklist/1', standing: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 1, eventId: 2, division: 'Masters', deckListUrl: 'https://rk9.gg/decklist/2', standing: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 1, eventId: 3, division: 'Masters', deckListUrl: null, standing: 32, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 2, eventId: 1, division: 'Senior', deckListUrl: 'https://rk9.gg/decklist/3', standing: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 4, eventId: 1, division: 'Junior', deckListUrl: null, standing: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]).run();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('検索から参加記録取得までの一連のフロー', () => {
    it('名前で検索し、取得したIDで参加記録を取得できる', async () => {
      // Step 1: 名前で検索（first_name または last_name で検索）
      const searchRes = await app.request('/api/players/search?name=Taro');
      expect(searchRes.status).toBe(200);

      const searchBody = await searchRes.json();
      expect(searchBody.players.length).toBeGreaterThan(0);

      // Step 2: 最初のプレイヤーのIDで参加記録を取得
      const playerId = searchBody.players[0].id;
      const participationsRes = await app.request(`/api/players/${playerId}/participations`);
      expect(participationsRes.status).toBe(200);

      const participationsBody = await participationsRes.json();
      expect(participationsBody.player.id).toBe(playerId);
      expect(participationsBody.participations).toBeDefined();
    });

    it('同名別人を区別できる情報が取得できる', async () => {
      // "Taro Yamada" を検索すると JP と US の2人がヒット
      const searchRes = await app.request('/api/players/search?name=Taro');
      const searchBody = await searchRes.json();

      // Taro という名前のプレイヤーが複数いる
      const taroPlayers = searchBody.players.filter((p: any) => p.firstName === 'Taro');
      expect(taroPlayers.length).toBeGreaterThanOrEqual(2);

      // 各プレイヤーには国情報が含まれる
      const countries = taroPlayers.map((p: any) => p.country);
      expect(countries).toContain('JP');
      expect(countries).toContain('US');
    });

    it('フィルターを組み合わせて絞り込める', async () => {
      // country=JP で検索
      const res = await app.request('/api/players/search?name=Yamada&country=JP');
      const body = await res.json();

      // JP の Yamada だけがヒット
      expect(body.players.every((p: any) => p.country === 'JP')).toBe(true);
      expect(body.players.every((p: any) => p.lastName === 'Yamada')).toBe(true);
    });
  });

  describe('エラーケースの検証', () => {
    it('検索条件なしでは400エラー', async () => {
      const res = await app.request('/api/players/search');
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('存在しないプレイヤーIDでは404エラー', async () => {
      const res = await app.request('/api/players/9999/participations');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('not found');
    });

    it('不正なlimit値では400エラー', async () => {
      const res = await app.request('/api/players/search?name=Test&limit=999');
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('limit');
    });
  });

  describe('ヘルスチェック', () => {
    it('/api/health が正常に応答する', async () => {
      const res = await app.request('/api/health');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('ok');
    });
  });

  describe('404エンドポイント', () => {
    it('存在しないエンドポイントは404を返す', async () => {
      const res = await app.request('/api/nonexistent');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBeDefined();
    });
  });
});
