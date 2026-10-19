import { Mark, Node, Extension, mergeAttributes } from '@tiptap/core';

/**
 * 1. 글꼴(Font Family) Mark
 */
export const FontFamily = Mark.create({
  name: 'fontFamily',
  addAttributes() {
    return {
      font: {
        default: null,
        parseHTML: element => element.getAttribute('data-font-family') || element.style.fontFamily?.replace(/['"]/g, '') || null,
        renderHTML: attributes => {
          if (!attributes.font) return {};
          return {
            'data-font-family': attributes.font,
            style: `font-family: ${attributes.font}`
          };
        }
      }
    };
  },
  parseHTML() {
    return [
      { tag: 'span[data-font-family]' },
      {
        tag: 'span[style]',
        getAttrs: element => {
          const font = element.style.fontFamily;
          return font ? { font } : false;
        }
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setFontFamily: font => ({ commands }) => {
        if (!font) return commands.unsetMark(this.name);
        return commands.setMark(this.name, { font });
      },
      unsetFontFamily: () => ({ commands }) => commands.unsetMark(this.name)
    };
  }
});

/**
 * 2. 글자 크기(Font Size) Mark
 */
export const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: element => element.getAttribute('data-font-size') || element.style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.size) return {};
          return {
            'data-font-size': attributes.size,
            style: `font-size: ${attributes.size}`
          };
        }
      }
    };
  },
  parseHTML() {
    return [
      { tag: 'span[data-font-size]' },
      {
        tag: 'span[style]',
        getAttrs: element => {
          const size = element.style.fontSize;
          return size ? { size } : false;
        }
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setFontSize: size => ({ commands }) => {
        if (!size) return commands.unsetMark(this.name);
        return commands.setMark(this.name, { size });
      },
      unsetFontSize: () => ({ commands }) => commands.unsetMark(this.name)
    };
  }
});

/**
 * 3. 글자색(Text Color) Mark
 */
export const TextColor = Mark.create({
  name: 'textColor',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: element => element.getAttribute('data-color') || element.style.color || element.getAttribute('color') || null,
        renderHTML: attributes => {
          if (!attributes.color) return {};
          return {
            'data-color': attributes.color,
            style: `color: ${attributes.color}`
          };
        }
      }
    };
  },
  parseHTML() {
    return [
      { tag: 'span[data-color]' },
      { tag: 'font[color]' },
      {
        tag: 'span[style]',
        getAttrs: element => {
          const color = element.style.color;
          return color ? { color } : false;
        }
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setTextColor: color => ({ commands }) => {
        if (!color) return commands.unsetMark(this.name);
        return commands.setMark(this.name, { color });
      },
      unsetTextColor: () => ({ commands }) => commands.unsetMark(this.name)
    };
  }
});

/**
 * 4. 형광펜/배경색(Highlight Color) Mark
 */
