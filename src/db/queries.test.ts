import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, closeDatabase, events, players, participations } from './index.js';
import { searchPlayers, getParticipationsWithEvents } from './queries.js';
import type { PlayerWithCount, ParticipationDetail } from './queries.js';

describe('queries', () => {
  beforeEach(() => {
    // 既存の接続をクリーンアップしてから新しいDBを作成
    closeDatabase();
    const db = createDatabase(':memory:');

    // テスト用データを挿入
    // Events
    db.insert(events).values([
      { eventId: 'event1', name: 'Tokyo Regional 2024', date: 'June 15-16, 2024', dateStart: '2024-06-15', city: 'Tokyo', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { eventId: 'event2', name: 'Osaka Regional 2024', date: 'May 10-11, 2024', dateStart: '2024-05-10', city: 'Osaka', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { eventId: 'event3', name: 'World Championship 2024', date: 'August 20-21, 2024', dateStart: '2024-08-20', city: 'Honolulu', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]).run();

    // Players
    db.insert(players).values([
      { playerIdMasked: '1....5', firstName: 'Taro', lastName: 'Yamada', country: 'JP', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerIdMasked: '2....8', firstName: 'Hanako', lastName: 'Yamada', country: 'JP', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerIdMasked: '3....2', firstName: 'John', lastName: 'Smith', country: 'US', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerIdMasked: '4....9', firstName: 'Taro', lastName: 'Suzuki', country: 'JP', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerIdMasked: '5....1', firstName: 'Taro', lastName: 'Yamada', country: 'US', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, // 同名別人（別の国）
    ]).run();

    // Participations
    db.insert(participations).values([
      { playerId: 1, eventId: 1, division: 'Masters', deckListUrl: 'https://rk9.gg/decklist/1', standing: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 1, eventId: 2, division: 'Masters', deckListUrl: 'https://rk9.gg/decklist/2', standing: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 1, eventId: 3, division: 'Masters', deckListUrl: null, standing: 32, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 2, eventId: 1, division: 'Senior', deckListUrl: 'https://rk9.gg/decklist/3', standing: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 3, eventId: 3, division: 'Masters', deckListUrl: 'https://rk9.gg/decklist/4', standing: 8, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { playerId: 5, eventId: 1, division: 'Junior', deckListUrl: null, standing: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]).run();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('searchPlayers', () => {
    describe('部分一致検索', () => {
      it('first_nameでの部分一致検索ができる', () => {
        const results = searchPlayers({ name: 'Taro' });

        expect(results.length).toBe(3); // Taro Yamada (JP), Taro Suzuki (JP), Taro Yamada (US)
        expect(results.every((p) => p.firstName === 'Taro')).toBe(true);
      });

      it('last_nameでの部分一致検索ができる', () => {
        const results = searchPlayers({ name: 'Yamada' });

        expect(results.length).toBe(3); // Taro Yamada (JP), Hanako Yamada (JP), Taro Yamada (US)
        expect(results.every((p) => p.lastName === 'Yamada')).toBe(true);
      });

      it('大文字小文字を区別しない検索ができる', () => {
        const results = searchPlayers({ name: 'yamada' });

        expect(results.length).toBe(3);
      });

      it('部分一致で複数のプレイヤーを取得できる', () => {
        const results = searchPlayers({ name: 'a' }); // Taro, Hanako, Yamada, etc.

        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe('フィルター機能', () => {
      it('countryでフィルタリングできる', () => {
        const results = searchPlayers({ name: 'Taro', country: 'JP' });

        expect(results.length).toBe(2); // Taro Yamada (JP), Taro Suzuki (JP)
        expect(results.every((p) => p.country === 'JP')).toBe(true);
      });

      it('divisionでフィルタリングできる', () => {
        const results = searchPlayers({ name: 'Yamada', division: 'Masters' });

        // Taro Yamada (JP) has Masters participations
        expect(results.length).toBeGreaterThan(0);
        // Note: Divisionはparticipationsテーブルにあるので、そのDivisionで参加したことがあるプレイヤーのみ
      });

      it('countryとdivisionの両方でフィルタリングできる', () => {
        const results = searchPlayers({ name: 'Yamada', country: 'JP', division: 'Masters' });

        expect(results.length).toBeGreaterThan(0);
        expect(results.every((p) => p.country === 'JP')).toBe(true);
      });
    });

    describe('参加回数', () => {
      it('各プレイヤーの大会参加回数が含まれる', () => {
        const results = searchPlayers({ name: 'Taro' });
        const taroYamadaJP = results.find((p) => p.firstName === 'Taro' && p.lastName === 'Yamada' && p.country === 'JP');

        expect(taroYamadaJP).toBeDefined();
        expect(taroYamadaJP!.participationCount).toBe(3); // 3大会に参加
      });

      it('参加記録がないプレイヤーは参加回数0で返される', () => {
        const results = searchPlayers({ name: 'Suzuki' });
        const suzuki = results.find((p) => p.lastName === 'Suzuki');

        expect(suzuki).toBeDefined();
        expect(suzuki!.participationCount).toBe(0); // 参加記録なし
      });
    });

    describe('制限', () => {
      it('デフォルトで100件までの制限がある', () => {
        const results = searchPlayers({ name: 'a' });

        expect(results.length).toBeLessThanOrEqual(100);
      });

      it('limitを指定して件数を制限できる', () => {
        const results = searchPlayers({ name: 'a', limit: 2 });

        expect(results.length).toBeLessThanOrEqual(2);
      });

      it('limit=500まで指定できる', () => {
        const results = searchPlayers({ name: 'a', limit: 500 });

        expect(results.length).toBeLessThanOrEqual(500);
      });
    });

    describe('空結果', () => {
      it('マッチしない場合は空配列を返す', () => {
        const results = searchPlayers({ name: 'NonExistent' });

        expect(results).toEqual([]);
      });
    });
  });

  describe('getParticipationsWithEvents', () => {
    describe('基本機能', () => {
      it('プレイヤーの参加記録を取得できる', () => {
        const results = getParticipationsWithEvents(1); // Taro Yamada (JP)

        expect(results.length).toBe(3);
      });

      it('大会情報が結合されている', () => {
        const results = getParticipationsWithEvents(1);

        results.forEach((r) => {
          expect(r.eventName).toBeDefined();
          expect(r.eventDate).toBeDefined();
          expect(r.eventCity).toBeDefined();
        });
      });

      it('同名別人判別用の情報が含まれる', () => {
        const results = getParticipationsWithEvents(1);

        results.forEach((r) => {
          expect(r.playerIdMasked).toBeDefined();
          expect(r.country).toBeDefined();
          expect(r.division).toBeDefined();
        });
      });
    });

    describe('ソート順', () => {
      it('開催日の新しい順（降順）でソートされる', () => {
        const results = getParticipationsWithEvents(1);

        // event3 (2024-08-20) > event1 (2024-06-15) > event2 (2024-05-10)
        expect(results[0].eventName).toBe('World Championship 2024');
        expect(results[1].eventName).toBe('Tokyo Regional 2024');
        expect(results[2].eventName).toBe('Osaka Regional 2024');
      });
    });

    describe('Divisionフィルター', () => {
      it('divisionでフィルタリングできる', () => {
        const results = getParticipationsWithEvents(1, 'Masters');

        expect(results.length).toBe(3); // すべてMasters
        expect(results.every((r) => r.division === 'Masters')).toBe(true);
      });

      it('マッチしないdivisionの場合は空配列を返す', () => {
        const results = getParticipationsWithEvents(1, 'Junior');

        expect(results).toEqual([]);
      });
    });

    describe('存在しないプレイヤー', () => {
      it('存在しないプレイヤーIDの場合は空配列を返す', () => {
        const results = getParticipationsWithEvents(9999);

        expect(results).toEqual([]);
      });
    });

    describe('デッキリストURL', () => {
      it('デッキリストURLがある場合は含まれる', () => {
        const results = getParticipationsWithEvents(1);
        const withDeck = results.find((r) => r.deckListUrl !== null);

        expect(withDeck).toBeDefined();
        expect(withDeck!.deckListUrl).toMatch(/^https:\/\/rk9\.gg\/decklist/);
      });

      it('デッキリストURLがない場合はnull', () => {
        const results = getParticipationsWithEvents(1);
        const withoutDeck = results.find((r) => r.eventName === 'World Championship 2024');

        expect(withoutDeck).toBeDefined();
        expect(withoutDeck!.deckListUrl).toBeNull();
      });
    });
  });
});
