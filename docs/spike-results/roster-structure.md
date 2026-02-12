# Task 1.2: Rosterページ構造検証結果

## 検証日時
2026-02-12

## 検証概要
rk9.ggのRosterページ（参加者一覧）の構造を調査し、クローラー実装に必要なセレクタとデータ抽出パターンを特定した。

## 検証対象
- TCG大会のみ（VGC/GO/UNITE等は除外）
- 過去の大会（Past Pokémon Events）から取得
- 144件のTCG大会を発見

## 検証結果

### 1. カラム構造（TCG大会共通）

| Index | カラム名 | 説明 |
|-------|---------|------|
| 0 | Player ID | マスク済みプレイヤーID |
| 1 | First name | 名 |
| 2 | Last name | 姓 |
| 3 | Country | 国 |
| 4 | Division | Masters/Senior/Junior |
| 5 | Deck List | デッキリストへのリンク |
| 6 | Standing | 順位 |

**注意**: Standingカラムはviewport幅が狭いと非表示になる（レスポンシブ対応）

### 2. Player IDマスク形式

- パターン: `数字....数字`
- 例: `2....8`, `5....9`, `4....5`
- 最初の1桁と最後の1桁のみ表示、中間4桁はドット

### 3. デッキリストURL

- 形式: `/decklist/public/{eventId}/{decklistId}`
- 例: `/decklist/public/ST01bmgM9jIqCvBYdzy3/z8GrCHO4EmJtipzzQvqT`
- 全参加者がデッキリストを持っているとは限らない

### 4. ページネーション（大規模大会検証済み）

- DataTablesによるクライアントサイドページネーション
- デフォルト50件/ページ
- **重要**: 全参加者データがHTMLに埋め込まれている（Ajax通信なし）

#### 大規模大会検証結果（ST01bmgM9jIqCvBYdzy3）
- 総参加者数: **1,870人**
- 初期表示: 50行
- 「All」選択後: 1,870行（全件取得可能）

#### 全件取得方法
```typescript
// "All"を選択して全件表示
await page.selectOption('.dataTables_length select', '-1');

// 読み込み待機
await page.waitForTimeout(2000);

// 全行取得
const allRows = await page.$$eval('table tbody tr', (rows) => rows.length);
// → 1,870行
```

### 5. 推奨セレクタ

```typescript
// テーブル全体
const table = 'table';

// ヘッダー行
const headers = 'table thead th';

// データ行（全参加者）
const rows = 'table tbody tr';

// 各セル
const cells = 'table tbody tr td';

// デッキリストリンク
const decklistLinks = 'table tbody a[href*="decklist"]';
```

### 6. 待機条件

```typescript
// ページ読み込み
await page.goto(url, { waitUntil: 'networkidle' });

// テーブルデータの待機
await page.waitForSelector('table tbody tr', { timeout: 15000 });
```

### 7. Viewport設定

Standingカラムを確実に取得するため、大きめのviewportを設定：

```typescript
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 }
});
```

## 大会タイプ別の差異

| 大会タイプ | カラム構造 | 備考 |
|-----------|-----------|------|
| TCG | Player ID \| First name \| Last name \| Country \| Division \| Deck List \| Standing | 本システムの対象 |
| VGC | Player ID \| First name \| Last name \| Country \| Screen name \| Team List | 対象外 |
| GO/UNITE | 類似構造だがカラム名が異なる | 対象外 |

## データ抽出コード例

```typescript
interface ParsedParticipant {
  playerIdMasked: string;
  firstName: string;
  lastName: string;
  country: string;
  division: string | null;
  deckListUrl: string | null;
  standing: number | null;
}

// カラムインデックス（TCG大会用）
const COL_INDICES = {
  playerId: 0,
  firstName: 1,
  lastName: 2,
  country: 3,
  division: 4,
  decklist: 5,
  standing: 6,
};

// データ抽出
const participants = await page.$$eval('table tbody tr', (rows) => {
  return rows.map((row) => {
    const cells = Array.from(row.querySelectorAll('td'));
    return {
      playerIdMasked: cells[0]?.textContent?.trim() || '',
      firstName: cells[1]?.textContent?.trim() || '',
      lastName: cells[2]?.textContent?.trim() || '',
      country: cells[3]?.textContent?.trim() || '',
      division: cells[4]?.textContent?.trim() || null,
      deckListUrl: cells[5]?.querySelector('a')?.getAttribute('href') || null,
      standing: parseInt(cells[6]?.textContent?.trim() || '', 10) || null,
    };
  });
});
```

## 注意事項

1. **TCG大会の識別**: イベント一覧ページで `<a>TCG</a>` リンクを持つ大会のみを対象とする
2. **全データ取得**: DataTablesはクライアントサイドなので、`tbody tr`で全行取得可能
3. **Polite Crawling**: リクエスト間に1-3秒の待機を入れる
4. **エラーハンドリング**: デッキリストがない参加者、順位が未定の参加者が存在する

## 検証に使用したスクリプト

`spike/roster-structure.ts`

## 次のステップ

- [ ] 1.3 エッジケースの検証（デッキリストなし、順位なし、特殊文字名）
- [ ] 3.1 Drizzleスキーマ定義
- [ ] 6.1 Rosterページの取得実装