export const HighlightColor = Mark.create({
  name: 'highlightColor',
  addAttributes() {
    return {
      bg: {
        default: '#fef08a',
        parseHTML: element => element.getAttribute('data-bg') || element.style.backgroundColor || '#fef08a',
        renderHTML: attributes => {
          if (!attributes.bg) return {};
          return {
            'data-bg': attributes.bg,
            style: `background-color: ${attributes.bg}; padding: 0.08em 0.24em; border-radius: 4px;`
          };
        }
      }
    };
  },
  parseHTML() {
    return [
      { tag: 'mark' },
      {
        tag: 'span[style]',
        getAttrs: element => {
          const bg = element.style.backgroundColor;
          return bg ? { bg } : false;
        }
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setHighlightColor: bg => ({ commands }) => {
        if (!bg) return commands.unsetMark(this.name);
        return commands.setMark(this.name, { bg });
      },
      unsetHighlightColor: () => ({ commands }) => commands.unsetMark(this.name)
    };
  }
});

/**
 * 5. 마크다운 키보드 키(<kbd>) Mark
 */
export const KeyboardKey = Mark.create({
  name: 'keyboardKey',
  parseHTML() {
    return [{ tag: 'kbd' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['kbd', mergeAttributes(HTMLAttributes, { class: 'md-kbd' }), 0];
  },
  addCommands() {
    return {
      toggleKeyboardKey: () => ({ commands }) => commands.toggleMark(this.name)
    };
  }
});

/**
 * 6. 위 첨자(<sup>) 및 아래 첨자(<sub>) Marks
 */
export const Superscript = Mark.create({
  name: 'superscript',
  excludes: 'subscript',
  parseHTML() {
    return [{ tag: 'sup' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      toggleSuperscript: () => ({ commands }) => commands.toggleMark(this.name)
    };
  }
});

export const Subscript = Mark.create({
  name: 'subscript',
  excludes: 'superscript',
  parseHTML() {
    return [{ tag: 'sub' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['sub', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      toggleSubscript: () => ({ commands }) => commands.toggleMark(this.name)
    };
  }
});

/**
 * 7. 문단 및 제목 정렬(Text Align) Extension
 */
export const TextAlign = Extension.create({
  name: 'textAlign',
  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          textAlign: {
            default: 'left',
            parseHTML: element => element.style.textAlign || element.getAttribute('align') || 'left',
            renderHTML: attributes => {
              if (!attributes.textAlign || attributes.textAlign === 'left') {
                return {};
              }
              return { style: `text-align: ${attributes.textAlign}` };
            }
          }
        }
      }
    ];
  },
  addCommands() {
    return {
      setTextAlign: alignment => ({ commands }) => {
        return ['heading', 'paragraph'].every(type =>
          commands.updateAttributes(type, { textAlign: alignment })
        );
      }
    };
  }
});

/**
 * 8. 체크리스트(TaskList & TaskItem) Nodes
 */
export const TaskList = Node.create({
  name: 'taskList',
  group: 'block list',
  content: 'taskItem+',
  parseHTML() {
    return [
      { tag: 'ul[data-type="taskList"]', priority: 51 },
      { tag: 'ul.contains-task-list', priority: 51 }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['ul', mergeAttributes(HTMLAttributes, { 'data-type': 'taskList', class: 'task-list' }), 0];
  },
  addCommands() {
    return {
      toggleTaskList: () => ({ commands }) => {
        return commands.toggleList(this.name, 'taskItem');
      }
    };
  }
});

export const TaskItem = Node.create({
  name: 'taskItem',
  content: 'paragraph block*',
  defining: true,
  addAttributes() {
    return {
      checked: {
        default: false,
        keepOnSplit: false,
        parseHTML: element => {
          const attr = element.getAttribute('data-checked');
          if (attr === 'true') return true;
          if (attr === 'false') return false;
          const input = element.querySelector('input[type="checkbox"]');
          return input ? input.checked || input.hasAttribute('checked') : false;
        },
        renderHTML: attributes => ({
          'data-checked': attributes.checked ? 'true' : 'false'
        })
      }
    };
  },
  parseHTML() {
    return [
      { tag: 'li[data-type="taskItem"]', priority: 51 },
      { tag: 'li.task-list-item', priority: 51 }
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'li',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'taskItem',
        'data-checked': node.attrs.checked ? 'true' : 'false',
        class: 'task-item'
      }),
      [
        'label',
        { class: 'task-checkbox-label', contenteditable: 'false' },
        [
          'input',
          {
            type: 'checkbox',
            ...(node.attrs.checked ? { checked: 'checked' } : {})
          }
        ]
      ],
      ['div', { class: 'task-content' }, 0]
    ];
  },
  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement('li');
      const checkboxWrapper = document.createElement('label');
      const checkbox = document.createElement('input');
      const content = document.createElement('div');

      listItem.className = 'task-item';
      listItem.dataset.type = 'taskItem';
      listItem.dataset.checked = node.attrs.checked ? 'true' : 'false';

      checkboxWrapper.className = 'task-checkbox-label';
      checkboxWrapper.contentEditable = 'false';
      checkbox.type = 'checkbox';
      checkbox.checked = !!node.attrs.checked;

      checkbox.addEventListener('change', event => {
        if (!editor.isEditable && typeof getPos !== 'function') return;
        const checked = event.target.checked;
        if (typeof getPos === 'function') {
          editor
            .chain()
            .focus(undefined, { scrollIntoView: false })
            .command(({ tr }) => {
              const pos = getPos();
              if (typeof pos !== 'number') return false;
              const currentNode = tr.doc.nodeAt(pos);
              tr.setNodeMarkup(pos, undefined, {
                ...currentNode?.attrs,
                checked
              });
              return true;
            })
            .run();
        }
      });

      content.className = 'task-content';
      checkboxWrapper.append(checkbox);
      listItem.append(checkboxWrapper, content);

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          listItem.setAttribute(key, value);
        }
      });

      return {
        dom: listItem,
        contentDOM: content,
        update: updatedNode => {
          if (updatedNode.type !== this.type) return false;
          listItem.dataset.checked = updatedNode.attrs.checked ? 'true' : 'false';
          checkbox.checked = !!updatedNode.attrs.checked;
          return true;
        }
      };
    };
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name)
    };
  }
});

