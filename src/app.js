import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

import {
  FontFamily,
  FontSize,
  TextColor,
  HighlightColor,
  KeyboardKey,
  Superscript,
  Subscript,
  TextAlign,
  TaskList,
  TaskItem,
  CalloutBox,
  DetailsToggle,
  RichImage
} from './extensions.js';

import {
  htmlToMarkdown,
  markdownToHtml,
  buildStandaloneHtmlDocument
} from './markdown-bridge.js';

import {
  FONT_FAMILIES,
  FONT_SIZES,
  TEXT_COLORS,
  HIGHLIGHT_COLORS,
  TEMPLATES
} from './templates.js';

const STORAGE_KEY = 'marknote_studio_docs_v1';
const SETTINGS_KEY = 'marknote_studio_settings_v1';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const state = {
  docs: [],
  activeDocId: null,
  viewMode: 'wysiwyg', // 'wysiwyg' | 'split' | 'source'
  sidebarTab: 'docs', // 'docs' | 'folder'
  theme: 'light', // 'light' | 'sepia' | 'dark'
  wideMode: false,
  sidebarOpen: true,
  inspectorOpen: false,
  docSearchQuery: '',
  folderPath: null,
  folderName: null,
  folderFiles: [],
  dirtyFile: false,
  saveTimer: null,
  isSyncingFromSource: false,
  isSyncingFromEditor: false
};

let editor = null;

function showToast(msg, type = 'info') {
  const host = $('#toast-container');
  if (!host) return;
  const item = document.createElement('div');
  item.className = `toast-item toast-${type}`;
  item.textContent = msg;
  host.appendChild(item);
  setTimeout(() => {
    item.classList.add('fade-out');
    setTimeout(() => item.remove(), 240);
  }, 2600);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.theme = parsed.theme || 'light';
      state.wideMode = !!parsed.wideMode;
      state.sidebarOpen = parsed.sidebarOpen !== false;
    }
  } catch {}
  applyThemeAndLayout();
}

function saveSettings() {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        theme: state.theme,
        wideMode: state.wideMode,
        sidebarOpen: state.sidebarOpen
      })
    );
  } catch {}
}

function applyThemeAndLayout() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const appEl = $('#app-shell');
  if (appEl) {
    appEl.classList.toggle('sidebar-collapsed', !state.sidebarOpen);
    appEl.classList.toggle('editor-wide', state.wideMode);
  }
  const inspector = $('#inspector-drawer');
  if (inspector) {
    inspector.hidden = !state.inspectorOpen;
  }
}

function loadDocsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.docs = parsed;
        state.activeDocId = parsed[0].id;
        return;
      }
    }
  } catch {}

  const welcomeTpl = TEMPLATES[0];
  const initialDoc = {
    id: 'doc_' + Date.now(),
    title: welcomeTpl.title,
    html: welcomeTpl.html.trim(),
    markdown: htmlToMarkdown(welcomeTpl.html.trim()),
    filePath: null,
    updatedAt: new Date().toISOString(),
    pinned: true
  };
  state.docs = [initialDoc];
  state.activeDocId = initialDoc.id;
  persistDocs();
}

function persistDocs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.docs));
  } catch {}
}

function getActiveDoc() {
  return state.docs.find(d => d.id === state.activeDocId) || state.docs[0] || null;
}

function extractTitleFromHtml(html, fallback = '제목 없는 노트') {
  const tpl = document.createElement('template');
  tpl.innerHTML = html || '';
  const h1 = tpl.content.querySelector('h1, h2, h3');
  if (h1 && h1.textContent.trim()) {
    return h1.textContent.trim().slice(0, 80);
  }
  const firstP = tpl.content.querySelector('p');
  if (firstP && firstP.textContent.trim()) {
    return firstP.textContent.trim().slice(0, 50);
  }
  return fallback;
}

function initEditor() {
  const host = $('#editor-mount');
  const activeDoc = getActiveDoc();

  editor = new Editor({
    element: host,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: false,
        underline: false
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank'
        }
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      FontFamily,
      FontSize,
      TextColor,
      HighlightColor,
      KeyboardKey,
      Superscript,
      Subscript,
      TextAlign,
      TaskList,
      TaskItem,
      CalloutBox,
      DetailsToggle,
      RichImage
    ],
    content: activeDoc ? activeDoc.html : '<p></p>',
    editorProps: {
      attributes: {
        class: 'prosemirror-editor-body',
        spellcheck: 'false',
        'aria-label': '비주얼 마크다운 편집 영역'
      },
      handleDrop(_view, event, _slice, moved) {
        if (!moved && event.dataTransfer?.files?.length) {
          const files = [...event.dataTransfer.files];
          const imgFiles = files.filter(f => f.type.startsWith('image/'));
          if (imgFiles.length > 0) {
            event.preventDefault();
            imgFiles.forEach(file => insertImageFile(file));
            return true;
          }
          const mdFile = files.find(f => /\.(md|markdown|txt|html)$/i.test(f.name));
          if (mdFile) {
            event.preventDefault();
            readDroppedDocumentFile(mdFile);
            return true;
          }
        }
        return false;
      },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) insertImageFile(file);
            return true;
          }
        }
        return false;
      },
      handleKeyDown(_view, event) {
        if (event.key === 'Tab') {
          event.preventDefault();
          const direction = event.shiftKey ? 'out' : 'in';
          indentOrOutdentList(direction);
          return true;
        }

        if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const { $from } = editor.state.selection;
          const isEmptyParagraph =
            $from.parent.type.name === 'paragraph' && $from.parent.textContent.trim() === '';
          if (isEmptyParagraph) {
            setTimeout(() => openSlashMenu(), 10);
          }
        }
        return false;
      }
    },
    onUpdate() {
      if (state.isSyncingFromSource) return;
      handleEditorContentChange();
      updateToolbarActiveStates();
      updateSelectionBubble();
    },
    onSelectionUpdate() {
      updateToolbarActiveStates();
      updateContextBars();
      updateSelectionBubble();
    }
  });

  syncSourceEditorFromWysiwyg();
  updateStatsAndOutline();
  updateToolbarActiveStates();
  updateContextBars();
}

function updateSelectionBubble() {
  const bubble = $('#selection-bubble-bar');
  if (!bubble || !editor || state.viewMode === 'source') {
    if (bubble) bubble.hidden = true;
    return;
  }

  const { from, to, empty } = editor.state.selection;
  if (empty || to - from < 1) {
    bubble.hidden = true;
    return;
  }

  const selectedText = editor.state.doc.textBetween(from, to, '').trim();
  if (!selectedText) {
    bubble.hidden = true;
    return;
  }

  try {
    const startCoords = editor.view.coordsAtPos(from);
    const endCoords = editor.view.coordsAtPos(to);
    const left = Math.max(160, Math.min(window.innerWidth - 160, (startCoords.left + endCoords.right) / 2));
    const top = Math.max(58, Math.min(startCoords.top, endCoords.top) - 10);

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.hidden = false;
  } catch {
    bubble.hidden = true;
  }
}

function handleEditorContentChange() {
  const doc = getActiveDoc();
  if (!doc || !editor) return;

  const html = editor.getHTML();
  const md = htmlToMarkdown(html);
  doc.html = html;
  doc.markdown = md;
  if (!doc.customTitle) {
    doc.title = extractTitleFromHtml(html, doc.title || '새 노트');
    const titleInput = $('#doc-title-input');
    if (titleInput && document.activeElement !== titleInput) {
      titleInput.value = doc.title;
    }
  }
  doc.updatedAt = new Date().toISOString();
  state.dirtyFile = !!doc.filePath;

  if (state.viewMode === 'split') {
    syncSourceEditorFromWysiwyg();
  }

  updateSaveStatusBadge('저장 중…');
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    persistDocs();
    renderSidebarContent();
    updateStatsAndOutline();
    updateSaveStatusBadge(doc.filePath ? '● 변경됨 (Ctrl+S)' : '자동저장됨');
  }, 240);
}

function syncSourceEditorFromWysiwyg() {
  const sourceArea = $('#markdown-source-textarea');
  if (!sourceArea || !editor) return;
  state.isSyncingFromEditor = true;
  const md = htmlToMarkdown(editor.getHTML());
  if (sourceArea.value !== md) {
    sourceArea.value = md;
  }
  state.isSyncingFromEditor = false;
}

function syncWysiwygFromSourceEditor() {
  const sourceArea = $('#markdown-source-textarea');
  const doc = getActiveDoc();
  if (!sourceArea || !editor || !doc) return;

  state.isSyncingFromSource = true;
  const md = sourceArea.value;
  const html = markdownToHtml(md);
  editor.commands.setContent(html, false);
  doc.markdown = md;
  doc.html = editor.getHTML();
  if (!doc.customTitle) {
    doc.title = extractTitleFromHtml(doc.html, doc.title || '새 노트');
    const titleInput = $('#doc-title-input');
    if (titleInput && document.activeElement !== titleInput) {
      titleInput.value = doc.title;
    }
  }
  doc.updatedAt = new Date().toISOString();
  persistDocs();
  renderSidebarContent();
  updateStatsAndOutline();
  updateSaveStatusBadge('원문 동기화됨');
  state.isSyncingFromSource = false;
}

function updateSaveStatusBadge(text) {
  const el = $('#save-status-badge');
  if (el) el.textContent = text;
}

