# PTCG Opponent Checker

ポケモンカードゲームの対戦相手が過去に使用したデッキを表示するアプリケーション。

## プロジェクト概要

相手の名前を入力すると、その人が参加した大会一覧と、各大会で使用したデッキを表示する。

## データソース

- **大会一覧**: https://rk9.gg/events/pokemon
  - テーブル: `#dtPastEvents`（過去大会）、`#dtUpcomingEvents`（今後の大会）
  - ページネーションなし（全件表示）
  - TCG大会のみ対象（リンクテキストが"TCG"のもの）
  - 大会IDは `/tournament/{eventId}` 形式で埋め込み
  - 例: `ST01bmgM9jIqCvBYdzy3`

- **大会結果**: https://rk9.gg/roster/{eventId}
  - DataTablesクライアントサイドページネーション
  - **重要**: 全データ取得には `selectOption('-1')` で「All」選択が必要
  - カラム構造: `Player ID | First name | Last name | Country | Division | Deck List | Standing`
  - Player ID（部分マスク: `数字....数字` 形式、例: `2....8`）
  - viewport: 1920x1080推奨（Standingカラム表示のため）

## 要件定義

### 1. データ収集（クローラー）

#### 1.1 大会一覧の取得
- https://rk9.gg/events/pokemon から全大会を取得
- Past Pokémon Events セクションが対象
- 取得データ: 大会ID, 大会名, 開催日, 開催地

#### 1.2 大会結果の取得
- 各大会の `/roster/{eventId}` をクローリング
- 取得データ:
  - Player ID（マスク済み: 例 `2....5`）
  - First name
  - Last name
  - Country
  - Division（Masters/Junior/Senior）
  - Deck List URL（存在する場合）
  - Standing（順位）

#### 1.3 クローリング設計
- レートリミット考慮（polite crawling）
- 差分更新対応（新規大会のみ取得）
- エラーハンドリング・リトライ機構

### 2. データモデル

#### 2.1 プレイヤー識別
**重要**: Player IDは部分マスクされているため、単独では一意識別不可。

一意識別キー（複合キー）:
- Player ID（マスク済み）
- First name
- Last name
- Country

これら4つが全て一致した場合のみ、同一人物として認識する。

#### 2.2 テーブル設計（案）

```
events
├── id (PK)
├── event_id (rk9のID)
├── name
├── date
├── city
├── created_at
└── updated_at

players
├── id (PK)
├── player_id_masked (例: "2....5")
├── first_name
├── last_name
├── country
├── created_at
└── updated_at
└── UNIQUE(player_id_masked, first_name, last_name, country)

participations
├── id (PK)
├── player_id (FK -> players)
├── event_id (FK -> events)
├── division
├── deck_list_url
├── standing
├── created_at
└── updated_at
└── UNIQUE(player_id, event_id)
```

### 3. 検索機能

#### 3.1 検索条件
- First name（部分一致）
- Last name（部分一致）
- Country（完全一致、オプション）

#### 3.2 検索結果表示
- プレイヤー候補一覧（同名異人の可能性あり）
- 選択したプレイヤーの参加大会一覧
  - 大会名
  - 開催日
  - 使用デッキ（Deck List URLがあればリンク表示）
  - 順位

### 4. 技術スタック

#### 4.1 バックエンド
- **言語**: TypeScript
- **ランタイム**: Node.js
- **フレームワーク**: Express.js or Hono（軽量）
- **ORM**: Drizzle ORM or better-sqlite3

#### 4.2 データベース
- **SQLite**: 軽量・セットアップ不要、個人利用に最適

#### 4.3 フロントエンド
- **Web UI**: React + Vite（または Next.js）
- シンプルな検索フォームと結果表示

#### 4.4 クローラー
- **Puppeteer** または **Playwright**: DataTables（JavaScript生成）対応
- **node-cron**: 定期実行スケジューラー
- 実行環境: ローカル（開発）→ クラウド（運用時）

### 5. 制約・考慮事項

- rk9.ggの利用規約確認
- クローリング頻度の適切な設定
- Player IDマスクによる名寄せの限界
  - 同姓同名・同国籍の別人を区別できない可能性

## 開発フェーズ

### Phase 1: 基盤構築
1. プロジェクトセットアップ（TypeScript + Node.js）
2. DBスキーマ作成（SQLite + Drizzle）
3. クローラー実装（大会一覧 + 結果取得）
4. 初回データ投入

### Phase 2: Web UI + API
1. バックエンドAPI実装（検索エンドポイント）
2. フロントエンド実装（React + Vite）
3. 検索・結果表示画面

### Phase 3: 運用最適化
1. 定期クローリング設定（node-cron）
2. 差分更新最適化
3. デプロイ（Vercel/Cloudflare等）

---

## プロジェクト構成（予定）

```
PTCGOpponentChecker/
├── src/
│   ├── crawler/          # クローラー
│   │   ├── events.ts     # 大会一覧取得
│   │   └── roster.ts     # 大会結果取得
│   ├── db/
│   │   ├── schema.ts     # Drizzleスキーマ
│   │   └── index.ts      # DB接続
│   ├── api/              # APIエンドポイント
│   │   └── routes.ts
│   └── index.ts          # エントリーポイント
├── web/                  # フロントエンド（React）
│   ├── src/
│   └── ...
├── data/
│   └── ptcg.db           # SQLiteファイル
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

## コマンド（予定）

```bash
# 依存関係インストール
npm install

# クローラー実行（全大会）
npm run crawl

# クローラー実行（差分のみ）
npm run crawl:update

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

## 参考URL

- 大会一覧: https://rk9.gg/events/pokemon
- 大会結果例: https://rk9.gg/roster/ST01bmgM9jIqCvBYdzy3

---

## 技術検証結果（Spike）

| ドキュメント | 内容 |
|-------------|------|
| [docs/spike-results/events-structure.md](docs/spike-results/events-structure.md) | Task 1.1: 大会一覧ページ構造検証 |
| [docs/spike-results/roster-structure.md](docs/spike-results/roster-structure.md) | Task 1.2: Rosterページ構造検証 |
| [docs/spike-results/edge-cases.md](docs/spike-results/edge-cases.md) | Task 1.3: エッジケース検証（デッキリストなし、日本語名等） |

検証スクリプトは `spike/` ディレクトリに配置。

---

## Active Specifications

| Spec | Description | Phase |
|------|-------------|-------|
| [2026-02-12-crawler-db-foundation](docs/.kiro/specs/2026-02-12-crawler-db-foundation/) | Phase 1: クローラーとDB基盤の構築 | initialized |
| [2026-02-12-web-ui-api](docs/.kiro/specs/2026-02-12-web-ui-api/) | Phase 2: Web UI + API の実装 | initialized |
