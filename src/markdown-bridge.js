import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

marked.setOptions({
  gfm: true,
  breaks: true
});

const td = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*'
});

td.use(gfm);

// 밑줄(<u>) 보존
td.addRule('underline', {
  filter: ['u'],
  replacement(content) {
    if (!content.trim()) return '';
    return `<u>${content}</u>`;
  }
});

// 키보드 배지(<kbd>) 보존
td.addRule('keyboardKey', {
  filter: ['kbd'],
  replacement(content) {
    if (!content.trim()) return '';
    return `<kbd>${content}</kbd>`;
  }
});

// 위 첨자(<sup>) 및 아래 첨자(<sub>) 보존
td.addRule('superscript', {
  filter: ['sup'],
  replacement(content) {
    if (!content.trim()) return '';
    return `<sup>${content}</sup>`;
  }
});

td.addRule('subscript', {
  filter: ['sub'],
  replacement(content) {
    if (!content.trim()) return '';
    return `<sub>${content}</sub>`;
  }
});

// 형광펜(<mark>) 보존
td.addRule('highlightMark', {
  filter: 'mark',
  replacement(content, node) {
    if (!content.trim()) return '';
    const bg = node.getAttribute('data-bg') || node.style?.backgroundColor || '#fef08a';
    return `<mark data-bg="${bg}" style="background-color: ${bg};">${content}</mark>`;
  }
});

