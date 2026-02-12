/**
 * Summary Module
 * 実行結果サマリーの集計・フォーマット・出力
 */

import type { CrawlSummary } from './crawler/types.js';

/**
 * ミリ秒を人間可読なフォーマットに変換
 * @param ms ミリ秒
 * @returns フォーマットされた文字列
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = totalSeconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }

  if (minutes > 0) {
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  // 1秒以上、1分未満
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}

/**
 * CrawlSummaryを構造化文字列にフォーマット
 * @param summary クローリングサマリー
 * @returns フォーマットされた文字列
 */
export function formatSummary(summary: CrawlSummary): string {
  const divider = '='.repeat(50);
  const lines: string[] = [
    divider,
    '📊 Crawl Summary',
    divider,
    '',
    '📅 Events:',
    `   Total processed: ${summary.totalEventsProcessed}`,
    `   New added:       ${summary.newEventsAdded}`,
    '',
    '👥 Players:',
    `   New added:       ${summary.newPlayersAdded}`,
    '',
    '🎴 Participations:',
    `   New added:       ${summary.newParticipationsAdded}`,
    '',
    '❌ Errors:          ${summary.totalErrors}',
    '',
    '⏱️  Duration:        ${formatDuration(summary.duration)}',
    divider,
  ];

  // テンプレートリテラル内の変数を展開
  return lines
    .map(line =>
      line
        .replace('${summary.totalEventsProcessed}', String(summary.totalEventsProcessed))
        .replace('${summary.newEventsAdded}', String(summary.newEventsAdded))
        .replace('${summary.newPlayersAdded}', String(summary.newPlayersAdded))
        .replace('${summary.newParticipationsAdded}', String(summary.newParticipationsAdded))
        .replace('${summary.totalErrors}', String(summary.totalErrors))
        .replace('${formatDuration(summary.duration)}', formatDuration(summary.duration))
    )
    .join('\n');
}

/**
 * サマリーをコンソールに出力
 * @param summary クローリングサマリー
 */
export function printSummary(summary: CrawlSummary): void {
  const formatted = formatSummary(summary);
  console.log(formatted);
}
