'use strict';
const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronBin = require('electron');
const child = spawn(electronBin, [path.join(__dirname, '..'), ...process.argv.slice(2)], {
  env,
  stdio: 'inherit'
});

child.on('exit', code => process.exit(code || 0));
child.on('error', err => {
  console.error('Electron 실행 오류:', err.message);
  process.exit(1);
});
