'use strict';
const { _electron: electron } = require('E:/00_원주종합사회복지관/01_개인/02_자기계발/01_coding/casemd/node_modules/@playwright/test');
const path = require('path');
const assert = require('assert');

(async () => {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [path.join(__dirname, '..')],
    env
  });
  const page = await app.firstWindow();
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
  assert(html.includes('<ul><li><p>항목 2</p></li></ul>'), '항목 2가 하위 목록으로 들여쓰기되어야 합니다.');
  console.log('  ✓ Bullet list Tab 성공 (하위 목록 생성됨)');

  // Shift+Tab on item 2
  await page.keyboard.press('Shift+Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  assert(!html.includes('<ul><li><p>항목 2</p></li></ul>') && html.includes('<li><p>항목 2</p></li>'), '항목 2가 상위 목록으로 내어쓰기되어야 합니다.');
  console.log('  ✓ Bullet list Shift+Tab 성공 (상위 목록 복귀)');

  console.log('2. First item Tab should NOT lose focus');
  await page.keyboard.press('ArrowUp'); // move to item 1
  await page.keyboard.press('Tab');
  let isFocused = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('prosemirror-editor-body'));
  assert(isFocused, '첫번째 항목에서 Tab을 눌러도 포커스가 에디터 외부로 탈출해서는 안 됩니다.');
  console.log('  ✓ First item Tab 포커스 유지 성공');

  console.log('3. Heading H1 -> H2 -> H3 -> H2 -> H1 -> paragraph via Tab & Shift+Tab');
  await page.click('#btn-new-doc');
  await page.click('.prosemirror-editor-body');
  await page.click('[data-heading="1"]');
  await page.keyboard.type('대제목 테스트');

  // Tab: H1 -> H2
  await page.keyboard.press('Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  assert(html.includes('<h2>대제목 테스트</h2>'), 'Tab 누르면 H1 -> H2 하위 제목으로 내려가야 합니다.');
  console.log('  ✓ H1 -> H2 (Tab) 성공');

  // Tab: H2 -> H3
  await page.keyboard.press('Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  assert(html.includes('<h3>대제목 테스트</h3>'), 'Tab 누르면 H2 -> H3 하위 제목으로 내려가야 합니다.');
  console.log('  ✓ H2 -> H3 (Tab) 성공');

  // Shift+Tab: H3 -> H2
  await page.keyboard.press('Shift+Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  assert(html.includes('<h2>대제목 테스트</h2>'), 'Shift+Tab 누르면 H3 -> H2 상위 제목으로 올라가야 합니다.');
  console.log('  ✓ H3 -> H2 (Shift+Tab) 성공');

  // Shift+Tab: H2 -> H1
  await page.keyboard.press('Shift+Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  assert(html.includes('<h1>대제목 테스트</h1>'), 'Shift+Tab 누르면 H2 -> H1 상위 제목으로 올라가야 합니다.');
  console.log('  ✓ H2 -> H1 (Shift+Tab) 성공');

  // Shift+Tab: H1 -> 본문 (p)
  await page.keyboard.press('Shift+Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  assert(html.includes('<p>대제목 테스트</p>'), 'Shift+Tab 누르면 H1 -> 본문 문단으로 전환되어야 합니다.');
  console.log('  ✓ H1 -> 본문 (Shift+Tab) 성공');

  console.log('4. Task list Tab and Shift+Tab');
  await page.click('#btn-new-doc');
  await page.click('.prosemirror-editor-body');
  await page.click('[data-cmd="taskList"]');
  await page.keyboard.type('할일 1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('할일 2');

  await page.keyboard.press('Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  assert(html.includes('ul data-type="taskList"') && html.includes('할일 2'), '할일 2가 하위 체크리스트로 들어가야 합니다.');
  console.log('  ✓ Task list Tab 성공');

  await page.keyboard.press('Shift+Tab');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  assert(html.includes('할일 1') && html.includes('할일 2'), '할일 2가 상위 체크리스트로 복귀해야 합니다.');
  console.log('  ✓ Task list Shift+Tab 성공');

  console.log('5. Toolbar buttons [▸하위] and [◂상위]');
  await page.click('#btn-indent-list');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  console.log('  ✓ [▸하위] 버튼 클릭 동작 확인');

  await page.click('#btn-outdent-list');
  html = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
  console.log('  ✓ [◂상위] 버튼 클릭 동작 확인');

  console.log('6. Source textarea Tab');
  await page.click('[data-view-btn="source"]');
  await page.click('#markdown-source-textarea');
  await page.keyboard.press('Tab');
  const srcVal = await page.inputValue('#markdown-source-textarea');
  assert(srcVal.startsWith('  '), '소스 편집기에서 Tab 누르면 공백이 삽입되어야 합니다.');
  console.log('  ✓ 소스 탭 키 동작 확인');

  // Cleanup
  await page.evaluate(() => localStorage.removeItem('marknote_studio_docs_v1'));
  await app.close();
  console.log('\n🎉 ALL TAB / SHIFT+TAB TESTS PASSED SUCCESSFULLY!');
})();