function updateToolbarActiveStates() {
  if (!editor) return;

  const blockSelect = $('#select-block-type');
  if (blockSelect) {
    if (editor.isActive('heading', { level: 1 })) blockSelect.value = 'h1';
    else if (editor.isActive('heading', { level: 2 })) blockSelect.value = 'h2';
    else if (editor.isActive('heading', { level: 3 })) blockSelect.value = 'h3';
    else if (editor.isActive('heading', { level: 4 })) blockSelect.value = 'h4';
    else if (editor.isActive('heading', { level: 5 })) blockSelect.value = 'h5';
    else if (editor.isActive('heading', { level: 6 })) blockSelect.value = 'h6';
    else blockSelect.value = 'p';
  }

  const fontSelect = $('#select-font-family');
  if (fontSelect) {
    const currentFont = editor.getAttributes('fontFamily').font || '';
    const matched = FONT_FAMILIES.find(f => f.value === currentFont);
    fontSelect.value = matched ? matched.value : FONT_FAMILIES[0].value;
  }

  const sizeSelect = $('#select-font-size');
  if (sizeSelect) {
    const currentSize = editor.getAttributes('fontSize').size || '';
    sizeSelect.value = currentSize;
  }

  const map = {
    bold: () => editor.isActive('bold'),
    italic: () => editor.isActive('italic'),
    underline: () => editor.isActive('underline'),
    strike: () => editor.isActive('strike'),
    code: () => editor.isActive('code'),
    kbd: () => editor.isActive('keyboardKey'),
    sup: () => editor.isActive('superscript'),
    sub: () => editor.isActive('subscript'),
    alignLeft: () => editor.isActive({ textAlign: 'left' }),
    alignCenter: () => editor.isActive({ textAlign: 'center' }),
    alignRight: () => editor.isActive({ textAlign: 'right' }),
    bulletList: () => editor.isActive('bulletList'),
    orderedList: () => editor.isActive('orderedList'),
    taskList: () => editor.isActive('taskList'),
    blockquote: () => editor.isActive('blockquote'),
    link: () => editor.isActive('link')
  };

  $$('[data-cmd]').forEach(btn => {
    const cmd = btn.dataset.cmd;
    if (map[cmd]) {
      btn.classList.toggle('active', !!map[cmd]());
    }
  });

  const currentColor = editor.getAttributes('textColor').color || '#1d1d1f';
  const colorIndicator = $('#indicator-text-color');
  if (colorIndicator) colorIndicator.style.backgroundColor = currentColor;

  const currentBg = editor.getAttributes('highlightColor').bg || '#fef08a';
  const bgIndicator = $('#indicator-highlight-color');
  if (bgIndicator) bgIndicator.style.backgroundColor = currentBg;
}

function updateContextBars() {
  if (!editor) return;

  const tableBar = $('#table-context-bar');
  if (tableBar) {
    tableBar.hidden = !editor.isActive('table');
  }

  const linkBar = $('#link-context-bar');
  if (linkBar) {
    const inLink = editor.isActive('link');
    linkBar.hidden = !inLink;
    if (inLink) {
      const href = editor.getAttributes('link').href || '';
      const urlSpan = $('#active-link-url');
      if (urlSpan) {
        urlSpan.textContent = href;
        urlSpan.title = href;
      }
    }
  }
}

function updateStatsAndOutline() {
  if (!editor) return;
  const dom = editor.view.dom;
  const text = dom.innerText || '';
  const charsWithSpace = text.replace(/\n/g, '').length;
  const charsNoSpace = text.replace(/\s+/g, '').length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readMin = Math.max(1, Math.ceil(charsWithSpace / 500));

  $('#stat-chars').textContent = charsWithSpace.toLocaleString();
  $('#stat-chars-nospace').textContent = charsNoSpace.toLocaleString();
  $('#stat-words').textContent = words.toLocaleString();
  $('#stat-readtime').textContent = `약 ${readMin}분`;
  $('#inline-char-counter').textContent = `${charsWithSpace.toLocaleString()}자 · ${words.toLocaleString()}단어`;

  const headings = [...dom.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  const tocList = $('#toc-list');
  if (!tocList) return;

  if (headings.length === 0) {
    tocList.innerHTML = `<div style="font-size:12px;color:var(--text-muted)">문서에 제목(H1~H6)을 넣으면 상하 계층 목차가 자동 생성됩니다.</div>`;
    return;
  }

  tocList.innerHTML = headings
    .map((h, idx) => {
      const level = Number(h.tagName.slice(1));
      const label = h.textContent.trim() || `(제목 ${idx + 1})`;
      return `<button type="button" class="toc-item" style="padding-left:${(level - 1) * 9 + 6}px" data-heading-idx="${idx}">
        <span class="toc-badge">H${level}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</span>
      </button>`;
    })
    .join('');

  $$('.toc-item', tocList).forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.headingIdx);
      const target = headings[idx];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
  });
}

function renderSidebarContent() {
  const listEl = $('#sidebar-list-area');
  if (!listEl) return;

  $$('[data-sidebar-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.sidebarTab === state.sidebarTab);
  });

  if (state.sidebarTab === 'folder') {
    if (!state.folderPath) {
      listEl.innerHTML = `
        <div style="padding:28px 14px;text-align:center;color:var(--text-muted);font-size:12.5px;line-height:1.6">
          연결된 로컬 폴더가 없습니다.<br><br>
          <button type="button" id="btn-connect-folder-empty" class="btn-primary">📁 로컬 폴더 선택하기</button>
        </div>
      `;
      const btn = $('#btn-connect-folder-empty', listEl);
      if (btn) btn.onclick = openLocalFolder;
      return;
    }

    listEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;font-size:11.5px;font-weight:700;color:var(--text-secondary)">
        <span title="${esc(state.folderPath)}">📂 ${esc(state.folderName)} (${state.folderFiles.length})</span>
        <div style="display:flex;gap:4px">
          <button type="button" id="btn-refresh-folder" class="icon-mini-btn" title="새로고침">↻</button>
          <button type="button" id="btn-change-folder" class="icon-mini-btn" title="다른 폴더 열기">📁</button>
        </div>
      </div>
      ${
        state.folderFiles.length === 0
          ? '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">폴더 내 마크다운 파일이 없습니다.</div>'
          : state.folderFiles
              .map(
                f => `
            <div class="doc-item" data-folder-file="${esc(f.filePath)}">
              <div class="doc-item-main">
                <div class="doc-item-title-row">
                  <span class="doc-item-title">${esc(f.name)}</span>
                </div>
                <div class="doc-item-meta">
                  <span class="file-linked-pill">${esc(f.ext.replace('.', '').toUpperCase())}</span>
                  <span>${esc(f.updatedAt.slice(0, 10))}</span>
                </div>
              </div>
            </div>
          `
              )
              .join('')
      }
    `;
    $('#btn-refresh-folder', listEl)?.addEventListener('click', refreshConnectedFolder);
    $('#btn-change-folder', listEl)?.addEventListener('click', openLocalFolder);
    $$('[data-folder-file]', listEl).forEach(el => {
      el.onclick = () => openFileByPath(el.dataset.folderFile);
    });
    return;
  }

  const q = state.docSearchQuery.trim().toLowerCase();
  const filtered = state.docs
    .slice()
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    })
    .filter(d => !q || (d.title || '').toLowerCase().includes(q) || (d.markdown || '').toLowerCase().includes(q));

  if (!filtered.length) {
    listEl.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px">일치하는 노트가 없습니다.</div>`;
    return;
  }

  listEl.innerHTML = filtered
    .map(doc => {
      const isActive = doc.id === state.activeDocId;
      const dateStr = (doc.updatedAt || '').slice(5, 16).replace('T', ' ');
      return `
        <div class="doc-item ${isActive ? 'active' : ''}" data-doc-id="${doc.id}">
          <div class="doc-item-main">
            <div class="doc-item-title-row">
              ${doc.pinned ? '<span style="font-size:11px">📌</span>' : ''}
              <span class="doc-item-title">${esc(doc.title || '제목 없는 노트')}</span>
            </div>
            <div class="doc-item-meta">
              <span>${dateStr}</span>
              ${doc.filePath ? `<span class="file-linked-pill">· 파일 연결됨</span>` : ''}
            </div>
          </div>
          <div class="doc-item-actions">
            <button type="button" class="icon-mini-btn" data-pin-doc="${doc.id}" title="상단 고정">📌</button>
            <button type="button" class="icon-mini-btn danger" data-del-doc="${doc.id}" title="삭제">×</button>
          </div>
        </div>
      `;
    })
    .join('');

  $$('[data-doc-id]', listEl).forEach(el => {
    el.onclick = e => {
      if (e.target.closest('button')) return;
      switchActiveDocument(el.dataset.docId);
    };
  });

  $$('[data-pin-doc]', listEl).forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const target = state.docs.find(d => d.id === btn.dataset.pinDoc);
      if (target) {
        target.pinned = !target.pinned;
        persistDocs();
        renderSidebarContent();
      }
    };
  });

  $$('[data-del-doc]', listEl).forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      deleteDocument(btn.dataset.delDoc);
    };
  });
}

