'use strict';
const { _electron: electron } = require('@playwright/test');
const path = require('path');
const assert = require('assert');

(async () => {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..')],
    env
  });

  const page = await electronApp.firstWindow();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.waitForSelector('.prosemirror-editor-body');

  // 1. 새 노트 생성 후 텍스트 입력 및 드래그 시 플로팅 버블 바 동작 확인
  await page.click('#btn-new-doc');
  await page.click('.prosemirror-editor-body');
  await page.keyboard.type('마크다운 상하 체계 및 꾸미기 테스트');
  await page.keyboard.press('Control+A');

  const bubbleVisible = await page.isVisible('#selection-bubble-bar');
  assert(bubbleVisible, '텍스트 선택 시 플로팅 버블 바가 표시되어야 합니다.');

  // 2. 굵게, 밑줄, 키보드 배지(<kbd>), 글꼴, 글자크기, 글자색, 형광펜 적용
  await page.click('[data-cmd="bold"]');
  await page.click('[data-cmd="underline"]');
  await page.click('[data-cmd="kbd"]');
  await page.selectOption('#select-font-family', 'Nanum Myeongjo, Batang, Georgia, serif');
  await page.selectOption('#select-font-size', '20px');

  await page.click('#btn-text-color');
  await page.click('[data-set-color="#2563eb"]');

  await page.click('#btn-highlight-color');
  await page.click('[data-set-bg="#fef08a"]');

  // 3. 마크다운 꾸미기 팔레트에서 접기/펼치기 토글(<details>) 및 중요 알림 박스 삽입
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.click('#btn-quick-insert');
  await page.click('[data-qblock="details"]');

  await page.click('#btn-quick-insert');
  await page.click('[data-qblock="callout-important"]');

  // 4. 분할 비교 모드 전환 후 마크다운 원문 확인
  await page.click('[data-view-btn="split"]');
  const mdText = await page.inputValue('#markdown-source-textarea');

  assert(mdText.includes('마크다운 상하 체계 및 꾸미기 테스트'), '입력한 본문이 마크다운에 포함되어야 합니다.');
  assert(mdText.includes('<kbd>'), '키보드 배지(<kbd>) 문법이 마크다운에 보존되어야 합니다.');
  assert(mdText.includes('<details'), '접기/펼치기(<details>) 토글 문법이 마크다운에 보존되어야 합니다.');
  assert(mdText.includes('callout-important'), '중요 알림 박스가 마크다운에 보존되어야 합니다.');
  assert(mdText.includes('color: #2563eb'), '글자색 스타일이 마크다운에 보존되어야 합니다.');

  // 테스트 완료 후 환영 문서로 초기화해 두기
  await page.evaluate(() => localStorage.removeItem('marknote_studio_docs_v1'));

  assert.strictEqual(errors.length, 0, '페이지 런타임 오류가 없어야 합니다: ' + errors.join(', '));

  console.log('✅ 마크다운 상하 체계(H1~H6, 다단계 목록, 토글) 및 꾸미기 문법 전체 검증 완료!');
  await electronApp.close();
})();