// 글꼴, 글자 크기, 글자색 <span> 보존
td.addRule('styledSpan', {
  filter(node) {
    if (node.nodeName !== 'SPAN') return false;
    return !!(
      node.getAttribute('data-font-family') ||
      node.getAttribute('data-font-size') ||
      node.getAttribute('data-color') ||
      node.style?.fontFamily ||
      node.style?.fontSize ||
      node.style?.color
    );
  },
  replacement(content, node) {
    if (!content) return '';
    const styles = [];
    const attrs = [];
    const font = node.getAttribute('data-font-family') || node.style?.fontFamily?.replace(/['"]/g, '');
    const size = node.getAttribute('data-font-size') || node.style?.fontSize;
    const color = node.getAttribute('data-color') || node.style?.color;

    if (font) {
      attrs.push(`data-font-family="${font}"`);
      styles.push(`font-family: ${font}`);
    }
    if (size) {
      attrs.push(`data-font-size="${size}"`);
      styles.push(`font-size: ${size}`);
    }
    if (color) {
      attrs.push(`data-color="${color}"`);
      styles.push(`color: ${color}`);
    }
    if (!styles.length) return content;
    return `<span ${attrs.join(' ')} style="${styles.join('; ')}">${content}</span>`;
  }
});

// 문단 및 제목 정렬(가운데/오른쪽/양쪽 정렬) 보존
td.addRule('alignedBlock', {
  filter(node) {
    if (!['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.nodeName)) return false;
    const align = node.style?.textAlign || node.getAttribute('align');
    return align && align !== 'left';
  },
  replacement(content, node) {
    const align = node.style?.textAlign || node.getAttribute('align');
    const tag = node.nodeName.toLowerCase();
    return `\n\n<${tag} style="text-align: ${align}">${content}</${tag}>\n\n`;
  }
});

// 체크리스트(TaskItem) 변환
td.addRule('taskListItem', {
  filter(node) {
    return (
      node.nodeName === 'LI' &&
      (node.getAttribute('data-type') === 'taskItem' || node.classList.contains('task-item'))
    );
  },
  replacement(content, node) {
    const checked =
      node.getAttribute('data-checked') === 'true' ||
      !!node.querySelector('input[type="checkbox"]:checked');
    const lines = content.trim().split('\n');
    const firstLine = (lines[0] || '').replace(/^\s*\[[ xX]\]\s*/, '');
    const childLines = lines.slice(1).map(l => l ? '    ' + l : '').join('\n');
    const fullBody = childLines ? `${firstLine}\n${childLines}\n` : `${firstLine}\n`;
    return `- [${checked ? 'x' : ' '}] ${fullBody}`;
  }
});

// 콜아웃 박스(CalloutBox) 보존
td.addRule('calloutBox', {
  filter(node) {
    return node.nodeName === 'DIV' && node.hasAttribute('data-callout');
  },
  replacement(content, node) {
    const kind = node.getAttribute('data-callout') || 'info';
    return `\n\n<div data-callout="${kind}" class="callout-box callout-${kind}">\n\n${content.trim()}\n\n</div>\n\n`;
  }
});

// 마크다운 접기/펼치기 토글 블록(<details><summary>...</summary>...</details>) 변환
td.addRule('detailsToggle', {
  filter(node) {
    return node.nodeName === 'DETAILS';
  },
  replacement(_content, node) {
    const summaryText =
      node.getAttribute('data-summary') ||
      node.querySelector('.md-details-title-text')?.textContent ||
      node.querySelector('summary')?.textContent ||
      '상세 내용 보기';
    const bodyEl = node.querySelector('.md-details-body');
    const innerMd = bodyEl ? td.turndown(bodyEl.innerHTML).trim() : '';
    return `\n\n<details open data-summary="${summaryText.replace(/"/g, '&quot;')}">\n<summary>${summaryText}</summary>\n<div class="md-details-body">\n\n${innerMd}\n\n</div>\n</details>\n\n`;
  }
});

// 리치 이미지(RichImage) 변환
td.addRule('richImageFigure', {
  filter(node) {
    return node.nodeName === 'FIGURE' && node.hasAttribute('data-rich-image');
  },
  replacement(_content, node) {
    const img = node.querySelector('img');
    const cap = node.querySelector('figcaption');
    const src = img?.getAttribute('src') || '';
    const alt = cap?.textContent || img?.getAttribute('alt') || '';
    const width = node.getAttribute('data-width') || '100%';
    const align = node.getAttribute('data-align') || 'center';

    if (width === '100%' && align === 'center') {
      return `\n\n![${alt}](${src})\n\n`;
    }
    return `\n\n<figure data-rich-image="true" data-width="${width}" data-align="${align}" style="text-align: ${align};"><img src="${src}" alt="${alt}" style="width: ${width}; max-width: 100%; border-radius: 8px;" />${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>\n\n`;
  }
});

/**
 * 에디터 HTML -> Markdown 문자열 변환
 */
export function htmlToMarkdown(html) {
  if (!html || html === '<p></p>') return '';
  return td.turndown(html).trim() + '\n';
}

/**
 * Markdown 문자열 -> 에디터 호환 HTML 변환
 */
export function markdownToHtml(mdText) {
  if (!mdText || !mdText.trim()) return '<p></p>';
  const rawHtml = marked.parse(mdText);
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['mark', 'u', 'kbd', 'sup', 'sub', 'details', 'summary', 'figure', 'figcaption', 'input', 'label'],
    ADD_ATTR: [
      'style',
      'align',
      'color',
      'width',
      'type',
      'checked',
      'disabled',
      'open',
      'data-font-family',
      'data-font-size',
      'data-color',
      'data-bg',
      'data-type',
      'data-checked',
      'data-callout',
      'data-summary',
      'data-rich-image',
      'data-width',
      'data-align',
      'target'
    ]
  });

  const tpl = document.createElement('template');
  tpl.innerHTML = cleanHtml;

  // 1. GFM 체크리스트를 Tiptap TaskList로 변환
  tpl.content.querySelectorAll('ul').forEach(ul => {
    const items = [...ul.children].filter(el => el.tagName === 'LI');
    const isTaskList = items.some(li => li.querySelector('input[type="checkbox"]'));
    if (!isTaskList) return;

    ul.setAttribute('data-type', 'taskList');
    ul.classList.add('task-list');

    items.forEach(li => {
      const cb = li.querySelector('input[type="checkbox"]');
      if (!cb) return;
      const isChecked = cb.checked || cb.hasAttribute('checked');
      cb.remove();

      li.setAttribute('data-type', 'taskItem');
      li.setAttribute('data-checked', isChecked ? 'true' : 'false');
      li.classList.add('task-item');

      const existingP = li.querySelector('p');
      if (!existingP) {
        const childLists = [...li.children].filter(c => c.tagName === 'UL' || c.tagName === 'OL');
        childLists.forEach(c => c.remove());
        const p = document.createElement('p');
        while (li.firstChild) {
          p.appendChild(li.firstChild);
        }
        p.innerHTML = p.innerHTML.replace(/^\s+/, '');
        li.appendChild(p);
        childLists.forEach(c => li.appendChild(c));
      }
    });
  });

  // 2. <details> 태그 정리
  tpl.content.querySelectorAll('details').forEach(det => {
    const sum = det.querySelector('summary');
    if (sum) {
      det.setAttribute('data-summary', sum.textContent.trim());
      sum.remove();
    }
    const bodyDiv = det.querySelector('.md-details-body');
    if (bodyDiv) {
      while (bodyDiv.firstChild) {
        det.appendChild(bodyDiv.firstChild);
      }
      bodyDiv.remove();
    }
    if (!det.children.length) {
      const p = document.createElement('p');
      p.textContent = det.textContent.trim() || '내용을 입력하세요.';
      det.textContent = '';
      det.appendChild(p);
    }
  });

  return tpl.innerHTML || '<p></p>';
}

/**
 * HTML 및 PDF 내보내기용 완성형 HTML 문서 생성
 */
export function buildStandaloneHtmlDocument(title, editorHtml) {
  const safeTitle = String(title || '문서').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 48px 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", sans-serif;
      font-size: 16px;
      line-height: 1.78;
      color: #1d1d1f;
      background: #ffffff;
    }
    .doc-container { max-width: 800px; margin: 0 auto; }
    h1, h2, h3, h4, h5, h6 {
      color: #1d1d1f;
      font-weight: 700;
      line-height: 1.35;
      margin-top: 1.6em;
      margin-bottom: 0.55em;
    }
    h1 { font-size: 2rem; border-bottom: 2px solid #e5e5ea; padding-bottom: 0.3rem; }
    h2 { font-size: 1.5rem; border-bottom: 1px solid #f2f2f7; padding-bottom: 0.25rem; }
    h3 { font-size: 1.25rem; }
    h4 { font-size: 1.08rem; }
    h5 { font-size: 0.98rem; color: #515154; }
    h6 { font-size: 0.9rem; color: #86868b; }
    p { margin: 0.7em 0; }
    a { color: #0071e3; text-decoration: underline; }
    mark { padding: 0.1em 0.25em; border-radius: 4px; }
    kbd {
      display: inline-block;
      padding: 2px 7px;
      font-size: 0.82em;
      font-family: "SF Mono", Consolas, monospace;
      background: #f5f5f7;
      border: 1px solid #d2d2d7;
      border-bottom-width: 2px;
      border-radius: 5px;
      color: #1d1d1f;
    }
    blockquote {
      margin: 1.2em 0;
      padding: 0.7em 1.2em;
      border-left: 3px solid #0071e3;
      background: #f5f5f7;
      color: #515154;
      border-radius: 0 10px 10px 0;
    }
    pre {
      background: #1d1d1f;
      color: #f5f5f7;
      padding: 16px 20px;
      border-radius: 12px;
      overflow-x: auto;
      font-family: "SF Mono", Consolas, monospace;
      font-size: 0.9rem;
      line-height: 1.6;
    }
    code {
      font-family: "SF Mono", Consolas, monospace;
      background: #f5f5f7;
      color: #d70015;
      padding: 0.15em 0.4em;
      border-radius: 5px;
      font-size: 0.88em;
    }
    pre code { background: transparent; color: inherit; padding: 0; }
    hr { border: 0; border-top: 1px solid #d2d2d7; margin: 2em 0; }
    table { width: 100%; border-collapse: collapse; margin: 1.2em 0; }
    th, td { border: 1px solid #d2d2d7; padding: 10px 14px; text-align: left; vertical-align: top; }
    th { background: #f5f5f7; font-weight: 700; }
    ul.task-list { list-style: none; padding-left: 0.2em; }
    li.task-item { display: flex; align-items: flex-start; gap: 10px; margin: 0.4em 0; }
    li.task-item[data-checked="true"] .task-content { text-decoration: line-through; color: #86868b; }
    .callout-box {
      padding: 14px 18px;
      border-radius: 12px;
      margin: 1.1em 0;
      border-left: 4px solid #0071e3;
      background: rgba(0, 113, 227, 0.08);
    }
    .callout-tip { border-left-color: #af52de; background: rgba(175, 82, 222, 0.08); }
    .callout-important { border-left-color: #5856d6; background: rgba(88, 86, 214, 0.09); }
    .callout-warn { border-left-color: #ff9500; background: rgba(255, 149, 0, 0.11); }
    .callout-caution { border-left-color: #ff3b30; background: rgba(255, 59, 48, 0.1); }
    .callout-check { border-left-color: #34c759; background: rgba(52, 199, 89, 0.1); }
    details.md-details-toggle {
      border: 1px solid #d2d2d7;
      border-radius: 12px;
      padding: 10px 16px;
      margin: 1em 0;
      background: #fafafa;
    }
    details.md-details-toggle summary {
      font-weight: 700;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <main class="doc-container">
    ${editorHtml}
  </main>
</body>
</html>`;
}
