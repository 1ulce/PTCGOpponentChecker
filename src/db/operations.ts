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
export async function createEvent(input: CreateEventInput): Promise<Event> {
  const now = new Date().toISOString();
  const result = await db()
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
    .returning();

  return result[0];
}

/**
 * event_idでイベントを検索
 */
export async function findEventByEventId(eventId: string): Promise<Event | null> {
  const result = await db()
    .select()
    .from(events)
    .where(eq(events.eventId, eventId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * 全イベントを取得
 */
export async function getAllEvents(): Promise<Event[]> {
  return db().select().from(events);
}

/**
 * 複数のevent_idから、DBに存在するものをリストアップ
 */
export async function getEventIdsByEventIds(eventIds: string[]): Promise<string[]> {
  if (eventIds.length === 0) return [];

  const results = await db()
    .select({ eventId: events.eventId })
    .from(events)
    .where(inArray(events.eventId, eventIds));

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
export async function findOrCreatePlayer(input: FindOrCreatePlayerInput): Promise<FindOrCreatePlayerResult> {
  // 複合キーで検索
  const existing = await db()
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
    .limit(1);

  if (existing[0]) {
    return { player: existing[0], created: false };
  }

  // 新規作成
  const now = new Date().toISOString();
  const newPlayer = await db()
    .insert(players)
    .values({
      playerIdMasked: input.playerIdMasked,
      firstName: input.firstName,
      lastName: input.lastName,
      country: input.country,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { player: newPlayer[0], created: true };
}

/**
 * プレイヤーIDで検索
 */
export async function findPlayerById(id: number): Promise<Player | null> {
  const result = await db()
    .select()
    .from(players)
    .where(eq(players.id, id))
    .limit(1);

  return result[0] ?? null;
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
export async function createParticipation(input: CreateParticipationInput): Promise<Participation | null> {
  const now = new Date().toISOString();

  try {
    const result = await db()
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
      .returning();

    return result[0];
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
export async function getParticipationsByPlayerId(playerId: number): Promise<Participation[]> {
  return db()
    .select()
    .from(participations)
    .where(eq(participations.playerId, playerId));
}

/**
 * イベントIDで参加記録を取得
 */
export async function getParticipationsByEventId(eventId: number): Promise<Participation[]> {
  return db()
    .select()
    .from(participations)
    .where(eq(participations.eventId, eventId));
}
