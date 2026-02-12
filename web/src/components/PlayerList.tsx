/**
 * プレイヤー一覧コンポーネント
 * 検索結果のプレイヤーをカード形式で表示
 */

import type { PlayerSearchResult } from '../types';

interface PlayerListProps {
  players: PlayerSearchResult[];
  selectedPlayerId: number | null;
  onSelectPlayer: (playerId: number) => void;
  isLoading: boolean;
  hasSearched: boolean;
}

export function PlayerList({
  players,
  selectedPlayerId,
  onSelectPlayer,
  isLoading,
  hasSearched,
}: PlayerListProps) {
  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!hasSearched) {
    return null;
  }

  if (players.length === 0) {
    return (
      <div className="empty-message">
        <p>No players found matching your search.</p>
      </div>
    );
  }

  return (
    <div className="player-list">
      <h2>Players ({players.length})</h2>
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          isSelected={player.id === selectedPlayerId}
          onClick={() => onSelectPlayer(player.id)}
        />
      ))}
    </div>
  );
}

interface PlayerCardProps {
  player: PlayerSearchResult;
  isSelected: boolean;
  onClick: () => void;
}

function PlayerCard({ player, isSelected, onClick }: PlayerCardProps) {
  return (
    <button
      type="button"
      className={`card player-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="player-name">
        {player.firstName} {player.lastName}
      </div>
      <div className="player-meta text-sm text-muted">
        <span className="player-country">{player.country}</span>
        <span className="player-id">ID: {player.playerIdMasked}</span>
        <span className="player-count">{player.participationCount} events</span>
      </div>
    </button>
  );
}
