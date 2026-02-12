/**
 * API Server - Hono based REST API
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { playersRoutes } from './routes/players.js';
import { createDatabase } from '../db/index.js';

// ============================================
// App Configuration
// ============================================

export const app = new Hono();

// ============================================
// Middleware
// ============================================

// CORS設定
app.use('*', cors());

// ============================================
// Routes
// ============================================

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' });
});

// Players API
app.route('/api/players', playersRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// ============================================
// Server Start (when run directly)
// ============================================

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Only start server when this file is run directly (not imported for testing)
if (process.argv[1]?.endsWith('api/index.ts') || process.argv[1]?.endsWith('api/index.js')) {
  // Initialize database connection
  console.log('Initializing database...');
  createDatabase();
  console.log('Database initialized');

  console.log(`Starting API server on port ${PORT}...`);
  serve({
    fetch: app.fetch,
    port: PORT,
  });
  console.log(`API server running at http://localhost:${PORT}`);
}

export { serve, PORT };
