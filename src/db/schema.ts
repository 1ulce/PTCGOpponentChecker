import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core';

/**
 * Events Table - 大会情報
 */
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: text('event_id').notNull().unique(),
  name: text('name').notNull(),
  date: text('date'),
  /** ISO形式の開始日（ソート用）例: "2026-02-07" */
  dateStart: text('date_start'),
  city: text('city'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

/**
 * Players Table - プレイヤー情報
 * 同一人物判定は (player_id_masked, first_name, last_name, country) の4項目複合キー
 */
export const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerIdMasked: text('player_id_masked').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  country: text('country').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  unique('players_identity_unique').on(
    table.playerIdMasked,
    table.firstName,
    table.lastName,
    table.country
  ),
  index('players_name_idx').on(table.firstName, table.lastName),
]);

/**
 * Participations Table - 大会参加記録
 */
export const participations = sqliteTable('participations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: integer('player_id').notNull().references(() => players.id),
  eventId: integer('event_id').notNull().references(() => events.id),
  division: text('division'),
  deckListUrl: text('deck_list_url'),
  standing: integer('standing'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  unique('participations_player_event_unique').on(table.playerId, table.eventId),
  index('participations_player_idx').on(table.playerId),
]);

// Type exports for use in other modules
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Participation = typeof participations.$inferSelect;
export type NewParticipation = typeof participations.$inferInsert;
