'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  // safe fallback when module not present
}

function getMimeType(ext) {
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp'
  };
  return map[ext.toLowerCase()] || 'image/png';
}

function listMarkdownFiles(dirPath) {
  const results = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.md', '.markdown', '.txt', '.html'].includes(ext)) {
        const stat = fs.statSync(fullPath);
        results.push({
          name: entry.name,
          filePath: fullPath,
          ext,
          size: stat.size,
          updatedAt: stat.mtime.toISOString()
        });
      }
    }
  }
  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return results;
}

function buildAppMenu() {
  const send = (cmd) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('marknote:shortcut', cmd);
    }
  };
  const template = [
    {
      label: '파일(F)',
      submenu: [
        { label: '새 문서', accelerator: 'CmdOrCtrl+N', click: () => send('new-doc') },
        { label: '파일 열기...', accelerator: 'CmdOrCtrl+O', click: () => send('open-file') },
        { label: '폴더 열기...', accelerator: 'CmdOrCtrl+Shift+O', click: () => send('open-folder') },
        { type: 'separator' },
        { label: '저장', accelerator: 'CmdOrCtrl+S', click: () => send('save-file') },
        { label: '다른 이름으로 저장...', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('save-file-as') },
        { type: 'separator' },
        { label: 'HTML 파일로 내보내기...', click: () => send('export-html') },
        { label: 'PDF 파일로 내보내기...', accelerator: 'CmdOrCtrl+P', click: () => send('export-pdf') },
        { type: 'separator' },
        { label: '종료', role: 'quit' }
      ]
    },
    {
      label: '편집(E)',
      submenu: [
        { label: '실행 취소', role: 'undo' },
        { label: '다시 실행', role: 'redo' },
        { type: 'separator' },
        { label: '잘라내기', role: 'cut' },
        { label: '복사', role: 'copy' },
        { label: '붙여넣기', role: 'paste' },
        { label: '모두 선택', role: 'selectAll' },
        { type: 'separator' },
        { label: '찾기 및 바꾸기', accelerator: 'CmdOrCtrl+F', click: () => send('find-replace') }
      ]
    },
    {
      label: '보기(V)',
      submenu: [
        { label: '비주얼 편집 모드', accelerator: 'CmdOrCtrl+1', click: () => send('mode-wysiwyg') },
        { label: '분할 화면 (실시간 마크다운 비교)', accelerator: 'CmdOrCtrl+2', click: () => send('mode-split') },
        { label: '마크다운 원문 편집 모드', accelerator: 'CmdOrCtrl+3', click: () => send('mode-source') },
        { type: 'separator' },
        { label: '화면 확대', role: 'zoomIn' },
        { label: '화면 축소', role: 'zoomOut' },
        { label: '기본 크기로', role: 'resetZoom' },
        { type: 'separator' },
        { label: '전체 화면', role: 'togglefullscreen' },
        { label: '개발자 도구', role: 'toggleDevTools' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1460,
    height: 920,
    minWidth: 980,
    minHeight: 660,
    backgroundColor: '#f8fafc',
    title: 'MarkNote Studio — 쉬운 비주얼 마크다운 편집기',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  buildAppMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  await mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('marknote:ipc', async (_event, { action, payload = {} }) => {
  try {
    switch (action) {
      case 'open-file': {
        const res = await dialog.showOpenDialog(mainWindow, {
          title: '마크다운 또는 HTML 문서 열기',
          filters: [
            { name: '마크다운 및 텍스트 문서', extensions: ['md', 'markdown', 'txt', 'html'] },
            { name: '모든 파일', extensions: ['*'] }
          ],
          properties: ['openFile']
        });
        if (res.canceled || !res.filePaths.length) return { canceled: true };
        const filePath = res.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf8');
        return {
          canceled: false,
          filePath,
          fileName: path.basename(filePath),
          ext: path.extname(filePath).toLowerCase(),
          content
        };
      }

      case 'read-file-by-path': {
        const { filePath } = payload;
        if (!filePath || !fs.existsSync(filePath)) {
          throw new Error('파일을 찾을 수 없습니다: ' + filePath);
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return {
          filePath,
          fileName: path.basename(filePath),
          ext: path.extname(filePath).toLowerCase(),
          content
        };
      }

      case 'save-file': {
        let targetPath = payload.filePath;
        if (!targetPath) {
          const defaultName = (payload.suggestedName || '새 문서').replace(/[\\/:*?"<>|]/g, '_') + '.md';
          const res = await dialog.showSaveDialog(mainWindow, {
            title: '마크다운 문서 저장',
            defaultPath: defaultName,
            filters: [
              { name: 'Markdown 문서 (*.md)', extensions: ['md'] },
              { name: '텍스트 파일 (*.txt)', extensions: ['txt'] }
            ]
          });
          if (res.canceled || !res.filePath) return { canceled: true };
          targetPath = res.filePath;
        }
        fs.writeFileSync(targetPath, payload.content ?? '', 'utf8');
        return {
          canceled: false,
          filePath: targetPath,
          fileName: path.basename(targetPath),
          savedAt: new Date().toISOString()
        };
      }

      case 'save-file-as': {
        const defaultName = (payload.suggestedName || '새 문서').replace(/[\\/:*?"<>|]/g, '_') + '.md';
        const res = await dialog.showSaveDialog(mainWindow, {
          title: '다른 이름으로 마크다운 저장',
          defaultPath: payload.filePath || defaultName,
          filters: [
            { name: 'Markdown 문서 (*.md)', extensions: ['md'] },
            { name: '텍스트 파일 (*.txt)', extensions: ['txt'] }
          ]
        });
        if (res.canceled || !res.filePath) return { canceled: true };
        fs.writeFileSync(res.filePath, payload.content ?? '', 'utf8');
        return {
          canceled: false,
          filePath: res.filePath,
          fileName: path.basename(res.filePath),
          savedAt: new Date().toISOString()
        };
      }

      case 'export-html': {
        const defaultName = (payload.suggestedName || '문서').replace(/[\\/:*?"<>|]/g, '_') + '.html';
        const res = await dialog.showSaveDialog(mainWindow, {
          title: 'HTML 웹 문서로 내보내기',
          defaultPath: defaultName,
          filters: [{ name: 'HTML 웹 문서 (*.html)', extensions: ['html'] }]
        });
        if (res.canceled || !res.filePath) return { canceled: true };
        fs.writeFileSync(res.filePath, payload.htmlContent ?? '', 'utf8');
        return {
          canceled: false,
          filePath: res.filePath,
          fileName: path.basename(res.filePath)
        };
      }

      case 'export-pdf': {
        const defaultName = (payload.suggestedName || '문서').replace(/[\\/:*?"<>|]/g, '_') + '.pdf';
        const res = await dialog.showSaveDialog(mainWindow, {
          title: 'PDF 문서로 내보내기',
          defaultPath: defaultName,
          filters: [{ name: 'PDF 문서 (*.pdf)', extensions: ['pdf'] }]
        });
        if (res.canceled || !res.filePath) return { canceled: true };

        const pdfWin = new BrowserWindow({
          show: false,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
          }
        });
        try {
          const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(payload.htmlContent || '');
          await pdfWin.loadURL(dataUrl);
          const pdfBuffer = await pdfWin.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
          });
          fs.writeFileSync(res.filePath, pdfBuffer);
        } finally {
          pdfWin.destroy();
        }
        return {
          canceled: false,
          filePath: res.filePath,
          fileName: path.basename(res.filePath)
        };
      }

      case 'open-folder': {
        const res = await dialog.showOpenDialog(mainWindow, {
          title: '작업할 마크다운 폴더 선택',
          properties: ['openDirectory', 'createDirectory']
        });
        if (res.canceled || !res.filePaths.length) return { canceled: true };
        const folderPath = res.filePaths[0];
        const files = listMarkdownFiles(folderPath);
        return {
          canceled: false,
          folderPath,
          folderName: path.basename(folderPath),
          files
        };
      }

      case 'refresh-folder': {
        const { folderPath } = payload;
        if (!folderPath || !fs.existsSync(folderPath)) return { files: [] };
        return {
          folderPath,
          folderName: path.basename(folderPath),
          files: listMarkdownFiles(folderPath)
        };
      }

      case 'pick-image': {
        const res = await dialog.showOpenDialog(mainWindow, {
          title: '문서에 넣을 이미지 선택',
          filters: [
            { name: '이미지 파일', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }
          ],
          properties: ['openFile']
        });
        if (res.canceled || !res.filePaths.length) return { canceled: true };
        const imgPath = res.filePaths[0];
        const ext = path.extname(imgPath);
        const mime = getMimeType(ext);
        const base64 = fs.readFileSync(imgPath).toString('base64');
        return {
          canceled: false,
          fileName: path.basename(imgPath),
          dataUrl: `data:${mime};base64,${base64}`
        };
      }

      case 'open-external': {
        if (payload.url && /^https?:\/\//i.test(payload.url)) {
          await shell.openExternal(payload.url);
        }
        return { opened: true };
      }

      case 'check-for-updates': {
        if (autoUpdater && app.isPackaged) {
          try {
            const res = await autoUpdater.checkForUpdates();
            return { ok: true, version: res?.updateInfo?.version };
          } catch (e) {
            return { error: e.message };
          }
        }
        return { isDev: true, message: '개발 모드에서는 배포된 버전의 자동 업데이트를 확인하지 않습니다.' };
      }

      case 'install-update': {
        if (autoUpdater && app.isPackaged) {
          autoUpdater.quitAndInstall();
          return { ok: true };
        }
        return { error: '설치 대기 중인 업데이트가 없습니다.' };
      }

      default:
        throw new Error('알 수 없는 명령입니다: ' + action);
    }
  } catch (err) {
    return { error: err.message || '작업 처리 중 오류가 발생했습니다.' };
  }
});

function initAutoUpdater() {
  if (!autoUpdater || !app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', info => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('marknote:update-status', {
        state: 'available',
        version: info.version
      });
    }
  });

  autoUpdater.on('download-progress', progressObj => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('marknote:update-status', {
        state: 'downloading',
        percent: Math.round(progressObj.percent)
      });
    }
  });

  autoUpdater.on('update-downloaded', info => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('marknote:update-status', {
        state: 'downloaded',
        version: info.version
      });
    }
  });

  autoUpdater.on('error', err => {
    console.error('AutoUpdater error:', err.message);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 3000);
}

app.whenReady().then(async () => {
  await createWindow();
  initAutoUpdater();
});
app.on('window-all-closed', () => app.quit());
