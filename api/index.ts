/**
 * Vercel Serverless Function Entry Point
 * Hono app as Vercel Function
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sql, eq, and, or, like, desc, count } from 'drizzle-orm';
import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core';

// ============================================
// Schema Definition (inline for Vercel Functions)
// ============================================

const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: text('event_id').notNull().unique(),
  name: text('name').notNull(),
  date: text('date'),
  dateStart: text('date_start'),
  city: text('city'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerIdMasked: text('player_id_masked').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  country: text('country').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  unique('players_identity_unique').on(
    table.playerIdMasked,
    table.firstName,
    table.lastName,
    table.country
  ),
  index('players_name_idx').on(table.firstName, table.lastName),
]);

const participations = sqliteTable('participations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: integer('player_id').notNull().references(() => players.id),
  eventId: integer('event_id').notNull().references(() => events.id),
  division: text('division'),
  deckListUrl: text('deck_list_url'),
  standing: integer('standing'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  unique('participations_player_event_unique').on(table.playerId, table.eventId),
  index('participations_player_idx').on(table.playerId),
]);

const schema = { events, players, participations };

// ============================================
// Database Setup
// ============================================

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

// ============================================
// App Configuration
// ============================================

const app = new Hono().basePath('/api');

// CORS設定
app.use('*', cors());

// ============================================
// Routes
// ============================================

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// GET /api/players/search - プレイヤー検索
app.get('/players/search', async (c) => {
  const name = c.req.query('name');
  const country = c.req.query('country');
  const division = c.req.query('division');
  const limitStr = c.req.query('limit');

  if (!name || name.trim() === '') {
    return c.json({ error: 'name is required' }, 400);
  }

  let limit = 100;
  if (limitStr !== undefined) {
    limit = parseInt(limitStr, 10);
    if (isNaN(limit) || limit < 1 || limit > 500) {
      return c.json({ error: 'limit must be between 1 and 500' }, 400);
    }
  }

  // 名前検索条件を構築
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0);

  const wordConditions = words.map((word) => {
    const pattern = `%${word}%`;
    return or(
      like(sql`LOWER(${players.firstName})`, sql`LOWER(${pattern})`),
      like(sql`LOWER(${players.lastName})`, sql`LOWER(${pattern})`)
    );
  });

  const nameCondition = wordConditions.length === 1
    ? wordConditions[0]
    : and(...wordConditions);

  const conditions = country
    ? and(nameCondition, eq(players.country, country))
    : nameCondition;

  // プレイヤーを取得
  let results = await db
    .select({
      id: players.id,
      playerIdMasked: players.playerIdMasked,
      firstName: players.firstName,
      lastName: players.lastName,
      country: players.country,
    })
    .from(players)
    .where(conditions);

  // Division フィルター
  if (division) {
    const divisionResults = await db
      .selectDistinct({ playerId: participations.playerId })
      .from(participations)
      .where(eq(participations.division, division));

    const playerIds = divisionResults.map((r) => r.playerId);
    results = results.filter((p) => playerIds.includes(p.id));
  }

  // 参加回数を取得
  const playersWithCount = await Promise.all(
    results.slice(0, limit).map(async (player) => {
      const countResult = await db
        .select({ count: count() })
        .from(participations)
        .where(eq(participations.playerId, player.id));
      return {
        ...player,
        participationCount: countResult[0]?.count ?? 0,
      };
    })
  );

  return c.json({
    players: playersWithCount,
    total: playersWithCount.length,
  });
});

// GET /api/players/:id/participations - 参加記録取得
app.get('/players/:id/participations', async (c) => {
  const idStr = c.req.param('id');
  const division = c.req.query('division');

  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid player ID' }, 400);
  }

  // プレイヤー情報を取得
  const playerResult = await db
    .select()
    .from(players)
    .where(eq(players.id, id))
    .limit(1);

  const player = playerResult[0];
  if (!player) {
    return c.json({ error: 'Player not found' }, 404);
  }

  // 参加記録を取得
  const baseCondition = eq(participations.playerId, id);
  const conditions = division
    ? and(baseCondition, eq(participations.division, division))
    : baseCondition;

  const participationResults = await db
    .select({
      participationId: participations.id,
      eventName: events.name,
      eventDate: events.date,
      eventCity: events.city,
      division: participations.division,
      deckListUrl: participations.deckListUrl,
      standing: participations.standing,
    })
    .from(participations)
    .innerJoin(events, eq(participations.eventId, events.id))
    .where(conditions)
    .orderBy(desc(events.dateStart));

  const participationList = participationResults.map((r) => ({
    ...r,
    playerIdMasked: player.playerIdMasked,
    country: player.country,
  }));

  return c.json({
    player: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      playerIdMasked: player.playerIdMasked,
      country: player.country,
    },
    participations: participationList,
    total: participationList.length,
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Export for Vercel
export default handle(app);
