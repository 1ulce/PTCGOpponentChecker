import { describe, it, expect, vi } from 'vitest';
import { retry } from './retry.js';

describe('retry', () => {
  it('成功時は結果を返すこと', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('失敗後にリトライして成功すること', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('1回目失敗'))
      .mockRejectedValueOnce(new Error('2回目失敗'))
      .mockResolvedValue('3回目成功');

    const result = await retry(fn, { maxRetries: 3, initialDelay: 10 });
    expect(result).toBe('3回目成功');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('最大リトライ回数を超えたらエラーをスローすること', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('常に失敗'));

    await expect(retry(fn, { maxRetries: 2, initialDelay: 10 }))
      .rejects.toThrow('常に失敗');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('指数バックオフで待機時間が増加すること', async () => {
    const delays: number[] = [];

    vi.spyOn(global, 'setTimeout').mockImplementation((fn: () => void, delay?: number) => {
      if (delay) delays.push(delay);
      fn();
      return 0 as unknown as NodeJS.Timeout;
    });

    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('1回目'))
      .mockRejectedValueOnce(new Error('2回目'))
      .mockResolvedValue('成功');

    await retry(fn, { maxRetries: 3, initialDelay: 100, backoffMultiplier: 2 });

    // 1回目: 100ms, 2回目: 200ms（backoff）
    expect(delays.length).toBe(2);
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);

    vi.restoreAllMocks();
  });

  it('onRetryコールバックが呼ばれること', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('失敗'))
      .mockResolvedValue('成功');

    await retry(fn, { maxRetries: 2, initialDelay: 10, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('shouldRetryがfalseを返したらリトライしないこと', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('リトライ不可エラー'));
    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(retry(fn, { maxRetries: 3, initialDelay: 10, shouldRetry }))
      .rejects.toThrow('リトライ不可エラー');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });
});
