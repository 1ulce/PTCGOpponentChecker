# Task 1.3: エッジケース検証結果

## 検証日時
2026-02-12

## 検証概要
rk9.ggのRosterページにおける以下のエッジケースを検証した：
1. デッキリストURLが存在しない参加者
2. 順位（Standing）が空の参加者
3. 特殊文字（アクセント記号、日本語等）を含む名前

## 検証対象大会

| 大会ID | 参加者数 | 地域 |
|--------|---------|------|
| ST01bmgM9jIqCvBYdzy3 | 1,870人 | チリ（サンティアゴ） |
| SY01X6aiblBgAp8tfhjx | 844人 | オーストラリア（シドニー） |

---

## 検証結果

### 1. デッキリストなしの参加者

| 大会 | 件数 | 割合 |
|------|------|------|
| ST01 | 0人 | 0.0% |
| SY01 | 1人 | 0.1% |

#### HTML構造（デッキリストなしの場合）

```html
<!-- デッキリストがある場合 -->
<td>
  <a href="/decklist/public/SY01X6aiblBgAp8tfhjx/w5KSrZXWR4kRFIq3FoLd">
    <span>View</span>
  </a>
</td>

<!-- デッキリストがない場合 -->
<td>&nbsp;</td>
```

#### 実装上の対応

```typescript
// デッキリストURLの取得
const deckListUrl = cells[5]?.querySelector('a')?.getAttribute('href') || null;

// &nbsp; や空白のみの場合は自動的に null になる
```

---

### 2. 順位なしの参加者

| 大会 | 件数 | 割合 |
|------|------|------|
| ST01 | 0人 | 0.0% |
| SY01 | 0人 | 0.0% |

**結論**: 検証した完了済み大会では全員に順位が付与されていた。

#### 想定されるケース

- 大会進行中の場合、順位が未確定の可能性
- 棄権（DQ）の参加者

#### 実装上の対応

```typescript
// 順位の取得
const standingText = cells[6]?.textContent?.trim() || '';
const standing = standingText && standingText !== '-'
  ? parseInt(standingText, 10) || null
  : null;
```

---

### 3. 特殊文字を含む名前

| 大会 | 件数 | 割合 |
|------|------|------|
| ST01 | 379人 | 20.3% |
| SY01 | 3人 | 0.4% |

#### 検出パターン

| 種類 | 例 | 大会 |
|------|-----|------|
| スペイン語アクセント | Adrián, Muñoz, Martínez, García | ST01 |
| フランス語アクセント | Aurélien | SY01 |
| 日本語（カタカナ） | コウキ ヤブタニ | SY01 |
| 日本語（漢字） | 康晴 早島 | SY01 |

#### サンプルデータ

```
ST01bmgM9jIqCvBYdzy3 (チリ大会):
- "Adrián" "Marin" (AR)
- "Agustin" "Muñoz" (CL)
- "Agustín" "Novoa Martínez" (CL)
- "Alejandro" "García" (CL)

SY01X6aiblBgAp8tfhjx (シドニー大会):
- "Aurélien" "B." (NZ)
- "コウキ" "ヤブタニ" (JP)
- "康晴" "早島" (JP)
```

#### 実装上の対応

```typescript
// UTF-8でそのまま保存
// SQLiteはデフォルトでUTF-8をサポート
const firstName = cells[1]?.textContent?.trim() || '';
const lastName = cells[2]?.textContent?.trim() || '';

// 検索時はCOLLATE NOCASEで大文字小文字を無視可能
// ただしアクセント記号は区別される
```

---

## その他のエッジケース

検証の結果、以下のケースは検出されなかった：

| ケース | 検出数 |
|--------|-------|
| 空のPlayer ID | 0人 |
| 空のFirst name | 0人 |
| 空のLast name | 0人 |
| 空のCountry | 0人 |

---

## 推奨実装パターン

### データ抽出関数

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

function parseParticipant(cells: HTMLTableCellElement[]): ParsedParticipant {
  // 基本フィールド（必須）
  const playerIdMasked = cells[0]?.textContent?.trim() || '';
  const firstName = cells[1]?.textContent?.trim() || '';
  const lastName = cells[2]?.textContent?.trim() || '';
  const country = cells[3]?.textContent?.trim() || '';

  // Division（オプション）
  const divisionText = cells[4]?.textContent?.trim();
  const division = divisionText && divisionText !== '' ? divisionText : null;

  // Deck List URL（オプション - &nbsp;の場合はnull）
  const deckListUrl = cells[5]?.querySelector('a')?.getAttribute('href') || null;

  // Standing（オプション - 空や"-"の場合はnull）
  const standingText = cells[6]?.textContent?.trim() || '';
  const standing = standingText && standingText !== '-' && standingText !== ''
    ? parseInt(standingText, 10) || null
    : null;

  return {
    playerIdMasked,
    firstName,
    lastName,
    country,
    division,
    deckListUrl,
    standing,
  };
}
```

### バリデーション

```typescript
function isValidParticipant(p: ParsedParticipant): boolean {
  // 必須フィールドのチェック
  return (
    p.playerIdMasked !== '' &&
    p.firstName !== '' &&
    p.lastName !== '' &&
    p.country !== ''
  );
}
```

---

## まとめ

| エッジケース | 発生頻度 | 対応方針 |
|-------------|---------|---------|
| デッキリストなし | 稀（0.1%未満） | `null`として保存 |
| 順位なし | 未検出 | `null`として保存 |
| 特殊文字名 | 高頻度（〜20%） | UTF-8でそのまま保存 |
| 日本語名 | 稀 | UTF-8でそのまま保存 |
| 必須フィールド空 | 未検出 | バリデーションで除外 |

---

## 検証スクリプト

`spike/edge-cases.ts`
