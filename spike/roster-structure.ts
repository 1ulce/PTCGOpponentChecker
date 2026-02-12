/**
 * Task 1.2: Rosterページの構造検証
 *
 * 複数の大会rosterページの構造を調査して、
 * クローラー実装に必要なセレクタとデータ抽出パターンを特定する。
 *
 * 検証項目:
 * - 3つ以上の異なる大会でrosterページ構造を比較
 * - 大規模大会（1000人以上）でHTMLに全参加者が含まれることを確認
 * - 各カラム（Player ID、名前、国、Division、デッキURL、順位）のセレクタ特定
 * - Player IDのマスク形式確認
 */

import { chromium, Browser, Page } from 'playwright';

// 過去の大会から動的に取得する
// rosterページは /roster/{eventId} で直接アクセス

interface RosterColumn {
  index: number;
  header: string;
  sampleValues: string[];
}

interface RosterAnalysisResult {
  eventId: string;
  url: string;
  totalRows: number;
  columns: RosterColumn[];
  playerIdPattern: string[];
  hasDecklist: boolean;
  sampleParticipants: ParsedParticipant[];
  errors: string[];
}

interface ParsedParticipant {
  playerIdMasked: string;
  firstName: string;
  lastName: string;
  country: string;
  division: string | null;
  deckListUrl: string | null;
  standing: number | null;
}

async function analyzeRosterPage(
  browser: Browser,
  eventId: string
): Promise<RosterAnalysisResult> {
  const result: RosterAnalysisResult = {
    eventId,
    url: `https://rk9.gg/roster/${eventId}`,
    totalRows: 0,
    columns: [],
    playerIdPattern: [],
    hasDecklist: false,
    sampleParticipants: [],
    errors: [],
  };

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }, // 大きめのviewportでStandingカラムを表示
  });

  try {
    console.log(`\n📡 ${result.url} にアクセス中...`);
    await page.goto(result.url, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // ページタイトル確認
    const title = await page.title();
    console.log(`ページタイトル: ${title}`);

    // テーブルの読み込みを待機
    console.log('⏳ テーブルの読み込みを待機中...');

    // テーブルが存在するか確認
    const hasTable = await page.$('table');
    if (!hasTable) {
      console.log('⚠️ テーブルが見つかりません。ページ構造を確認...');

      // ページ内の主要要素を確認
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log(`ページ内容: ${bodyText}`);

      result.errors.push('テーブルが見つかりません');
      return result;
    }

    await page.waitForSelector('table tbody tr', { timeout: 15000 });

    // ===== 1. テーブルヘッダーの取得 =====
    const headers = await page.$$eval('table thead th', (ths) =>
      ths.map((th, idx) => ({
        index: idx,
        text: th.textContent?.trim() || '',
      }))
    );
    console.log(`ヘッダー: ${headers.map((h) => h.text).join(' | ')}`);

    // ===== 2. 全行数の取得 =====
    result.totalRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`総参加者数: ${result.totalRows}`);

    // ===== 3. 各カラムの構造分析 =====
    const columnAnalysis = await page.$$eval('table tbody tr', (rows) => {
      const analysis: { [key: number]: string[] } = {};
      const sampleSize = Math.min(10, rows.length);

      for (let i = 0; i < sampleSize; i++) {
        const cells = rows[i].querySelectorAll('td');
        cells.forEach((cell, idx) => {
          if (!analysis[idx]) analysis[idx] = [];
          analysis[idx].push(cell.innerHTML.substring(0, 500));
        });
      }
      return analysis;
    });

    // ヘッダーと結合してカラム情報を構築
    result.columns = headers.map((h) => ({
      index: h.index,
      header: h.text,
      sampleValues: columnAnalysis[h.index] || [],
    }));

    // ===== 4. Player ID パターンの抽出 =====
    // Player IDカラムを特定（"Player ID" or similar header）
    const playerIdColIndex = headers.findIndex(
      (h) =>
        h.text.toLowerCase().includes('player') || h.text.toLowerCase().includes('id')
    );

    if (playerIdColIndex >= 0 && columnAnalysis[playerIdColIndex]) {
      result.playerIdPattern = columnAnalysis[playerIdColIndex]
        .map((html) => {
          // HTMLからテキストを抽出
          const text = html.replace(/<[^>]+>/g, '').trim();
          return text;
        })
        .filter((id) => id.length > 0);
    }

    // ===== 5. デッキリストURLの確認 =====
    const decklistLinks = await page.$$eval(
      'table tbody a[href*="decklist"], table tbody a[href*="decklists"]',
      (links) => links.map((a) => a.getAttribute('href'))
    );
    result.hasDecklist = decklistLinks.length > 0;
    console.log(`デッキリストあり: ${result.hasDecklist} (${decklistLinks.length}件)`);

    // リンクの形式を確認
    if (decklistLinks.length > 0) {
      console.log(`デッキリストURL例: ${decklistLinks.slice(0, 3).join(', ')}`);
    }

    // ===== 6. サンプル参加者のパース =====
    result.sampleParticipants = await parseParticipants(page, headers, 5);

    // ===== 7. 全参加者がHTMLに含まれているか確認 =====
    const paginationInfo = await page.evaluate(() => {
      const info = document.querySelector('.dataTables_info');
      return info?.textContent?.trim() || null;
    });
    console.log(`ページネーション情報: ${paginationInfo}`);

    // DataTables設定の確認
    const dtLength = await page.$('.dataTables_length');
    if (dtLength) {
      const options = await dtLength.$$eval('select option', (opts) =>
        opts.map((o) => o.textContent)
      );
      console.log(`表示件数オプション: ${options.join(', ')}`);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMsg);
    console.error(`❌ エラー: ${errorMsg}`);
  } finally {
    await page.close();
  }

  return result;
}

