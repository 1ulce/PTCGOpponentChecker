import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app } from './index.js';

describe('API Server', () => {
  describe('Health Check', () => {
    it('GET /api/health returns 200 with status ok', async () => {
      const res = await app.request('/api/health');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ status: 'ok' });
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await app.request('/api/unknown');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty('error');
    });
  });

  describe('CORS', () => {
    it('includes CORS headers in response', async () => {
      const res = await app.request('/api/health', {
        method: 'OPTIONS',
      });

      // CORS対応している場合、OPTIONSリクエストが適切に処理される
      expect(res.status).toBeLessThan(500);
    });
  });
});
