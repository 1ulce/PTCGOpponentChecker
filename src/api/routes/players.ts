/**
 * Players API Routes
 */

import { Hono } from 'hono';
import { searchPlayers, getParticipationsWithEvents } from '../../db/queries.js';
import { findPlayerById } from '../../db/operations.js';

export const playersRoutes = new Hono();

// ============================================
// GET /search - プレイヤー検索
// ============================================

playersRoutes.get('/search', (c) => {
  // クエリパラメータの取得
  const name = c.req.query('name');
  const country = c.req.query('country');
  const division = c.req.query('division');
  const limitStr = c.req.query('limit');

  // バリデーション: name必須
  if (!name || name.trim() === '') {
    return c.json({ error: 'name is required' }, 400);
  }

  // バリデーション: limit
  let limit: number | undefined;
  if (limitStr !== undefined) {
    limit = parseInt(limitStr, 10);
    if (isNaN(limit)) {
      return c.json({ error: 'limit must be a number' }, 400);
    }
    if (limit < 1 || limit > 500) {
      return c.json({ error: 'limit must be between 1 and 500' }, 400);
    }
  }

  // 検索実行
  const players = searchPlayers({
    name: name.trim(),
    country: country || undefined,
    division: division || undefined,
    limit,
  });

  return c.json({
    players,
    total: players.length,
  });
});

// ============================================
// GET /:id/participations - 参加記録取得
// ============================================

playersRoutes.get('/:id/participations', (c) => {
  const idStr = c.req.param('id');
  const division = c.req.query('division');

  // バリデーション: id
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid player ID' }, 400);
  }

  // プレイヤーの存在確認
  const player = findPlayerById(id);
  if (!player) {
    return c.json({ error: 'Player not found' }, 404);
  }

  // 参加記録取得
  const participations = getParticipationsWithEvents(id, division || undefined);

  return c.json({
    player: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      playerIdMasked: player.playerIdMasked,
      country: player.country,
    },
    participations,
    total: participations.length,
  });
});