function switchActiveDocument(docId) {
  const doc = state.docs.find(d => d.id === docId);
  if (!doc || !editor) return;
  state.activeDocId = doc.id;
  state.isSyncingFromSource = true;
  editor.commands.setContent(doc.html || markdownToHtml(doc.markdown || ''), false);
  state.isSyncingFromSource = false;

  const titleInput = $('#doc-title-input');
  if (titleInput) titleInput.value = doc.title || '제목 없는 노트';
  const pathBadge = $('#active-file-path-badge');
  if (pathBadge) {
    pathBadge.textContent = doc.filePath ? doc.filePath : '로컬 노트 (자동 임시저장)';
  }

  syncSourceEditorFromWysiwyg();
  renderSidebarContent();
  updateStatsAndOutline();
  updateToolbarActiveStates();
  updateContextBars();
}

function createNewDocument(templateId = 'blank') {
  const tpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[1];
  const html = tpl.html.trim();
  const newDoc = {
    id: 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: templateId === 'blank' ? '새 노트' : tpl.title.replace(/^[^\s]+\s/, ''),
    customTitle: false,
    html,
    markdown: htmlToMarkdown(html),
    filePath: null,
    updatedAt: new Date().toISOString(),
    pinned: false
  };
  state.docs.unshift(newDoc);
  persistDocs();
  state.sidebarTab = 'docs';
  switchActiveDocument(newDoc.id);
  showToast(`'${newDoc.title}' 노트를 만들었습니다.`);
}

function deleteDocument(docId) {
  if (state.docs.length <= 1) {
    showToast('최소 1개의 노트는 남아 있어야 합니다.');
    return;
  }
  state.docs = state.docs.filter(d => d.id !== docId);
  if (state.activeDocId === docId) {
    state.activeDocId = state.docs[0].id;
    switchActiveDocument(state.activeDocId);
  } else {
    persistDocs();
    renderSidebarContent();
  }
}

function setViewMode(mode) {
  if (state.viewMode === 'source' && mode !== 'source') {
    syncWysiwygFromSourceEditor();
  } else if (mode === 'split' || mode === 'source') {
    syncSourceEditorFromWysiwyg();
  }

  state.viewMode = mode;
  const workspace = $('#editor-workspace');
  if (workspace) {
    workspace.setAttribute('data-view-mode', mode);
  }
  $$('[data-view-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.viewBtn === mode);
  });
  updateSelectionBubble();
}

async function openLocalFile() {
  if (window.marknoteDesktop?.isDesktop) {
    const res = await window.marknoteDesktop.invoke('open-file');
    if (res.canceled) return;
    if (res.error) return showToast(res.error, 'error');
    loadOpenedFileIntoEditor(res);
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md,.markdown,.txt,.html';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const content = await file.text();
    loadOpenedFileIntoEditor({
      filePath: null,
      fileName: file.name,
      ext: '.' + (file.name.split('.').pop() || 'md').toLowerCase(),
      content
    });
  };
  input.click();
}

function loadOpenedFileIntoEditor({ filePath, fileName, ext, content }) {
  const isHtml = ext === '.html';
  const html = isHtml ? content : markdownToHtml(content);
  const md = isHtml ? htmlToMarkdown(html) : content;
  const baseTitle = fileName.replace(/\.(md|markdown|txt|html)$/i, '');

  const existing = filePath ? state.docs.find(d => d.filePath === filePath) : null;
  if (existing) {
    existing.title = baseTitle;
    existing.html = html;
    existing.markdown = md;
    existing.updatedAt = new Date().toISOString();
    persistDocs();
    switchActiveDocument(existing.id);
  } else {
    const newDoc = {
      id: 'doc_' + Date.now(),
      title: baseTitle,
      customTitle: true,
      html,
      markdown: md,
      filePath: filePath || null,
      updatedAt: new Date().toISOString(),
      pinned: false
    };
    state.docs.unshift(newDoc);
    persistDocs();
    switchActiveDocument(newDoc.id);
  }
  showToast(`'${fileName}' 파일을 열었습니다.`);
}

async function openFileByPath(filePath) {
  if (!window.marknoteDesktop?.isDesktop) return;
  const res = await window.marknoteDesktop.invoke('read-file-by-path', { filePath });
  if (res.error) return showToast(res.error, 'error');
  loadOpenedFileIntoEditor(res);
}

async function readDroppedDocumentFile(file) {
  const content = await file.text();
  loadOpenedFileIntoEditor({
    filePath: file.path || null,
    fileName: file.name,
    ext: '.' + (file.name.split('.').pop() || 'md').toLowerCase(),
    content
  });
}

