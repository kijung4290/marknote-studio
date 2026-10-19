'use strict';
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outJs = path.join(__dirname, '../dist/app.js');

esbuild.buildSync({
  entryPoints: [path.join(__dirname, '../src/app.js')],
  bundle: true,
  outfile: outJs,
  platform: 'browser',
  format: 'iife',
  target: 'chrome120',
  minify: true,
  legalComments: 'none'
});

// 단일 파일로도 어디서든 열 수 있도록 독립실행형 HTML 함께 생성
const css = fs.readFileSync(path.join(__dirname, '../src/style.css'), 'utf8');
const js = fs.readFileSync(outJs, 'utf8');
const standaloneHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MarkNote Studio — 비주얼 마크다운 편집기</title>
  <style>${css}</style>
</head>
<body>
  <div id="app"></div>
  <script>${js}</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '../독립실행형_마크다운편집기.html'), standaloneHtml, 'utf8');
console.log('[MarkNote Studio] dist/app.js 및 독립실행형_마크다운편집기.html 생성 완료');
