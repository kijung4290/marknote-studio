'use strict';
const { _electron: electron } = require('E:/00_원주종합사회복지관/01_개인/02_자기계발/01_coding/casemd/node_modules/@playwright/test');
const path = require('path');

(async () => {
  try {
    console.log('Step 1: Launching electron...');
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const app = await electron.launch({
      args: [path.join(__dirname, '..')],
      env
    });
    console.log('Step 2: Getting first window...');
    const page = await app.firstWindow();
    console.log('Step 3: Waiting for selector...');
    await page.waitForSelector('.prosemirror-editor-body');

    console.log('Step 4: Clicking new doc...');
    await page.click('#btn-new-doc');

    console.log('Step 5: Testing list Tab...');
    await page.click('.prosemirror-editor-body');
    await page.click('[data-cmd="bulletList"]');
    await page.keyboard.type('항목 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('항목 2');

    console.log('Step 6: Pressing Tab...');
    await page.keyboard.press('Tab');
    const htmlAfterTab = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
    console.log('HTML after Tab:', htmlAfterTab);

    console.log('Step 7: Pressing Shift+Tab...');
    await page.keyboard.press('Shift+Tab');
    const htmlAfterShiftTab = await page.evaluate(() => document.querySelector('.prosemirror-editor-body').innerHTML);
    console.log('HTML after Shift+Tab:', htmlAfterShiftTab);

    console.log('Step 8: Closing app...');
    await app.close();
    console.log('Step 9: Done!');
  } catch (err) {
    console.error('Error in test:', err);
    process.exit(1);
  }
})();
