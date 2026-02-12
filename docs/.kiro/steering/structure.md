# Project Structure

## Root Directory

```
PTCGOpponentChecker/
├── src/                    # バックエンドソースコード
├── web/                    # フロントエンド（React + Vite）
├── data/                   # SQLiteデータベース
├── dist/                   # ビルド出力
├── docs/                   # ドキュメント
├── spike/                  # 技術検証スクリプト
├── node_modules/           # 依存パッケージ
├── .claude/                # Claude Code設定
├── package.json            # プロジェクト設定
├── tsconfig.json           # TypeScript設定
├── drizzle.config.ts       # Drizzle ORM設定
├── vitest.config.ts        # Vitest設定
├── CLAUDE.md               # プロジェクト仕様書
└── .gitignore
```

## Source Directory (`src/`)

```
src/
├── index.ts                # CLIエントリポイント
├── cli.ts                  # CLI引数解析・実行管理
├── summary.ts              # 実行結果サマリー
├── e2e.test.ts             # E2Eテスト
├── crawler/                # クローラーモジュール
│   ├── browser.ts          # Playwright初期化・共通設定
│   ├── events.ts           # 大会一覧クローラー
│   ├── roster.ts           # 参加者クローラー
│   ├── types.ts            # クローラー型定義
│   ├── integration.test.ts # 統合テスト
│   └── *.test.ts           # ユニットテスト
├── db/                     # データベースモジュール
│   ├── index.ts            # DB接続・初期化
│   ├── schema.ts           # Drizzleスキーマ定義
│   ├── operations.ts       # CRUD操作ヘルパー
│   ├── queries.ts          # 検索クエリ（複合単語検索等）
│   ├── integration.test.ts # 統合テスト
│   └── *.test.ts           # ユニットテスト
├── api/                    # REST APIモジュール（Hono）
│   ├── index.ts            # Honoアプリ初期化・サーバー起動
│   └── routes/
│       └── players.ts      # プレイヤーAPIルート
└── utils/                  # ユーティリティ
    ├── logger.ts           # 構造化ロガー
    ├── retry.ts            # リトライ機能
    ├── sleep.ts            # 待機ユーティリティ
    ├── date.ts             # 日付パース
    └── *.test.ts           # テストファイル
```

## Frontend Directory (`web/`)

```
web/
├── src/
│   ├── main.tsx            # React エントリポイント
│   ├── App.tsx             # ルートコンポーネント
│   ├── App.test.tsx        # Appコンポーネントテスト
│   ├── types.ts            # フロントエンド型定義
│   ├── index.css           # グローバルスタイル
│   ├── test-setup.ts       # テストセットアップ
│   ├── components/         # UIコンポーネント
│   │   ├── SearchForm.tsx      # 検索フォーム
│   │   ├── PlayerList.tsx      # プレイヤー一覧
│   │   ├── ParticipationList.tsx # 参加履歴一覧
│   │   └── index.ts            # コンポーネント一括export
│   ├── hooks/              # カスタムフック
│   │   ├── usePlayerSearch.ts  # プレイヤー検索ロジック
│   │   ├── useParticipations.ts # 参加履歴取得ロジック
│   │   └── index.ts
│   └── api/                # API通信層
│       ├── client.ts       # APIクライアント
│       ├── client.test.ts  # クライアントテスト
│       └── index.ts
├── index.html              # HTMLテンプレート
├── package.json            # フロントエンド依存関係
├── tsconfig.json           # TypeScript設定
├── vite.config.ts          # Vite設定
├── vitest.config.ts        # Vitest設定
└── eslint.config.js        # ESLint設定
```

## Code Organization Patterns

### Module Structure
各モジュールは以下のパターンに従う：

```
module/
├── index.ts          # 公開API（あれば）
├── types.ts          # 型定義
├── [feature].ts      # 機能実装
└── [feature].test.ts # テスト（同階層に配置）
```

### Layer Separation

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| Presentation | `web/src/` | UI表示・ユーザー操作 |
| API | `src/api/` | RESTエンドポイント |
| CLI | `src/` (root) | コマンドライン処理 |
| Crawler | `src/crawler/` | 外部データ取得 |
| Data | `src/db/` | データ永続化 |
| Utils | `src/utils/` | 共通ユーティリティ |

