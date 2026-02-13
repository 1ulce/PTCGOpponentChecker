/**
 * 検索クエリモジュール
 * プレイヤー検索と参加記録取得の機能を提供
 */

import { sql, eq, and, or, like, desc, count } from 'drizzle-orm';
import { getDatabase, players, participations, events } from './index.js';

// ============================================
// Types
// ============================================

export interface SearchPlayersOptions {
  /** 検索文字列（first_name または last_name で部分一致検索） */
  name: string;
  /** 国（完全一致、オプション） */
  country?: string;
  /** Division（オプション、このDivisionで参加したことがあるプレイヤーのみ） */
  division?: string;
  /** 取得件数（デフォルト: 100、最大: 500） */
  limit?: number;
}

export interface PlayerWithCount {
  id: number;
  playerIdMasked: string;
  firstName: string;
  lastName: string;
  country: string;
  participationCount: number;
}

export interface ParticipationDetail {
  participationId: number;
  eventName: string;
  eventDate: string | null;
  eventCity: string | null;
  division: string | null;
  deckListUrl: string | null;
  standing: number | null;
  playerIdMasked: string;
  country: string;
}

// ============================================
// Internal Helpers
// ============================================

function db() {
  const database = getDatabase();
  if (!database) {
    throw new Error('Database not initialized. Call createDatabase() first.');
  }
  return database;
}

function isValidCountry(country: string): boolean {
  return /^[A-Z]{2}$/.test(country);
}

function buildEventName(eventName: string, eventDate: string | null, eventCity: string | null): string {
  const trimmed = eventName.trim();
  if (trimmed !== '') {
    return trimmed;
  }
  if (eventDate && eventCity) {
    return `${eventDate} (${eventCity})`;
  }
  if (eventDate) {
    return eventDate;
  }
  if (eventCity) {
    return eventCity;
  }
  return 'Unknown Tournament';
}

/** プレイヤーの参加回数を取得 */
async function getParticipationCount(playerId: number): Promise<number> {
  const result = await db()
    .select({ count: count() })
    .from(participations)
    .where(eq(participations.playerId, playerId));
  return result[0]?.count ?? 0;
}

/**
 * 名前検索の基本条件を構築
 *
 * 入力例: "J. Tomás Maxwell"
 * - 単語に分割: ["J.", "Tomás", "Maxwell"]
 * - 各単語がfirst_nameまたはlast_nameに部分一致するかチェック
 * - 全ての単語条件をANDで結合（全単語がどこかにマッチする必要がある）
 *
 * これにより first_name="J. Tomás", last_name="Maxwell" のプレイヤーがヒット:
 * - "J." → first_name "J. Tomás" に含まれる ✓
 * - "Tomás" → first_name "J. Tomás" に含まれる ✓
 * - "Maxwell" → last_name "Maxwell" に含まれる ✓
 */
function buildNameSearchConditions(name: string, country?: string) {
  // スペースで分割して空でない単語を取得
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) {
    // 空の検索は全件マッチ（通常はバリデーションで弾かれる）
    return country ? eq(players.country, country) : undefined;
  }

  // 各単語について「first_name OR last_name に部分一致」の条件を作成
  const wordConditions = words.map((word) => {
    const pattern = `%${word}%`;
    return or(
      like(sql`LOWER(${players.firstName})`, sql`LOWER(${pattern})`),
      like(sql`LOWER(${players.lastName})`, sql`LOWER(${pattern})`)
    );
  });

  // 全ての単語条件をANDで結合（全単語がどこかにマッチ）
  const nameCondition = wordConditions.length === 1
    ? wordConditions[0]
    : and(...wordConditions);

  return country ? and(nameCondition, eq(players.country, country)) : nameCondition;
}

/** プレイヤー基本情報のselect設定 */
const playerSelectFields = {
  id: players.id,
  playerIdMasked: players.playerIdMasked,
  firstName: players.firstName,
  lastName: players.lastName,
  country: players.country,
};

// ============================================
// Query Functions
// ============================================

/**
 * 名前でプレイヤーを検索（参加回数付き）
 */
export async function searchPlayers(options: SearchPlayersOptions): Promise<PlayerWithCount[]> {
  const { name, country, division, limit = 100 } = options;
  const effectiveLimit = Math.min(limit, 500);
  const conditions = buildNameSearchConditions(name, country);

  // Division指定がある場合のフィルタリング
  let playerIdsWithDivision: number[] | null = null;
  if (division) {
    const divisionResults = await db()
      .selectDistinct({ playerId: participations.playerId })
      .from(participations)
      .where(eq(participations.division, division));

    playerIdsWithDivision = divisionResults.map((r) => r.playerId);

    if (playerIdsWithDivision.length === 0) {
      return [];
    }
  }

  // プレイヤーを取得
  const results = await db()
    .select(playerSelectFields)
    .from(players)
    .where(conditions);

  // Divisionフィルターを適用して、limit適用、参加回数を付加
  const filteredByCountry = results.filter((p) => isValidCountry(p.country));

  const filtered = playerIdsWithDivision
    ? filteredByCountry.filter((p) => playerIdsWithDivision!.includes(p.id))
    : filteredByCountry;

  const limited = filtered.slice(0, effectiveLimit);

  // 参加回数を並列で取得
  const playersWithCount = await Promise.all(
    limited.map(async (player) => ({
      ...player,
      participationCount: await getParticipationCount(player.id),
    }))
  );

  return playersWithCount;
}

/**
 * プレイヤーの参加記録を取得（開催日降順）
 */
export async function getParticipationsWithEvents(
  playerId: number,
  division?: string
): Promise<ParticipationDetail[]> {
  // プレイヤー情報を取得
  const playerResult = await db()
    .select({
      playerIdMasked: players.playerIdMasked,
      country: players.country,
    })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  const player = playerResult[0];

  if (!player) {
    return [];
  }

  // 参加記録を取得（イベント情報と結合）
  const baseCondition = eq(participations.playerId, playerId);
  const conditions = division
    ? and(baseCondition, eq(participations.division, division))
    : baseCondition;

  const results = await db()
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

  // プレイヤー情報を付加
  return results.map((r) => ({
    ...r,
    eventName: buildEventName(r.eventName, r.eventDate, r.eventCity),
    playerIdMasked: player.playerIdMasked,
    country: player.country,
  }));
}
