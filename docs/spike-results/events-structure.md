# 技術検証結果

## Task 1.1: 大会一覧ページの構造検証

**検証日**: 2026-02-12
**対象URL**: https://rk9.gg/events/pokemon

---

## 1. ページ構造

### テーブル構成

| テーブルID | 説明 | 行数 |
|-----------|------|------|
| `#dtUpcomingEvents` | 今後の大会 | 7件（変動） |
| `#dtPastEvents` | 過去の大会 | 134件（2026-02-12時点） |

### セクション見出し

- `<h4>Upcoming Pokémon Events</h4>`
- `<h4>Past Pokémon Events</h4>`

---

## 2. テーブル行の構造

### セル構成（0-indexed）

| Index | 内容 | 例 |
|-------|------|-----|
| 0 | 日付 | "February 7-8, 2026" |
| 1 | ロゴ画像 | `<img src="..." height="30">` |
| 2 | 大会名（aタグ内） | "2026 Santiago Pokémon Regional Championships" |
| 3 | 開催地 | "Huechuraba, CL" |
| 4 | リンク（GO/TCG/UNITE/VG/Spectators） | 複数のaタグ |

### 大会名セルの構造

```html
<td>
  <a href="/event/pokemon-santiago-2026" target="_blank">
    2026 Santiago Pokémon Regional Championships
  </a>
  <br>
  <i></i>
</td>
```

### リンクセルの構造

```html
<td>
  <a href="/tournament/ST03Gz1KMoh4n8Av4tPY">GO</a>
  <a href="/tournament/ST01bmgM9jIqCvBYdzy3">TCG</a>
  <a href="/tournament/ST02KJ5wqNl34q3KGE8N">VG</a>
  <a href="/spectator/pokemon-santiago-2026">Spectators</a>
</td>
```

---

## 3. 大会IDの抽出

### パターン

- **URL形式**: `/tournament/{ID}`
- **ID形式**: 英数字20文字程度（例: `ST01bmgM9jIqCvBYdzy3`）
- **正規表現**: `/\/tournament\/([A-Za-z0-9]+)/`

### TCG大会の特定方法

```javascript
// リンクセル内でテキストが"TCG"のaタグを探す
const tcgLink = row.querySelector('td:nth-child(5) a');
const allLinks = Array.from(row.querySelectorAll('td:nth-child(5) a'));
const tcgAnchor = allLinks.find(a => a.textContent?.trim() === 'TCG');
```

---

## 4. DataTables設定

### 確認事項

- **ページネーション**: なし（全件表示）
- **並び替え**: 無効 (`ordering: false`)
- **表示件数**: 固定（セレクタなし）

### 待機条件

```javascript
// 推奨: networkidle + セレクタ待機
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('#dtPastEvents tbody tr');
```

---

## 5. 推奨セレクタ

### クローラー実装用

```typescript
// テーブル
const PAST_EVENTS_TABLE = '#dtPastEvents';
const UPCOMING_EVENTS_TABLE = '#dtUpcomingEvents';

// 行
const PAST_EVENTS_ROWS = '#dtPastEvents tbody tr';

// セル（行から相対）
const DATE_CELL = 'td:nth-child(1)';
const EVENT_NAME_LINK = 'td:nth-child(3) a';
const CITY_CELL = 'td:nth-child(4)';
const LINKS_CELL = 'td:nth-child(5)';

// TCG大会リンク（行内）
const TCG_LINK = 'td:nth-child(5) a'; // textContent === 'TCG'
```

---

## 6. データ抽出コード例

```typescript
interface ParsedEvent {
  eventId: string;
  name: string;
  date: string | null;
  city: string | null;
}

async function extractTCGEvents(page: Page): Promise<ParsedEvent[]> {
  return await page.$$eval('#dtPastEvents tbody tr', (rows) => {
    return rows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        const linksCell = cells[4];

        // TCGリンクを探す
        const links = linksCell ? Array.from(linksCell.querySelectorAll('a')) : [];
        const tcgAnchor = links.find((a) => a.textContent?.trim() === 'TCG');

        if (!tcgAnchor) return null;

        const href = tcgAnchor.getAttribute('href');
        const match = href?.match(/\/tournament\/([A-Za-z0-9]+)/);

        return {
          eventId: match ? match[1] : '',
          name: cells[2]?.querySelector('a')?.textContent?.trim() || '',
          date: cells[0]?.textContent?.trim() || null,
          city: cells[3]?.textContent?.trim() || null,
        };
      })
      .filter((e): e is ParsedEvent => e !== null && e.eventId !== '');
  });
}
```

---

## 7. 確認済み大会ID例

| 大会名 | ID |
|--------|-----|
| 2026 Santiago Regional | ST01bmgM9jIqCvBYdzy3 |
| 2026 Sydney Regional | SY01X6aiblBgAp8tfhjx |
| 2026 LAIC | LA0126uWiVw5bRySlkA2 |
| 2024 World Championships | worlds |
| 2024 NAIC | naic |
| 2024 EUIC | euic |

**注意**: 一部の大会（World Championships等）はIDが短い（`worlds`, `naic`等）

---

## 8. TCGカバレッジ分析

### 結果

| 項目 | 件数 |
|------|------|
| 全大会数 | 134 |
| TCGリンクあり | 134件（100%） |
| TCGリンクなし | 0件 |
| TCGリンク総数 | 144件 |

### 複数TCGリンクを持つ大会（7件）

| 大会 | リンク数 | 例 |
|------|---------|-----|
| 2023 World Championships | 2 | Day 1が分離 |
| 2022 World Championships | 5 | Open TCG (Blue/Yellow) + Main + Day 1 |
| その他5大会 | 各2 | Day 1/Day 2分離 |

### クローラー実装への影響

1. **全ての過去大会にTCGリンクが存在** → TCGなし大会のハンドリング不要
2. **一部大会に複数TCGリンクがある** → 全て取得するか、最初の1つだけか決める必要あり
3. **World Championships系は特殊** → Day 1, Open TCG等の分離に注意

### 推奨対応

```typescript
// オプション1: 最初のTCGリンクのみ取得（シンプル）
const tcgLink = links.find(a => a.textContent === 'TCG');

// オプション2: 全TCGリンクを取得（完全）
const tcgLinks = links.filter(a => a.textContent === 'TCG');
```

---

## 9. 次のステップ

- [x] 大会一覧ページの構造確認
- [x] DataTablesの初期化タイミング確認
- [x] ページネーションの確認（なし）
- [x] 大会IDの抽出パターン確認
- [x] セレクタのドキュメント化
- [x] Task 1.2: Rosterページの構造検証 → [roster-structure.md](roster-structure.md)
- [ ] Task 1.3: エッジケースの検証
