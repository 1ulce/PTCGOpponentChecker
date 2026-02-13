/**
 * Roster Crawler
 * 各大会の参加者情報を取得してDBに保存
 */

import type { Page } from 'playwright';
import type { ParsedParticipant, RosterCrawlResult, CrawlerError } from './types.js';
import { createCrawlerError, CrawlerErrorType, fromJsError } from './types.js';
import { createBrowser, createPage, navigateTo, waitForSelector } from './browser.js';
import { findEventByEventId, findOrCreatePlayer, createParticipation } from '../db/operations.js';
import { retry, isRetryableError } from '../utils/retry.js';
import { sleepRandom } from '../utils/sleep.js';
import { Logger } from '../utils/logger.js';

// ============================================
// Constants
// ============================================

/** RosterページのベースURL */
export const ROSTER_URL_BASE = 'https://rk9.gg/roster';

/** テーブル行のセレクタ */
const TABLE_ROWS_SELECTOR = 'table tbody tr';
const TABLE_SELECTOR = 'table';

/** DataTables長さセレクタ */
const DATATABLES_LENGTH_SELECTOR = '.dataTables_length select';

/** 全件表示後の待機時間（ミリ秒） */
const WAIT_AFTER_SELECT_ALL = 2000;

/** ポライトクローリング用の待機時間（ミリ秒） */
const CRAWL_DELAY_MIN = 1000;
const CRAWL_DELAY_MAX = 3000;

const logger = new Logger('RosterCrawler');

// ============================================
// Helper Functions
// ============================================

/**
 * RosterページのURLを生成
 * @param eventId 大会ID
 * @returns RosterページのURL
 */
export function buildRosterUrl(eventId: string): string {
  return `${ROSTER_URL_BASE}/${eventId}`;
}

/**
 * 参加者データが有効かどうかを判定
 * 必須フィールド（playerIdMasked, firstName, lastName, country）が全て存在すること
 * @param participant パース済み参加者情報
 * @returns 有効ならtrue
 */
export function isValidParticipant(participant: ParsedParticipant): boolean {
  const isCountryCode = /^[A-Z]{2}$/.test(participant.country);

  return (
    participant.playerIdMasked !== '' &&
    participant.firstName !== '' &&
    participant.lastName !== '' &&
    isCountryCode
  );
}

// ============================================
// Parser Functions
// ============================================

/**
 * ページから参加者情報をパース
 * $$evalを使ってブラウザ内でDOMを評価
 * @param page Playwrightのページインスタンス
 * @returns パース済み参加者情報の配列
 */
export async function parseParticipantsFromPage(page: Page): Promise<ParsedParticipant[]> {
  const participants = await page.$$eval(TABLE_SELECTOR, (tables: Element[]) => {
    const table = tables[0] as HTMLTableElement | undefined;
    if (!table) return [];

    const normalizeHeader = (text: string): string =>
      text.toLowerCase().replace(/\s+/g, ' ').trim();

    const headers = Array.from(table.querySelectorAll('thead tr th'))
      .map((th) => normalizeHeader(th.textContent || ''));

    const indexOf = (candidates: string[]): number =>
      headers.findIndex((h) => candidates.includes(h));

    const column = {
      playerIdMasked: indexOf(['player id']),
      firstName: indexOf(['first name']),
      lastName: indexOf(['last name']),
      country: indexOf(['country']),
      division: indexOf(['division']),
      deckList: indexOf(['deck list']),
      standing: indexOf(['standing']),
    };

    const rows = Array.from(table.querySelectorAll('tbody tr'));

    const getCellText = (cells: HTMLTableCellElement[], index: number): string =>
      index >= 0 ? (cells[index]?.textContent?.trim() || '') : '';

    const getCellLink = (cells: HTMLTableCellElement[], index: number): string | null =>
      index >= 0 ? (cells[index]?.querySelector('a')?.getAttribute('href') || null) : null;

    return rows.map((row) => {
      const cells = Array.from(row.querySelectorAll('td')) as HTMLTableCellElement[];

      const playerIdMasked = getCellText(cells, column.playerIdMasked);
      const firstName = getCellText(cells, column.firstName);
      const lastName = getCellText(cells, column.lastName);

      // 古い大会では Country 列が存在しないため、その場合は空文字で無効扱いにする
      const countryRaw = getCellText(cells, column.country).toUpperCase();
      const country = /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : '';

      const divisionText = getCellText(cells, column.division);
      const division = divisionText !== '' ? divisionText : null;

      const deckListUrl = getCellLink(cells, column.deckList);

      const standingText = getCellText(cells, column.standing);
      const standing =
        standingText !== '' && standingText !== '-'
          ? parseInt(standingText, 10) || null
          : null;

      return {
        playerIdMasked,
        firstName,
        lastName,
        country,
        division,
        deckListUrl,
        standing,
      };
    });
  });

  return participants;
}

// ============================================
// Crawler Service
// ============================================

