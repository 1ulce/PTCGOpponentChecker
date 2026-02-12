/**
 * APIクライアントのテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchPlayers, getPlayerParticipations, ApiClientError } from './client';
import type {
  PlayerSearchResponse,
  ParticipationsResponse,
} from '../types';

// グローバルfetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('searchPlayers', () => {
    it('名前で検索できる', async () => {
      const mockResponse: PlayerSearchResponse = {
        players: [
          {
            id: 1,
            playerIdMasked: '2....5',
            firstName: 'Taro',
            lastName: 'Yamada',
            country: 'JP',
            participationCount: 5,
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await searchPlayers({ name: 'Yamada' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players/search?name=Yamada',
        expect.any(Object)
      );
      expect(result.players).toHaveLength(1);
      expect(result.players[0].lastName).toBe('Yamada');
    });

    it('country付きで検索できる', async () => {
      const mockResponse: PlayerSearchResponse = {
        players: [],
        total: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await searchPlayers({ name: 'Test', country: 'JP' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players/search?name=Test&country=JP',
        expect.any(Object)
      );
    });

    it('division付きで検索できる', async () => {
      const mockResponse: PlayerSearchResponse = {
        players: [],
        total: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await searchPlayers({ name: 'Test', division: 'Masters' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players/search?name=Test&division=Masters',
        expect.any(Object)
      );
    });

    it('limit付きで検索できる', async () => {
      const mockResponse: PlayerSearchResponse = {
        players: [],
        total: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await searchPlayers({ name: 'Test', limit: 50 });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players/search?name=Test&limit=50',
        expect.any(Object)
      );
    });

    it('division=allの場合はパラメータに含めない', async () => {
      const mockResponse: PlayerSearchResponse = {
        players: [],
        total: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await searchPlayers({ name: 'Test', division: 'all' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players/search?name=Test',
        expect.any(Object)
      );
    });

    it('400エラー時にApiClientErrorをthrow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'name is required' }),
      });

      try {
        await searchPlayers({ name: '' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).message).toBe('name is required');
        expect((error as ApiClientError).status).toBe(400);
      }
    });
  });

  describe('getPlayerParticipations', () => {
    it('プレイヤーIDで参加記録を取得できる', async () => {
      const mockResponse: ParticipationsResponse = {
        player: {
          id: 1,
          firstName: 'Taro',
          lastName: 'Yamada',
          playerIdMasked: '2....5',
          country: 'JP',
        },
        participations: [
          {
            participationId: 1,
            eventName: 'Japan Championships 2024',
            eventDate: '2024-06-15',
            eventCity: 'Tokyo',
            division: 'Masters',
            deckListUrl: 'https://example.com/deck/1',
            standing: 1,
            playerIdMasked: '2....5',
            country: 'JP',
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getPlayerParticipations(1);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players/1/participations',
        expect.any(Object)
      );
      expect(result.player.id).toBe(1);
      expect(result.participations).toHaveLength(1);
    });

    it('divisionフィルター付きで取得できる', async () => {
      const mockResponse: ParticipationsResponse = {
        player: {
          id: 1,
          firstName: 'Taro',
          lastName: 'Yamada',
          playerIdMasked: '2....5',
          country: 'JP',
        },
        participations: [],
        total: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await getPlayerParticipations(1, 'Senior');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players/1/participations?division=Senior',
        expect.any(Object)
      );
    });

    it('404エラー時にApiClientErrorをthrow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Player not found' }),
      });

      try {
        await getPlayerParticipations(9999);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).message).toBe('Player not found');
        expect((error as ApiClientError).status).toBe(404);
      }
    });

    it('ネットワークエラー時にApiClientErrorをthrow', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await getPlayerParticipations(1);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).message).toBe('ネットワークエラーが発生しました');
      }
    });
  });
});