async function saveLocalFile(saveAs = false) {
  const doc = getActiveDoc();
  if (!doc || !editor) return;

  if (state.viewMode === 'source') {
    syncWysiwygFromSourceEditor();
  }
  const mdContent = htmlToMarkdown(editor.getHTML());
  doc.markdown = mdContent;
  doc.html = editor.getHTML();

  if (window.marknoteDesktop?.isDesktop) {
    const action = saveAs || !doc.filePath ? 'save-file-as' : 'save-file';
    const res = await window.marknoteDesktop.invoke(action, {
      filePath: doc.filePath,
      suggestedName: doc.title || '문서',
      content: mdContent
    });
    if (res.canceled) return;
    if (res.error) return showToast(res.error, 'error');

    doc.filePath = res.filePath;
    doc.title = res.fileName.replace(/\.(md|markdown|txt)$/i, '');
    doc.updatedAt = res.savedAt || new Date().toISOString();
    state.dirtyFile = false;
    persistDocs();
    switchActiveDocument(doc.id);
    if (state.folderPath) await refreshConnectedFolder();
    updateSaveStatusBadge(`저장됨 (${res.fileName})`);
    showToast(`'${res.fileName}' 저장 완료`);
    return;
  }

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (doc.title || '문서').replace(/[\\/:*?"<>|]/g, '_') + '.md';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('마크다운(.md) 파일을 다운로드했습니다.');
}

async function exportHtmlDocument() {
  const doc = getActiveDoc();
  if (!doc || !editor) return;
  const fullHtml = buildStandaloneHtmlDocument(doc.title || '문서', editor.getHTML());

  if (window.marknoteDesktop?.isDesktop) {
    const res = await window.marknoteDesktop.invoke('export-html', {
      suggestedName: doc.title || '문서',
      htmlContent: fullHtml
    });
    if (res.canceled) return;
    if (res.error) return showToast(res.error, 'error');
    showToast(`'${res.fileName}' 내보내기 완료`);
    return;
  }

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (doc.title || '문서').replace(/[\\/:*?"<>|]/g, '_') + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportPdfDocument() {
  const doc = getActiveDoc();
  if (!doc || !editor) return;
  const fullHtml = buildStandaloneHtmlDocument(doc.title || '문서', editor.getHTML());

  if (window.marknoteDesktop?.isDesktop) {
    showToast('PDF 생성 중…');
    const res = await window.marknoteDesktop.invoke('export-pdf', {
      suggestedName: doc.title || '문서',
      htmlContent: fullHtml
    });
    if (res.canceled) return;
    if (res.error) return showToast(res.error, 'error');
    showToast(`'${res.fileName}' PDF 저장 완료`);
    return;
  }
  window.print();
}

async function openLocalFolder() {
  if (!window.marknoteDesktop?.isDesktop) {
    return showToast('폴더 열기는 데스크톱 앱에서 지원됩니다.');
  }
  const res = await window.marknoteDesktop.invoke('open-folder');
  if (res.canceled) return;
  if (res.error) return showToast(res.error, 'error');
  state.folderPath = res.folderPath;
  state.folderName = res.folderName;
  state.folderFiles = res.files || [];
  state.sidebarTab = 'folder';
  renderSidebarContent();
}

async function refreshConnectedFolder() {
  if (!window.marknoteDesktop?.isDesktop || !state.folderPath) return;
  const res = await window.marknoteDesktop.invoke('refresh-folder', {
    folderPath: state.folderPath
  });
  if (!res.error) {
    state.folderFiles = res.files || [];
    renderSidebarContent();
  }
}

async function copyRichTextToClipboard() {
  if (!editor) return;
  const html = editor.getHTML();
  const text = editor.view.dom.innerText;
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
      showToast('서식 복사 완료 (블로그·노션·워드에 바로 붙여넣기)');
      return;
    }
  } catch {}
  await navigator.clipboard.writeText(text);
  showToast('텍스트 복사 완료');
}

async function copyMarkdownToClipboard() {
  if (!editor) return;
  const md = htmlToMarkdown(editor.getHTML());
  await navigator.clipboard.writeText(md);
  showToast('마크다운(.md) 원문 복사 완료');
}

function openModal({ title, bodyHtml, footerHtml = '', wide = false, onMount }) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-dialog ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>${esc(title)}</h3>
          <button type="button" class="modal-close-btn" aria-label="닫기">×</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    </div>
  `;
  const close = () => {
    root.innerHTML = '';
    editor?.commands.focus();
  };
  $('.modal-close-btn', root).onclick = close;
  $('.modal-backdrop', root).onclick = e => {
    if (e.target.classList.contains('modal-backdrop')) close();
  };
  if (onMount) onMount(root, close);
}

function openLinkModal() {
  if (!editor) return;
  const { from, to } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to, ' ');
  const existingHref = editor.getAttributes('link').href || 'https://';

  openModal({
    title: '🔗 링크 연결 ([텍스트](주소))',
    bodyHtml: `
      <div class="form-group">
        <label for="link-text-input">표시할 이름 (선택)</label>
        <input id="link-text-input" type="text" placeholder="예: 홈페이지 바로가기" value="${esc(selectedText)}" />
      </div>
      <div class="form-group">
        <label for="link-url-input">웹 주소 (URL)</label>
        <input id="link-url-input" type="url" placeholder="https://example.com" value="${esc(existingHref)}" />
      </div>
    `,
    footerHtml: `
      ${editor.isActive('link') ? '<button type="button" id="btn-remove-link" class="btn-secondary">링크 해제</button>' : ''}
      <button type="button" id="btn-apply-link" class="btn-primary">적용</button>
    `,
    onMount(root, close) {
      const textInput = $('#link-text-input', root);
      const urlInput = $('#link-url-input', root);
      setTimeout(() => urlInput.focus(), 30);

      const apply = () => {
        let url = urlInput.value.trim();
        const label = textInput.value.trim();
        if (!url) return showToast('주소를 입력해 주세요.');
        if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
          url = 'https://' + url;
        }
        if (selectedText) {
          if (label && label !== selectedText) {
            editor.chain().focus().insertContentAt({ from, to }, `<a href="${esc(url)}">${esc(label)}</a>`).run();
          } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
        } else {
          const display = label || url;
          editor.chain().focus().insertContent(`<a href="${esc(url)}">${esc(display)}</a> `).run();
        }
        close();
      };

      $('#btn-apply-link', root).onclick = apply;
      urlInput.onkeydown = e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          apply();
        }
      };

      const removeBtn = $('#btn-remove-link', root);
      if (removeBtn) {
        removeBtn.onclick = () => {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          close();
        };
      }
    }
  });
}

function openImageModal() {
  if (!editor) return;
  openModal({
    title: '🖼 사진 추가 (![설명](경로))',
    bodyHtml: `
      <div class="image-upload-dropzone" id="modal-image-dropzone">
        <p style="margin:0 0 10px;font-weight:600">내 컴퓨터에서 사진을 선택하거나 끌어다 놓으세요</p>
        <button type="button" id="btn-pick-local-img" class="btn-primary">사진 파일 선택…</button>
        <input type="file" id="hidden-img-file-input" accept="image/*" hidden />
      </div>
      <div class="divider-label">또는 이미지 웹 주소(URL) 입력</div>
      <div class="form-group">
        <input id="img-url-input" type="url" placeholder="https://example.com/photo.jpg" />
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label for="img-alt-input">사진 캡션 (선택)</label>
          <input id="img-alt-input" type="text" placeholder="사진 아래 설명" />
        </div>
        <div class="form-group">
          <label for="img-width-select">크기</label>
          <select id="img-width-select">
            <option value="100%">100% (기본)</option>
            <option value="75%">75%</option>
            <option value="50%">50%</option>
            <option value="25%">25%</option>
          </select>
        </div>
      </div>
    `,
    footerHtml: `<button type="button" id="btn-insert-url-img" class="btn-primary">사진 넣기</button>`,
    onMount(root, close) {
      const altInput = $('#img-alt-input', root);
      const widthSelect = $('#img-width-select', root);
      const urlInput = $('#img-url-input', root);
      const fileInput = $('#hidden-img-file-input', root);

      $('#btn-pick-local-img', root).onclick = async () => {
        if (window.marknoteDesktop?.isDesktop) {
          const res = await window.marknoteDesktop.invoke('pick-image');
          if (res.canceled) return;
          if (res.error) return showToast(res.error);
          editor
            .chain()
            .focus()
            .insertRichImage({
              src: res.dataUrl,
              alt: altInput.value.trim(),
              width: widthSelect.value,
              align: 'center'
            })
            .run();
          close();
        } else {
          fileInput.click();
        }
      };

      fileInput.onchange = () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        insertImageFile(file, altInput.value.trim(), widthSelect.value);
        close();
      };

      const dropzone = $('#modal-image-dropzone', root);
      dropzone.ondragover = e => e.preventDefault();
      dropzone.ondrop = e => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
          insertImageFile(file, altInput.value.trim(), widthSelect.value);
          close();
        }
      };

      $('#btn-insert-url-img', root).onclick = () => {
        const url = urlInput.value.trim();
        if (!url) return showToast('사진 파일을 선택하거나 URL을 입력하세요.');
        editor
          .chain()
          .focus()
          .insertRichImage({
            src: url,
            alt: altInput.value.trim(),
            width: widthSelect.value,
            align: 'center'
          })
          .run();
        close();
      };
    }
  });
}

function insertImageFile(file, customAlt = '', width = '100%') {
  const reader = new FileReader();
  reader.onload = () => {
    editor
      ?.chain()
      .focus()
      .insertRichImage({
        src: reader.result,
        alt: customAlt,
        width,
        align: 'center'
      })
      .run();
  };
  reader.readAsDataURL(file);
}

function openTableModal() {
  if (!editor) return;
  openModal({
    title: '▦ 표 추가 (| 제목 | 내용 |)',
    bodyHtml: `
      <div class="form-row-2">
        <div class="form-group">
          <label for="table-rows-input">가로 줄 (행)</label>
          <input id="table-rows-input" type="number" min="1" max="30" value="3" />
        </div>
        <div class="form-group">
          <label for="table-cols-input">세로 칸 (열)</label>
          <input id="table-cols-input" type="number" min="1" max="12" value="3" />
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer">
        <input type="checkbox" id="table-header-chk" checked />
        <span>첫 줄을 제목 행(머리글)으로 지정</span>
      </label>
    `,
    footerHtml: `<button type="button" id="btn-confirm-table" class="btn-primary">표 만들기</button>`,
    onMount(root, close) {
      $('#btn-confirm-table', root).onclick = () => {
        const rows = Math.min(30, Math.max(1, Number($('#table-rows-input', root).value) || 3));
        const cols = Math.min(12, Math.max(1, Number($('#table-cols-input', root).value) || 3));
        const withHeaderRow = $('#table-header-chk', root).checked;
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
        close();
      };
    }
  });
}

function openTemplateModal() {
  openModal({
    title: '✨ 템플릿으로 시작하기',
    bodyHtml: `
      <div class="template-grid">
        ${TEMPLATES.map(
          t => `
          <button type="button" class="template-card" data-tpl-id="${t.id}">
            <div class="template-card-icon">${t.icon}</div>
            <div class="template-card-info">
              <strong>${esc(t.title)}</strong>
              <p>${esc(t.description)}</p>
            </div>
          </button>
        `
        ).join('')}
      </div>
    `,
    onMount(root, close) {
      $$('[data-tpl-id]', root).forEach(btn => {
        btn.onclick = () => {
          createNewDocument(btn.dataset.tplId);
          close();
        };
      });
    }
  });
}

/**
 * 마크다운 문법별 꾸미기 & 상하 계층 전체 갤러리 모달
 */
function openSlashMenu() {
  openModal({
    title: '✨ 마크다운 문법 꾸미기 팔레트 (클릭하여 바로 적용)',
    wide: true,
    bodyHtml: `
      <div class="md-syntax-cat-title">📐 1. 상하 계층 · 구조 나누기 (제목 / 다단계 목록 / 접기 토글)</div>
      <div class="md-syntax-grid">
        <button type="button" class="md-syntax-card" data-qblock="h1">
          <div class="md-syntax-card-top"><strong>큰 대제목 1</strong><span class="md-syntax-code-pill"># H1</span></div>
          <small>문서 최상위 대제목 (밑줄 포함)</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="h2">
          <div class="md-syntax-card-top"><strong>중간 제목 2</strong><span class="md-syntax-code-pill">## H2</span></div>
          <small>주요 장(섹션)을 나누는 중제목</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="h3">
          <div class="md-syntax-card-top"><strong>소제목 3</strong><span class="md-syntax-code-pill">### H3</span></div>
          <small>세부 주제를 나누는 소제목</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="details">
          <div class="md-syntax-card-top"><strong>▶ 접기/펼치기 토글</strong><span class="md-syntax-code-pill">&lt;details&gt;</span></div>
          <small>하위 상세 내용을 접어두는 아코디언</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="nested-ul">
          <div class="md-syntax-card-top"><strong>• 다단계 계층 목록</strong><span class="md-syntax-code-pill">- / ▸Tab</span></div>
          <small>상위 → 하위 들여쓰기 글머리 목록</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="task">
          <div class="md-syntax-card-top"><strong>☑ 할 일 체크리스트</strong><span class="md-syntax-code-pill">- [ ]</span></div>
          <small>클릭해서 완료 체크하는 목록</small>
        </button>
      </div>

      <div class="md-syntax-cat-title">🎨 2. 마크다운 강조 박스 &amp; 인용구 (GitHub Alerts 문법)</div>
      <div class="md-syntax-grid">
        <button type="button" class="md-syntax-card" data-qblock="callout-info">
          <div class="md-syntax-card-top"><strong>ℹ️ 참고 안내 박스</strong><span class="md-syntax-code-pill">[!NOTE]</span></div>
          <small>파란색 안내·참고사항 박스</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="callout-tip">
          <div class="md-syntax-card-top"><strong>💡 핵심 팁 박스</strong><span class="md-syntax-code-pill">[!TIP]</span></div>
          <small>보라색 유용한 팁·아이디어 박스</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="callout-important">
          <div class="md-syntax-card-top"><strong>📌 중요 포인트 박스</strong><span class="md-syntax-code-pill">[!IMPORTANT]</span></div>
          <small>인디고색 필수 확인 사항 박스</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="callout-warn">
          <div class="md-syntax-card-top"><strong>⚠️ 주의사항 박스</strong><span class="md-syntax-code-pill">[!WARNING]</span></div>
          <small>주황색 주의·점검 사항 박스</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="callout-caution">
          <div class="md-syntax-card-top"><strong>🚨 위험/경고 박스</strong><span class="md-syntax-code-pill">[!CAUTION]</span></div>
          <small>빨간색 중요 경고 강조 박스</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="quote">
          <div class="md-syntax-card-top"><strong>❝ 인용구 블록</strong><span class="md-syntax-code-pill">&gt; 인용</span></div>
          <small>발언이나 핵심 문장 인용 블록</small>
        </button>
      </div>

      <div class="md-syntax-cat-title">🔤 3. 인라인 글자 꾸미기 &amp; 배지 문법</div>
      <div class="md-syntax-grid">
        <button type="button" class="md-syntax-card" data-qblock="inline-code">
          <div class="md-syntax-card-top"><strong>단어 코드 배지</strong><span class="md-syntax-code-pill">\`단어\`</span></div>
          <small>단어에 캡슐 배경 배지 씌우기</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="kbd">
          <div class="md-syntax-card-top"><strong>⌨️ 키보드 키 배지</strong><span class="md-syntax-code-pill">&lt;kbd&gt;</span></div>
          <small>Ctrl, Enter 등 입체 버튼 모양</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="sup">
          <div class="md-syntax-card-top"><strong>x² 위 첨자</strong><span class="md-syntax-code-pill">&lt;sup&gt;</span></div>
          <small>제곱(m²), 각주 번호 표시</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="sub">
          <div class="md-syntax-card-top"><strong>H₂O 아래 첨자</strong><span class="md-syntax-code-pill">&lt;sub&gt;</span></div>
          <small>화학식, 아래 작은 글씨 표시</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="codeblock">
          <div class="md-syntax-card-top"><strong>{ } 다중 줄 코드박스</strong><span class="md-syntax-code-pill">\`\`\`</span></div>
          <small>어두운 배경의 코드·명령어 블록</small>
        </button>
        <button type="button" class="md-syntax-card" data-qblock="hr">
          <div class="md-syntax-card-top"><strong>― 가로 구분선</strong><span class="md-syntax-code-pill">---</span></div>
          <small>문단과 문단 사이를 나누는 선</small>
        </button>
      </div>
    `,
    onMount(root, close) {
      $$('[data-qblock]', root).forEach(btn => {
        btn.onclick = () => {
          const kind = btn.dataset.qblock;
          const { $from } = editor.state.selection;
          if ($from.parent.textContent === '/') {
            editor.commands.deleteRange({ from: $from.pos - 1, to: $from.pos });
          }
          const chain = editor.chain().focus();
          if (kind === 'h1') chain.toggleHeading({ level: 1 }).run();
          else if (kind === 'h2') chain.toggleHeading({ level: 2 }).run();
          else if (kind === 'h3') chain.toggleHeading({ level: 3 }).run();
          else if (kind === 'details') chain.insertDetailsToggle().run();
          else if (kind === 'nested-ul') {
            chain
              .insertContent(
                '<ul><li><p>1단계 상위 항목</p><ul><li><p>2단계 하위 세부 항목</p></li></ul></li></ul>'
              )
              .run();
          } else if (kind === 'task') chain.toggleTaskList().run();
          else if (kind === 'table') chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          else if (kind.startsWith('callout-')) chain.insertCallout(kind.replace('callout-', '')).run();
          else if (kind === 'quote') chain.toggleBlockquote().run();
          else if (kind === 'inline-code') {
            const { from, to } = editor.state.selection;
            if (from === to) chain.insertContent('<code>핵심키워드</code> ').run();
            else chain.toggleCode().run();
          } else if (kind === 'kbd') {
            const { from, to } = editor.state.selection;
            if (from === to) chain.insertContent('<kbd>Ctrl</kbd> + <kbd>S</kbd> ').run();
            else chain.toggleKeyboardKey().run();
          } else if (kind === 'sup') {
            const { from, to } = editor.state.selection;
            if (from === to) chain.insertContent('<sup>각주1</sup>').run();
            else chain.toggleSuperscript().run();
          } else if (kind === 'sub') {
            const { from, to } = editor.state.selection;
            if (from === to) chain.insertContent('<sub>아래첨자</sub>').run();
            else chain.toggleSubscript().run();
          } else if (kind === 'codeblock') chain.toggleCodeBlock().run();
          else if (kind === 'hr') chain.setHorizontalRule().run();
          close();
        };
      });
    }
  });
}

