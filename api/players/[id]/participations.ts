import { and, desc, eq } from 'drizzle-orm';
import { events, getDb, participations, players } from '../../_db.js';
import { firstQueryValue, handleOptions, setCorsHeaders } from '../../_http.js';

type RequestLike = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  url?: string;
};

type ResponseLike = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    end: () => void;
  };
};

function getPlayerId(req: RequestLike): number | null {
  const fromQuery = firstQueryValue(req.query?.id);
  if (fromQuery) {
    const id = parseInt(fromQuery, 10);
    return isNaN(id) ? null : id;
  }

  const url = req.url ?? '';
  const match = url.match(/\/api\/players\/(\d+)\/participations/);
  if (!match) {
    return null;
  }

  const id = parseInt(match[1], 10);
  return isNaN(id) ? null : id;
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

  const id = getPlayerId(req);
  if (id === null) {
    res.status(400).json({ error: 'Invalid player ID' });
    return;
  }

  const division = firstQueryValue(req.query?.division);
  const database = getDb();

  try {
    const playerResult = await database
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1);

    const player = playerResult[0];
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    const baseCondition = eq(participations.playerId, id);
    const conditions = division
      ? and(baseCondition, eq(participations.division, division))
      : baseCondition;

    const participationResults = await database
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

    res.status(200).json({
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
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
