/**
 * Appコンポーネントの統合テスト
 * 主要フローの動作を検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import type { PlayerSearchResponse, ParticipationsResponse } from './types';

// グローバルfetchのモック
const mockFetch = vi.fn();

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('初期表示でタイトルと検索フォームが表示される', () => {
    render(<App />);

    expect(screen.getByText('PTCG Opponent Checker')).toBeInTheDocument();
    expect(screen.getByLabelText('Player Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
    expect(screen.getByLabelText('Division')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('名前が空の場合は検索ボタンが無効', () => {
    render(<App />);

    const searchButton = screen.getByRole('button', { name: 'Search' });
    expect(searchButton).toBeDisabled();
  });

  it('名前を入力すると検索ボタンが有効になる', () => {
    render(<App />);

    const nameInput = screen.getByLabelText('Player Name');
    fireEvent.change(nameInput, { target: { value: 'Yamada' } });

    const searchButton = screen.getByRole('button', { name: 'Search' });
    expect(searchButton).not.toBeDisabled();
  });

  it('検索するとローディング状態になり、結果が表示される', async () => {
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
        {
          id: 2,
          playerIdMasked: '3....8',
          firstName: 'Hanako',
          lastName: 'Yamada',
          country: 'JP',
          participationCount: 3,
        },
      ],
      total: 2,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<App />);

    // 名前を入力
    const nameInput = screen.getByLabelText('Player Name');
    fireEvent.change(nameInput, { target: { value: 'Yamada' } });

    // 検索ボタンをクリック
    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    // ローディング中の表示
    expect(screen.getByText('Searching...')).toBeInTheDocument();

    // 結果が表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText('Players (2)')).toBeInTheDocument();
    });

    // プレイヤーカードが表示される
    expect(screen.getByText('Taro Yamada')).toBeInTheDocument();
    expect(screen.getByText('Hanako Yamada')).toBeInTheDocument();
  });

  it('検索結果が0件の場合はメッセージが表示される', async () => {
    const mockResponse: PlayerSearchResponse = {
      players: [],
      total: 0,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<App />);

    const nameInput = screen.getByLabelText('Player Name');
    fireEvent.change(nameInput, { target: { value: 'Unknown' } });

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(
        screen.getByText('No players found matching your search.')
      ).toBeInTheDocument();
    });
  });

  it('プレイヤー選択で参加記録が表示される', async () => {
    const searchResponse: PlayerSearchResponse = {
      players: [
        {
          id: 1,
          playerIdMasked: '2....5',
          firstName: 'Taro',
          lastName: 'Yamada',
          country: 'JP',
          participationCount: 2,
        },
      ],
      total: 1,
    };

    const participationsResponse: ParticipationsResponse = {
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
          deckListUrl: 'https://rk9.gg/decklist/1',
          standing: 1,
          playerIdMasked: '2....5',
          country: 'JP',
        },
        {
          participationId: 2,
          eventName: 'Regional Championships 2024',
          eventDate: '2024-03-10',
          eventCity: 'Osaka',
          division: 'Masters',
          deckListUrl: null,
          standing: 16,
          playerIdMasked: '2....5',
          country: 'JP',
        },
      ],
      total: 2,
    };

    // 検索APIのモック
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => searchResponse,
    });

    render(<App />);

    // 検索
    const nameInput = screen.getByLabelText('Player Name');
    fireEvent.change(nameInput, { target: { value: 'Yamada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    // 検索結果が表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText('Taro Yamada')).toBeInTheDocument();
    });

    // 参加記録APIのモック
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => participationsResponse,
    });

    // プレイヤーを選択
    const playerCard = screen.getByText('Taro Yamada').closest('button');
    fireEvent.click(playerCard!);

    // 参加記録が表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText('Japan Championships 2024')).toBeInTheDocument();
    });

    // 大会情報が表示される
    expect(screen.getByText('Regional Championships 2024')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#16')).toBeInTheDocument();

    // デッキリストリンクが表示される
    expect(screen.getByText('View Deck List')).toBeInTheDocument();
  });

  it('APIエラー時にエラーメッセージが表示される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'name is required' }),
    });

    render(<App />);

    const nameInput = screen.getByLabelText('Player Name');
    fireEvent.change(nameInput, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('name is required')).toBeInTheDocument();
    });
  });

  it('Countryフィルターで検索できる', async () => {
    const mockResponse: PlayerSearchResponse = {
      players: [],
      total: 0,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<App />);

    // 名前を入力
    const nameInput = screen.getByLabelText('Player Name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    // Countryを選択
    const countrySelect = screen.getByLabelText('Country');
    fireEvent.change(countrySelect, { target: { value: 'JP' } });

    // 検索
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('country=JP'),
        expect.any(Object)
      );
    });
  });

  it('Divisionフィルターで検索できる', async () => {
    const mockResponse: PlayerSearchResponse = {
      players: [],
      total: 0,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<App />);

    // 名前を入力
    const nameInput = screen.getByLabelText('Player Name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    // Divisionを選択
    const divisionSelect = screen.getByLabelText('Division');
    fireEvent.change(divisionSelect, { target: { value: 'Masters' } });

    // 検索
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('division=Masters'),
        expect.any(Object)
      );
    });
  });
});
