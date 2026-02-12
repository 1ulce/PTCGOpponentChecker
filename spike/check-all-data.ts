import { chromium } from 'playwright';

async function checkAllData() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('📡 ページにアクセス中...');
    await page.goto('https://rk9.gg/roster/ST01bmgM9jIqCvBYdzy3', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await page.waitForSelector('table tbody tr', { timeout: 15000 });

    // 初期状態
    const initialRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`初期表示: ${initialRows}行`);

    // "All"を選択して全件表示
    console.log('⏳ "All"を選択して全件表示中...');
    await page.selectOption('.dataTables_length select', '-1');

    // 全件読み込みを待機
    await page.waitForTimeout(3000);

    // 全件表示後の行数
    const allRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`全件表示後: ${allRows}行`);

    // DataTables info確認
    const infoText = await page.evaluate(() => {
      const info = document.querySelector('.dataTables_info');
      return info?.textContent || '';
    });
    console.log(`DataTables info: "${infoText}"`);

    // サンプルデータ（最初と最後の数件）
    console.log('\n--- 最初の3件 ---');
    const firstRows = await page.$$eval('table tbody tr', (rows) =>
      rows.slice(0, 3).map((row) => {
        const cells = row.querySelectorAll('td');
        return `${cells[0]?.textContent} | ${cells[1]?.textContent} ${cells[2]?.textContent} | ${cells[3]?.textContent}`;
      })
    );
    firstRows.forEach((r) => console.log(`  ${r}`));

    console.log('\n--- 最後の3件 ---');
    const lastRows = await page.$$eval('table tbody tr', (rows) =>
      rows.slice(-3).map((row) => {
        const cells = row.querySelectorAll('td');
        return `${cells[0]?.textContent} | ${cells[1]?.textContent} ${cells[2]?.textContent} | ${cells[3]?.textContent}`;
      })
    );
    lastRows.forEach((r) => console.log(`  ${r}`));

    console.log(`\n✅ 結論: 全${allRows}件のデータがHTMLに含まれている`);

  } finally {
    await browser.close();
  }
}

checkAllData();
