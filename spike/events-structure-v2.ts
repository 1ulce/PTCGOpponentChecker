/**
 * Task 1.1: 大会一覧ページの構造検証（詳細版）
 *
 * Past Pokémon Eventsテーブルの詳細構造を調査
 */

import { chromium } from 'playwright';

async function analyzeEventsPageV2() {
  console.log('🔍 Past Pokémon Events テーブルの詳細検証...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://rk9.gg/events/pokemon', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#dtPastEvents tbody tr', { timeout: 10000 });

    // ===== Past Events テーブルの詳細 =====
    console.log('===== Past Pokémon Events テーブル詳細 =====\n');

    // テーブルの行数
    const pastEventsCount = await page.$$eval(
      '#dtPastEvents tbody tr',
      (rows) => rows.length
    );
    console.log(`Past Events 行数: ${pastEventsCount}\n`);

    // 各行の詳細構造（最初の5行）
    console.log('--- 行構造の詳細（最初の5行） ---');
    const rowDetails = await page.$$eval('#dtPastEvents tbody tr', (rows) =>
      rows.slice(0, 5).map((row, rowIdx) => {
        const cells = Array.from(row.querySelectorAll('td'));
        const linksCell = cells[4]; // 5番目のセル（Links列）

        // Links列内のすべてのリンクを取得
        const links = linksCell
          ? Array.from(linksCell.querySelectorAll('a')).map((a) => ({
              href: a.getAttribute('href'),
              text: a.textContent?.trim(),
            }))
          : [];

        return {
          rowIndex: rowIdx,
          date: cells[0]?.textContent?.trim(),
          eventName: cells[2]?.querySelector('a')?.textContent?.trim(),
          eventSlug: cells[2]?.querySelector('a')?.getAttribute('href'),
          city: cells[3]?.textContent?.trim(),
          links: links,
        };
      })
    );

    rowDetails.forEach((row) => {
      console.log(`\n行 ${row.rowIndex + 1}:`);
      console.log(`  日付: ${row.date}`);
      console.log(`  大会名: ${row.eventName}`);
      console.log(`  イベントSlug: ${row.eventSlug}`);
      console.log(`  開催地: ${row.city}`);
      console.log(`  リンク:`);
      row.links.forEach((link) => {
        console.log(`    - ${link.text}: ${link.href}`);
      });
    });

    // ===== TCG大会のみ抽出 =====
    console.log('\n\n===== TCG大会の抽出 =====\n');

    const tcgEvents = await page.$$eval('#dtPastEvents tbody tr', (rows) => {
      const results: Array<{
        date: string;
        eventName: string;
        city: string;
        tcgTournamentId: string | null;
      }> = [];

      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        const linksCell = cells[4];

        // TCGリンクを探す
        const tcgLink = linksCell?.querySelector('a[href*="/tournament/"]');
        const allLinks = linksCell
          ? Array.from(linksCell.querySelectorAll('a[href*="/tournament/"]'))
          : [];

        // TCGテキストを持つリンクを探す
        const tcgAnchor = allLinks.find(
          (a) => a.textContent?.trim() === 'TCG'
        );

        if (tcgAnchor) {
          const href = tcgAnchor.getAttribute('href');
          const match = href?.match(/\/tournament\/([A-Za-z0-9]+)/);

          results.push({
            date: cells[0]?.textContent?.trim() || '',
            eventName: cells[2]?.querySelector('a')?.textContent?.trim() || '',
            city: cells[3]?.textContent?.trim() || '',
            tcgTournamentId: match ? match[1] : null,
          });
        }
      });

      return results;
    });

    console.log(`TCG大会数: ${tcgEvents.length}\n`);
    console.log('最初の10件:');
    tcgEvents.slice(0, 10).forEach((event, i) => {
      console.log(
        `${i + 1}. ${event.eventName} (${event.date}) - ID: ${event.tcgTournamentId}`
      );
    });

    // ===== セレクタのまとめ =====
    console.log('\n\n===== 推奨セレクタ =====\n');
    console.log(`
【テーブル】
- Past Events: #dtPastEvents
- Upcoming Events: #dtUpcomingEvents

【行】
- Past Events の全行: #dtPastEvents tbody tr

【セル構造（0-indexed）】
- [0] 日付
- [1] ロゴ画像
- [2] 大会名（内部にaタグ）
- [3] 開催地
- [4] リンク（GO/TCG/UNITE/VG）

【TCG大会IDの抽出】
セレクタ: #dtPastEvents tbody tr td:nth-child(5) a
条件: textContent === 'TCG'
ID抽出: href.match(/\\/tournament\\/([A-Za-z0-9]+)/)

【待機条件】
- waitForSelector('#dtPastEvents tbody tr')
- または waitUntil: 'networkidle'
    `);

    // ===== 全TCG大会IDを出力 =====
    console.log('\n===== 全TCG大会ID一覧 =====\n');
    console.log(
      `総数: ${tcgEvents.length}件\n`
    );
    console.log('ID一覧:');
    tcgEvents.forEach((e) => console.log(`  ${e.tcgTournamentId}`));

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await browser.close();
    console.log('\n✅ 検証完了');
  }
}

analyzeEventsPageV2();
