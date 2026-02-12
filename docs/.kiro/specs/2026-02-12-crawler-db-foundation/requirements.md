# Requirements Document

## Introduction

PTCG Opponent Checker Phase 1として、rk9.ggからポケモンカード大会データを収集・保存する基盤システムを構築する。

本フェーズでは、大会一覧と参加者情報をクローリングし、SQLiteデータベースに永続化する機能を実装する。これにより、Phase 2以降の検索機能・Web UIの基盤となるデータ層を確立する。

### ビジネス価値
- 対戦相手の過去デッキ使用履歴を検索可能にするためのデータ基盤
- rk9.ggのデータを構造化して保存し、高速な検索を実現

---

## Requirements

### Requirement 1: プロジェクト基盤セットアップ

**Objective:** 開発者として、TypeScript + Node.jsの開発環境を構築したい。これにより、型安全なコードでクローラーとDB操作を実装できる。

#### Acceptance Criteria

1. WHEN プロジェクトをクローンした後 THEN 開発者 SHALL `npm install` で全依存関係をインストールできる
2. WHEN TypeScriptファイルを編集した後 THEN ビルドシステム SHALL トランスパイルしてJavaScriptを生成できる
3. WHEN `npm run crawl` を実行した時 THEN クローラー SHALL 正常に起動する
4. WHERE プロジェクトルート THE 設定ファイル（tsconfig.json, package.json）SHALL 適切なTypeScript設定を含む

---

### Requirement 2: データベーススキーマ定義

**Objective:** 開発者として、Drizzle ORMでSQLiteスキーマを定義したい。これにより、型安全なデータベース操作が可能になる。

#### Acceptance Criteria

1. WHEN アプリケーションが初回起動した時 THEN DBスキーマ SHALL 自動的にマイグレーションされる
2. WHERE eventsテーブル THE スキーマ SHALL 以下のカラムを含む：
   - id (INTEGER, PRIMARY KEY, AUTOINCREMENT)
   - event_id (TEXT, UNIQUE, NOT NULL) - rk9のイベントID
   - name (TEXT, NOT NULL) - 大会名
   - date (TEXT) - 開催日
   - city (TEXT) - 開催地
   - created_at (TEXT, NOT NULL)
   - updated_at (TEXT, NOT NULL)

3. WHERE playersテーブル THE スキーマ SHALL 以下のカラムを含む：
   - id (INTEGER, PRIMARY KEY, AUTOINCREMENT)
   - player_id_masked (TEXT, NOT NULL) - マスク済みID（例: "2....5"）
   - first_name (TEXT, NOT NULL)
   - last_name (TEXT, NOT NULL)
   - country (TEXT, NOT NULL)
   - created_at (TEXT, NOT NULL)
   - updated_at (TEXT, NOT NULL)
   - UNIQUE制約 (player_id_masked, first_name, last_name, country)

4. WHERE participationsテーブル THE スキーマ SHALL 以下のカラムを含む：
   - id (INTEGER, PRIMARY KEY, AUTOINCREMENT)
   - player_id (INTEGER, FK → players.id, NOT NULL)
   - event_id (INTEGER, FK → events.id, NOT NULL)
   - division (TEXT) - Masters/Junior/Senior
   - deck_list_url (TEXT) - デッキリストURL（nullable）
   - standing (INTEGER) - 順位
   - created_at (TEXT, NOT NULL)
   - updated_at (TEXT, NOT NULL)
   - UNIQUE制約 (player_id, event_id)

---

### Requirement 3: 大会一覧クローラー

**Objective:** システムとして、rk9.ggから過去の全ポケモンカード大会一覧を取得したい。これにより、データ収集の起点となる大会IDを取得できる。

#### Acceptance Criteria

1. WHEN クローラーが大会一覧ページにアクセスした時 THEN クローラー SHALL JavaScriptで生成されるDataTablesコンテンツを待機して取得する
2. WHEN 大会一覧を取得した時 THEN クローラー SHALL 各大会の以下情報を抽出する：
   - event_id（URLから抽出）
   - 大会名
   - 開催日
   - 開催地
3. WHEN ページネーションが存在する場合 THEN クローラー SHALL 全ページを巡回して全大会を取得する
4. WHEN 取得した大会がDBに存在しない場合 THEN クローラー SHALL 新規レコードとして挿入する
5. WHEN 取得した大会が既にDBに存在する場合 THEN クローラー SHALL スキップする（差分更新）
6. WHILE クローリング中 THE クローラー SHALL リクエスト間に適切な待機時間（1-3秒）を設ける

