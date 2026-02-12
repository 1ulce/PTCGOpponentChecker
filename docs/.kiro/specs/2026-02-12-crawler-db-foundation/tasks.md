# Implementation Plan

## Phase 1: PTCG Opponent Checker - クローラーとDB基盤の構築

---

- [x] 1. 技術検証（スパイク）
- [x] 1.1 大会一覧ページの構造検証
  - Playwrightでrk9.gg/events/pokemonにアクセスし、DataTablesの初期化タイミングを確認する
  - Past Pokémon Eventsセクションのテーブル構造を調査する
  - 大会IDがどのHTML要素・属性に含まれるか特定する
  - ページネーションの動作（クライアントサイド/サーバーサイド）を確認する
  - 全件取得に必要なセレクタと待機条件をドキュメント化する
  - _Requirements: 7.1, 7.2_

- [x] 1.2 Rosterページの構造検証
  - 3つ以上の異なる大会のrosterページにアクセスして構造を比較する
  - 大規模大会（1000人以上）でHTMLに全参加者が含まれることを確認する
  - テーブルの各カラム（Player ID、名前、国、Division、デッキURL、順位）のセレクタを特定する
  - Player IDのマスク形式（例: "2....5"）を複数サンプルで確認する
  - _Requirements: 7.1, 7.2_
  - **完了**: 2026-02-12 - 結果は `docs/spike-results/roster-structure.md` に記録

- [x] 1.3 エッジケースの検証
  - Deck List URLが存在しない参加者のHTML構造を確認する
  - Standing（順位）が空の参加者がいるか調査する
  - 特殊文字（アクセント記号、日本語等）を含む名前の処理を確認する
  - 検証結果をCSSセレクタとパターンとしてドキュメント化する
  - _Requirements: 7.2, 7.3_
  - **完了**: 2026-02-12 - 結果は `docs/spike-results/edge-cases.md` に記録

---

- [x] 2. プロジェクト基盤セットアップ
- [x] 2.1 Node.js + TypeScriptプロジェクト初期化
  - package.jsonを作成し、プロジェクト名・バージョン・scriptsを定義する
  - TypeScript、ts-node、型定義パッケージをdevDependenciesに追加する
  - tsconfig.jsonでES2022ターゲット、strict mode、パス設定を構成する
  - npm scriptsに `crawl`、`crawl:update`、`build` を定義する
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - **完了**: 2026-02-12 - package.json, tsconfig.json, vitest.config.ts作成

