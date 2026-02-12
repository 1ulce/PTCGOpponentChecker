/**
 * デバッグ: イベントページの詳細構造を調査
 */

import { chromium } from 'playwright';

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('📡 イベントページにアクセス中...');
    await page.goto('https://rk9.gg/events/pokemon', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // ページタイトル
    const title = await page.title();
    console.log(`ページタイトル: ${title}`);

    // 全てのリンクを取得
    const allLinks = await page.$$eval('a', (links) =>
      links.map((a) => ({
        href: a.getAttribute('href'),
        text: a.textContent?.trim().substring(0, 50),
      }))
    );
    console.log(`\n全リンク数: ${allLinks.length}`);

    // roster関連のリンク
    const rosterLinks = allLinks.filter((l) => l.href?.includes('roster'));
    console.log(`\nRosterリンク数: ${rosterLinks.length}`);
    rosterLinks.slice(0, 10).forEach((l) => {
      console.log(`  ${l.href} - ${l.text}`);
    });

    // tournament関連のリンク
    const tournamentLinks = allLinks.filter((l) => l.href?.includes('tournament'));
    console.log(`\nTournamentリンク数: ${tournamentLinks.length}`);
    tournamentLinks.slice(0, 10).forEach((l) => {
      console.log(`  ${l.href} - ${l.text}`);
    });

    // テーブルの確認
    const tables = await page.$$eval('table', (tables) =>
      tables.map((t, i) => ({
        index: i,
        id: t.id,
        className: t.className,
        rowCount: t.querySelectorAll('tbody tr').length,
        headerText: Array.from(t.querySelectorAll('thead th')).map((th) =>
          th.textContent?.trim()
        ),
      }))
    );
    console.log(`\nテーブル数: ${tables.length}`);
    tables.forEach((t) => {
      console.log(`  [${t.index}] id="${t.id}" class="${t.className}" rows=${t.rowCount}`);
      console.log(`      headers: ${t.headerText?.join(' | ')}`);
    });

    // ページ全体のHTML長さ
    const htmlLength = await page.evaluate(() => document.documentElement.innerHTML.length);
    console.log(`\nHTML全体の長さ: ${htmlLength.toLocaleString()}文字`);

    // セクション見出し
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (els) =>
      els.map((el) => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 100),
      }))
    );
    console.log(`\n見出し: ${headings.length}件`);
    headings.forEach((h) => console.log(`  <${h.tag}> ${h.text}`));

    // DataTables関連の要素
    const dtElements = await page.$$eval('[class*="dataTable"], [id*="dataTable"]', (els) =>
      els.map((el) => ({
        tag: el.tagName,
        id: el.id,
        className: el.className,
      }))
    );
    console.log(`\nDataTables要素: ${dtElements.length}件`);
    dtElements.forEach((el) => console.log(`  <${el.tag}> id="${el.id}" class="${el.className}"`));

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await browser.close();
  }
}

debug();