/**
 * 9. 마크다운 콜아웃 / GitHub Alert 강조 박스 (NOTE, TIP, IMPORTANT, WARNING, CAUTION)
 */
export const CalloutBox = Node.create({
  name: 'calloutBox',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      kind: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-callout') || 'info',
        renderHTML: attributes => ({
          'data-callout': attributes.kind || 'info'
        })
      }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const kind = node.attrs.kind || 'info';
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-callout': kind,
        class: `callout-box callout-${kind}`
      }),
      0
    ];
  },
  addCommands() {
    return {
      insertCallout: (kind = 'info') => ({ commands }) => {
        const titles = {
          info: 'ℹ️ [참고 NOTE] 안내 및 부가 설명을 여기에 작성하세요.',
          tip: '💡 [핵심 TIP] 유용한 팁이나 노하우를 적어보세요.',
          important: '📌 [중요 IMPORTANT] 꼭 기억해야 할 핵심 사항입니다.',
          warn: '⚠️ [주의 WARNING] 실수하기 쉬운 주의 사항을 기록하세요.',
          caution: '🚨 [경고 CAUTION] 위험하거나 되돌릴 수 없는 중요 경고입니다.',
          check: '✅ [완료 CHECK] 확인 완료된 사항이나 결론을 정리하세요.'
        };
        return commands.insertContent({
          type: this.name,
          attrs: { kind },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: titles[kind] || titles.info }]
            }
          ]
        });
      }
    };
  }
});

/**
 * 10. 마크다운 접기/펼치기 토글 블록 (<details><summary>...</summary>...</details>)
 */
export const DetailsToggle = Node.create({
  name: 'detailsToggle',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      summary: {
        default: '클릭하여 상세 내용 펼치기 / 접기',
        parseHTML: element => {
          const sum = element.querySelector('summary');
          return sum?.textContent || element.getAttribute('data-summary') || '상세 내용 보기';
        },
        renderHTML: attributes => ({
          'data-summary': attributes.summary || '상세 내용 보기'
        })
      },
      open: {
        default: true,
        parseHTML: element => element.hasAttribute('open')
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: 'details',
        contentElement: element => element.querySelector('.md-details-body') || element
      }
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'details',
      mergeAttributes(HTMLAttributes, {
        class: 'md-details-toggle',
        open: node.attrs.open ? 'open' : null,
        'data-summary': node.attrs.summary
      }),
      ['summary', { class: 'md-details-summary' }, node.attrs.summary || '상세 내용 보기'],
      ['div', { class: 'md-details-body' }, 0]
    ];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const details = document.createElement('details');
      details.className = 'md-details-toggle';
      details.open = node.attrs.open !== false;
      details.setAttribute('data-summary', node.attrs.summary || '상세 내용 보기');

      const summary = document.createElement('summary');
      summary.className = 'md-details-summary';
      summary.contentEditable = 'false';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'md-details-title-text';
      titleSpan.textContent = node.attrs.summary || '클릭하여 상세 내용 펼치기 / 접기';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'md-details-edit-btn';
      editBtn.textContent = '제목 변경';
      editBtn.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        const nextTitle = window.prompt('토글 블록의 제목을 입력하세요:', node.attrs.summary || '');
        if (nextTitle !== null && typeof getPos === 'function') {
          const pos = getPos();
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              summary: nextTitle.trim() || '상세 내용 보기'
            })
          );
        }
      };

      summary.append(titleSpan, editBtn);

      const body = document.createElement('div');
      body.className = 'md-details-body';

      details.append(summary, body);

      return {
        dom: details,
        contentDOM: body,
        update: updatedNode => {
          if (updatedNode.type !== this.type) return false;
          node = updatedNode;
          details.setAttribute('data-summary', node.attrs.summary || '상세 내용 보기');
          titleSpan.textContent = node.attrs.summary || '상세 내용 보기';
          return true;
        }
      };
    };
  },
  addCommands() {
    return {
      insertDetailsToggle: (summaryText = '▶ 클릭하여 세부 내용 펼치기/접기') => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { summary: summaryText, open: true },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '여기에 접어둘 상세 설명이나 하위 내용을 자유롭게 작성하세요.' }]
            }
          ]
        });
      }
    };
  }
});

