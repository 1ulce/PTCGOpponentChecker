/**
 * CLI Module
 * コマンドライン引数解析とクローラー初期化/クリーンアップ
 */

import { createDatabase, closeDatabase } from './db/index.js';
import { createBrowser, closeBrowser } from './crawler/browser.js';
import { crawlAllEvents, fetchEventsFromRk9, saveNewEvents } from './crawler/events.js';
import { crawlRosters } from './crawler/roster.js';
import { getAllEvents, getEventIdsByEventIds } from './db/operations.js';
import { sleepRandom } from './utils/sleep.js';
import { Logger } from './utils/logger.js';
import type { CrawlSummary, CrawlResult, RosterCrawlResult, ParsedEvent } from './crawler/types.js';

const logger = new Logger('CLI');

// ============================================
// Types
// ============================================

/**
 * クロールモード
 */
export enum CrawlMode {
  /** 全件取得 */
  FULL = 'full',
  /** 差分更新 */
  UPDATE = 'update',
}

/**
 * コマンドライン引数の解析結果
 */
export interface ParsedArgs {
  mode: CrawlMode;
}

// ============================================
// Argument Parsing
// ============================================

/**
 * コマンドライン引数を解析
 * @param args process.argv.slice(2) 相当の引数配列
 * @returns 解析結果
 */
export function parseArgs(args: string[]): ParsedArgs {
  const isUpdateMode = args.includes('--update');

  return {
    mode: isUpdateMode ? CrawlMode.UPDATE : CrawlMode.FULL,
  };
}

// ============================================
// Initialization & Cleanup
// ============================================

/**
 * クローラーの初期化
 * - DB接続を作成
 * - Playwrightブラウザを起動
 * @param dbPath SQLiteファイルのパス（デフォルト: ./data/ptcg.db）
 */
export async function initializeCrawler(dbPath: string = './data/ptcg.db'): Promise<void> {
  logger.info('Initializing crawler...');

  // DB接続を初期化
  logger.debug('Creating database connection...');
  createDatabase(dbPath);
  logger.debug('Database connection established');

  // ブラウザを起動
  logger.debug('Launching browser...');
  await createBrowser();
  logger.debug('Browser launched');

  logger.info('Crawler initialized successfully');
}

/**
 * クローラーのクリーンアップ
 * - ブラウザを閉じる
 * - DB接続を閉じる
 */
export async function cleanupCrawler(): Promise<void> {
  logger.info('Cleaning up crawler...');

  try {
    // ブラウザを閉じる
    await closeBrowser();
    logger.debug('Browser closed');
  } catch (error) {
    logger.error('Failed to close browser', error);
  }

  try {
    // DB接続を閉じる
    closeDatabase();
    logger.debug('Database connection closed');
  } catch (error) {
    logger.error('Failed to close database', error);
  }

  logger.info('Crawler cleanup completed');
}

// ============================================
// Crawl Execution Options
// ============================================

/**
 * クロール実行オプション
 */
export interface CrawlOptions {
  /** 実際のクロールをスキップ（テスト用） */
  skipActualCrawl?: boolean;
}

// ============================================
// Crawl Execution
// ============================================

/**
 * パースした大会リストから、DBに未登録の大会IDを抽出
 * @param parsedEvents パース済み大会情報
 * @returns 未登録の大会IDの配列
 */
export function getNewEventIds(parsedEvents: ParsedEvent[]): string[] {
  if (parsedEvents.length === 0) {
    return [];
  }

  const allEventIds = parsedEvents.map((e) => e.eventId);
  const existingIds = new Set(getEventIdsByEventIds(allEventIds));

  return allEventIds.filter((id) => !existingIds.has(id));
}

/**
 * RosterCrawlResultの配列からサマリーを集計
 */
function aggregateRosterResults(results: RosterCrawlResult[]): {
  playersAdded: number;
  playersReused: number;
  participationsAdded: number;
  errors: number;
} {
  return results.reduce(
    (acc, r) => ({
      playersAdded: acc.playersAdded + r.playersAdded,
      playersReused: acc.playersReused + r.playersReused,
      participationsAdded: acc.participationsAdded + r.participationsAdded,
      errors: acc.errors + r.errors.length,
    }),
    { playersAdded: 0, playersReused: 0, participationsAdded: 0, errors: 0 }
  );
}

/**
 * 全件クロールを実行
 * 1. 大会一覧を取得してDBに保存
 * 2. 新規追加された大会のrosterをクロール
 * @param options クロールオプション
 * @returns クローリングサマリー
 */
export async function runFullCrawl(options: CrawlOptions = {}): Promise<CrawlSummary> {
  const startTime = Date.now();
  const { skipActualCrawl = false } = options;

  logger.info('Starting full crawl...');

  if (skipActualCrawl) {
    logger.info('Skipping actual crawl (test mode)');
    return {
      totalEventsProcessed: 0,
      newEventsAdded: 0,
      newPlayersAdded: 0,
      newParticipationsAdded: 0,
      totalErrors: 0,
      duration: Date.now() - startTime,
    };
  }

  // 1. 大会一覧を取得してDBに保存
  logger.info('Fetching events from rk9.gg...');
  const eventsResult = await crawlAllEvents();
  logger.info(`Events: ${eventsResult.eventsAdded} added, ${eventsResult.eventsSkipped} skipped`);

  // 新規追加された大会のみrosterをクロール
  // crawlAllEventsは既存イベントをスキップするので、DBから新規イベントを取得
  const allEvents = getAllEvents();
  const newEventIds = allEvents
    .slice(-eventsResult.eventsAdded) // 最新のN件が新規追加されたイベント
    .map((e) => e.eventId);

  // 2. 新規大会のrosterをクロール
  let rosterResults: RosterCrawlResult[] = [];
  if (newEventIds.length > 0) {
    logger.info(`Crawling rosters for ${newEventIds.length} new events...`);
    rosterResults = await crawlRosters(newEventIds);
  }

  const rosterSummary = aggregateRosterResults(rosterResults);
  const duration = Date.now() - startTime;

  const summary: CrawlSummary = {
    totalEventsProcessed: eventsResult.eventsAdded + eventsResult.eventsSkipped,
    newEventsAdded: eventsResult.eventsAdded,
    newPlayersAdded: rosterSummary.playersAdded,
    newParticipationsAdded: rosterSummary.participationsAdded,
    totalErrors: eventsResult.errors.length + rosterSummary.errors,
    duration,
  };

  logger.info('Full crawl completed');
  return summary;
}

/**
 * 差分更新クロールを実行
 * crawlAllEventsが内部で差分判定するため、runFullCrawlと同じ処理
 * @param options クロールオプション
 * @returns クローリングサマリー
 */
export async function runUpdateCrawl(options: CrawlOptions = {}): Promise<CrawlSummary> {
  const startTime = Date.now();
  const { skipActualCrawl = false } = options;

  logger.info('Starting update crawl...');

  if (skipActualCrawl) {
    logger.info('Skipping actual crawl (test mode)');
    return {
      totalEventsProcessed: 0,
      newEventsAdded: 0,
      newPlayersAdded: 0,
      newParticipationsAdded: 0,
      totalErrors: 0,
      duration: Date.now() - startTime,
    };
  }

  // 差分更新もrunFullCrawlと同じ（crawlAllEventsが内部で差分判定）
  return runFullCrawl(options);
}
