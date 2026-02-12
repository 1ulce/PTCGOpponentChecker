# Technology Stack

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer (React)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ SearchForm  │  │ PlayerList   │  │ ParticipationList      │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘  │
│         │                │                      │               │
│         └────────────────┼──────────────────────┘               │
│                          │                                      │
│  ┌───────────────────────┴────────────────────────────────────┐ │
│  │  Custom Hooks: usePlayerSearch, useParticipations          │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                      │
│  ┌───────────────────────▼────────────────────────────────────┐ │
│  │  API Client: searchPlayers, getPlayerParticipations        │ │
│  └───────────────────────┬────────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP (port 3000)
┌──────────────────────────┼──────────────────────────────────────┐
│                     API Layer (Hono)                             │
│  ┌───────────────────────▼────────────────────────────────────┐ │
│  │  /api/players/search       - プレイヤー名検索               │ │
│  │  /api/players/:id/participations - 参加履歴取得            │ │
│  └───────────────────────┬────────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                     CLI Layer                                    │
│  ┌─────────┐  ┌──────────┴──┐  ┌─────────────────────┐          │
│  │ index.ts│  │   cli.ts    │  │    summary.ts       │          │
│  └────┬────┘  └──────┬──────┘  └──────────┬──────────┘          │
└───────┼──────────────┼─────────────────────┼────────────────────┘
        │              │                     │
┌───────┼──────────────┼─────────────────────┼────────────────────┐
│       │         Crawler Layer              │                    │
│  ┌────▼────┐  ┌──────▼──────┐  ┌──────────▼──────────┐          │
│  │ events  │  │   roster    │  │      browser        │          │
│  │ .ts     │  │    .ts      │  │       .ts           │          │
│  └────┬────┘  └──────┬──────┘  └─────────────────────┘          │
└───────┼──────────────┼──────────────────────────────────────────┘
        │              │
┌───────┼──────────────┼──────────────────────────────────────────┐
│       │        Data Layer                                       │
│  ┌────▼────────────▼─────┐  ┌─────────────────────────────────┐ │
│  │     operations.ts     │  │      queries.ts                 │ │
│  └───────────┬───────────┘  └────────────┬────────────────────┘ │
│              │                           │                      │
│  ┌───────────▼───────────────────────────▼────────────────────┐ │
│  │                      schema.ts                             │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                    ┌─────▼─────┐                                │
│                    │ ptcg.db   │ (SQLite)                       │
│                    └───────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

## Core Technologies

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Language | TypeScript | 5.7+ | 型安全な開発 |
| Runtime | Node.js | 20 LTS | 実行環境 |
| Browser Automation | Playwright | 1.50+ | rk9.ggクローリング |
| ORM | Drizzle ORM | 0.38+ | 型安全なDB操作 |
| Database | SQLite (better-sqlite3) | 11.8+ | ローカルデータ永続化 |
| API Framework | Hono | 4.11+ | 軽量RESTサーバー |
| Node HTTP Server | @hono/node-server | 1.19+ | Hono用Nodeアダプター |
| Frontend Framework | React | 19.2+ | UI構築 |
| Build Tool | Vite | 6.x | フロントエンドビルド |
| Testing | Vitest | 3.0+ | ユニット/統合テスト |
| Build | tsx | 4.19+ | TypeScript直接実行 |

## Development Environment

### Required Tools
- Node.js 20.x or higher
- npm 10.x or higher

### Initial Setup
```bash
# 依存関係インストール
npm install

# Playwrightブラウザセットアップ
npx playwright install chromium
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run crawl` | 全件クロール実行 |
| `npm run crawl:update` | 差分更新クロール |
| `npm test` | テスト実行（143+テスト） |
| `npm run test:watch` | テストウォッチモード |
| `npm run build` | TypeScriptビルド |
| `npm run db:generate` | Drizzleマイグレーション生成 |
| `npm run dev` | API + Web 同時起動 |
| `npm run dev:api` | APIサーバー起動（port 3000） |
| `npm run dev:web` | フロントエンド起動（port 5173） |

## Database Configuration

### SQLite Settings
- **File Location**: `./data/ptcg.db`
- **Journal Mode**: WAL（Write-Ahead Logging）
- **Foreign Keys**: 有効
- **Synchronous**: NORMAL

### Tables
| Table | Records | Purpose |
|-------|---------|---------|
| `events` | 134 | 大会情報 |
| `players` | 66,634 | プレイヤー情報 |
| `participations` | 183,972 | 大会参加記録 |

## Browser Automation Settings

### Playwright Configuration
```typescript
{
  headless: true,
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  waitUntil: 'networkidle'
}
```

### Rate Limiting
- リクエスト間隔: 1-3秒（ランダム）
- リトライ回数: 最大3回（指数バックオフ）

## Environment Variables

現時点では環境変数は使用していない。将来的に追加予定：

| Variable | Purpose | Default |
|----------|---------|---------|
| `DB_PATH` | SQLiteファイルパス | `./data/ptcg.db` |
| `LOG_LEVEL` | ログレベル | `INFO` |

## Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| API Server | 3000 | バックエンドAPI（Hono） |
| Web UI | 5173 | Vite開発サーバー |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/players/search` | プレイヤー名検索（query: `q`, `country`, `limit`） |
| GET | `/api/players/:id/participations` | 参加履歴取得（query: `division`） |

## Dependencies Overview

### Production Dependencies (Backend)
- `playwright`: ブラウザ自動化
- `drizzle-orm`: ORM
- `better-sqlite3`: SQLiteドライバ
- `hono`: REST APIフレームワーク
- `@hono/node-server`: Node.jsアダプター

### Production Dependencies (Frontend)
- `react`: UIライブラリ
- `react-dom`: React DOM レンダリング

### Development Dependencies
- `typescript`: TypeScriptコンパイラ
- `tsx`: TypeScript実行
- `vitest`: テストフレームワーク
- `drizzle-kit`: マイグレーションツール
- `vite`: フロントエンドビルド
- `concurrently`: 複数プロセス同時実行
- `@types/*`: 型定義
