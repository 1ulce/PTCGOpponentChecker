import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema.js';

let sqliteDb: Database.Database | null = null;
let drizzleDb: BetterSQLite3Database<typeof schema> | null = null;

/**
 * データベース接続を作成し、スキーマを初期化する
 * @param dbPath DBファイルパス（デフォルト: ./data/ptcg.db）
 * @returns Drizzle DBインスタンス
 */
export function createDatabase(dbPath: string = './data/ptcg.db'): BetterSQLite3Database<typeof schema> {
  // 既存の接続があれば返す
  if (drizzleDb && sqliteDb) {
    return drizzleDb;
  }

  // DBファイルのディレクトリを作成
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // SQLite接続を作成
  sqliteDb = new Database(dbPath);

  // WALモードを有効化（パフォーマンス向上）
  sqliteDb.pragma('journal_mode = WAL');

  // 外部キー制約を有効化
  sqliteDb.pragma('foreign_keys = ON');

  // Drizzleインスタンスを作成
  drizzleDb = drizzle(sqliteDb, { schema });

  // スキーマを直接作成（マイグレーションファイルがない場合のフォールバック）
  initializeSchema(sqliteDb);

  return drizzleDb;
}

/**
 * スキーマを直接SQLで初期化（drizzle-kitマイグレーションのフォールバック）
 */
function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      date TEXT,
      date_start TEXT,
      city TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id_masked TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      country TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(player_id_masked, first_name, last_name, country)
    );

    CREATE INDEX IF NOT EXISTS players_name_idx ON players(first_name, last_name);

    CREATE TABLE IF NOT EXISTS participations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id),
      event_id INTEGER NOT NULL REFERENCES events(id),
      division TEXT,
      deck_list_url TEXT,
      standing INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(player_id, event_id)
    );

    CREATE INDEX IF NOT EXISTS participations_player_idx ON participations(player_id);
  `);
}

/**
 * drizzle-kitによるマイグレーションを実行
 * @param migrationsFolder マイグレーションフォルダパス
 */
export function runMigrations(migrationsFolder: string = './drizzle'): void {
  if (!drizzleDb) {
    throw new Error('Database not initialized. Call createDatabase() first.');
  }

  try {
    migrate(drizzleDb, { migrationsFolder });
  } catch (error) {
    // マイグレーションフォルダがない場合は無視（initializeSchemaで対応済み）
    console.warn('Migration skipped:', error instanceof Error ? error.message : error);
  }
}

/**
 * データベース接続を取得
 * @returns Drizzle DBインスタンス（未初期化の場合はnull）
 */
export function getDatabase(): BetterSQLite3Database<typeof schema> | null {
  return drizzleDb;
}

/**
 * データベース接続をクローズ
 */
export function closeDatabase(): void {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    drizzleDb = null;
  }
}

// スキーマをre-export
export * from './schema.js';
