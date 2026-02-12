/**
 * 日付パースユーティリティ
 * rk9.ggの日付形式をISO形式に変換
 */

/** 月名からゼロ埋め月番号への変換マップ */
const MONTH_MAP: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
};

/**
 * rk9.ggの日付形式をISO形式の開始日に変換
 *
 * 入力例:
 * - "February 7-8, 2026" → "2026-02-07"
 * - "January 24-25, 2026" → "2026-01-24"
 * - "September 30–October 2, 2022" → "2022-09-30"
 * - "November 29-30, 2025" → "2025-11-29"
 *
 * @param dateStr rk9.ggの日付文字列
 * @returns ISO形式の日付（YYYY-MM-DD）、パース失敗時はnull
 */
export function parseDateToISO(dateStr: string | null): string | null {
  if (!dateStr) return null;

  // 正規化: en-dash (–) を通常のハイフン (-) に置換
  const normalized = dateStr.replace(/–/g, '-');

  // パターン1: "Month Day-Day, Year" (例: "February 7-8, 2026")
  // パターン2: "Month Day-Month Day, Year" (例: "September 30-October 2, 2022")
  const match = normalized.match(/^([A-Za-z]+)\s+(\d{1,2})[-–].*?,\s*(\d{4})$/);

  if (match) {
    const [, month, day, year] = match;
    const monthNum = MONTH_MAP[month.toLowerCase()];
    if (monthNum) {
      const dayPadded = day.padStart(2, '0');
      return `${year}-${monthNum}-${dayPadded}`;
    }
  }

  return null;
}
