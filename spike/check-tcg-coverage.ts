/**
 * TCG大会のカバレッジ検証
 * 全大会のうち、TCGリンクが存在する/しない大会を確認
 */

import { chromium } from 'playwright';

async function checkTCGCoverage() {
  console.log('🔍 TCG大会のカバレッジを検証...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://rk9.gg/events/pokemon', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#dtPastEvents tbody tr', { timeout: 10000 });

    // 全行を分析
    const analysis = await page.$$eval('#dtPastEvents tbody tr', (rows) => {
      const withTCG: Array<{ name: string; links: string[] }> = [];
      const withoutTCG: Array<{ name: string; links: string[] }> = [];

      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        const eventName = cells[2]?.querySelector('a')?.textContent?.trim() || 'Unknown';
        const linksCell = cells[4];

        // 全リンクを取得
        const allLinks = linksCell
          ? Array.from(linksCell.querySelectorAll('a')).map((a) => a.textContent?.trim() || '')
          : [];

        // TCGがあるかチェック
        const hasTCG = allLinks.some((text) => text === 'TCG');

        if (hasTCG) {
          withTCG.push({ name: eventName, links: allLinks });
        } else {
          withoutTCG.push({ name: eventName, links: allLinks });
        }
      });

      return { withTCG, withoutTCG };
    });

    console.log('===== 結果 =====\n');
    console.log(`全大会数: ${analysis.withTCG.length + analysis.withoutTCG.length}`);
    console.log(`TCGあり: ${analysis.withTCG.length}件`);
    console.log(`TCGなし: ${analysis.withoutTCG.length}件`);

    if (analysis.withoutTCG.length > 0) {
      console.log('\n===== TCGリンクがない大会 =====\n');
      analysis.withoutTCG.forEach((event, i) => {
        console.log(`${i + 1}. ${event.name}`);
        console.log(`   リンク: ${event.links.join(', ') || '(なし)'}`);
      });
    } else {
      console.log('\n✅ 全ての大会にTCGリンクがあります');
    }

    // リンクの種類を集計
    console.log('\n===== リンク種類の集計 =====\n');
    const linkCounts: Record<string, number> = {};
    analysis.withTCG.concat(analysis.withoutTCG).forEach((event) => {
      event.links.forEach((link) => {
        linkCounts[link] = (linkCounts[link] || 0) + 1;
      });
    });

    Object.entries(linkCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([link, count]) => {
        console.log(`  ${link}: ${count}件`);
      });

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await browser.close();
  }
}

checkTCGCoverage();
