import { describe, it, expect } from 'vitest';
import { sleep, randomDelay, sleepRandom } from './sleep.js';

describe('sleep utilities', () => {
  describe('sleep', () => {
    it('指定ミリ秒だけ待機すること', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // 許容誤差
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('randomDelay', () => {
    it('最小値と最大値の範囲内の値を返すこと', () => {
      for (let i = 0; i < 100; i++) {
        const delay = randomDelay(100, 200);
        expect(delay).toBeGreaterThanOrEqual(100);
        expect(delay).toBeLessThanOrEqual(200);
      }
    });

    it('最小値と最大値が同じ場合その値を返すこと', () => {
      const delay = randomDelay(150, 150);
      expect(delay).toBe(150);
    });
  });

  describe('sleepRandom', () => {
    it('指定範囲内のランダムな時間待機すること', async () => {
      const start = Date.now();
      await sleepRandom(30, 80);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(25); // 許容誤差
      expect(elapsed).toBeLessThan(150);
    });
  });
});
