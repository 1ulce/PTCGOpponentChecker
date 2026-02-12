/**
 * プレイヤー検索状態管理フック
 */

import { useState, useCallback } from 'react';
import { searchPlayers, ApiClientError } from '../api';
import type { PlayerSearchResult, SearchState } from '../types';

interface UsePlayerSearchResult {
  // 検索条件
  searchState: SearchState;
  setSearchState: (state: SearchState) => void;

  // 検索結果
  players: PlayerSearchResult[];
  hasSearched: boolean;

  // ローディング・エラー状態
  isSearching: boolean;
  searchError: string | null;

  // 選択状態
  selectedPlayerId: number | null;
  setSelectedPlayerId: (id: number | null) => void;

  // アクション
  executeSearch: () => Promise<void>;
  clearResults: () => void;
}

const initialSearchState: SearchState = {
  name: '',
  country: '',
  division: 'all',
};

export function usePlayerSearch(): UsePlayerSearchResult {
  // 検索条件
  const [searchState, setSearchState] = useState<SearchState>(initialSearchState);

  // 検索結果
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // ローディング・エラー状態
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 選択状態
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // 検索実行
  const executeSearch = useCallback(async () => {
    if (!searchState.name.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSelectedPlayerId(null);

    try {
      const response = await searchPlayers({
        name: searchState.name.trim(),
        country: searchState.country || undefined,
        division: searchState.division === 'all' ? undefined : searchState.division,
      });

      setPlayers(response.players);
      setHasSearched(true);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSearchError(error.message);
      } else {
        setSearchError('An unexpected error occurred');
      }
      setPlayers([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchState]);

  // 結果クリア
  const clearResults = useCallback(() => {
    setPlayers([]);
    setHasSearched(false);
    setSearchError(null);
    setSelectedPlayerId(null);
  }, []);

  return {
    searchState,
    setSearchState,
    players,
    hasSearched,
    isSearching,
    searchError,
    selectedPlayerId,
    setSelectedPlayerId,
    executeSearch,
    clearResults,
  };
}
