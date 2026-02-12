/**
 * Task 1.1: 大会一覧ページの構造検証
 *
 * rk9.gg/events/pokemon のページ構造を調査して、
 * クローラー実装に必要なセレクタと待機条件を特定する。
 */

import { chromium } from 'playwright';

async function analyzeEventsPage() {
  console.log('🔍 大会一覧ページの構造検証を開始...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // ページにアクセス
    console.log('📡 https://rk9.gg/events/pokemon にアクセス中...');
    await page.goto('https://rk9.gg/events/pokemon', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // DataTablesの初期化を待機
    console.log('⏳ DataTablesの初期化を待機中...');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // ===== 1. テーブル構造の確認 =====
    console.log('\n===== 1. テーブル構造 =====');

    const tables = await page.$$eval('table', (tables) =>
      tables.map((t) => ({
        id: t.id,
        className: t.className,
        rowCount: t.querySelectorAll('tbody tr').length,
      }))
    );
    console.log('テーブル一覧:', JSON.stringify(tables, null, 2));

    // ===== 2. Past Events テーブルの特定 =====
    console.log('\n===== 2. Past Pokémon Events テーブル =====');

    // ページ上のすべてのh2/h3/h4を確認してセクションを特定
    const headings = await page.$$eval('h1, h2, h3, h4, h5', (els) =>
      els.map((el) => ({ tag: el.tagName, text: el.textContent?.trim() }))
    );
    console.log('見出し一覧:', headings);

    // ===== 3. テーブルヘッダーの確認 =====
    console.log('\n===== 3. テーブルヘッダー =====');

    const headers = await page.$$eval('table thead th', (ths) =>
      ths.map((th) => th.textContent?.trim())
    );
    console.log('ヘッダー:', headers);

    // ===== 4. サンプル行の構造確認 =====
    console.log('\n===== 4. サンプル行の構造 =====');

    const sampleRows = await page.$$eval('table tbody tr', (rows) =>
      rows.slice(0, 3).map((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells.map((cell, idx) => ({
          index: idx,
          html: cell.innerHTML.substring(0, 200),
          text: cell.textContent?.trim().substring(0, 100),
        }));
      })
    );
    console.log('サンプル行（最初の3行）:');
    sampleRows.forEach((row, i) => {
      console.log(`\n--- 行 ${i + 1} ---`);
      row.forEach((cell) => {
        console.log(`  [${cell.index}] text: "${cell.text}"`);
        console.log(`      html: ${cell.html}`);
      });
    });

    // ===== 5. 大会リンクの構造確認 =====
    console.log('\n===== 5. 大会リンクの構造 =====');

    const links = await page.$$eval('table tbody tr a[href*="/tournament/"]', (anchors) =>
      anchors.slice(0, 10).map((a) => ({
        href: a.getAttribute('href'),
        text: a.textContent?.trim(),
      }))
    );
    console.log('Tournament リンク（最初の10件）:', JSON.stringify(links, null, 2));

    // Rosterリンクも確認
    const rosterLinks = await page.$$eval('table tbody tr a[href*="/roster/"]', (anchors) =>
      anchors.slice(0, 5).map((a) => ({
        href: a.getAttribute('href'),
        text: a.textContent?.trim(),
      }))
    );
    console.log('Roster リンク（最初の5件）:', JSON.stringify(rosterLinks, null, 2));

    // ===== 6. 大会IDの抽出パターン確認 =====
    console.log('\n===== 6. 大会IDの抽出パターン =====');

    const eventIds = links
      .map((l) => {
        const match = l.href?.match(/\/tournament\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    console.log('抽出した大会ID:', eventIds);

    // ===== 7. ページネーションの確認 =====
    console.log('\n===== 7. ページネーション =====');

    const paginationInfo = await page.evaluate(() => {
      const info = document.querySelector('.dataTables_info');
      const paginate = document.querySelector('.dataTables_paginate');
      return {
        infoText: info?.textContent?.trim(),
        paginateHtml: paginate?.innerHTML.substring(0, 300),
      };
    });
    console.log('ページネーション情報:', paginationInfo);

    // 全件数を取得
    const totalRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`現在表示されている行数: ${totalRows}`);

    // ===== 8. DataTables設定の確認 =====
    console.log('\n===== 8. DataTables設定（推測） =====');

    // lengthMenuがあるか確認
    const lengthMenu = await page.$('.dataTables_length select');
    if (lengthMenu) {
      const options = await lengthMenu.$$eval('option', (opts) =>
        opts.map((o) => ({ value: o.value, text: o.textContent }))
      );
      console.log('表示件数オプション:', options);
    } else {
      console.log('表示件数セレクタなし（固定表示）');
    }

    // ===== 結果サマリー =====
    console.log('\n===== 検証結果サマリー =====');
    console.log(`
📋 大会一覧ページ構造検証結果

【テーブルセレクタ】
- テーブル: table または #dtUpcomingEvents
- 行: table tbody tr
- ヘッダー: ${headers?.join(', ')}

【大会リンク】
- セレクタ: a[href*="/tournament/"]
- ID抽出パターン: /tournament/([A-Za-z0-9]+)
- サンプルID: ${eventIds.slice(0, 3).join(', ')}

【待機条件】
- table tbody tr が存在するまで待機
- networkidle で安定を確認

【ページネーション】
- ${paginationInfo.infoText || '情報なし'}
- 現在の行数: ${totalRows}
    `);
  } catch (error) {
    console.error('❌ エラー発生:', error);
  } finally {
    await browser.close();
    console.log('\n✅ 検証完了');
  }
}

analyzeEventsPage();
