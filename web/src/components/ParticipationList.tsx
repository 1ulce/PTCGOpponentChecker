/**
 * 参加記録一覧コンポーネント
 * 選択プレイヤーの大会参加履歴を表示
 */

import type { ParticipationWithEvent, PlayerInfo } from '../types';

interface ParticipationListProps {
  player: PlayerInfo | null;
  participations: ParticipationWithEvent[];
  isLoading: boolean;
  error: string | null;
}

export function ParticipationList({
  player,
  participations,
  isLoading,
  error,
}: ParticipationListProps) {
  if (!player && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="participation-list">
        <h2>Participation History</h2>
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="participation-list">
        <h2>Participation History</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!player) {
    return null;
  }

  return (
    <div className="participation-list">
      <h2>
        {player.firstName} {player.lastName}
      </h2>
      <div className="player-detail-meta text-sm text-muted mb-4">
        <span>ID: {player.playerIdMasked}</span>
        <span> | </span>
        <span>{player.country}</span>
      </div>

      {participations.length === 0 ? (
        <div className="empty-message">
          <p>No participation records found.</p>
        </div>
      ) : (
        <div className="participation-cards">
          {participations.map((p) => (
            <ParticipationCard key={p.participationId} participation={p} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ParticipationCardProps {
  participation: ParticipationWithEvent;
}

const RK9_BASE_URL = 'https://rk9.gg';

function ParticipationCard({ participation }: ParticipationCardProps) {
  const getDeckListUrl = (url: string | null) => {
    if (!url) return null;
    // すでに絶対URLならそのまま返す
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // 相対パスならrk9.ggのベースURLを追加
    return `${RK9_BASE_URL}${url}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Date unknown';
    // DBには "February 7-8, 2026" のような範囲形式で保存されている
    // この形式はすでに読みやすいのでそのまま表示
    return dateStr;
  };

  return (
    <div className="card participation-card">
      <div className="participation-header">
        <div className="event-name">{participation.eventName}</div>
        <div className="standing">
          {participation.standing ? `#${participation.standing}` : '-'}
        </div>
      </div>

      <div className="participation-meta text-sm text-muted">
        <span>{formatDate(participation.eventDate)}</span>
        {participation.eventCity && (
          <>
            <span> | </span>
            <span>{participation.eventCity}</span>
          </>
        )}
        {participation.division && (
          <>
            <span> | </span>
            <span>{participation.division}</span>
          </>
        )}
      </div>

      {participation.deckListUrl && (
        <div className="deck-link mt-2">
          <a
            href={getDeckListUrl(participation.deckListUrl)!}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Deck List
          </a>
        </div>
      )}
    </div>
  );
}