function indentOrOutdentList(direction = 'in') {
  if (!editor) return;

  // 1. 커서가 표 안에 있을 때 (Tab: 다음 셀, Shift+Tab: 이전 셀)
  if (editor.isActive('table')) {
    if (direction === 'in') {
      editor.chain().focus().goToNextCell().run();
    } else {
      editor.chain().focus().goToPreviousCell().run();
    }
    return;
  }

  // 2. 커서가 제목(Heading 1~6)에 있을 때: 제목 상하 단계 조절
  let currentLevel = 0;
  for (let i = 1; i <= 6; i++) {
    if (editor.isActive('heading', { level: i })) {
      currentLevel = i;
      break;
    }
  }

  if (currentLevel > 0) {
    if (direction === 'in') {
      if (currentLevel < 6) {
        editor.chain().focus().toggleHeading({ level: currentLevel + 1 }).run();
        showToast(`'제목 ${currentLevel + 1}(H${currentLevel + 1})' 하위 단계로 내렸습니다.`);
      } else {
        showToast('가장 낮은 세부 제목 단계(H6)입니다.');
      }
    } else {
      if (currentLevel > 1) {
        editor.chain().focus().toggleHeading({ level: currentLevel - 1 }).run();
        showToast(`'제목 ${currentLevel - 1}(H${currentLevel - 1})' 상위 단계로 올렸습니다.`);
      } else {
        editor.chain().focus().setParagraph().run();
        showToast('본문 텍스트로 전환되었습니다.');
      }
    }
    updateToolbarActiveStates();
    return;
  }

  // 3. 커서가 목록(글머리, 번호, 체크리스트)에 있을 때: 들여쓰기 / 내어쓰기
  const isList =
    editor.isActive('bulletList') ||
    editor.isActive('orderedList') ||
    editor.isActive('taskList') ||
    editor.isActive('listItem') ||
    editor.isActive('taskItem');

  if (isList) {
    if (direction === 'in') {
      let success = editor.chain().focus().sinkListItem('listItem').run();
      if (!success) {
        success = editor.chain().focus().sinkListItem('taskItem').run();
      }
      if (success) {
        showToast('하위 세부 항목으로 들여쓰기되었습니다. (단축키: Tab)');
      } else {
        showToast('💡 목록의 첫 번째 항목은 상위 항목이 없어 들여쓸 수 없습니다. 두 번째 항목부터 [▸하위]나 Tab 키로 들여써 보세요!', 'warn');
      }
    } else {
      let success = editor.chain().focus().liftListItem('listItem').run();
      if (!success) {
        success = editor.chain().focus().liftListItem('taskItem').run();
      }
      if (success) {
        showToast('상위 목록 단계로 내어쓰기되었습니다. (단축키: Shift+Tab)');
      } else {
        if (editor.isActive('bulletList')) editor.chain().focus().toggleBulletList().run();
        else if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run();
        else if (editor.isActive('taskList')) editor.chain().focus().toggleTaskList().run();
        showToast('목록을 벗어나 일반 본문으로 돌아왔습니다.');
      }
    }
    updateToolbarActiveStates();
    return;
  }

  // 4. 일반 본문(문단)에 커서가 있을 때
  if (direction === 'in') {
    const { $from } = editor.state.selection;
    const isBlank = !$from.parent.textContent || $from.parent.textContent.trim() === '';
    if (isBlank) {
      editor.chain().focus().toggleBulletList().run();
      showToast('• 글머리 목록으로 전환되었습니다. 2번째 항목부터 [▸하위]나 Tab 키로 하위 계층을 만들 수 있습니다.');
    } else {
      editor.chain().focus().insertContent('    ').run();
      showToast('들여쓰기 공백(Tab)이 삽입되었습니다.');
    }
  } else {
    showToast('이미 가장 상위 단계(본문)입니다.');
  }
  updateToolbarActiveStates();
}

function runReplaceInDocument(replaceAll = false) {
  if (!editor) return;
  const findVal = $('#find-input')?.value || '';
  const replaceVal = $('#replace-input')?.value || '';
  if (!findVal) return showToast('찾을 단어를 입력하세요.');

  const md = htmlToMarkdown(editor.getHTML());
  if (!md.includes(findVal)) {
    return showToast(`'${findVal}' 단어를 찾지 못했습니다.`);
  }
  const updatedMd = replaceAll ? md.split(findVal).join(replaceVal) : md.replace(findVal, replaceVal);
  editor.commands.setContent(markdownToHtml(updatedMd), true);
  handleEditorContentChange();
  showToast('바꾸기 완료');
}

