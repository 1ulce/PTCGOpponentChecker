/**
 * 複数のTCGリンクを持つ大会を確認
 */

import { chromium } from 'playwright';

async function checkMultipleTCG() {
  console.log('🔍 複数TCGリンクを持つ大会を検索...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://rk9.gg/events/pokemon', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#dtPastEvents tbody tr', { timeout: 10000 });

    const multipleTCG = await page.$$eval('#dtPastEvents tbody tr', (rows) => {
      const results: Array<{
        name: string;
        tcgLinks: Array<{ text: string; href: string }>;
      }> = [];

      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        const eventName = cells[2]?.querySelector('a')?.textContent?.trim() || 'Unknown';
        const linksCell = cells[4];

        const tcgLinks = linksCell
          ? Array.from(linksCell.querySelectorAll('a'))
              .filter((a) => a.textContent?.trim() === 'TCG')
              .map((a) => ({
                text: a.textContent?.trim() || '',
                href: a.getAttribute('href') || '',
              }))
          : [];

        if (tcgLinks.length > 1) {
          results.push({ name: eventName, tcgLinks });
        }
      });

      return results;
    });

    if (multipleTCG.length > 0) {
      console.log(`複数TCGリンクを持つ大会: ${multipleTCG.length}件\n`);
      multipleTCG.forEach((event, i) => {
        console.log(`${i + 1}. ${event.name}`);
        event.tcgLinks.forEach((link) => {
          console.log(`   - ${link.href}`);
        });
      });
    } else {
      console.log('複数TCGリンクを持つ大会: なし');
    }

    // TCGリンクの総数を再確認
    const allTCGLinks = await page.$$eval('#dtPastEvents tbody tr', (rows) => {
      let count = 0;
      rows.forEach((row) => {
        const linksCell = row.querySelectorAll('td')[4];
        if (linksCell) {
          const tcgLinks = Array.from(linksCell.querySelectorAll('a')).filter(
            (a) => a.textContent?.trim() === 'TCG'
          );
          count += tcgLinks.length;
        }
      });
      return count;
    });

    console.log(`\nTCGリンク総数: ${allTCGLinks}`);

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await browser.close();
  }
}

checkMultipleTCG();
