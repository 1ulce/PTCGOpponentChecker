import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { createDatabase, closeDatabase, events, players, participations } from '../../db/index.js';
import { playersRoutes } from './players.js';

describe('Players API Routes', () => {
  let app: Hono;

  beforeEach(() => {
    // テスト用DBを初期化
    closeDatabase();
    const db = createDatabase(':memory:');

    // テストデータを挿入
    db.insert(events).values([
      { eventId: 'event1', name: 'Tokyo Regional 2024', date: 'June 15-16, 2024', dateStart: '2024-06-15', city: 'Tokyo', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { eventId: 'event2', name: 'Osaka Regional 2024', date: 'May 10-11, 2024', dateStart: '2024-05-10', city: 'Osaka', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]).run();

    db.insert(players).values([
      { playerIdMasked: '1....5', firstName: 'Taro', lastName: 'Yamada', country: 'JP', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerIdMasked: '2....8', firstName: 'Hanako', lastName: 'Yamada', country: 'JP', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerIdMasked: '3....2', firstName: 'John', lastName: 'Smith', country: 'US', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]).run();

    db.insert(participations).values([
      { playerId: 1, eventId: 1, division: 'Masters', deckListUrl: 'https://rk9.gg/decklist/1', standing: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 1, eventId: 2, division: 'Masters', deckListUrl: 'https://rk9.gg/decklist/2', standing: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 2, eventId: 1, division: 'Senior', deckListUrl: null, standing: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]).run();

    // Honoアプリをセットアップ
    app = new Hono();
    app.route('/api/players', playersRoutes);
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('GET /api/players/search', () => {
    describe('正常系', () => {
      it('名前で検索してプレイヤー一覧を返す', async () => {
        const res = await app.request('/api/players/search?name=Yamada');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.players).toHaveLength(2);
        expect(body.total).toBe(2);
      });

      it('各プレイヤーに必要な情報が含まれる', async () => {
        const res = await app.request('/api/players/search?name=Taro');
        const body = await res.json();

        expect(body.players[0]).toHaveProperty('id');
        expect(body.players[0]).toHaveProperty('playerIdMasked');
        expect(body.players[0]).toHaveProperty('firstName');
        expect(body.players[0]).toHaveProperty('lastName');
        expect(body.players[0]).toHaveProperty('country');
        expect(body.players[0]).toHaveProperty('participationCount');
      });

      it('countryでフィルタリングできる', async () => {
        const res = await app.request('/api/players/search?name=a&country=JP');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.players.every((p: any) => p.country === 'JP')).toBe(true);
      });

      it('divisionでフィルタリングできる', async () => {
        const res = await app.request('/api/players/search?name=Yamada&division=Masters');

        expect(res.status).toBe(200);
        const body = await res.json();
        // Taro Yamada のみがMastersに参加
        expect(body.players.length).toBeGreaterThan(0);
      });

      it('limitを指定できる', async () => {
        const res = await app.request('/api/players/search?name=a&limit=1');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.players.length).toBeLessThanOrEqual(1);
      });

      it('検索結果が0件の場合は空配列を返す', async () => {
        const res = await app.request('/api/players/search?name=NonExistent');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.players).toEqual([]);
        expect(body.total).toBe(0);
      });
    });

    describe('バリデーションエラー', () => {
      it('nameが未指定の場合は400エラー', async () => {
        const res = await app.request('/api/players/search');

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('name');
      });

      it('nameが空文字の場合は400エラー', async () => {
        const res = await app.request('/api/players/search?name=');

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('name');
      });

      it('limitが0以下の場合は400エラー', async () => {
        const res = await app.request('/api/players/search?name=Taro&limit=0');

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('limit');
      });

      it('limitが500を超える場合は400エラー', async () => {
        const res = await app.request('/api/players/search?name=Taro&limit=501');

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('limit');
      });

      it('limitが数値でない場合は400エラー', async () => {
        const res = await app.request('/api/players/search?name=Taro&limit=abc');

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('limit');
      });
    });
  });

  describe('GET /api/players/:id/participations', () => {
    describe('正常系', () => {
      it('プレイヤーの参加記録を返す', async () => {
        const res = await app.request('/api/players/1/participations');

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.participations).toHaveLength(2);
        expect(body.total).toBe(2);
      });

      it('プレイヤー情報が含まれる', async () => {
        const res = await app.request('/api/players/1/participations');
        const body = await res.json();

        expect(body.player).toHaveProperty('id');
        expect(body.player).toHaveProperty('firstName');
        expect(body.player).toHaveProperty('lastName');
        expect(body.player).toHaveProperty('playerIdMasked');
        expect(body.player).toHaveProperty('country');
      });

      it('各参加記録に必要な情報が含まれる', async () => {
        const res = await app.request('/api/players/1/participations');
        const body = await res.json();

        expect(body.participations[0]).toHaveProperty('participationId');
        expect(body.participations[0]).toHaveProperty('eventName');
        expect(body.participations[0]).toHaveProperty('eventDate');
        expect(body.participations[0]).toHaveProperty('eventCity');
        expect(body.participations[0]).toHaveProperty('division');
        expect(body.participations[0]).toHaveProperty('deckListUrl');
        expect(body.participations[0]).toHaveProperty('standing');
        expect(body.participations[0]).toHaveProperty('playerIdMasked');
        expect(body.participations[0]).toHaveProperty('country');
      });

      it('開催日の新しい順（降順）でソートされる', async () => {
        const res = await app.request('/api/players/1/participations');
        const body = await res.json();

        // Tokyo (2024-06-15) > Osaka (2024-05-10)
        expect(body.participations[0].eventName).toBe('Tokyo Regional 2024');
        expect(body.participations[1].eventName).toBe('Osaka Regional 2024');
      });

      it('divisionでフィルタリングできる', async () => {
        const res = await app.request('/api/players/1/participations?division=Masters');
        const body = await res.json();

        expect(body.participations.every((p: any) => p.division === 'Masters')).toBe(true);
      });

      it('参加記録がない場合は空配列を返す', async () => {
        const res = await app.request('/api/players/3/participations');
        const body = await res.json();

        expect(body.participations).toEqual([]);
        expect(body.total).toBe(0);
      });
    });

    describe('エラーケース', () => {
      it('存在しないプレイヤーIDの場合は404エラー', async () => {
        const res = await app.request('/api/players/9999/participations');

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toContain('not found');
      });

      it('IDが数値でない場合は400エラー', async () => {
        const res = await app.request('/api/players/abc/participations');

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBeDefined();
      });
    });
  });
});
