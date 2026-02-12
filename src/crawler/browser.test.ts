import { describe, it, expect, afterEach } from 'vitest';
import { createBrowser, closeBrowser, getBrowser, BROWSER_CONFIG } from './browser.js';

describe('Browser Manager', () => {
  afterEach(async () => {
    await closeBrowser();
  });

  describe('BROWSER_CONFIG', () => {
    it('headlessモードがtrueであること', () => {
      expect(BROWSER_CONFIG.headless).toBe(true);
    });

    it('viewportが1920x1080であること', () => {
      expect(BROWSER_CONFIG.viewport.width).toBe(1920);
      expect(BROWSER_CONFIG.viewport.height).toBe(1080);
    });

    it('タイムアウトが30秒であること', () => {
      expect(BROWSER_CONFIG.timeout).toBe(30000);
    });
  });

  describe('createBrowser', () => {
    it('ブラウザインスタンスを作成できること', async () => {
      const browser = await createBrowser();
      expect(browser).toBeDefined();
      expect(browser.isConnected()).toBe(true);
    });

    it('2回目の呼び出しで同じインスタンスを返すこと', async () => {
      const browser1 = await createBrowser();
      const browser2 = await createBrowser();
      expect(browser1).toBe(browser2);
    });
  });

  describe('getBrowser', () => {
    it('未初期化時はnullを返すこと', () => {
      const browser = getBrowser();
      expect(browser).toBeNull();
    });

    it('初期化後はインスタンスを返すこと', async () => {
      await createBrowser();
      const browser = getBrowser();
      expect(browser).not.toBeNull();
    });
  });

  describe('closeBrowser', () => {
    it('ブラウザを正常にクローズできること', async () => {
      await createBrowser();
      await closeBrowser();
      expect(getBrowser()).toBeNull();
    });

    it('未初期化時でもエラーにならないこと', async () => {
      await expect(closeBrowser()).resolves.not.toThrow();
    });
  });
});
