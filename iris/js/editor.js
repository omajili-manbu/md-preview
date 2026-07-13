(function() {
  'use strict';

  // ============== 状态 ==============
  let cells = [];
  let cellCounter = 0;
  let activeCellId = null;

  // ============== 画廊样式注册 ==============
  const knownStyles = ['grid', 'cardstack', 'filmstrip', 'polaroid', 'stack', 'mosaic', 'scattered', 'hexagon', 'coverflow', 'tape', 'duotone', 'frame', 'arch', 'masonry', 'slider', 'ticket', 'panorama'];

  // 自动补全条目
  const autocompleteItems = [
    { label: '@grid', desc: '默认网格', insert: '@grid\n' },
    { label: '@cardstack', desc: '扑克牌堆', insert: '@cardstack\n' },
    { label: '@filmstrip', desc: '胶片条', insert: '@filmstrip\n' },
    { label: '@polaroid', desc: '拍立得墙', insert: '@polaroid\n' },
    { label: '@stack', desc: '堆叠覆盖', insert: '@stack\n' },
    { label: '@mosaic', desc: '马赛克', insert: '@mosaic\n' },
    { label: '@scattered', desc: '散落明信片', insert: '@scattered\n' },
    { label: '@hexagon', desc: '蜂巢六边形', insert: '@hexagon\n' },
    { label: '@coverflow', desc: 'Cover Flow', insert: '@coverflow\n' },
    { label: '@tape', desc: '软木板留言墙', insert: '@tape\n' },
    { label: '@duotone', desc: '双色调', insert: '@duotone\n' },
    { label: '@frame', desc: '画框装裱', insert: '@frame\n' },
    { label: '@arch', desc: '拱形画廊', insert: '@arch\n' },
    { label: '@masonry', desc: '瀑布流', insert: '@masonry\n' },
    { label: '@slider', desc: '幻灯片', insert: '@slider\n' },
    { label: '@ticket', desc: '票根', insert: '@ticket\n' },
    { label: '@panorama', desc: '全景横幅', insert: '@panorama\n' },
  ];

  // ============== DOM 引用 ==============
  const editorMain = document.getElementById('editorMain');
  const runCurrentBtn = document.getElementById('runCurrentBtn');
  const runAllBtn = document.getElementById('runAllBtn');
  const autocompleteList = document.getElementById('autocompleteList');

  // ============== Cell 管理 ==============

  function createCell(afterCellId) {
    cellCounter++;
    const id = cellCounter;

    const cellDiv = document.createElement('div');
    cellDiv.className = 'cell';
    cellDiv.dataset.cellId = id;

    cellDiv.innerHTML = `
      <div class="cell-header">
        <div class="cell-header-left">
          <span class="cell-number">Cell [${id}]</span>
          <button class="cell-run-btn" data-cell-id="${id}">▶ 运行</button>
        </div>
        <button class="cell-delete-btn" data-cell-id="${id}">✕</button>
      </div>
      <textarea class="cell-editor" data-cell-id="${id}" placeholder="输入 Markdown..."></textarea>
      <div class="cell-output markdown-body" data-cell-id="${id}"></div>
    `;

    const addBtn = document.createElement('button');
    addBtn.className = 'add-cell-btn';
    addBtn.textContent = '+ 新建 Cell';
    addBtn.dataset.afterCellId = id;

    const cellData = { id, div: cellDiv, addBtn, textarea: cellDiv.querySelector('.cell-editor'), output: cellDiv.querySelector('.cell-output') };
    cells.push(cellData);

    // 插入到 DOM
    if (afterCellId) {
      const afterCell = getCell(afterCellId);
      if (afterCell) {
        afterCell.addBtn.after(cellDiv);
        cellDiv.after(addBtn);
      }
    } else {
      editorMain.appendChild(cellDiv);
      cellDiv.after(addBtn);
    }

    // 事件绑定
    cellData.textarea.addEventListener('focus', () => { activeCellId = id; });
    cellData.textarea.addEventListener('input', onTextareaInput);
    cellData.textarea.addEventListener('keydown', onTextareaKeydown);
    cellData.textarea.addEventListener('blur', hideAutocomplete);
    cellDiv.querySelector('.cell-run-btn').addEventListener('click', () => runCell(id));
    cellDiv.querySelector('.cell-delete-btn').addEventListener('click', () => deleteCell(id));
    addBtn.addEventListener('click', () => createCell(id));

    activeCellId = id;
    renumberCells();
    cellData.textarea.focus();

    return cellData;
  }

  function getCell(id) {
    return cells.find(c => c.id === id);
  }

  function getActiveCell() {
    return getCell(activeCellId);
  }

  function deleteCell(id) {
    if (cells.length <= 1) return;
    const idx = cells.findIndex(c => c.id === id);
    if (idx === -1) return;
    const cell = cells[idx];
    cell.div.remove();
    cell.addBtn.remove();
    cells.splice(idx, 1);
    if (activeCellId === id) {
      activeCellId = cells[Math.min(idx, cells.length - 1)].id;
    }
    renumberCells();
  }

  function renumberCells() {
    cells.forEach((c, i) => {
      c.div.querySelector('.cell-number').textContent = `Cell [${i + 1}]`;
    });
  }

  // ============== Markdown 渲染 ==============

  function processGitHubAlerts(text) {
    const alertTypes = { NOTE: 'ℹ️', IMPORTANT: '💡', WARNING: '⚠️', TIP: '💡', CAUTION: '⚠️' };
    const lines = text.split('\n');
    let result = '';
    let i = 0;
    while (i < lines.length) {
      const m = lines[i].match(/^> \[!([A-Z]+)\](.*)$/);
      if (m && alertTypes[m[1]]) {
        const icon = alertTypes[m[1]];
        const title = m[1].charAt(0) + m[1].slice(1).toLowerCase();
        const contentLines = [];
        i++;
        while (i < lines.length && (lines[i].startsWith('> ') || lines[i].trim() === '')) {
          contentLines.push(lines[i].trim() === '' ? '' : lines[i].substring(2));
          i++;
        }
        const parsedContent = marked.parse(contentLines.join('\n').trim(), { breaks: true, gfm: true });
        result += `<div class="alert alert-${m[1].toLowerCase()}"><div class="alert-header"><span class="alert-icon">${icon}</span><span class="alert-title">${title}</span></div><div class="alert-content">${parsedContent}</div></div>\n`;
      } else {
        result += lines[i] + '\n';
        i++;
      }
    }
    return result;
  }

  function protectLaTeXBlocks(text) {
    const blocks = [];
    const processed = text.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
      const idx = blocks.length;
      const cleaned = match.split('\n').map((l, i, a) => {
        if (i === 0) return l.replace(/^\$\$\s*/, '');
        if (i === a.length - 1) return l.replace(/\s*\$\$$/, '');
        return l.replace(/^    /, '');
      }).join('\n').trim();
      blocks.push(cleaned);
      return `LATEXPROTECT_${idx}_`;
    });
    return { processed, blocks };
  }

  function createRenderer() {
    const renderer = new marked.Renderer();
    renderer.code = function({ text, lang }) {
      const language = lang || '';
      const languageClass = language ? ` class="language-${language}"` : '';
      const langLabel = language ? `<span class="code-lang-label">${language}</span>` : '';
      return `<pre class="code-block"${language ? ` data-lang="${language}"` : ''}><button class="copy-btn" aria-label="复制代码"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>${langLabel}<code${languageClass}>${text}</code></pre>`;
    };
    renderer.paragraph = function(token) {
      const trimmed = (token && token.text ? token.text : '').trim();
      const markerMatch = trimmed.match(/^@([a-zA-Z][\w-]*)(\s.*)?$/);
      if (markerMatch && knownStyles.includes(markerMatch[1].toLowerCase())) {
        return `<p class="gallery-style-marker" data-style="${markerMatch[1].toLowerCase()}"></p>`;
      }
      return `<p>${this.parser.parseInline(token.tokens)}</p>`;
    };
    return renderer;
  }

  function processImages(container) {
    const images = container.querySelectorAll('img');
    if (images.length < 2) return;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = container.innerHTML;
    const allElements = Array.from(tempDiv.childNodes);
    const galleryGroups = [];
    let currentGroup = [];
    let pendingStyle = null;
    const markersToRemove = [];

    allElements.forEach((node, index) => {
      if (node.nodeName === 'P') {
        if (node.classList && node.classList.contains('gallery-style-marker')) {
          if (currentGroup.length >= 2) galleryGroups.push({ imgs: [...currentGroup], style: pendingStyle });
          currentGroup = [];
          pendingStyle = node.getAttribute('data-style') || null;
          markersToRemove.push(node);
          return;
        }
        const imgs = node.querySelectorAll('img');
        if (imgs.length > 0 && node.textContent.trim() === '') {
          currentGroup.push(...Array.from(imgs));
          const nextNode = allElements[index + 1];
          if (!nextNode || nextNode.nodeName !== 'P' || nextNode.querySelectorAll('img').length === 0) {
            if (currentGroup.length >= 2) galleryGroups.push({ imgs: [...currentGroup], style: pendingStyle });
            currentGroup = [];
            pendingStyle = null;
          }
        } else {
          if (currentGroup.length >= 2) galleryGroups.push({ imgs: [...currentGroup], style: pendingStyle });
          currentGroup = [];
          pendingStyle = null;
        }
      } else {
        if (currentGroup.length >= 2) galleryGroups.push({ imgs: [...currentGroup], style: pendingStyle });
        currentGroup = [];
        pendingStyle = null;
      }
    });

    if (currentGroup.length >= 2) galleryGroups.push({ imgs: [...currentGroup], style: pendingStyle });
    markersToRemove.forEach(n => n.remove());

    galleryGroups.forEach(group => {
      if (group.imgs.length < 2) return;
      const firstImg = group.imgs[0];
      const parentP = firstImg.closest('p');
      if (!parentP) return;
      const galleryDiv = document.createElement('div');
      galleryDiv.className = 'image-gallery';
      if (group.style) galleryDiv.classList.add(`image-gallery--${group.style}`);
      group.imgs.forEach(img => galleryDiv.appendChild(img.cloneNode(true)));
      parentP.replaceWith(galleryDiv);
    });

    container.innerHTML = tempDiv.innerHTML;
  }

  function initSliders(container) {
    container.querySelectorAll('.image-gallery--slider').forEach(slider => {
      const imgs = Array.from(slider.querySelectorAll('img'));
      if (imgs.length < 2) return;
      const track = document.createElement('div');
      track.className = 'slider-track';
      imgs.forEach(img => track.appendChild(img));
      slider.appendChild(track);
      const dots = document.createElement('div');
      dots.className = 'slider-dots';
      imgs.forEach((_, i) => {
        const dot = document.createElement('span');
        if (i === 0) dot.classList.add('active');
        dots.appendChild(dot);
      });
      slider.appendChild(dots);
      const count = imgs.length;
      let index = 0;
      let timer = null;
      function go(i) {
        index = ((i % count) + count) % count;
        track.style.transform = `translateX(-${index * 100}%)`;
        dots.querySelectorAll('span').forEach((d, di) => d.classList.toggle('active', di === index));
      }
      function start() { stop(); timer = setInterval(() => go(index + 1), 4000); }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      slider.addEventListener('mouseenter', stop);
      slider.addEventListener('mouseleave', start);
      start();
    });
  }

  function renderCellMarkdown(content, outputElement) {
    const { processed, blocks } = protectLaTeXBlocks(content);
    const alertProcessed = processGitHubAlerts(processed);
    const renderer = createRenderer();
    let html = marked.parse(alertProcessed, { breaks: true, gfm: true, renderer });

    // 恢复 LaTeX
    html = html.replace(/LATEXPROTECT_(\d+)_/g, (m, idx) => {
      return `<div class="katex-block">${blocks[parseInt(idx)]}</div>`;
    });

    outputElement.innerHTML = html;
    processImages(outputElement);
    initSliders(outputElement);

    // 代码高亮
    if (window.hljs) {
      outputElement.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    }

    // 插件渲染
    setTimeout(() => {
      try {
        const renderers = window.MarkdownPreview?.renderers;
        if (renderers) {
          if (renderers.mermaid?.render) renderers.mermaid.render();
          if (renderers.apexcharts?.render) renderers.apexcharts.render();
          if (renderers.diff?.render) renderers.diff.render();
          if (renderers.katex?.render) renderers.katex.render();
          if (renderers.plantuml?.render) renderers.plantuml.render();
          if (renderers.embedded?.render) renderers.embedded.render();
        }
      } catch (e) { console.warn('[Editor] Plugin render error:', e); }
    }, 200);

    outputElement.classList.add('visible');
  }

  // ============== 运行 Cell ==============

  function runCell(id) {
    const cell = getCell(id);
    if (!cell) return;
    const content = cell.textarea.value;
    if (!content.trim()) return;
    renderCellMarkdown(content, cell.output);
    activeCellId = id;
  }

  function runAllCells() {
    cells.forEach(c => runCell(c.id));
  }

  // ============== 工具栏快速插入 ==============

  function insertAtCursor(textarea, text, cursorOffset) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    const newPos = start + text.length + (cursorOffset || 0);
    textarea.selectionStart = textarea.selectionEnd = newPos;
    textarea.focus();
  }

  // ============== 下拉菜单管理 ==============

  function closeAllDropdowns() {
    document.querySelectorAll('.toolbar-dropdown').forEach(d => d.classList.remove('open'));
  }

  document.querySelectorAll('.toolbar-dropdown').forEach(dropdown => {
    const btn = dropdown.querySelector('.toolbar-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = dropdown.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) dropdown.classList.add('open');
    });
  });

  document.addEventListener('click', closeAllDropdowns);

  // 快速插入按钮点击
  document.querySelectorAll('.dropdown-item[data-insert]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const cell = getActiveCell();
      if (!cell) return;
      const text = item.dataset.insert.replace(/\\n/g, '\n');
      const cursorOffset = item.dataset.cursor ? parseInt(item.dataset.cursor) : 0;
      insertAtCursor(cell.textarea, text, cursorOffset);
      closeAllDropdowns();
    });
  });

  // 下载按钮点击
  document.querySelectorAll('.dropdown-item[data-action]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      if (action === 'download-md') downloadCurrentMd();
      else if (action === 'download-html') downloadCurrentHtml();
      else if (action === 'download-pdf') downloadCurrentPdf();
      else if (action === 'download-notebook') downloadNotebook();
      closeAllDropdowns();
    });
  });

  // ============== 自动补全 ==============

  let acIndex = -1;
  let acVisible = false;

  function showAutocomplete(textarea, filter) {
    const filtered = filter
      ? autocompleteItems.filter(it => it.label.toLowerCase().includes(filter.toLowerCase()))
      : autocompleteItems;
    if (filtered.length === 0) { hideAutocomplete(); return; }

    autocompleteList.innerHTML = '';
    filtered.forEach((it, i) => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item' + (i === 0 ? ' active' : '');
      div.innerHTML = `<span class="autocomplete-item-label">${it.label}</span><span class="autocomplete-item-desc">${it.desc}</span>`;
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        applyAutocomplete(textarea, it);
      });
      autocompleteList.appendChild(div);
    });

    // 定位：在 textarea 下方
    const rect = textarea.getBoundingClientRect();
    autocompleteList.style.top = (rect.bottom + 4) + 'px';
    autocompleteList.style.left = rect.left + 'px';
    autocompleteList.classList.add('visible');
    acIndex = 0;
    acVisible = true;
  }

  function hideAutocomplete() {
    autocompleteList.classList.remove('visible');
    acVisible = false;
    acIndex = -1;
  }

  function applyAutocomplete(textarea, item) {
    const val = textarea.value;
    const pos = textarea.selectionStart;
    // 找到当前行中 @ 的位置
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    const atPos = val.indexOf('@', lineStart);
    if (atPos >= 0 && atPos < pos) {
      textarea.value = val.substring(0, atPos) + item.insert + val.substring(pos);
      textarea.selectionStart = textarea.selectionEnd = atPos + item.insert.length;
    }
    hideAutocomplete();
    textarea.focus();
  }

  function onTextareaInput(e) {
    const textarea = e.target;
    const val = textarea.value;
    const pos = textarea.selectionStart;
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    const lineBeforeCursor = val.substring(lineStart, pos);

    if (lineBeforeCursor.match(/^@\w*$/)) {
      const filter = lineBeforeCursor.substring(1);
      showAutocomplete(textarea, filter);
    } else {
      hideAutocomplete();
    }
  }

  // ============== 键盘快捷键 ==============

  function onTextareaKeydown(e) {
    const textarea = e.target;

    // 自动补全导航
    if (acVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const items = autocompleteList.querySelectorAll('.autocomplete-item');
        items[acIndex]?.classList.remove('active');
        acIndex = (acIndex + 1) % items.length;
        items[acIndex]?.classList.add('active');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const items = autocompleteList.querySelectorAll('.autocomplete-item');
        items[acIndex]?.classList.remove('active');
        acIndex = (acIndex - 1 + items.length) % items.length;
        items[acIndex]?.classList.add('active');
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const items = autocompleteList.querySelectorAll('.autocomplete-item');
        if (items[acIndex]) {
          const label = items[acIndex].querySelector('.autocomplete-item-label').textContent;
          const item = autocompleteItems.find(it => it.label === label);
          if (item) applyAutocomplete(textarea, item);
        }
        return;
      }
      if (e.key === 'Escape') {
        hideAutocomplete();
        return;
      }
    }

    // Ctrl/Cmd + Enter: 运行当前 cell
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cellId = parseInt(textarea.dataset.cellId);
      runCell(cellId);
      return;
    }

    // Ctrl/Cmd + Shift + Enter: 运行全部
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      runAllCells();
      return;
    }

    // Tab: 插入空格
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    }

    // Shift+Tab: 移除行首空格
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const start = textarea.selectionStart;
      const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
      if (textarea.value.substring(lineStart, lineStart + 2) === '  ') {
        textarea.value = textarea.value.substring(0, lineStart) + textarea.value.substring(lineStart + 2);
        textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 2);
      }
    }
  }

  // ============== 下载功能 ==============

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadCurrentMd() {
    const cell = getActiveCell();
    if (!cell) return;
    const content = cell.textarea.value;
    if (!content.trim()) { alert('当前 Cell 为空'); return; }
    downloadBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), `cell-${cell.id}.md`);
  }

  function downloadCurrentHtml() {
    const cell = getActiveCell();
    if (!cell) return;
    const html = cell.output.innerHTML;
    if (!html.trim()) { alert('请先运行当前 Cell'); return; }
    const fullHtml = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Cell ${cell.id}</title><link rel="stylesheet" href="iris/styles.css"><link rel="stylesheet" href="iris/vendor/highlight.js/styles/github.css"><link rel="stylesheet" href="iris/vendor/katex/katex.min.css"></head><body><article class="markdown-body" style="max-width:800px;margin:40px auto;padding:0 20px;">${html}</article></body></html>`;
    downloadBlob(new Blob([fullHtml], { type: 'text/html;charset=utf-8' }), `cell-${cell.id}.html`);
  }

  function downloadCurrentPdf() {
    const cell = getActiveCell();
    if (!cell) return;
    const html = cell.output.innerHTML;
    if (!html.trim()) { alert('请先运行当前 Cell'); return; }
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="iris/styles.css"><link rel="stylesheet" href="iris/vendor/highlight.js/styles/github.css"><link rel="stylesheet" href="iris/vendor/katex/katex.min.css"><style>@media print{body{margin:0;}}</style></head><body><article class="markdown-body" style="max-width:800px;margin:20px auto;padding:0 20px;">${html}</article></body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  }

  function downloadNotebook() {
    const data = {
      version: 1,
      type: 'mdnb',
      created: new Date().toISOString(),
      cells: cells.map(c => ({
        id: c.id,
        content: c.textarea.value,
        output_html: c.output.classList.contains('visible') ? c.output.innerHTML : ''
      }))
    };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), 'notebook.mdnb');
  }

  // ============== 事件绑定 ==============

  runCurrentBtn.addEventListener('click', () => {
    if (activeCellId) runCell(activeCellId);
  });

  runAllBtn.addEventListener('click', runAllCells);

  // 全局键盘快捷键
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeCellId) runCell(activeCellId);
    }
  });

  // ============== 初始化 ==============

  createCell();

})();
