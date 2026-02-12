import { describe, it, expect } from 'vitest';
import {
  CrawlerErrorType,
  createCrawlerError,
  isRetryableCrawlerError,
  type CrawlResult,
  type RosterCrawlResult,
} from './types.js';

describe('Crawler Types', () => {
  describe('createCrawlerError', () => {
    it('エラーオブジェクトを正しく作成すること', () => {
      const error = createCrawlerError(
        CrawlerErrorType.NETWORK_ERROR,
        'Connection failed',
        'EVENT123'
      );

      expect(error.type).toBe(CrawlerErrorType.NETWORK_ERROR);
      expect(error.message).toBe('Connection failed');
      expect(error.eventId).toBe('EVENT123');
      expect(error.timestamp).toBeDefined();
      expect(error.retryable).toBe(true);
    });

    it('eventIdなしでもエラーを作成できること', () => {
      const error = createCrawlerError(
        CrawlerErrorType.DATABASE_ERROR,
        'DB connection failed'
      );

      expect(error.eventId).toBeUndefined();
      expect(error.retryable).toBe(false);
    });
  });

  describe('isRetryableCrawlerError', () => {
    it('NETWORK_ERRORはリトライ可能', () => {
      const error = createCrawlerError(CrawlerErrorType.NETWORK_ERROR, 'test');
      expect(isRetryableCrawlerError(error)).toBe(true);
    });

    it('TIMEOUT_ERRORはリトライ可能', () => {
      const error = createCrawlerError(CrawlerErrorType.TIMEOUT_ERROR, 'test');
      expect(isRetryableCrawlerError(error)).toBe(true);
    });

    it('RATE_LIMIT_ERRORはリトライ可能', () => {
      const error = createCrawlerError(CrawlerErrorType.RATE_LIMIT_ERROR, 'test');
      expect(isRetryableCrawlerError(error)).toBe(true);
    });

    it('DATABASE_ERRORはリトライ不可', () => {
      const error = createCrawlerError(CrawlerErrorType.DATABASE_ERROR, 'test');
      expect(isRetryableCrawlerError(error)).toBe(false);
    });

    it('PARSE_ERRORはリトライ不可', () => {
      const error = createCrawlerError(CrawlerErrorType.PARSE_ERROR, 'test');
      expect(isRetryableCrawlerError(error)).toBe(false);
    });
  });

  describe('CrawlResult', () => {
    it('正しい構造を持つこと', () => {
      const result: CrawlResult = {
        eventsAdded: 10,
        eventsSkipped: 5,
        errors: [],
      };

      expect(result.eventsAdded).toBe(10);
      expect(result.eventsSkipped).toBe(5);
      expect(result.errors).toEqual([]);
    });
  });

  describe('RosterCrawlResult', () => {
    it('正しい構造を持つこと', () => {
      const result: RosterCrawlResult = {
        eventId: 'TEST123',
        playersAdded: 100,
        playersReused: 50,
        participationsAdded: 150,
        errors: [],
      };

      expect(result.eventId).toBe('TEST123');
      expect(result.playersAdded).toBe(100);
      expect(result.playersReused).toBe(50);
      expect(result.participationsAdded).toBe(150);
    });
  });
});