async function parseParticipants(
  page: Page,
  headers: { index: number; text: string }[],
  limit: number
): Promise<ParsedParticipant[]> {
  // ヘッダーからカラムインデックスを動的に特定
  const findColIndex = (keywords: string[]) =>
    headers.findIndex((h) =>
      keywords.some((kw) => h.text.toLowerCase().includes(kw.toLowerCase()))
    );

  const colIndices = {
    playerId: findColIndex(['player', 'id']),
    firstName: findColIndex(['first']),
    lastName: findColIndex(['last']),
    country: findColIndex(['country', 'ctry']),
    division: findColIndex(['division', 'div']),
    decklist: findColIndex(['deck', 'list']),
    standing: findColIndex(['standing', 'place', 'rank']),
  };

  console.log(`カラムインデックス: ${JSON.stringify(colIndices)}`);

  return page.$$eval(
    'table tbody tr',
    (rows, args) => {
      const { indices, maxRows } = args;
      return rows.slice(0, maxRows).map((row) => {
        const cells = Array.from(row.querySelectorAll('td'));

        const getText = (idx: number) =>
          idx >= 0 ? cells[idx]?.textContent?.trim() || '' : '';
        const getLink = (idx: number) =>
          idx >= 0 ? cells[idx]?.querySelector('a')?.getAttribute('href') || null : null;

        return {
          playerIdMasked: getText(indices.playerId),
          firstName: getText(indices.firstName),
          lastName: getText(indices.lastName),
          country: getText(indices.country),
          division: getText(indices.division) || null,
          deckListUrl: getLink(indices.decklist),
          standing: indices.standing >= 0 ? parseInt(getText(indices.standing), 10) || null : null,
        };
      });
    },
    { indices: colIndices, maxRows: limit }
  );
}

