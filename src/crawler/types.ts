/**
 * クローラー共通型定義
 * エラーハンドリング、結果集約のための型
 */

/**
 * クローラーエラー種別
 */
export enum CrawlerErrorType {
  /** ネットワーク接続失敗 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** HTMLパース失敗 */
  PARSE_ERROR = 'PARSE_ERROR',
  /** ページ読み込みタイムアウト */
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  /** DB操作失敗 */
  DATABASE_ERROR = 'DATABASE_ERROR',
  /** レートリミット検出 */
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
}

/**
 * リトライ可能なエラー種別
 */
const RETRYABLE_ERROR_TYPES = new Set([
  CrawlerErrorType.NETWORK_ERROR,
  CrawlerErrorType.TIMEOUT_ERROR,
  CrawlerErrorType.RATE_LIMIT_ERROR,
]);

/**
 * クローラーエラー
 */
export interface CrawlerError {
  /** エラー種別 */
  type: CrawlerErrorType;
  /** エラーメッセージ */
  message: string;
  /** 関連する大会ID（あれば） */
  eventId?: string;
  /** エラー発生時刻（ISO8601形式） */
  timestamp: string;
  /** リトライ可能かどうか */
  retryable: boolean;
}

/**
 * クローラーエラーを作成
 * @param type エラー種別
 * @param message エラーメッセージ
 * @param eventId 関連する大会ID
 * @returns CrawlerErrorオブジェクト
 */
export function createCrawlerError(
  type: CrawlerErrorType,
  message: string,
  eventId?: string
): CrawlerError {
  return {
    type,
    message,
    eventId,
    timestamp: new Date().toISOString(),
    retryable: RETRYABLE_ERROR_TYPES.has(type),
  };
}

/**
 * クローラーエラーがリトライ可能かを判定
 * @param error クローラーエラー
 * @returns リトライ可能ならtrue
 */
export function isRetryableCrawlerError(error: CrawlerError): boolean {
  return error.retryable;
}

/**
 * JavaScriptエラーからクローラーエラーを作成
 * @param error JavaScriptエラー
 * @param eventId 関連する大会ID
 * @returns CrawlerError
 */
export function fromJsError(error: Error, eventId?: string): CrawlerError {
  const message = error.message.toLowerCase();

  // エラーメッセージからタイプを推測
  if (message.includes('timeout') || message.includes('navigation')) {
    return createCrawlerError(CrawlerErrorType.TIMEOUT_ERROR, error.message, eventId);
  }
  if (message.includes('network') || message.includes('econnreset') || message.includes('socket')) {
    return createCrawlerError(CrawlerErrorType.NETWORK_ERROR, error.message, eventId);
  }
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many')) {
    return createCrawlerError(CrawlerErrorType.RATE_LIMIT_ERROR, error.message, eventId);
  }
  if (message.includes('database') || message.includes('sqlite') || message.includes('constraint')) {
    return createCrawlerError(CrawlerErrorType.DATABASE_ERROR, error.message, eventId);
  }

  // デフォルトはパースエラー
  return createCrawlerError(CrawlerErrorType.PARSE_ERROR, error.message, eventId);
}

// ============================================
// クローリング結果型
// ============================================

/**
 * 大会一覧クローリング結果
 */
export interface CrawlResult {
  /** 追加された大会数 */
  eventsAdded: number;
  /** スキップされた大会数 */
  eventsSkipped: number;
  /** 発生したエラー */
  errors: CrawlerError[];
}

/**
 * Rosterクローリング結果
 */
export interface RosterCrawlResult {
  /** 対象大会ID */
  eventId: string;
  /** 新規追加されたプレイヤー数 */
  playersAdded: number;
  /** 再利用されたプレイヤー数 */
  playersReused: number;
  /** 追加された参加記録数 */
  participationsAdded: number;
  /** 発生したエラー */
  errors: CrawlerError[];
}

/**
 * クローリング全体サマリー
 */
export interface CrawlSummary {
  /** 処理した大会数 */
  totalEventsProcessed: number;
  /** 新規追加された大会数 */
  newEventsAdded: number;
  /** 新規追加されたプレイヤー数 */
  newPlayersAdded: number;
  /** 新規追加された参加記録数 */
  newParticipationsAdded: number;
  /** エラー総数 */
  totalErrors: number;
  /** 実行時間（ミリ秒） */
  duration: number;
}

// ============================================
// パース済みデータ型（spikeで検証済みの構造）
// ============================================

/**
 * パース済み大会情報
 */
export interface ParsedEvent {
  /** rk9の大会ID */
  eventId: string;
  /** 大会名 */
  name: string;
  /** 開催日 */
  date: string | null;
  /** 開催地 */
  city: string | null;
}

/**
 * パース済み参加者情報
 */
export interface ParsedParticipant {
  /** マスク済みプレイヤーID（例: "2....8"） */
  playerIdMasked: string;
  /** 名 */
  firstName: string;
  /** 姓 */
  lastName: string;
  /** 国 */
  country: string;
  /** Division（Masters/Senior/Junior） */
  division: string | null;
  /** デッキリストURL */
  deckListUrl: string | null;
  /** 順位 */
  standing: number | null;
}
