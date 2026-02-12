/**
 * 構造化ロガー
 * クローラーの進捗、エラー、統計情報を出力
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  /**
   * タイムスタンプを取得
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * ログ出力の共通フォーマット
   */
  private formatMessage(level: LogLevel, message: string): string {
    return `${this.getTimestamp()} [${level}] [${this.module}] ${message}`;
  }

  /**
   * DEBUGレベルのログ
   */
  debug(message: string, data?: unknown): void {
    const formatted = this.formatMessage(LogLevel.DEBUG, message);
    if (data !== undefined) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }

  /**
   * INFOレベルのログ
   */
  info(message: string, data?: unknown): void {
    const formatted = this.formatMessage(LogLevel.INFO, message);
    if (data !== undefined) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }

  /**
   * WARNレベルのログ
   */
  warn(message: string, data?: unknown): void {
    const formatted = this.formatMessage(LogLevel.WARN, message);
    if (data !== undefined) {
      console.warn(formatted, data);
    } else {
      console.warn(formatted);
    }
  }

  /**
   * ERRORレベルのログ
   */
  error(message: string, error?: Error | unknown): void {
    const formatted = this.formatMessage(LogLevel.ERROR, message);
    if (error !== undefined) {
      console.error(formatted, error);
    } else {
      console.error(formatted);
    }
  }

  /**
   * 進捗情報を出力
   * @param message 進捗メッセージ
   * @param current 現在の件数
   * @param total 総件数
   */
  progress(message: string, current: number, total: number): void {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const formatted = this.formatMessage(
      LogLevel.INFO,
      `${message} [${current}/${total}] (${percent}%)`
    );
    console.log(formatted);
  }

  /**
   * 統計情報を構造化して出力
   * @param stats キーと値のオブジェクト
   */
  stats(stats: Record<string, number | string>): void {
    const formatted = this.formatMessage(LogLevel.INFO, 'Statistics:');
    console.log(formatted);
    for (const [key, value] of Object.entries(stats)) {
      console.log(`  ${key}: ${value}`);
    }
  }
}

/**
 * デフォルトのロガーインスタンス
 */
export const logger = new Logger('Crawler');
