import { sql, and, or, like, eq, count } from 'drizzle-orm';
import { getDb, players, participations } from '../_db.js';
import { firstQueryValue, handleOptions, setCorsHeaders } from '../_http.js';

type RequestLike = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    end: () => void;
  };
};

function isValidCountry(country: string): boolean {
  return /^[A-Z]{2}$/.test(country);
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  setCorsHeaders(res);

  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const name = firstQueryValue(req.query?.name);
  const country = firstQueryValue(req.query?.country);
  const division = firstQueryValue(req.query?.division);
  const limitStr = firstQueryValue(req.query?.limit);

  if (!name || name.trim() === '') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  let limit = 100;
  if (limitStr !== undefined) {
    limit = parseInt(limitStr, 10);
    if (isNaN(limit) || limit < 1 || limit > 500) {
      res.status(400).json({ error: 'limit must be between 1 and 500' });
      return;
    }
  }

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

  if (!nameCondition) {
    res.status(200).json({ players: [], total: 0 });
    return;
  }

  const conditions = country
    ? and(nameCondition, eq(players.country, country))
    : nameCondition;

  const database = getDb();
  try {
    let results = await database
      .select({
        id: players.id,
        playerIdMasked: players.playerIdMasked,
        firstName: players.firstName,
        lastName: players.lastName,
        country: players.country,
      })
      .from(players)
      .where(conditions);

    if (division) {
      const divisionResults = await database
        .selectDistinct({ playerId: participations.playerId })
        .from(participations)
        .where(eq(participations.division, division));

      const playerIds = divisionResults.map((r) => r.playerId);
      results = results.filter((p) => playerIds.includes(p.id));
    }

    const sanitizedResults = results.filter((player) => isValidCountry(player.country));

    const playersWithCount = await Promise.all(
      sanitizedResults.slice(0, limit).map(async (player) => {
        const countResult = await database
          .select({ count: count() })
          .from(participations)
          .where(eq(participations.playerId, player.id));

        return {
          ...player,
          participationCount: countResult[0]?.count ?? 0,
        };
      })
    );

    res.status(200).json({
      players: playersWithCount,
      total: playersWithCount.length,
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
