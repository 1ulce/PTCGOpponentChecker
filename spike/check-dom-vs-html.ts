import { chromium } from 'playwright';

async function checkDomVsHtml() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('📡 ページにアクセス中...');
    await page.goto('https://rk9.gg/roster/ST01bmgM9jIqCvBYdzy3', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await page.waitForSelector('table tbody tr', { timeout: 15000 });

    // 1. 「All」選択前のDOM状態
    const beforeAllRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`\n【「All」選択前】`);
    console.log(`  DOM上のtr要素数: ${beforeAllRows}`);

    // 2. HTMLソース内のtr要素数を確認（正規表現で）
    const htmlContent = await page.content();
    const trMatches = htmlContent.match(/<tr[^>]*>/g);
    console.log(`  HTMLソース内のtr要素数: ${trMatches?.length || 0}`);

    // 3. DataTablesの内部データを確認
    const dtInfo = await page.evaluate(() => {
      // @ts-ignore
      const table = document.querySelector('table');
      // @ts-ignore
      if (table && typeof jQuery !== 'undefined') {
        // @ts-ignore
        const dt = jQuery(table).DataTable();
        return {
          recordsTotal: dt.page.info().recordsTotal,
          recordsDisplay: dt.page.info().recordsDisplay,
        };
      }
      return null;
    });
    console.log(`  DataTables内部データ: ${JSON.stringify(dtInfo)}`);

    console.log(`\n結論: 「All」選択前は${beforeAllRows}行のみDOMに存在`);

  } finally {
    await browser.close();
  }
}

checkDomVsHtml();
