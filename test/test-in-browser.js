'use strict';
const { chromium } = require('E:/00_원주종합사회복지관/01_개인/02_자기계발/01_coding/casemd/node_modules/@playwright/test');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto('file:///E:/00_원주종합사회복지관/01_개인/02_자기계발/01_coding/md-editor/독립실행형_마크다운편집기.html');
  await page.waitForSelector('.prosemirror-editor-body');

  console.log('1. Bullet list Tab and Shift+Tab');
  await page.click('#btn-new-doc');
  await page.click('.prosemirror-editor-body');
  await page.click('[data-cmd="bulletList"]');
  await page.keyboard.type('항목 1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('항목 2');

  // Tab on item 2
  await page.keyboard.press('Tab');
  let html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  console.log('HTML after Tab:');
  console.log(html);
  assert(html.includes('<ul><li><p>항목 2</p></li></ul>'), '항목 2가 하위 목록으로 들여쓰기되어야 합니다.');
  console.log('  ✓ Bullet list Tab 성공 (하위 목록 생성됨)');

  // Shift+Tab on item 2
  await page.keyboard.press('Shift+Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  console.log('HTML after Shift+Tab:');
  console.log(html);
  assert(!html.includes('<ul><li><p>항목 2</p></li></ul>') && html.includes('<li><p>항목 2</p></li>'), '항목 2가 상위 목록으로 내어쓰기되어야 합니다.');
  console.log('  ✓ Bullet list Shift+Tab 성공 (상위 목록 복귀)');

  console.log('2. Heading Tab and Shift+Tab');
  await page.click('#btn-new-doc');
  await page.selectOption('#select-block-type', 'h1');
  await page.keyboard.type('제목 테스트');
  
  await page.keyboard.press('Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  console.log('Heading after Tab:');
  console.log(html);
  assert(html.includes('<h2>제목 테스트</h2>'), 'Tab 누르면 H1 -> H2로 변경되어야 합니다.');
  console.log('  ✓ H1 -> H2 성공');

  await page.keyboard.press('Shift+Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  console.log('Heading after Shift+Tab:');
  console.log(html);
  assert(html.includes('<h1>제목 테스트</h1>'), 'Shift+Tab 누르면 H2 -> H1로 복귀되어야 합니다.');
  console.log('  ✓ H2 -> H1 성공');

  console.log('3. Task list Tab and Shift+Tab');
  await page.click('#btn-new-doc');
  await page.click('.prosemirror-editor-body');
  await page.click('[data-cmd="taskList"]');
  await page.keyboard.type('체크 1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('체크 2');

  await page.keyboard.press('Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  console.log('Task list after Tab:');
  console.log(html);
  assert(html.includes('ul data-type="taskList"') && html.includes('체크 2'), '체크 2가 하위 체크리스트로 들어가야 합니다.');
  console.log('  ✓ Task list Tab 성공');

  await page.keyboard.press('Shift+Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  console.log('Task list after Shift+Tab:');
  console.log(html);
  assert(html.includes('체크 1') && html.includes('체크 2'), '체크 2가 상위 체크리스트로 복귀해야 합니다.');
  console.log('  ✓ Task list Shift+Tab 성공');

  console.log('4. [▸하위] / [◂상위] Toolbar button clicks');
  await page.click('#btn-indent-list');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  console.log('After [▸하위] click:');
  console.log(html);

  await page.click('#btn-outdent-list');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  console.log('After [◂상위] click:');
  console.log(html);

  await browser.close();
  console.log('\n🎉 ALL TESTS PASSED CLEANLY IN HEADLESS CHROMIUM!');
})();
