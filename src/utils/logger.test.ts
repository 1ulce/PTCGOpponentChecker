import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger.js';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let logger: Logger;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    logger = new Logger('TestModule');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('INFOレベルのログを出力すること', () => {
      logger.info('テストメッセージ');
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('[INFO]');
      expect(output).toContain('[TestModule]');
      expect(output).toContain('テストメッセージ');
    });
  });

  describe('warn', () => {
    it('WARNレベルのログを出力すること', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      logger.warn('警告メッセージ');
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('ERRORレベルのログを出力すること', () => {
      const errorSpy = vi.spyOn(console, 'error');
      logger.error('エラーメッセージ');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('Errorオブジェクトを受け取れること', () => {
      const errorSpy = vi.spyOn(console, 'error');
      logger.error('エラー発生', new Error('テストエラー'));
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('progress', () => {
    it('進捗情報を出力すること', () => {
      logger.progress('処理中', 5, 10);
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('5/10');
    });
  });

  describe('stats', () => {
    it('統計情報を構造化して出力すること', () => {
      logger.stats({ events: 10, players: 100, errors: 2 });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
