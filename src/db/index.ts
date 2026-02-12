import { createClient, Client } from '@libsql/client';
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import 'dotenv/config';
import * as schema from './schema.js';

let libsqlClient: Client | null = null;
let drizzleDb: LibSQLDatabase<typeof schema> | null = null;

/**
 * データベース接続を作成し、スキーマを初期化する
 * 環境変数 TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を使用
 * ローカル開発時は TURSO_DATABASE_URL に file:./data/ptcg.db を指定可能
 * @returns Drizzle DBインスタンス
 */
export async function createDatabase(): Promise<LibSQLDatabase<typeof schema>> {
  // 既存の接続があれば返す
  if (drizzleDb && libsqlClient) {
    return drizzleDb;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL is required');
  }

  // libSQL クライアントを作成
  libsqlClient = createClient({
    url,
    authToken,
  });

  // Drizzle インスタンスを作成
  drizzleDb = drizzle(libsqlClient, { schema });

  // スキーマを初期化
  await initializeSchema(libsqlClient);

  return drizzleDb;
}

/**
 * スキーマを直接SQLで初期化
 */
async function initializeSchema(client: Client): Promise<void> {
  // Tursoではbatchを使って複数のSQL文を実行
  await client.batch([
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      date TEXT,
      date_start TEXT,
      city TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id_masked TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      country TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(player_id_masked, first_name, last_name, country)
    )`,
    `CREATE INDEX IF NOT EXISTS players_name_idx ON players(first_name, last_name)`,
    `CREATE TABLE IF NOT EXISTS participations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id),
      event_id INTEGER NOT NULL REFERENCES events(id),
      division TEXT,
      deck_list_url TEXT,
      standing INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(player_id, event_id)
    )`,
    `CREATE INDEX IF NOT EXISTS participations_player_idx ON participations(player_id)`,
  ], 'write');
}

/**
 * データベース接続を取得
 * @returns Drizzle DBインスタンス（未初期化の場合はnull）
 */
export function getDatabase(): LibSQLDatabase<typeof schema> | null {
  return drizzleDb;
}

/**
 * データベース接続をクローズ
 */
export function closeDatabase(): void {
  if (libsqlClient) {
    libsqlClient.close();
    libsqlClient = null;
    drizzleDb = null;
  }
}

// スキーマをre-export
export * from './schema.js';