function buildAppShell() {
  const app = $('#app');
  app.innerHTML = `
    <div id="app-shell" class="app-shell">
      <!-- 좌측 Apple Notes 스타일 사이드바 -->
      <aside class="left-sidebar">
        <div class="sidebar-top">
          <div class="sidebar-brand-row">
            <div class="apple-brand">
              <span class="apple-brand-icon">✎</span>
              <span>MarkNote</span>
            </div>
            <button type="button" id="btn-new-doc" class="new-note-pill" title="새 노트 작성 (Ctrl+N)">＋ 새 노트</button>
          </div>

          <div class="sidebar-seg">
            <button type="button" data-sidebar-tab="docs" class="active">내 노트</button>
            <button type="button" data-sidebar-tab="folder">로컬 폴더</button>
          </div>

          <div class="sidebar-search-wrap">
            <input type="search" id="doc-search-input" placeholder="검색" />
          </div>
        </div>

        <div id="sidebar-list-area" class="sidebar-list-area"></div>

        <div class="sidebar-bottom-bar">
          <button type="button" id="btn-templates" class="sidebar-ghost-btn" title="회의록·보고서 등 템플릿">✨ 양식</button>
          <button type="button" id="btn-open-file" class="sidebar-ghost-btn" title="컴퓨터의 .md 파일 열기">📂 열기</button>
          <button type="button" id="btn-open-folder" class="sidebar-ghost-btn" title="폴더 연결">📁 폴더</button>
        </div>
      </aside>

      <!-- 우측 메인 스테이지 -->
      <div class="main-stage">
        <!-- 단일 슬림 애플 글래스 헤더 -->
        <header class="apple-topbar">
          <div class="topbar-left">
            <button type="button" id="btn-toggle-sidebar" class="apple-icon-btn" title="사이드바 열기/닫기">◧</button>
            <span id="save-status-badge" class="save-pill-indicator">자동저장됨</span>
          </div>

          <div class="topbar-center">
            <div class="view-mode-switch" role="group" aria-label="보기 모드">
              <button type="button" data-view-btn="wysiwyg" class="active">비주얼 편집</button>
              <button type="button" data-view-btn="split">분할 비교</button>
              <button type="button" data-view-btn="source">마크다운 원문</button>
            </div>
          </div>

          <div class="topbar-right">
            <button type="button" id="btn-save-file" class="apple-icon-btn primary-pill" title="파일로 저장 (Ctrl+S)">저장</button>

            <div class="dropdown-wrap">
              <button type="button" id="btn-export-menu" class="apple-icon-btn" title="내보내기 및 복사">내보내기 ▾</button>
              <div id="export-dropdown" class="apple-popover right" hidden>
                <div class="popover-section-label">클립보드 복사</div>
                <button type="button" class="menu-row" id="menu-copy-rich">📋 서식 유지 복사 (블로그·노션·워드용)</button>
                <button type="button" class="menu-row" id="menu-copy-md">📝 마크다운(.md) 원문 복사</button>
                <hr />
                <div class="popover-section-label">파일로 내보내기</div>
                <button type="button" class="menu-row" id="menu-save-as">💾 다른 이름으로 .md 저장…</button>
                <button type="button" class="menu-row" id="menu-export-html">🌐 웹 문서(.html) 내보내기</button>
                <button type="button" class="menu-row" id="menu-export-pdf">🖨 PDF(.pdf) 문서로 내보내기</button>
              </div>
            </div>

            <button type="button" id="btn-theme-cycle" class="apple-icon-btn" title="테마 전환 (라이트/세피아/다크)">🌗</button>
            <button type="button" id="btn-wide-toggle" class="apple-icon-btn" title="문서 폭 넓게/표준">⇔</button>
            <button type="button" id="btn-toggle-inspector" class="apple-icon-btn" title="목차·글자수·찾기 (ⓘ)">ⓘ</button>
          </div>
        </header>

        <!-- 깔끔한 원라인 플로팅 서식 캡슐 -->
        <div class="apple-toolbar-wrap">
          <div class="apple-format-pill" role="toolbar" aria-label="서식 도구">
            <button type="button" class="tool-btn" data-cmd="undo" title="실행 취소">↶</button>
            <button type="button" class="tool-btn" data-cmd="redo" title="다시 실행">↷</button>

            <div class="pill-divider"></div>

            <select id="select-block-type" class="clean-select" aria-label="문단 및 제목 상하 단계" title="마크다운 상하 계층 제목 선택 (# ~ ######)">
              <option value="p">본문 텍스트</option>
              <option value="h1"># 대제목 1 (H1)</option>
              <option value="h2">## 중제목 2 (H2)</option>
              <option value="h3">### 소제목 3 (H3)</option>
              <option value="h4">#### 세부제목 4 (H4)</option>
              <option value="h5">##### 항목제목 5 (H5)</option>
              <option value="h6">###### 꼬리제목 6 (H6)</option>
            </select>

            <select id="select-font-family" class="clean-select" aria-label="글꼴">
              ${FONT_FAMILIES.map(f => `<option value="${esc(f.value)}">${esc(f.label)}</option>`).join('')}
            </select>

            <select id="select-font-size" class="clean-select" aria-label="글자 크기">
              ${FONT_SIZES.map(s => `<option value="${esc(s.value)}">${esc(s.label)}</option>`).join('')}
            </select>

            <div class="pill-divider"></div>

            <button type="button" class="tool-btn" data-cmd="bold" title="굵게 (**Bold**)"><b>B</b></button>
            <button type="button" class="tool-btn" data-cmd="italic" title="기울임 (*Italic*)"><i>I</i></button>
            <button type="button" class="tool-btn" data-cmd="underline" title="밑줄 (<u>)"><u>U</u></button>
            <button type="button" class="tool-btn" data-cmd="strike" title="취소선 (~~Strike~~)"><s>S</s></button>
            <button type="button" class="tool-btn" data-cmd="code" title="단어 코드 배지"><code>배지</code></button>
            <button type="button" class="tool-btn" data-cmd="kbd" title="키보드 단축키 배지 (<kbd>)">⌨️키</button>

            <!-- 글자색 도트 -->
            <div class="dropdown-wrap">
              <button type="button" id="btn-text-color" class="tool-btn color-dot-btn" title="글자색">
                <span id="indicator-text-color" class="color-circle" style="background:#1d1d1f"></span>
                <span>색상</span>
              </button>
              <div id="popover-text-color" class="apple-popover" hidden>
                <div class="popover-section-label">글자색</div>
                <div class="color-swatch-grid">
                  ${TEXT_COLORS.map(
                    c => `
                    <button type="button" class="color-swatch" data-set-color="${esc(c.color)}" title="${esc(c.name)}" style="background:${c.color || '#1d1d1f'}">
                      ${!c.color ? '<span style="color:#fff">기본</span>' : ''}
                    </button>
                  `
                  ).join('')}
                </div>
                <label class="custom-color-row">
                  <span>직접 선택</span>
                  <input type="color" id="input-custom-text-color" value="#0071e3" />
                </label>
              </div>
            </div>

            <!-- 형광펜 도트 -->
            <div class="dropdown-wrap">
              <button type="button" id="btn-highlight-color" class="tool-btn color-dot-btn" title="형광펜 배경색">
                <span id="indicator-highlight-color" class="highlight-pill-icon" style="background:#fef08a"></span>
                <span>형광펜</span>
              </button>
              <div id="popover-highlight-color" class="apple-popover" hidden>
                <div class="popover-section-label">형광펜 하이라이트</div>
                <div class="color-swatch-grid">
                  ${HIGHLIGHT_COLORS.map(
                    c => `
                    <button type="button" class="color-swatch" data-set-bg="${esc(c.bg)}" title="${esc(c.name)}" style="background:${c.bg || '#ffffff'}">
                      ${!c.bg ? '해제' : ''}
                    </button>
                  `
                  ).join('')}
                </div>
                <label class="custom-color-row">
                  <span>직접 선택</span>
                  <input type="color" id="input-custom-bg-color" value="#fef08a" />
                </label>
              </div>
            </div>

            <div class="pill-divider"></div>

            <!-- 상하 계층 목록 & 들여쓰기 & 토글 -->
            <button type="button" class="tool-btn" data-cmd="bulletList" title="글머리 목록 (-)">• 목록</button>
            <button type="button" class="tool-btn" data-cmd="orderedList" title="번호 목록 (1.)">1. 번호</button>
            <button type="button" class="tool-btn" data-cmd="taskList" title="체크리스트 (- [ ])">☑ 할 일</button>
            <button type="button" class="tool-btn" id="btn-indent-list" title="하위 단계로 들여쓰기 (Tab)">▸하위</button>
            <button type="button" class="tool-btn" id="btn-outdent-list" title="상위 단계로 내어쓰기 (Shift+Tab)">◂상위</button>
            <button type="button" class="tool-btn" data-cmd="detailsToggle" title="접기/펼치기 아코디언 토글 (<details>)">▶ 토글</button>

            <div class="pill-divider"></div>

            <button type="button" class="tool-btn" data-cmd="link" title="링크 연결">🔗 링크</button>
            <button type="button" class="tool-btn" data-cmd="image" title="사진 넣기">🖼 사진</button>
            <button type="button" class="tool-btn" data-cmd="table" title="표 넣기">▦ 표</button>
            <button type="button" class="tool-btn plus-insert-btn" id="btn-quick-insert" title="마크다운 문법 꾸미기 팔레트 열기">✨ 마크다운 꾸미기</button>
          </div>

          <!-- 표 안에 커서가 있을 때만 부드럽게 나타나는 미니 캡슐 -->
          <div id="table-context-bar" class="context-subbar" hidden>
            <span class="subbar-label">▦ 표 편집</span>
            <button type="button" data-table-cmd="addRowBefore">＋위 행</button>
            <button type="button" data-table-cmd="addRowAfter">＋아래 행</button>
            <button type="button" data-table-cmd="deleteRow" class="danger">－행 삭제</button>
            <button type="button" data-table-cmd="addColBefore">＋왼쪽 열</button>
            <button type="button" data-table-cmd="addColAfter">＋오른쪽 열</button>
            <button type="button" data-table-cmd="deleteCol" class="danger">－열 삭제</button>
            <button type="button" data-table-cmd="deleteTable" class="danger">표 삭제</button>
          </div>

          <!-- 링크 클릭 시에만 나타나는 미니 캡슐 -->
          <div id="link-context-bar" class="context-subbar" hidden>
            <span class="subbar-label">🔗 링크</span>
            <span id="active-link-url" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary)"></span>
            <button type="button" id="btn-open-active-link">열기 ↗</button>
            <button type="button" id="btn-edit-active-link">수정</button>
            <button type="button" id="btn-unlink-active" class="danger">해제</button>
          </div>
        </div>

        <!-- 메인 에디터 종이 시트 -->
        <main id="editor-workspace" class="editor-workspace" data-view-mode="wysiwyg">
          <div class="panes-container">
            <div class="pane wysiwyg-pane">
              <div class="apple-paper-sheet">
                <div class="inline-title-row">
                  <input
                    type="text"
                    id="doc-title-input"
                    class="doc-title-input"
                    placeholder="제목을 입력하세요"
                    aria-label="문서 제목"
                  />
                  <div class="doc-submeta">
                    <span id="active-file-path-badge">로컬 노트 (자동 임시저장)</span>
                    <span>·</span>
                    <span id="inline-char-counter">0자 · 0단어</span>
                  </div>
                </div>
                <div id="editor-mount"></div>
              </div>
            </div>

            <div class="pane source-pane">
              <div class="source-pane-header">
                <span>Markdown 원문 (.md) — 수정 시 비주얼 화면에 자동 반영됩니다</span>
                <button type="button" id="btn-copy-source-pane" class="new-note-pill" style="height:24px">원문 복사</button>
              </div>
              <textarea
                id="markdown-source-textarea"
                class="markdown-source-textarea"
                spellcheck="false"
                placeholder="# 마크다운 원문..."
              ></textarea>
            </div>
          </div>
        </main>

        <!-- 우측 ⓘ 인스펙터 팝오버 (기본 숨김 · 클릭 시에만 깔끔하게 표시) -->
        <aside id="inspector-drawer" class="inspector-drawer" hidden>
          <div class="inspector-section">
            <h4>문서 통계</h4>
            <div class="stats-pill-grid">
              <div class="stat-box"><label>글자(공백포함)</label><strong id="stat-chars">0</strong></div>
              <div class="stat-box"><label>글자(공백제외)</label><strong id="stat-chars-nospace">0</strong></div>
              <div class="stat-box"><label>단어 수</label><strong id="stat-words">0</strong></div>
              <div class="stat-box"><label>읽기 시간</label><strong id="stat-readtime">약 1분</strong></div>
            </div>
          </div>

          <div class="inspector-section">
            <h4>문서 상하 계층 목차 (H1~H6)</h4>
            <div id="toc-list" class="toc-list"></div>
          </div>

          <div class="inspector-section">
            <h4>찾기 및 바꾸기</h4>
            <div class="form-group" style="margin-bottom:6px">
              <input type="text" id="find-input" placeholder="찾을 단어" style="height:30px;font-size:12px" />
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <input type="text" id="replace-input" placeholder="바꿀 단어" style="height:30px;font-size:12px" />
            </div>
            <div style="display:flex;gap:6px">
              <button type="button" id="btn-replace-one" class="sidebar-ghost-btn">바꾸기</button>
              <button type="button" id="btn-replace-all" class="sidebar-ghost-btn" style="color:var(--accent)">모두 바꾸기</button>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- 텍스트 드래그 시 글자 바로 위에 뜨는 애플 스타일 플로팅 버블 바 -->
    <div id="selection-bubble-bar" class="selection-bubble-bar" hidden>
      <button type="button" data-bubble-cmd="bold" title="굵게 (**)"><b>B</b></button>
      <button type="button" data-bubble-cmd="italic" title="기울임 (*)"><i>I</i></button>
      <button type="button" data-bubble-cmd="underline" title="밑줄 (<u>)"><u>U</u></button>
      <button type="button" data-bubble-cmd="code" title="단어 코드 배지"><code>배지</code></button>
      <button type="button" data-bubble-cmd="kbd" title="키보드 키 (<kbd>)">⌨️</button>
      <button type="button" data-bubble-color="#0071e3" title="파란 글씨"><span class="bubble-dot" style="background:#0a84ff"></span></button>
      <button type="button" data-bubble-color="#e11d48" title="빨간 글씨"><span class="bubble-dot" style="background:#ff453a"></span></button>
      <button type="button" data-bubble-bg="#fef08a" title="노란 형광펜"><span class="bubble-dot" style="background:#fef08a;border-radius:3px"></span></button>
      <button type="button" data-bubble-bg="#bbf7d0" title="연두 형광펜"><span class="bubble-dot" style="background:#bbf7d0;border-radius:3px"></span></button>
      <button type="button" data-bubble-cmd="link" title="링크 연결">🔗</button>
      <button type="button" data-bubble-cmd="clear" title="서식 지우기">Tx</button>
    </div>

    <div id="modal-root"></div>
    <div id="toast-container" class="toast-container"></div>
  `;

  bindUIEvents();
}

