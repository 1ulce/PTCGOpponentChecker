/**
 * フロントエンド用型定義
 * バックエンドAPIのレスポンス型と整合性を保つ
 */

// ============================================
// Player Search
// ============================================

/** プレイヤー検索結果の1件 */
export interface PlayerSearchResult {
  id: number;
  playerIdMasked: string;
  firstName: string;
  lastName: string;
  country: string;
  participationCount: number;
}

/** プレイヤー検索APIのレスポンス */
export interface PlayerSearchResponse {
  players: PlayerSearchResult[];
  total: number;
}

/** プレイヤー検索のパラメータ */
export interface SearchPlayersParams {
  name: string;
  country?: string;
  division?: 'Masters' | 'Senior' | 'Junior' | 'all';
  limit?: number;
}

// ============================================
// Participations
// ============================================

/** 参加記録の詳細（イベント情報付き） */
export interface ParticipationWithEvent {
  participationId: number;
  eventName: string;
  eventDate: string | null;
  eventCity: string | null;
  division: string | null;
  deckListUrl: string | null;
  standing: number | null;
  playerIdMasked: string;
  country: string;
}

/** プレイヤー情報（参加記録レスポンス用） */
export interface PlayerInfo {
  id: number;
  firstName: string;
  lastName: string;
  playerIdMasked: string;
  country: string;
}

/** 参加記録取得APIのレスポンス */
export interface ParticipationsResponse {
  player: PlayerInfo;
  participations: ParticipationWithEvent[];
  total: number;
}

// ============================================
// API Error
// ============================================

/** APIエラーレスポンス */
export interface ApiError {
  error: string;
}

// ============================================
// App State
// ============================================

/** Division選択肢 */
export type DivisionFilter = 'all' | 'Masters' | 'Senior' | 'Junior';

/** 検索パラメータの状態 */
export interface SearchState {
  name: string;
  country: string;
  division: DivisionFilter;
}
