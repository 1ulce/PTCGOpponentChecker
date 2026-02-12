import { eq, and, inArray } from 'drizzle-orm';
import { getDatabase, events, players, participations } from './index.js';
import type { Event, Player, Participation } from './schema.js';

/**
 * DBインスタンスを取得（未初期化の場合はエラー）
 */
function db() {
  const database = getDatabase();
  if (!database) {
    throw new Error('Database not initialized. Call createDatabase() first.');
  }
  return database;
}

// ============================================
// Event Operations
// ============================================

interface CreateEventInput {
  eventId: string;
  name: string;
  date: string | null;
  dateStart: string | null;
  city: string | null;
}

/**
 * 新規イベントを作成
 */
export function createEvent(input: CreateEventInput): Event {
  const now = new Date().toISOString();
  const result = db()
    .insert(events)
    .values({
      eventId: input.eventId,
      name: input.name,
      date: input.date,
      dateStart: input.dateStart,
      city: input.city,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return result;
}

/**
 * event_idでイベントを検索
 */
export function findEventByEventId(eventId: string): Event | null {
  const result = db()
    .select()
    .from(events)
    .where(eq(events.eventId, eventId))
    .get();

  return result ?? null;
}

/**
 * 全イベントを取得
 */
export function getAllEvents(): Event[] {
  return db().select().from(events).all();
}

/**
 * 複数のevent_idから、DBに存在するものをリストアップ
 */
export function getEventIdsByEventIds(eventIds: string[]): string[] {
  if (eventIds.length === 0) return [];

  const results = db()
    .select({ eventId: events.eventId })
    .from(events)
    .where(inArray(events.eventId, eventIds))
    .all();

  return results.map((r) => r.eventId);
}

// ============================================
// Player Operations
// ============================================

interface FindOrCreatePlayerInput {
  playerIdMasked: string;
  firstName: string;
  lastName: string;
  country: string;
}

interface FindOrCreatePlayerResult {
  player: Player;
  created: boolean;
}

/**
 * 複合キー（4項目）でプレイヤーを検索し、存在しなければ作成
 */
export function findOrCreatePlayer(input: FindOrCreatePlayerInput): FindOrCreatePlayerResult {
  // 複合キーで検索
  const existing = db()
    .select()
    .from(players)
    .where(
      and(
        eq(players.playerIdMasked, input.playerIdMasked),
        eq(players.firstName, input.firstName),
        eq(players.lastName, input.lastName),
        eq(players.country, input.country)
      )
    )
    .get();

  if (existing) {
    return { player: existing, created: false };
  }

  // 新規作成
  const now = new Date().toISOString();
  const newPlayer = db()
    .insert(players)
    .values({
      playerIdMasked: input.playerIdMasked,
      firstName: input.firstName,
      lastName: input.lastName,
      country: input.country,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return { player: newPlayer, created: true };
}

/**
 * プレイヤーIDで検索
 */
export function findPlayerById(id: number): Player | null {
  const result = db()
    .select()
    .from(players)
    .where(eq(players.id, id))
    .get();

  return result ?? null;
}

// ============================================
// Participation Operations
// ============================================

interface CreateParticipationInput {
  playerId: number;
  eventId: number;
  division: string | null;
  deckListUrl: string | null;
  standing: number | null;
}

/**
 * 参加記録を作成（重複時はnullを返す）
 */
export function createParticipation(input: CreateParticipationInput): Participation | null {
  const now = new Date().toISOString();

  try {
    const result = db()
      .insert(participations)
      .values({
        playerId: input.playerId,
        eventId: input.eventId,
        division: input.division,
        deckListUrl: input.deckListUrl,
        standing: input.standing,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return result;
  } catch (error) {
    // UNIQUE制約違反の場合はnullを返す
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return null;
    }
    throw error;
  }
}

/**
 * プレイヤーIDで参加記録を取得
 */
export function getParticipationsByPlayerId(playerId: number): Participation[] {
  return db()
    .select()
    .from(participations)
    .where(eq(participations.playerId, playerId))
    .all();
}

/**
 * イベントIDで参加記録を取得
 */
export function getParticipationsByEventId(eventId: number): Participation[] {
  return db()
    .select()
    .from(participations)
    .where(eq(participations.eventId, eventId))
    .all();
}
