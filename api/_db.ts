import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core';

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

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('TURSO_DATABASE_URL is not set');
    }

    const client = createClient({ url, authToken });
    db = drizzle(client, { schema });
  }

  return db;
}

export { events, players, participations };