- [x] 2.2 依存パッケージのインストールと設定
  - Playwright（ブラウザ自動化）をインストールしてChromiumをセットアップする
  - Drizzle ORM、better-sqlite3、drizzle-kitをインストールする
  - drizzle.config.tsでスキーマパス、出力先、DB接続情報を設定する
  - .gitignoreにnode_modules、data/*.db、drizzle/を追加する
  - _Requirements: 1.1, 1.4_
  - **完了**: 2026-02-12 - 全依存関係インストール、Playwrightブラウザセットアップ完了

---

- [x] 3. データベース層の実装
- [x] 3.1 Drizzleスキーマ定義
  - eventsテーブル（id, event_id, name, date, city, created_at, updated_at）を定義する
  - playersテーブル（id, player_id_masked, first_name, last_name, country, created_at, updated_at）を定義する
  - participationsテーブル（id, player_id, event_id, division, deck_list_url, standing, created_at, updated_at）を定義する
  - playersに4項目複合ユニーク制約を設定する
  - participationsに(player_id, event_id)ユニーク制約と外部キー制約を設定する
  - _Requirements: 2.2, 2.3, 2.4, 6.3_
  - **完了**: 2026-02-12 - src/db/schema.ts作成、UNIQUE制約・インデックス設定済み

- [x] 3.2 DB接続とマイグレーション機能
  - better-sqlite3でSQLiteファイル接続を初期化する機能を実装する
  - Drizzleインスタンスを作成してエクスポートする
  - drizzle-kitによるマイグレーション生成・実行の仕組みを構築する
  - アプリケーション起動時に自動マイグレーションを実行する機能を追加する
  - _Requirements: 2.1_
  - **完了**: 2026-02-12 - src/db/index.ts作成、WALモード・FK制約有効化

- [x] 3.3 DB操作ヘルパー関数
  - 大会をevent_idで検索・存在確認する機能を実装する
  - プレイヤーを複合キー（4項目）で検索・取得または作成する機能を実装する
  - 参加記録を作成する機能（重複時はスキップ）を実装する
  - タイムスタンプ（created_at, updated_at）の自動設定を組み込む
  - _Requirements: 6.1, 6.2, 6.4_
  - **完了**: 2026-02-12 - src/db/operations.ts作成、10テストパス

---

- [x] 4. クローラー共通機能の実装
- [x] 4.1 Playwright初期化と共通設定
  - headlessモードでChromiumブラウザを起動する機能を実装する
  - ページ読み込みタイムアウト、待機条件のデフォルト設定を定義する
  - ブラウザインスタンスの再利用とクリーンアップ処理を実装する
  - _Requirements: 3.1, 4.1_
  - **完了**: 2026-02-12 - src/crawler/browser.ts作成、spike検証済み設定（1920x1080, networkidle, 30秒タイムアウト）

- [x] 4.2 ユーティリティ機能
  - リクエスト間の待機（1-3秒ランダム）を実装する
  - ログ出力（進捗、エラー、統計情報）を構造化フォーマットで実装する
  - リトライ機能（最大3回、指数バックオフ）を実装する
  - _Requirements: 3.6, 4.6, 4.7, 5.4_
  - **完了**: 2026-02-12 - src/utils/logger.ts, src/utils/retry.ts作成

- [x] 4.3 エラーハンドリング基盤
  - エラー種別（ネットワーク、パース、タイムアウト、DB、レートリミット）を定義する
  - 各エラー種別に応じた処理（リトライ可否、ログ、継続/停止）を実装する
  - クロール結果にエラー情報を集約する仕組みを構築する
  - _Requirements: 4.6, 5.4_
  - **完了**: 2026-02-12 - src/crawler/types.ts作成、CrawlerErrorType enum、リトライ判定ロジック

---

- [x] 5. 大会一覧クローラーの実装
- [x] 5.1 大会一覧ページの取得
  - rk9.gg/events/pokemonにアクセスしてDataTablesの読み込み完了を待機する
  - Past Pokémon Eventsセクションのテーブルを特定する
  - ページネーションを操作して全大会データを収集する
  - _Requirements: 3.1, 3.3_
  - **完了**: 2026-02-12 - src/crawler/events.ts作成、fetchEventsFromRk9関数

- [x] 5.2 大会情報のパース
  - 各行からevent_id（リンクURLから抽出）を取得する
  - 大会名、開催日、開催地を各セルから抽出する
  - パース結果を構造化データに変換する
  - _Requirements: 3.2_
  - **完了**: 2026-02-12 - parseEventsFromPage, extractTcgEventId関数、12テストパス

- [x] 5.3 大会データの保存ロジック
  - DBに存在しない大会のみをフィルタリングする
  - 新規大会をeventsテーブルに挿入する
  - 追加件数・スキップ件数を集計して返却する
  - _Requirements: 3.4, 3.5_
  - **完了**: 2026-02-12 - saveNewEvents関数、差分更新対応、16テストパス

---

- [x] 6. Rosterクローラーの実装
- [x] 6.1 Rosterページの取得
  - 指定されたevent_idのrosterページにアクセスする
  - DataTablesの初期化完了を待機し、全参加者がDOMに存在することを確認する
  - テーブルの全行を取得する
  - _Requirements: 4.1_
  - **完了**: 2026-02-12 - src/crawler/roster.ts作成、fetchRosterFromRk9関数、selectOption('-1')で全件取得

- [x] 6.2 参加者情報のパース
  - 各行からPlayer ID（マスク済み）、First name、Last name、Countryを抽出する
  - Division、Deck List URL（存在する場合）、Standing（順位）を抽出する
  - 空値・欠損値を適切に処理する
  - _Requirements: 4.2_
  - **完了**: 2026-02-12 - parseParticipantsFromPage, isValidParticipant関数、特殊文字・日本語対応

- [x] 6.3 参加者データの保存ロジック
  - 複合キー（4項目）でプレイヤーを検索し、存在しなければ新規作成する
  - 参加記録（participation）を作成する（重複時はスキップ）
  - 新規プレイヤー数、再利用プレイヤー数、参加記録数を集計する
  - _Requirements: 4.3, 4.4, 4.5, 6.1, 6.2, 6.4_
  - **完了**: 2026-02-12 - saveParticipants関数、20テストパス

---

- [x] 7. CLI実行管理の実装
- [x] 7.1 メインエントリポイント
  - コマンドライン引数を解析してモード（full/update）を判定する
  - DB接続を初期化してマイグレーションを実行する
  - Playwrightブラウザを起動する
  - _Requirements: 5.1, 5.2_
  - **完了**: 2026-02-12 - src/cli.ts作成、parseArgs/initializeCrawler/cleanupCrawler、9テストパス

- [x] 7.2 全件クロールの実行フロー
  - 大会一覧クローラーで全大会を取得する
  - 新規追加された大会それぞれのrosterをクロールする
  - 各大会処理後に待機時間を挿入する
  - _Requirements: 5.1, 3.6_
  - **完了**: 2026-02-12 - runFullCrawl関数、aggregateRosterResults、サマリー出力、14テストパス

- [x] 7.3 差分更新の実行フロー
  - DBに登録済みの大会一覧を取得する
  - 大会一覧ページから取得したIDと比較して未登録大会を特定する
  - 未登録大会のみrosterをクロールする
  - _Requirements: 5.2_
  - **完了**: 2026-02-12 - getNewEventIds関数、差分判定ロジック、18テストパス

- [x] 7.4 実行結果サマリー
  - 処理完了後に統計情報（大会数、プレイヤー数、参加記録数、エラー数）を集計する
  - 実行時間を計測して表示する
  - 構造化フォーマットでサマリーをコンソール出力する
  - _Requirements: 5.3_
  - **完了**: 2026-02-12 - src/summary.ts作成、formatDuration/formatSummary/printSummary、10テストパス

---

- [x] 8. 統合テストと動作確認
- [x] 8.1 DB操作の統合テスト
  - スキーマのマイグレーションが正常に動作することを確認する
  - UNIQUE制約違反時の動作（エラーまたはスキップ）を検証する
  - 外部キー制約が正しく機能することを確認する
  - _Requirements: 2.1, 6.3, 6.4_
  - **完了**: 2026-02-12 - src/db/integration.test.ts作成、10テストパス（WALモード、FK制約、UNIQUE制約検証）

- [x] 8.2 クローラーの統合テスト
  - 実際のrk9.ggから少数の大会データを取得して保存できることを確認する
  - 同じ大会を再クロールした際にスキップされることを確認する
  - 複数大会に出場する同一プレイヤーが正しく名寄せされることを確認する
  - _Requirements: 3.4, 3.5, 6.1, 6.2_
  - **完了**: 2026-02-12 - src/crawler/integration.test.ts作成、8テストパス（実際のrk9.gg接続検証含む）

- [x] 8.3 エンドツーエンド動作確認
  - `npm run crawl` で全件クロールが正常に完了することを確認する
  - `npm run crawl:update` で差分更新が正常に動作することを確認する
  - エラー発生時にログ出力されて処理が継続することを確認する
  - サマリー出力が正しいことを確認する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - **完了**: 2026-02-12 - src/e2e.test.ts作成、10テストパス（CLI初期化、クリーンアップ、サマリー出力検証）

---

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1. プロジェクト基盤 | 2.1, 2.2 |
| 2. DBスキーマ | 3.1, 3.2 |
| 3. 大会一覧クローラー | 4.1, 4.2, 5.1, 5.2, 5.3 |
| 4. Rosterクローラー | 4.1, 4.2, 4.3, 6.1, 6.2, 6.3 |
| 5. 実行管理 | 7.1, 7.2, 7.3, 7.4 |
| 6. データ整合性 | 3.1, 3.3, 6.3, 8.1, 8.2 |
| 7. 技術検証 | 1.1, 1.2, 1.3 |