async function getPastEventIds(browser: Browser): Promise<string[]> {
  console.log('\n📋 過去の大会一覧からTCG大会IDを取得中...');
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    await page.goto('https://rk9.gg/events/pokemon', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await page.waitForSelector('#dtPastEvents tbody tr', { timeout: 15000 });

    // Past Eventsテーブルから「TCG」大会のみのIDを取得
    const eventIds = await page.$$eval(
      '#dtPastEvents tbody tr a[href*="/tournament/"]',
      (links) =>
        links
          .filter((a) => {
            const text = a.textContent?.trim() || '';
            return text === 'TCG'; // TCGのみ
          })
          .map((a) => {
            const href = a.getAttribute('href');
            return href?.match(/\/tournament\/([A-Za-z0-9]+)/)?.[1] || null;
          })
          .filter((id): id is string => id !== null)
    );

    console.log(`${eventIds.length}件のTCG大会を発見`);
    return eventIds;
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🔍 Rosterページの構造検証を開始...\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const results: RosterAnalysisResult[] = [];

  try {
    // 過去の大会からIDを取得
    const allEventIds = await getPastEventIds(browser);

    // 最初の3つ + 大規模大会を探して検証
    const testEventIds = allEventIds.slice(0, 3);

    // 大規模大会を探す（参加者1000人以上）
    console.log('\n🔍 大規模大会を検索中...');
    for (const eventId of allEventIds.slice(0, 20)) {
      if (testEventIds.includes(eventId)) continue;

      const checkPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      try {
        await checkPage.goto(`https://rk9.gg/roster/${eventId}`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        // DataTablesのinfo要素から総件数を確認
        const infoText = await checkPage.evaluate(() => {
          const info = document.querySelector('.dataTables_info');
          return info?.textContent || '';
        });

        const match = infoText.match(/of\s+([\d,]+)\s+entries/i);
        const totalCount = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;

        console.log(`  ${eventId}: ${totalCount}人`);

        if (totalCount >= 500) {
          testEventIds.push(eventId);
          console.log(`  → 大規模大会として追加！`);
          break;
        }
      } catch {
        // skip
      } finally {
        await checkPage.close();
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`\n検証対象大会: ${testEventIds.join(', ')}`);

    // 各大会のRosterページを分析
    for (const eventId of testEventIds) {
      console.log('\n' + '='.repeat(60));
      console.log(`📊 大会 ${eventId} を分析中...`);
      console.log('='.repeat(60));

      const result = await analyzeRosterPage(browser, eventId);
      results.push(result);

      // 1-3秒待機（polite crawling）
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));
    }

    // ===== 検証結果サマリー =====
    console.log('\n' + '='.repeat(60));
    console.log('📋 Rosterページ構造検証結果サマリー');
    console.log('='.repeat(60));

    // 共通カラム構造の特定
    console.log('\n【カラム構造】');
    results.forEach((r, i) => {
      if (r.columns.length > 0) {
        console.log(`  大会${i + 1} (${r.eventId}):`);
        console.log(`    ${r.columns.map((c) => c.header).join(' | ')}`);
      }
    });

    // Player IDパターン
    console.log('\n【Player IDパターン（マスク形式）】');
    results.forEach((r) => {
      if (r.playerIdPattern.length > 0) {
        console.log(`  ${r.eventId}: ${r.playerIdPattern.slice(0, 5).join(', ')}`);
      }
    });

    // 参加者数
    console.log('\n【参加者数】');
    results.forEach((r) => {
      console.log(
        `  ${r.eventId}: ${r.totalRows}人 (デッキリスト: ${r.hasDecklist ? 'あり' : 'なし'})`
      );
    });

    // サンプル参加者データ
    console.log('\n【サンプル参加者データ】');
    results.forEach((r) => {
      if (r.sampleParticipants.length > 0) {
        console.log(`\n  --- ${r.eventId} ---`);
        r.sampleParticipants.slice(0, 2).forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.firstName} ${p.lastName} (${p.country})`);
          console.log(`     Player ID: "${p.playerIdMasked}"`);
          console.log(`     Division: ${p.division || 'N/A'}`);
          console.log(`     Standing: ${p.standing || 'N/A'}`);
          console.log(`     Decklist: ${p.deckListUrl || 'なし'}`);
        });
      }
    });

    // エラー
    const allErrors = results.flatMap((r) =>
      r.errors.map((e) => `${r.eventId}: ${e}`)
    );
    if (allErrors.length > 0) {
      console.log('\n【エラー・警告】');
      allErrors.forEach((e) => console.log(`  ⚠️ ${e}`));
    }

    // 推奨セレクタ（成功した大会から抽出）
    const successResult = results.find((r) => r.columns.length > 0);
    if (successResult) {
      console.log('\n【推奨セレクタ・パターン】');
      console.log(`
  テーブル: table
  ヘッダー: table thead th
  データ行: table tbody tr
  セル: table tbody tr td
  デッキリストリンク: table tbody a[href*="decklist"]

  カラム構成: ${successResult.columns.map((c) => c.header).join(' | ')}

  待機条件: table tbody tr が存在するまで

  Player ID形式: ${successResult.playerIdPattern[0] || 'N/A'}
      `);
    }

  } catch (error) {
    console.error('❌ 検証中にエラー発生:', error);
  } finally {
    await browser.close();
    console.log('\n✅ 検証完了');
  }
}

main();
