/**
 * APIクライアント
 * バックエンドAPIとの通信を担当
 */

import type {
  PlayerSearchResponse,
  ParticipationsResponse,
  SearchPlayersParams,
  ApiError,
} from '../types';

// ============================================
// Error Class
// ============================================

export class ApiClientError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

// ============================================
// Internal Helpers
// ============================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new ApiClientError(errorData.error, response.status);
  }
  return response.json() as Promise<T>;
}

function buildSearchParams(params: SearchPlayersParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  searchParams.set('name', params.name);

  if (params.country) {
    searchParams.set('country', params.country);
  }

  if (params.division && params.division !== 'all') {
    searchParams.set('division', params.division);
  }

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  return searchParams;
}

// ============================================
// API Functions
// ============================================

/**
 * プレイヤーを検索
 */
export async function searchPlayers(
  params: SearchPlayersParams
): Promise<PlayerSearchResponse> {
  const searchParams = buildSearchParams(params);
  const url = `/api/players/search?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PlayerSearchResponse>(response);
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError('ネットワークエラーが発生しました');
  }
}

/**
 * プレイヤーの参加記録を取得
 */
export async function getPlayerParticipations(
  playerId: number,
  division?: string
): Promise<ParticipationsResponse> {
  let url = `/api/players/${playerId}/participations`;

  if (division && division !== 'all') {
    url += `?division=${division}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<ParticipationsResponse>(response);
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError('ネットワークエラーが発生しました');
  }
}
