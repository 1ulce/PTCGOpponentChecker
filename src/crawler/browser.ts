/**
 * Playwright Browser Manager
 * ブラウザインスタンスの作成・管理・クリーンアップを担当
 */

import { chromium, Browser, Page } from 'playwright';

/**
 * ブラウザ設定（spikeで検証済みの値）
 */
export const BROWSER_CONFIG = {
  /** ヘッドレスモード */
  headless: true,
  /** ビューポートサイズ（Standingカラム表示のため1920x1080必須） */
  viewport: { width: 1920, height: 1080 },
  /** ページ読み込みタイムアウト（ミリ秒） */
  timeout: 30000,
  /** セレクタ待機タイムアウト（ミリ秒） */
  selectorTimeout: 15000,
  /** ナビゲーション待機条件 */
  waitUntil: 'networkidle' as const,
} as const;

let browserInstance: Browser | null = null;

/**
 * ブラウザインスタンスを作成（シングルトン）
 * 既に作成済みの場合は既存インスタンスを返す
 */
export async function createBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  browserInstance = await chromium.launch({
    headless: BROWSER_CONFIG.headless,
  });

  return browserInstance;
}

/**
 * 現在のブラウザインスタンスを取得
 * 未初期化の場合はnullを返す
 */
export function getBrowser(): Browser | null {
  return browserInstance;
}

/**
 * ブラウザインスタンスをクローズ
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * 新しいページを作成（設定済み）
 * @param browser ブラウザインスタンス
 * @returns 設定済みのページ
 */
export async function createPage(browser?: Browser): Promise<Page> {
  const b = browser ?? browserInstance;
  if (!b) {
    throw new Error('Browser not initialized. Call createBrowser() first.');
  }

  const page = await b.newPage();

  // ビューポート設定
  await page.setViewportSize(BROWSER_CONFIG.viewport);

  // デフォルトタイムアウト設定
  page.setDefaultTimeout(BROWSER_CONFIG.timeout);
  page.setDefaultNavigationTimeout(BROWSER_CONFIG.timeout);

  return page;
}

/**
 * ページにアクセス（共通設定適用）
 * @param page ページインスタンス
 * @param url アクセスするURL
 */
export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url, {
    waitUntil: BROWSER_CONFIG.waitUntil,
    timeout: BROWSER_CONFIG.timeout,
  });
}

/**
 * セレクタが表示されるまで待機
 * @param page ページインスタンス
 * @param selector 待機するセレクタ
 * @param timeout タイムアウト（ミリ秒、デフォルトはBROWSER_CONFIG.selectorTimeout）
 */
export async function waitForSelector(
  page: Page,
  selector: string,
  timeout: number = BROWSER_CONFIG.selectorTimeout
): Promise<void> {
  await page.waitForSelector(selector, { timeout });
}
