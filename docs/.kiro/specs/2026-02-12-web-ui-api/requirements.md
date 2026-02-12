# Requirements Document

## Project Description (Input)

Phase 2: Web UI + API の実装

CLAUDE.md の Phase 2 に基づき、以下の機能を実装する:
1. バックエンドAPI実装（検索エンドポイント）
2. フロントエンド実装（React + Vite）
3. 検索・結果表示画面

### 機能要件（CLAUDE.mdより）

#### 検索条件
- Name（部分一致）- first_name と last_name の両方を検索
  - ユーザーがどちらがFirstかLastか迷わないように、入力欄は1つ
- Country（完全一致、オプション）
- Division（オプション、デフォルト: 全て Masters/Senior/Junior）

#### 検索結果表示
- プレイヤー候補一覧（同名異人の可能性あり）
- 選択したプレイヤーの参加大会一覧
  - 大会名
  - 開催日
  - 使用デッキ（Deck List URLがあればリンク表示）
  - 順位
  - **Division**（同名別人判別用）
  - **Player ID**（マスク済み、同名別人判別用）
  - **Country**（同名別人判別用）

#### ソート順
- **開催日の新しい順（降順）** で表示

#### 同名別人判別のための設計意図
Player ID、Division、Countryを検索結果に含めることで、ユーザーが同名の別人かどうかを自分で判断できるようにする。

### 技術スタック（CLAUDE.mdより）

#### バックエンド
- 言語: TypeScript
- ランタイム: Node.js
- フレームワーク: Express.js or Hono（軽量）
- ORM: Drizzle ORM

#### フロントエンド
- Web UI: React + Vite
- シンプルな検索フォームと結果表示
- **モバイルファースト**: 大会会場でのスマホ利用が前提
  - PC表示時もモバイル幅（max-width: 400px）で中央配置
  - レスポンシブ対応は不要

## Requirements
<!-- Will be generated in /kiro:spec-requirements phase -->
