/**
 * PTCG Opponent Checker - Main Entry Point
 * クローラーのCLIエントリポイント
 */

import {
  parseArgs,
  CrawlMode,
  initializeCrawler,
  cleanupCrawler,
  runFullCrawl,
  runUpdateCrawl,
} from './cli.js';
import type { CrawlSummary } from './crawler/types.js';
import { Logger } from './utils/logger.js';
import { printSummary } from './summary.js';

const logger = new Logger('Main');

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  logger.info('='.repeat(50));
  logger.info('PTCG Opponent Checker');
  logger.info(`Mode: ${args.mode === CrawlMode.UPDATE ? 'Update (差分更新)' : 'Full (全件取得)'}`);
  logger.info('='.repeat(50));

  try {
    // クローラーを初期化
    await initializeCrawler();

    // クローリング実行
    let summary: CrawlSummary;
    if (args.mode === CrawlMode.UPDATE) {
      summary = await runUpdateCrawl();
    } else {
      summary = await runFullCrawl();
    }

    // サマリー出力
    printSummary(summary);
  } finally {
    // クリーンアップ
    await cleanupCrawler();
  }
}

main().catch((error: unknown) => {
  logger.error('Fatal error', error);
  process.exit(1);
});