function bindUIEvents() {
  $$('.apple-format-pill button, .selection-bubble-bar button').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());
  });

  $('#btn-toggle-sidebar').onclick = () => {
    state.sidebarOpen = !state.sidebarOpen;
    applyThemeAndLayout();
    saveSettings();
  };

  $('#btn-toggle-inspector').onclick = e => {
    e.stopPropagation();
    state.inspectorOpen = !state.inspectorOpen;
    applyThemeAndLayout();
  };

  $('#btn-wide-toggle').onclick = () => {
    state.wideMode = !state.wideMode;
    applyThemeAndLayout();
    saveSettings();
  };

  $('#btn-theme-cycle').onclick = () => {
    const order = ['light', 'sepia', 'dark'];
    state.theme = order[(order.indexOf(state.theme) + 1) % order.length];
    applyThemeAndLayout();
    saveSettings();
  };

  $$('[data-sidebar-tab]').forEach(btn => {
    btn.onclick = () => {
      state.sidebarTab = btn.dataset.sidebarTab;
      renderSidebarContent();
    };
  });

  $('#btn-new-doc').onclick = () => createNewDocument('blank');
  $('#btn-templates').onclick = openTemplateModal;
  $('#btn-open-file').onclick = openLocalFile;
  $('#btn-open-folder').onclick = openLocalFolder;
  $('#btn-save-file').onclick = () => saveLocalFile(false);

  $$('[data-view-btn]').forEach(btn => {
    btn.onclick = () => setViewMode(btn.dataset.viewBtn);
  });

  const exportBtn = $('#btn-export-menu');
  const exportMenu = $('#export-dropdown');
  exportBtn.onclick = e => {
    e.stopPropagation();
    exportMenu.hidden = !exportMenu.hidden;
  };
  $('#menu-copy-rich').onclick = () => {
    exportMenu.hidden = true;
    copyRichTextToClipboard();
  };
  $('#menu-copy-md').onclick = () => {
    exportMenu.hidden = true;
    copyMarkdownToClipboard();
  };
  $('#menu-save-as').onclick = () => {
    exportMenu.hidden = true;
    saveLocalFile(true);
  };
  $('#menu-export-html').onclick = () => {
    exportMenu.hidden = true;
    exportHtmlDocument();
  };
  $('#menu-export-pdf').onclick = () => {
    exportMenu.hidden = true;
    exportPdfDocument();
  };

  const titleInput = $('#doc-title-input');
  titleInput.oninput = () => {
    const doc = getActiveDoc();
    if (!doc) return;
    doc.title = titleInput.value.trim() || '제목 없는 노트';
    doc.customTitle = true;
    doc.updatedAt = new Date().toISOString();
    persistDocs();
    renderSidebarContent();
  };

  $('#doc-search-input').oninput = e => {
    state.docSearchQuery = e.target.value;
    state.sidebarTab = 'docs';
    renderSidebarContent();
  };

  $('#select-block-type').onchange = e => {
    const val = e.target.value;
    const chain = editor.chain().focus();
    if (val === 'p') chain.setParagraph().run();
    else if (val.startsWith('h')) chain.toggleHeading({ level: Number(val.slice(1)) }).run();
  };

  $('#select-font-family').onchange = e => {
    editor.chain().focus().setFontFamily(e.target.value).run();
  };

  $('#select-font-size').onchange = e => {
    const sz = e.target.value;
    if (!sz) editor.chain().focus().unsetFontSize().run();
    else editor.chain().focus().setFontSize(sz).run();
  };

  $('#btn-indent-list').onclick = () => indentOrOutdentList('in');
  $('#btn-outdent-list').onclick = () => indentOrOutdentList('out');

  $$('[data-cmd]').forEach(btn => {
    btn.onclick = () => {
      const cmd = btn.dataset.cmd;
      const chain = editor.chain().focus();
      if (cmd === 'undo') chain.undo().run();
      else if (cmd === 'redo') chain.redo().run();
      else if (cmd === 'bold') chain.toggleBold().run();
      else if (cmd === 'italic') chain.toggleItalic().run();
      else if (cmd === 'underline') chain.toggleUnderline().run();
      else if (cmd === 'strike') chain.toggleStrike().run();
      else if (cmd === 'code') chain.toggleCode().run();
      else if (cmd === 'kbd') chain.toggleKeyboardKey().run();
      else if (cmd === 'sup') chain.toggleSuperscript().run();
      else if (cmd === 'sub') chain.toggleSubscript().run();
      else if (cmd === 'alignLeft') chain.setTextAlign('left').run();
      else if (cmd === 'alignCenter') chain.setTextAlign('center').run();
      else if (cmd === 'alignRight') chain.setTextAlign('right').run();
      else if (cmd === 'bulletList') chain.toggleBulletList().run();
      else if (cmd === 'orderedList') chain.toggleOrderedList().run();
      else if (cmd === 'taskList') chain.toggleTaskList().run();
      else if (cmd === 'detailsToggle') chain.insertDetailsToggle().run();
      else if (cmd === 'link') openLinkModal();
      else if (cmd === 'image') openImageModal();
      else if (cmd === 'table') openTableModal();
      updateToolbarActiveStates();
      updateContextBars();
    };
  });

  // 플로팅 버블 바 이벤트
  $$('[data-bubble-cmd]').forEach(btn => {
    btn.onclick = () => {
      const c = btn.dataset.bubbleCmd;
      const chain = editor.chain().focus();
      if (c === 'bold') chain.toggleBold().run();
      else if (c === 'italic') chain.toggleItalic().run();
      else if (c === 'underline') chain.toggleUnderline().run();
      else if (c === 'code') chain.toggleCode().run();
      else if (c === 'kbd') chain.toggleKeyboardKey().run();
      else if (c === 'link') openLinkModal();
      else if (c === 'clear') chain.unsetAllMarks().run();
      updateToolbarActiveStates();
    };
  });
  $$('[data-bubble-color]').forEach(btn => {
    btn.onclick = () => {
      editor.chain().focus().setTextColor(btn.dataset.bubbleColor).run();
      updateToolbarActiveStates();
    };
  });
  $$('[data-bubble-bg]').forEach(btn => {
    btn.onclick = () => {
      editor.chain().focus().setHighlightColor(btn.dataset.bubbleBg).run();
      updateToolbarActiveStates();
    };
  });

  // 색상 팝오버
  const colorBtn = $('#btn-text-color');
  const colorPopover = $('#popover-text-color');
  const bgBtn = $('#btn-highlight-color');
  const bgPopover = $('#popover-highlight-color');

  colorBtn.onclick = e => {
    e.stopPropagation();
    bgPopover.hidden = true;
    colorPopover.hidden = !colorPopover.hidden;
  };
  bgBtn.onclick = e => {
    e.stopPropagation();
    colorPopover.hidden = true;
    bgPopover.hidden = !bgPopover.hidden;
  };

  $$('[data-set-color]').forEach(sw => {
    sw.onclick = () => {
      const c = sw.dataset.setColor;
      if (!c) editor.chain().focus().unsetTextColor().run();
      else editor.chain().focus().setTextColor(c).run();
      colorPopover.hidden = true;
      updateToolbarActiveStates();
    };
  });

  $('#input-custom-text-color').oninput = e => {
    editor.chain().focus().setTextColor(e.target.value).run();
    updateToolbarActiveStates();
  };

  $$('[data-set-bg]').forEach(sw => {
    sw.onclick = () => {
      const bg = sw.dataset.setBg;
      if (!bg) editor.chain().focus().unsetHighlightColor().run();
      else editor.chain().focus().setHighlightColor(bg).run();
      bgPopover.hidden = true;
      updateToolbarActiveStates();
    };
  });

  $('#input-custom-bg-color').oninput = e => {
    editor.chain().focus().setHighlightColor(e.target.value).run();
    updateToolbarActiveStates();
  };

  $$('[data-table-cmd]').forEach(btn => {
    btn.onclick = () => {
      const c = btn.dataset.tableCmd;
      const chain = editor.chain().focus();
      if (c === 'addRowBefore') chain.addRowBefore().run();
      else if (c === 'addRowAfter') chain.addRowAfter().run();
      else if (c === 'deleteRow') chain.deleteRow().run();
      else if (c === 'addColBefore') chain.addColumnBefore().run();
      else if (c === 'addColAfter') chain.addColumnAfter().run();
      else if (c === 'deleteCol') chain.deleteColumn().run();
      else if (c === 'deleteTable') chain.deleteTable().run();
      updateContextBars();
    };
  });

  $('#btn-open-active-link').onclick = () => {
    const href = editor.getAttributes('link').href;
    if (!href) return;
    if (window.marknoteDesktop?.isDesktop) {
      window.marknoteDesktop.invoke('open-external', { url: href });
    } else {
      window.open(href, '_blank', 'noopener');
    }
  };
  $('#btn-edit-active-link').onclick = openLinkModal;
  $('#btn-unlink-active').onclick = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    updateContextBars();
  };

  $('#btn-quick-insert').onclick = openSlashMenu;

  $('#btn-replace-one').onclick = () => runReplaceInDocument(false);
  $('#btn-replace-all').onclick = () => runReplaceInDocument(true);

  const sourceTextarea = $('#markdown-source-textarea');
  sourceTextarea.onkeydown = e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = sourceTextarea.selectionStart;
      const end = sourceTextarea.selectionEnd;
      const val = sourceTextarea.value;
      if (e.shiftKey) {
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        if (val.slice(lineStart, lineStart + 2) === '  ') {
          sourceTextarea.value = val.slice(0, lineStart) + val.slice(lineStart + 2);
          sourceTextarea.selectionStart = Math.max(lineStart, start - 2);
          sourceTextarea.selectionEnd = Math.max(lineStart, end - 2);
        } else if (val.slice(lineStart, lineStart + 4) === '    ') {
          sourceTextarea.value = val.slice(0, lineStart) + val.slice(lineStart + 4);
          sourceTextarea.selectionStart = Math.max(lineStart, start - 4);
          sourceTextarea.selectionEnd = Math.max(lineStart, end - 4);
        }
      } else {
        sourceTextarea.value = val.substring(0, start) + '  ' + val.substring(end);
        sourceTextarea.selectionStart = sourceTextarea.selectionEnd = start + 2;
      }
      sourceTextarea.dispatchEvent(new Event('input'));
    }
  };
  sourceTextarea.oninput = () => {
    if (state.isSyncingFromEditor) return;
    if (state.viewMode === 'split') {
      syncWysiwygFromSourceEditor();
    } else {
      const doc = getActiveDoc();
      if (doc) {
        doc.markdown = sourceTextarea.value;
        doc.updatedAt = new Date().toISOString();
        persistDocs();
      }
    }
  };

  $('#btn-copy-source-pane').onclick = copyMarkdownToClipboard;

  document.addEventListener('click', e => {
    if (!e.target.closest('.dropdown-wrap')) {
      exportMenu.hidden = true;
      colorPopover.hidden = true;
      bgPopover.hidden = true;
    }
    if (
      state.inspectorOpen &&
      !e.target.closest('#inspector-drawer') &&
      !e.target.closest('#btn-toggle-inspector')
    ) {
      state.inspectorOpen = false;
      applyThemeAndLayout();
    }
  });

  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveLocalFile(e.shiftKey);
    } else if (mod && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      if (e.shiftKey) openLocalFolder();
      else openLocalFile();
    } else if (mod && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      state.inspectorOpen = true;
      applyThemeAndLayout();
      $('#find-input')?.focus();
    }
  });

  if (window.marknoteDesktop?.onMenuShortcut) {
    window.marknoteDesktop.onMenuShortcut(cmd => {
      if (cmd === 'new-doc') createNewDocument('blank');
      else if (cmd === 'open-file') openLocalFile();
      else if (cmd === 'open-folder') openLocalFolder();
      else if (cmd === 'save-file') saveLocalFile(false);
      else if (cmd === 'save-file-as') saveLocalFile(true);
      else if (cmd === 'export-html') exportHtmlDocument();
      else if (cmd === 'export-pdf') exportPdfDocument();
      else if (cmd === 'find-replace') {
        state.inspectorOpen = true;
        applyThemeAndLayout();
        $('#find-input')?.focus();
      } else if (cmd === 'mode-wysiwyg') setViewMode('wysiwyg');
      else if (cmd === 'mode-split') setViewMode('split');
      else if (cmd === 'mode-source') setViewMode('source');
    });
  }

  if (window.marknoteDesktop?.onUpdateStatus) {
    window.marknoteDesktop.onUpdateStatus(data => {
      if (data.state === 'available') {
        showToast(`새 버전(${data.version}) 업데이트가 발견되어 다운로드를 시작합니다.`);
      } else if (data.state === 'downloaded') {
        showToast(`새 버전(${data.version}) 다운로드 완료! 앱 재시작 시 자동 적용됩니다.`, 'info');
      }
    });
  }
}

function bootstrap() {
  buildAppShell();
  loadSettings();
  loadDocsFromStorage();
  initEditor();
  const active = getActiveDoc();
  if (active) {
    switchActiveDocument(active.id);
  }
}

bootstrap();
