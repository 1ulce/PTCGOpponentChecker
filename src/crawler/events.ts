/**
 * Events Crawler
 * rk9.ggから大会一覧を取得してDBに保存
 */

import type { Page } from 'playwright';
import type { ParsedEvent, CrawlResult, CrawlerError } from './types.js';
import { fromJsError } from './types.js';
import { createBrowser, createPage, navigateTo, waitForSelector } from './browser.js';
import { createEvent, getEventIdsByEventIds } from '../db/operations.js';
import { retry, isRetryableError } from '../utils/retry.js';
import { Logger } from '../utils/logger.js';
import { parseDateToISO } from '../utils/date.js';

// ============================================
// Constants
// ============================================

/** 大会一覧ページのURL */
export const EVENTS_URL = 'https://rk9.gg/events/pokemon';

/** 過去大会テーブルのセレクタ */
export const PAST_EVENTS_TABLE_SELECTOR = '#dtPastEvents';

/** 過去大会の行セレクタ */
const PAST_EVENTS_ROWS_SELECTOR = '#dtPastEvents tbody tr';

/** 大会ID抽出用の正規表現 */
const EVENT_ID_PATTERN = /\/tournament\/([A-Za-z0-9]+)/;

const logger = new Logger('EventsCrawler');

// ============================================
// Parser Functions
// ============================================

/**
 * URLからTCG大会のevent_idを抽出
 * @param href /tournament/{id} 形式のURL
 * @returns 大会ID、抽出できない場合はnull
 */
export function extractTcgEventId(href: string | null): string | null {
  if (!href) return null;

  const match = href.match(EVENT_ID_PATTERN);
  return match ? match[1] : null;
}

/**
 * ページから大会情報をパース
 * $$evalを使ってブラウザ内でDOMを評価
 * @param page Playwrightのページインスタンス
 * @returns パース済み大会情報の配列
 */
export async function parseEventsFromPage(page: Page): Promise<ParsedEvent[]> {
  const events = await page.$$eval(PAST_EVENTS_ROWS_SELECTOR, (rows: Element[]) => {
    return rows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('td')) as HTMLTableCellElement[];
        if (cells.length < 5) return null;

        // リンクセル（5番目）からTCGリンクを探す
        const linksCell = cells[4];
        const links = linksCell ? Array.from(linksCell.querySelectorAll('a')) as HTMLAnchorElement[] : [];
        const tcgAnchor = links.find((a: HTMLAnchorElement) => a.textContent?.trim() === 'TCG');

        if (!tcgAnchor) return null;

        const href = tcgAnchor.getAttribute('href');
        const match = href?.match(/\/tournament\/([A-Za-z0-9]+)/);

        if (!match) return null;

        return {
          eventId: match[1],
          name: (
            cells[2]?.querySelector('a')?.textContent?.trim() ||
            cells[2]?.textContent?.trim() ||
            ''
          ).replace(/\s+/g, ' ').trim(),
          date: cells[0]?.textContent?.trim() || null,
          city: cells[3]?.textContent?.trim() || null,
        };
      })
      .filter((e): e is { eventId: string; name: string; date: string | null; city: string | null } =>
        e !== null && e.eventId !== ''
      );
  });

  return events;
}

// ============================================
// Crawler Service
// ============================================

/**
 * 大会一覧ページにアクセスしてデータを取得
 * @returns パース済み大会情報の配列
 */
export async function fetchEventsFromRk9(): Promise<ParsedEvent[]> {
  const browser = await createBrowser();
  const page = await createPage(browser);

  try {
    logger.info(`Accessing ${EVENTS_URL}`);
    await navigateTo(page, EVENTS_URL);

    // DataTablesの読み込み完了を待機
    await waitForSelector(page, PAST_EVENTS_ROWS_SELECTOR);
    logger.info('Page loaded, parsing events...');

    const events = await parseEventsFromPage(page);
    logger.info(`Found ${events.length} TCG events`);

    return events;
  } finally {
    await page.close();
  }
}

/**
 * 新規大会のみをDBに保存（差分更新）
 * @param events パース済み大会情報
 * @returns 保存結果
 */
export async function saveNewEvents(events: ParsedEvent[]): Promise<CrawlResult> {
  const errors: CrawlerError[] = [];
  let eventsAdded = 0;
  let eventsSkipped = 0;

  // 一括でDBに存在するevent_idを取得（効率化）
  const eventIds = events.map((e) => e.eventId);
  const existingIds = new Set(await getEventIdsByEventIds(eventIds));

  for (const event of events) {
    try {
      if (existingIds.has(event.eventId)) {
        eventsSkipped++;
        continue;
      }

      await createEvent({
        eventId: event.eventId,
        name: event.name,
        date: event.date,
        dateStart: parseDateToISO(event.date),
        city: event.city,
      });
      eventsAdded++;
      logger.debug(`Added event: ${event.name} (${event.eventId})`);
    } catch (error) {
      const crawlerError = fromJsError(error instanceof Error ? error : new Error(String(error)), event.eventId);
      errors.push(crawlerError);
      logger.error(`Failed to save event ${event.eventId}`, error);
    }
  }

  return {
    eventsAdded,
    eventsSkipped,
    errors,
  };
}

/**
 * 全大会を取得してDBに保存
 * @returns クローリング結果
 */
export async function crawlAllEvents(): Promise<CrawlResult> {
  const errors: CrawlerError[] = [];

  try {
    const events = await retry(
      () => fetchEventsFromRk9(),
      {
        maxRetries: 3,
        onRetry: (error, attempt) => {
          logger.warn(`Retry attempt ${attempt} for fetching events`, error);
        },
        shouldRetry: isRetryableError,
      }
    );

    const result = await saveNewEvents(events);
    return result;
  } catch (error) {
    const crawlerError = fromJsError(error instanceof Error ? error : new Error(String(error)));
    errors.push(crawlerError);
    logger.error('Failed to crawl events', error);

    return {
      eventsAdded: 0,
      eventsSkipped: 0,
      errors,
    };
  }
}

/**
 * 新規大会のみを取得（差分更新モード）
 * crawlAllEventsと同じ動作（saveNewEventsが内部で差分判定）
 * @returns クローリング結果
 */
export async function crawlNewEvents(): Promise<CrawlResult> {
  return crawlAllEvents();
}