### Dependency Flow
```
Presentation (React) → API Client
                           ↓ HTTP
                      API (Hono)
                           ↓
CLI → Crawler → Data (DB)
       ↓
     Utils (横断的)
```

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| 機能モジュール（Backend） | `kebab-case.ts` | `events.ts`, `browser.ts` |
| テストファイル | `*.test.ts(x)` | `events.test.ts`, `App.test.tsx` |
| 型定義 | `types.ts` | `crawler/types.ts`, `web/src/types.ts` |
| スキーマ | `schema.ts` | `db/schema.ts` |
| 設定ファイル | `*.config.ts` | `drizzle.config.ts`, `vite.config.ts` |
| Reactコンポーネント | `PascalCase.tsx` | `SearchForm.tsx`, `PlayerList.tsx` |
| カスタムフック | `use*.ts` | `usePlayerSearch.ts`, `useParticipations.ts` |
| インデックス | `index.ts(x)` | `components/index.ts`, `hooks/index.ts` |

## Import Organization

### Import Order
```typescript
// 1. Node.js built-in modules
import { existsSync } from 'fs';

// 2. External packages
import { chromium } from 'playwright';
import { eq } from 'drizzle-orm';

// 3. Internal modules (type imports)
import type { ParsedEvent, CrawlResult } from './types.js';

// 4. Internal modules (value imports)
import { createDatabase } from './db/index.js';
import { Logger } from './utils/logger.js';
```

### Import Rules
- ESM形式を使用（`.js`拡張子必須）
- 型のみのインポートは `type` キーワードを使用
- 相対パスでインポート

## Key Architectural Principles

### 1. TDD (Test-Driven Development)
- 全機能にユニットテストを作成
- テストファイルは実装ファイルと同階層に配置
- `*.test.ts` 命名規則

### 2. Type Safety
- `strict: true` でTypeScript使用
- Drizzle ORMによる型安全なDB操作
- 明示的な型定義（`types.ts`）

### 3. Error Handling
- `CrawlerError`型による構造化エラー
- リトライ可能/不可能の判定
- エラー発生時も処理継続（大会単位）

### 4. Polite Crawling
- リクエスト間に1-3秒の待機
- 最大3回のリトライ（指数バックオフ）
- 進捗ログの出力

## Documentation Structure

```
docs/
├── .kiro/
│   ├── steering/           # プロジェクトガイダンス
│   │   ├── product.md      # プロダクト概要
│   │   ├── tech.md         # 技術スタック
│   │   └── structure.md    # プロジェクト構造
│   └── specs/              # 仕様書
│       └── [feature]/
│           ├── requirements.md
│           ├── design.md
│           ├── tasks.md
│           └── spec.json
└── spike-results/          # 技術検証結果
    ├── events-structure.md
    ├── roster-structure.md
    └── edge-cases.md
```

## Data Directory

```
data/
└── ptcg.db                 # SQLiteデータベース（gitignore対象）
```

## Test Coverage

### Backend Tests

| Module | Test File | Tests |
|--------|-----------|-------|
| CLI | `cli.test.ts` | 18 |
| Summary | `summary.test.ts` | 10 |
| E2E | `e2e.test.ts` | 10 |
| Events | `events.test.ts` | 16 |
| Roster | `roster.test.ts` | 20 |
| Browser | `browser.test.ts` | 9 |
| Types | `types.test.ts` | 9 |
| DB Index | `index.test.ts` | 4 |
| DB Schema | `schema.test.ts` | 3 |
| DB Ops | `operations.test.ts` | 10 |
| DB Integration | `integration.test.ts` | 10 |
| Crawler Integration | `integration.test.ts` | 8 |
| Logger | `logger.test.ts` | 6 |
| Retry | `retry.test.ts` | 6 |
| Sleep | `sleep.test.ts` | 4 |
| **Backend Total** | | **143+** |

### Frontend Tests

| Module | Test File | Tests |
|--------|-----------|-------|
| App | `App.test.tsx` | 複数 |
| API Client | `client.test.ts` | 複数 |
| **Frontend Total** | | **多数** |

## React Component Patterns

### コンポーネント構造
```typescript
// 典型的なコンポーネント構造
interface ComponentProps {
  data: DataType;
  onAction: (param: ParamType) => void;
  isLoading?: boolean;
}

export function Component({ data, onAction, isLoading }: ComponentProps) {
  // 早期リターン（ローディング/エラー状態）
  if (isLoading) return <div>Loading...</div>;

  // メインレンダリング
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### カスタムフック構造
```typescript
// 典型的なカスタムフック構造
export function useFeature(param: ParamType) {
  const [state, setState] = useState<StateType>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await apiCall(param);
      setState(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [param]);

  return { state, isLoading, error, execute };
}
```