/**
 * 指定大会のRosterページにアクセスして参加者データを取得
 * @param eventId 大会ID
 * @returns パース済み参加者情報の配列
 */
export async function fetchRosterFromRk9(eventId: string): Promise<ParsedParticipant[]> {
  const browser = await createBrowser();
  const page = await createPage(browser);
  const url = buildRosterUrl(eventId);

  try {
    logger.info(`Accessing ${url}`);
    await navigateTo(page, url);

    // テーブルの読み込み完了を待機
    await waitForSelector(page, TABLE_ROWS_SELECTOR);

    // 全件表示を選択（DataTablesのページネーションを解除）
    try {
      await page.selectOption(DATATABLES_LENGTH_SELECTOR, '-1');
      await page.waitForTimeout(WAIT_AFTER_SELECT_ALL);
    } catch (e) {
      // セレクタがない場合はスキップ（小規模大会など）
      logger.debug('DataTables length selector not found, skipping');
    }

    logger.info('Page loaded, parsing participants...');
    const participants = await parseParticipantsFromPage(page);
    logger.info(`Found ${participants.length} participants`);

    return participants;
  } finally {
    await page.close();
  }
}

/**
 * 参加者データをDBに保存
 * @param eventId 大会ID（rk9のevent_id）
 * @param participants パース済み参加者情報
 * @returns 保存結果
 */
export async function saveParticipants(
  eventId: string,
  participants: ParsedParticipant[]
): Promise<RosterCrawlResult> {
  const errors: CrawlerError[] = [];
  let playersAdded = 0;
  let playersReused = 0;
  let participationsAdded = 0;

  // イベントをDBから取得
  const event = await findEventByEventId(eventId);
  if (!event) {
    errors.push(
      createCrawlerError(
        CrawlerErrorType.DATABASE_ERROR,
        `Event not found in database: ${eventId}`,
        eventId
      )
    );
    return {
      eventId,
      playersAdded: 0,
      playersReused: 0,
      participationsAdded: 0,
      errors,
    };
  }

  // 有効な参加者のみフィルタ
  const validParticipants = participants.filter(isValidParticipant);
  logger.debug(`Valid participants: ${validParticipants.length}/${participants.length}`);

  for (const participant of validParticipants) {
    try {
      // プレイヤーを検索または作成（複合キーで同一人物判定）
      const { player, created } = await findOrCreatePlayer({
        playerIdMasked: participant.playerIdMasked,
        firstName: participant.firstName,
        lastName: participant.lastName,
        country: participant.country,
      });

      if (created) {
        playersAdded++;
      } else {
        playersReused++;
      }

      // 参加記録を作成（重複時はnull）
      const participation = await createParticipation({
        playerId: player.id,
        eventId: event.id,
        division: participant.division,
        deckListUrl: participant.deckListUrl,
        standing: participant.standing,
      });

      if (participation) {
        participationsAdded++;
      }
    } catch (error) {
      const crawlerError = fromJsError(
        error instanceof Error ? error : new Error(String(error)),
        eventId
      );
      errors.push(crawlerError);
      logger.error(`Failed to save participant: ${participant.firstName} ${participant.lastName}`, error);
    }
  }

  return {
    eventId,
    playersAdded,
    playersReused,
    participationsAdded,
    errors,
  };
}

/**
 * 指定大会のRosterをクロールしてDBに保存
 * @param eventId 大会ID
 * @returns クローリング結果
 */
export async function crawlRoster(eventId: string): Promise<RosterCrawlResult> {
  try {
    const participants = await retry(
      () => fetchRosterFromRk9(eventId),
      {
        maxRetries: 3,
        onRetry: (error, attempt) => {
          logger.warn(`Retry attempt ${attempt} for roster ${eventId}`, error);
        },
        shouldRetry: isRetryableError,
      }
    );

    const result = await saveParticipants(eventId, participants);
    return result;
  } catch (error) {
    const crawlerError = fromJsError(
      error instanceof Error ? error : new Error(String(error)),
      eventId
    );
    logger.error(`Failed to crawl roster for ${eventId}`, error);

    return {
      eventId,
      playersAdded: 0,
      playersReused: 0,
      participationsAdded: 0,
      errors: [crawlerError],
    };
  }
}

/**
 * 複数大会のRosterを順次クロール
 * @param eventIds 大会IDの配列
 * @returns クローリング結果の配列
 */
export async function crawlRosters(eventIds: string[]): Promise<RosterCrawlResult[]> {
  const results: RosterCrawlResult[] = [];

  for (let i = 0; i < eventIds.length; i++) {
    const eventId = eventIds[i];
    logger.progress('Crawling rosters', i + 1, eventIds.length);

    const result = await crawlRoster(eventId);
    results.push(result);

    // ポライトクローリング: 次のリクエスト前に待機
    if (i < eventIds.length - 1) {
      await sleepRandom(CRAWL_DELAY_MIN, CRAWL_DELAY_MAX);
    }
  }

  return results;
}