---

### Requirement 4: 大会結果（Roster）クローラー

**Objective:** システムとして、各大会の参加者情報とデッキリストを取得したい。これにより、プレイヤーの大会参加履歴を記録できる。

#### 技術的前提（検証済み）
- rosterページはクライアントサイド埋め込み型（HTMLに全件含まれる）
- Ajax通信なし、DataTablesはクライアントサイドでページネーション処理
- ページ読み込み完了後、全参加者データがDOM上に存在する

#### Acceptance Criteria

1. WHEN クローラーがroster URLにアクセスした時 THEN クローラー SHALL ページ読み込み完了を待ち、HTMLに埋め込まれた全参加者データを取得する
2. WHEN 参加者データを取得した時 THEN クローラー SHALL 各参加者の以下情報を抽出する：
   - Player ID（マスク済み: 例 "2....5"）
   - First name
   - Last name
   - Country
   - Division
   - Deck List URL（存在する場合）
   - Standing（順位）
3. WHEN 参加者がplayersテーブルに存在しない場合 THEN クローラー SHALL 新規プレイヤーレコードを作成する
4. WHEN 参加者がplayersテーブルに既に存在する場合（複合キー一致） THEN クローラー SHALL 既存レコードを再利用する
5. WHEN 参加記録がparticipationsテーブルに存在しない場合 THEN クローラー SHALL 新規参加記録を作成する
6. IF クローリング中にエラーが発生した場合 THEN クローラー SHALL エラーをログ出力し、次の大会の処理を継続する
7. WHILE クローリング中 THE クローラー SHALL 進捗状況をコンソールに出力する

---

### Requirement 5: クローラー実行管理

**Objective:** 運用者として、クローラーの実行方法を制御したい。これにより、初回の全件取得と差分更新を使い分けられる。

#### Acceptance Criteria

1. WHEN `npm run crawl` を実行した時 THEN クローラー SHALL 全大会の一覧取得 → 各大会の結果取得を順次実行する
2. WHEN `npm run crawl:update` を実行した時 THEN クローラー SHALL DBに未登録の大会のみを対象に結果取得を実行する
3. WHEN クローリングが完了した時 THEN クローラー SHALL 処理結果サマリーを出力する：
   - 新規追加された大会数
   - 新規追加されたプレイヤー数
   - 新規追加された参加記録数
   - エラー発生数
4. IF 致命的エラー（ネットワーク障害等）が発生した場合 THEN クローラー SHALL 適切なエラーメッセージを出力して終了する

---

### Requirement 6: データ整合性

**Objective:** システムとして、データの一貫性と正確性を保証したい。これにより、検索機能で信頼性の高いデータを提供できる。

#### Acceptance Criteria

1. WHEN 同一プレイヤーが複数大会に参加している場合 THEN DB SHALL 同一のplayerレコードに紐づく複数のparticipationレコードを持つ
2. WHEN プレイヤーを識別する際 THEN システム SHALL player_id_masked + first_name + last_name + country の4項目が全て一致する場合のみ同一人物と判定する
3. WHERE 外部キー制約 THE DB SHALL participations.player_id → players.id, participations.event_id → events.id の参照整合性を保証する
4. IF 同一大会に同一プレイヤーの重複レコードが検出された場合 THEN システム SHALL 重複を無視して1件のみ保存する

---

### Requirement 7: 技術検証（スパイク）

**Objective:** 開発者として、本格実装前にrk9.ggのページ構造とデータ取得方法を検証したい。これにより、実装時のリスクを低減できる。

#### 検証項目

1. **大会一覧ページの検証**
   - DataTablesの初期化タイミング
   - ページネーションの全件取得方法
   - 大会IDの抽出パターン確認

2. **Rosterページの検証**
   - 全参加者データがHTMLに含まれることの確認（複数大会でテスト）
   - 大規模大会（1000人以上）での動作確認
   - テーブル構造・セレクタの特定

3. **エッジケースの確認**
   - Deck List URLが存在しない参加者の処理
   - Standing（順位）が空の場合の処理
   - 特殊文字を含む名前の処理

#### Acceptance Criteria

1. WHEN 技術検証を実施した時 THEN 開発者 SHALL 少なくとも3つの異なる大会でrosterデータ取得を確認する
2. WHEN 技術検証が完了した時 THEN 開発者 SHALL CSSセレクタとデータ抽出パターンをドキュメント化する
3. IF 想定と異なるページ構造が発見された場合 THEN 開発者 SHALL 要件定義を更新する