/**
 * 11. 리치 이미지(RichImage) Node
 */
export const RichImage = Node.create({
  name: 'richImage',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      width: { default: '100%' },
      align: { default: 'center' }
    };
  },
  parseHTML() {
    return [
      {
        tag: 'figure[data-rich-image]',
        getAttrs: element => {
          const img = element.querySelector('img');
          const cap = element.querySelector('figcaption');
          return {
            src: img?.getAttribute('src') || '',
            alt: cap?.textContent || img?.getAttribute('alt') || '',
            width: element.getAttribute('data-width') || img?.style?.width || '100%',
            align: element.getAttribute('data-align') || 'center'
          };
        }
      },
      {
        tag: 'img[src]',
        getAttrs: element => ({
          src: element.getAttribute('src') || '',
          alt: element.getAttribute('alt') || '',
          width: element.getAttribute('width') || element.style?.width || '100%',
          align: element.getAttribute('data-align') || 'center'
        })
      }
    ];
  },
  renderHTML({ node }) {
    const { src, alt, width, align } = node.attrs;
    return [
      'figure',
      {
        'data-rich-image': 'true',
        'data-width': width || '100%',
        'data-align': align || 'center',
        class: `rich-image-figure align-${align || 'center'}`,
        style: `text-align: ${align || 'center'};`
      },
      [
        'img',
        {
          src,
          alt: alt || '',
          style: `width: ${width || '100%'}; max-width: 100%; height: auto; border-radius: 8px;`
        }
      ],
      ...(alt ? [['figcaption', { class: 'rich-image-caption' }, alt]] : [])
    ];
  },
  addCommands() {
    return {
      insertRichImage: attrs => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs
        });
      }
    };
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement('figure');
      wrapper.className = `rich-image-figure align-${node.attrs.align || 'center'}`;
      wrapper.dataset.richImage = 'true';
      wrapper.style.textAlign = node.attrs.align || 'center';

      const container = document.createElement('div');
      container.className = 'rich-image-container';
      container.style.width = node.attrs.width || '100%';

      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.className = 'rich-image-el';

      const controls = document.createElement('div');
      controls.className = 'rich-image-controls';
      controls.contentEditable = 'false';

      const sizes = ['25%', '50%', '75%', '100%'];
      sizes.forEach(sz => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = sz;
        if ((node.attrs.width || '100%') === sz) btn.classList.add('active');
        btn.onclick = e => {
          e.stopPropagation();
          if (typeof getPos === 'function') {
            const pos = getPos();
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                width: sz
              })
            );
          }
        };
        controls.appendChild(btn);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'danger';
      delBtn.textContent = '삭제';
      delBtn.onclick = e => {
        e.stopPropagation();
        if (typeof getPos === 'function') {
          const pos = getPos();
          editor.view.dispatch(editor.view.state.tr.delete(pos, pos + node.nodeSize));
        }
      };
      controls.appendChild(delBtn);

      const caption = document.createElement('figcaption');
      caption.className = 'rich-image-caption';
      caption.textContent = node.attrs.alt || '';
      if (!node.attrs.alt) caption.style.display = 'none';

      container.append(img, controls);
      wrapper.append(container, caption);

      return {
        dom: wrapper,
        update: updatedNode => {
          if (updatedNode.type !== this.type) return false;
          node = updatedNode;
          wrapper.className = `rich-image-figure align-${node.attrs.align || 'center'}`;
          wrapper.style.textAlign = node.attrs.align || 'center';
          container.style.width = node.attrs.width || '100%';
          img.src = node.attrs.src;
          img.alt = node.attrs.alt || '';
          caption.textContent = node.attrs.alt || '';
          caption.style.display = node.attrs.alt ? 'block' : 'none';
          [...controls.querySelectorAll('button')].forEach(b => {
            b.classList.toggle('active', b.textContent === (node.attrs.width || '100%'));
          });
          return true;
        }
      };
    };
  }
});
