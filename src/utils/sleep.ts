/**
 * 指定ミリ秒だけ待機するユーティリティ
 * @param ms 待機時間（ミリ秒）
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 最小・最大の範囲内でランダムな待機時間を返す
 * @param minMs 最小待機時間（ミリ秒）
 * @param maxMs 最大待機時間（ミリ秒）
 */
export function randomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * ランダムな時間だけ待機する（polite crawling用）
 * @param minMs 最小待機時間（ミリ秒）
 * @param maxMs 最大待機時間（ミリ秒）
 */
export async function sleepRandom(minMs: number, maxMs: number): Promise<void> {
  const delay = randomDelay(minMs, maxMs);
  await sleep(delay);
}
