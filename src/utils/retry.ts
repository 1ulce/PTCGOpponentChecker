/**
 * リトライ機能
 * 指数バックオフによるリトライをサポート
 */

export interface RetryOptions {
  /** 最大リトライ回数（デフォルト: 3） */
  maxRetries?: number;
  /** 初回待機時間（ミリ秒、デフォルト: 1000） */
  initialDelay?: number;
  /** バックオフ乗数（デフォルト: 2） */
  backoffMultiplier?: number;
  /** 最大待機時間（ミリ秒、デフォルト: 30000） */
  maxDelay?: number;
  /** リトライ時のコールバック */
  onRetry?: (error: Error, attempt: number) => void;
  /** リトライすべきかを判定する関数 */
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'shouldRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
};

/**
 * 指定時間待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 関数を指数バックオフでリトライ実行
 * @param fn 実行する非同期関数
 * @param options リトライオプション
 * @returns 関数の戻り値
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelay = DEFAULT_OPTIONS.initialDelay,
    backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
    maxDelay = DEFAULT_OPTIONS.maxDelay,
    onRetry,
    shouldRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // shouldRetryがfalseを返したらリトライしない
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      // 最後の試行ならエラーをスロー
      if (attempt >= maxRetries) {
        throw lastError;
      }

      // リトライコールバック
      if (onRetry) {
        onRetry(lastError, attempt);
      }

      // 待機
      await sleep(delay);

      // 次回の待機時間を計算（指数バックオフ）
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  // TypeScript用（到達しないが必要）
  throw lastError!;
}

/**
 * リトライ可能なエラーかどうかを判定
 * ネットワークエラー、タイムアウトエラーはリトライ可能
 */
export function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    /network/i,
    /timeout/i,
    /ECONNRESET/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /socket hang up/i,
    /rate limit/i,
  ];

  return retryablePatterns.some((pattern) => pattern.test(error.message));
}
