import { chromium } from 'playwright';

async function checkTotal() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    await page.goto('https://rk9.gg/roster/ST01bmgM9jIqCvBYdzy3', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await page.waitForSelector('table tbody tr', { timeout: 15000 });

    // DataTables info要素から総件数を取得
    const infoText = await page.evaluate(() => {
      const info = document.querySelector('.dataTables_info');
      return info?.textContent || 'info要素なし';
    });
    console.log(`DataTables info: "${infoText}"`);

    // 表示中の行数
    const visibleRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`表示中の行数: ${visibleRows}`);

    // ページネーション情報
    const paginationButtons = await page.$$eval('.dataTables_paginate .paginate_button', (btns) =>
      btns.map((b) => b.textContent)
    );
    console.log(`ページネーションボタン: ${paginationButtons.join(', ')}`);

    // 表示件数セレクタ
    const lengthOptions = await page.$$eval('.dataTables_length select option', (opts) =>
      opts.map((o) => `${o.textContent} (${o.value})`)
    );
    console.log(`表示件数オプション: ${lengthOptions.join(', ')}`);

  } finally {
    await browser.close();
  }
}

checkTotal();
