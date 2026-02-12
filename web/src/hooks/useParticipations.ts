/**
 * 参加記録取得フック
 * プレイヤー選択時に参加記録を取得
 */

import { useState, useEffect, useCallback } from 'react';
import { getPlayerParticipations, ApiClientError } from '../api';
import type { ParticipationWithEvent, PlayerInfo, DivisionFilter } from '../types';

interface UseParticipationsResult {
  player: PlayerInfo | null;
  participations: ParticipationWithEvent[];
  isLoading: boolean;
  error: string | null;
  divisionFilter: DivisionFilter;
  setDivisionFilter: (division: DivisionFilter) => void;
}

export function useParticipations(playerId: number | null): UseParticipationsResult {
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [participations, setParticipations] = useState<ParticipationWithEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>('all');

  const fetchParticipations = useCallback(async () => {
    if (playerId === null) {
      setPlayer(null);
      setParticipations([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getPlayerParticipations(
        playerId,
        divisionFilter === 'all' ? undefined : divisionFilter
      );

      setPlayer(response.player);
      setParticipations(response.participations);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load participation history');
      }
      setPlayer(null);
      setParticipations([]);
    } finally {
      setIsLoading(false);
    }
  }, [playerId, divisionFilter]);

  // プレイヤーID変更時にフェッチ
  useEffect(() => {
    fetchParticipations();
  }, [fetchParticipations]);

  return {
    player,
    participations,
    isLoading,
    error,
    divisionFilter,
    setDivisionFilter,
  };
}
