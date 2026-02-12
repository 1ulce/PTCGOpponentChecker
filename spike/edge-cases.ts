/**
 * Task 1.3: エッジケースの検証
 *
 * 検証項目:
 * - Deck List URLが存在しない参加者のHTML構造
 * - Standing（順位）が空の参加者
 * - 特殊文字（アクセント記号、日本語等）を含む名前の処理
 */

import { chromium, Browser, Page } from 'playwright';

interface EdgeCaseResult {
  eventId: string;
  totalParticipants: number;
  withoutDecklist: number;
  withoutStanding: number;
  specialCharNames: string[];
  sampleWithoutDecklist: ParticipantSample[];
  sampleWithoutStanding: ParticipantSample[];
  sampleSpecialChar: ParticipantSample[];
}

interface ParticipantSample {
  playerIdMasked: string;
  firstName: string;
  lastName: string;
  country: string;
  division: string;
  deckListUrl: string | null;
  deckListHtml: string;
  standing: string;
  standingHtml: string;
}

async function analyzeEdgeCases(browser: Browser, eventId: string): Promise<EdgeCaseResult> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const result: EdgeCaseResult = {
    eventId,
    totalParticipants: 0,
    withoutDecklist: 0,
    withoutStanding: 0,
    specialCharNames: [],
    sampleWithoutDecklist: [],
    sampleWithoutStanding: [],
    sampleSpecialChar: [],
  };

  try {
    console.log(`\n📡 https://rk9.gg/roster/${eventId} にアクセス中...`);
    await page.goto(`https://rk9.gg/roster/${eventId}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await page.waitForSelector('table tbody tr', { timeout: 15000 });

    // 全件表示
    console.log('⏳ 全件表示中...');
    await page.selectOption('.dataTables_length select', '-1');
    await page.waitForTimeout(3000);

    // 全参加者データを取得
    const participants = await page.$$eval('table tbody tr', (rows) => {
      return rows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        return {
          playerIdMasked: cells[0]?.textContent?.trim() || '',
          firstName: cells[1]?.textContent?.trim() || '',
          lastName: cells[2]?.textContent?.trim() || '',
          country: cells[3]?.textContent?.trim() || '',
          division: cells[4]?.textContent?.trim() || '',
          deckListUrl: cells[5]?.querySelector('a')?.getAttribute('href') || null,
          deckListHtml: cells[5]?.innerHTML || '',
          standing: cells[6]?.textContent?.trim() || '',
          standingHtml: cells[6]?.innerHTML || '',
        };
      });
    });

    result.totalParticipants = participants.length;
    console.log(`総参加者数: ${result.totalParticipants}`);

    // === 1. デッキリストなしの参加者 ===
    const withoutDecklist = participants.filter((p) => !p.deckListUrl);
    result.withoutDecklist = withoutDecklist.length;
    result.sampleWithoutDecklist = withoutDecklist.slice(0, 5);

    console.log(`\n【デッキリストなし】: ${result.withoutDecklist}人 (${((result.withoutDecklist / result.totalParticipants) * 100).toFixed(1)}%)`);
    if (result.sampleWithoutDecklist.length > 0) {
      console.log('  サンプル:');
      result.sampleWithoutDecklist.slice(0, 3).forEach((p) => {
        console.log(`    - ${p.firstName} ${p.lastName}: deckListHtml="${p.deckListHtml.substring(0, 100)}"`);
      });
    }

    // === 2. 順位なしの参加者 ===
    const withoutStanding = participants.filter((p) => !p.standing || p.standing === '' || p.standing === '-');
    result.withoutStanding = withoutStanding.length;
    result.sampleWithoutStanding = withoutStanding.slice(0, 5);

    console.log(`\n【順位なし】: ${result.withoutStanding}人 (${((result.withoutStanding / result.totalParticipants) * 100).toFixed(1)}%)`);
    if (result.sampleWithoutStanding.length > 0) {
      console.log('  サンプル:');
      result.sampleWithoutStanding.slice(0, 3).forEach((p) => {
        console.log(`    - ${p.firstName} ${p.lastName}: standing="${p.standing}", standingHtml="${p.standingHtml.substring(0, 100)}"`);
      });
    }

    // === 3. 特殊文字を含む名前 ===
    // アクセント記号、日本語、特殊記号などを検出
    const specialCharRegex = /[^\x00-\x7F]|[áéíóúàèìòùâêîôûäëïöüñçøåæ]/i;
    const withSpecialChars = participants.filter(
      (p) => specialCharRegex.test(p.firstName) || specialCharRegex.test(p.lastName)
    );
    result.specialCharNames = withSpecialChars.map((p) => `${p.firstName} ${p.lastName}`);
    result.sampleSpecialChar = withSpecialChars.slice(0, 10);

    console.log(`\n【特殊文字を含む名前】: ${withSpecialChars.length}人`);
    if (result.sampleSpecialChar.length > 0) {
      console.log('  サンプル:');
      result.sampleSpecialChar.slice(0, 10).forEach((p) => {
        console.log(`    - "${p.firstName}" "${p.lastName}" (${p.country})`);
      });
    }

    // === 4. その他のエッジケース ===
    // 空のPlayer ID
    const emptyPlayerId = participants.filter((p) => !p.playerIdMasked || p.playerIdMasked === '');
    if (emptyPlayerId.length > 0) {
      console.log(`\n【空のPlayer ID】: ${emptyPlayerId.length}人`);
    }

    // 空の名前
    const emptyName = participants.filter((p) => !p.firstName || !p.lastName);
    if (emptyName.length > 0) {
      console.log(`\n【空の名前】: ${emptyName.length}人`);
      emptyName.slice(0, 3).forEach((p) => {
        console.log(`    - ID=${p.playerIdMasked}, first="${p.firstName}", last="${p.lastName}"`);
      });
    }

    // 空のCountry
    const emptyCountry = participants.filter((p) => !p.country);
    if (emptyCountry.length > 0) {
      console.log(`\n【空のCountry】: ${emptyCountry.length}人`);
    }

  } catch (error) {
    console.error(`❌ エラー: ${error}`);
  } finally {
    await page.close();
  }

  return result;
}

async function main() {
  console.log('🔍 エッジケースの検証を開始...\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const results: EdgeCaseResult[] = [];

  // 検証対象の大会（大規模 + 中規模）
  const testEventIds = [
    'ST01bmgM9jIqCvBYdzy3', // 1,870人の大規模大会
    'SY01X6aiblBgAp8tfhjx', // 別の大会
  ];

  try {
    for (const eventId of testEventIds) {
      console.log('\n' + '='.repeat(60));
      console.log(`📊 大会 ${eventId} のエッジケース検証`);
      console.log('='.repeat(60));

      const result = await analyzeEdgeCases(browser, eventId);
      results.push(result);

      await new Promise((r) => setTimeout(r, 2000));
    }

    // === サマリー ===
    console.log('\n' + '='.repeat(60));
    console.log('📋 エッジケース検証結果サマリー');
    console.log('='.repeat(60));

    console.log('\n【統計】');
    results.forEach((r) => {
      console.log(`\n${r.eventId}:`);
      console.log(`  総参加者: ${r.totalParticipants}人`);
      console.log(`  デッキリストなし: ${r.withoutDecklist}人 (${((r.withoutDecklist / r.totalParticipants) * 100).toFixed(1)}%)`);
      console.log(`  順位なし: ${r.withoutStanding}人 (${((r.withoutStanding / r.totalParticipants) * 100).toFixed(1)}%)`);
      console.log(`  特殊文字名: ${r.specialCharNames.length}人`);
    });

    // 推奨対応
    console.log('\n【推奨対応】');
    console.log(`
1. デッキリストなし:
   - deckListUrl が null または空の場合は null として保存
   - HTMLが空（<td></td>）または空白のみの場合がある

2. 順位なし:
   - standing が空文字列または "-" の場合は null として保存
   - 大会進行中の場合、順位が未確定の参加者がいる可能性

3. 特殊文字名:
   - UTF-8でそのまま保存（アクセント記号、日本語等）
   - DBのCOLLATION設定に注意（検索時の大文字小文字・アクセント区別）
   - 例: "Álvaro", "José", "日本語名"
    `);

  } catch (error) {
    console.error('❌ 検証中にエラー発生:', error);
  } finally {
    await browser.close();
    console.log('\n✅ 検証完了');
  }
}

main();
