(function() {
  'use strict';

  // ============== 状态 ==============
  let cells = [];
  let cellCounter = 0;
  let activeCellId = null;
  let contextMenuCellId = null;

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
  const clearAllBtn = document.getElementById('clearAllBtn');
  const autocompleteList = document.getElementById('autocompleteList');
  const selectionToolbar = document.getElementById('selectionToolbar');
  const contextMenu = document.getElementById('contextMenu');
  const cellCountBadge = document.getElementById('cellCountBadge');
  const statusCellCount = document.getElementById('statusCellCount');
  const statusWords = document.getElementById('statusWords');
  const statusLines = document.getElementById('statusLines');
  const statusCursor = document.getElementById('statusCursor');
  const statusActive = document.getElementById('statusActive');

  // ============== Cell 管理 ==============

  function createCell(afterCellId, initialContent) {
    cellCounter++;
    const id = cellCounter;

    const cellDiv = document.createElement('div');
    cellDiv.className = 'cell';
    cellDiv.dataset.cellId = id;

    cellDiv.innerHTML = `
      <div class="cell-header">
        <div class="cell-header-left">
          <span class="cell-number">
            <span class="cell-status-dot"></span>
            Cell [<span class="cell-num">${id}</span>]
          </span>
          <span class="cell-meta cell-lines">0 行</span>
        </div>
        <div class="cell-header-right">
          <button class="cell-action-btn cell-run-btn" data-cell-id="${id}" title="运行 (Ctrl+Enter)">▶</button>
          <button class="cell-action-btn cell-up-btn" data-cell-id="${id}" title="上移">↑</button>
          <button class="cell-action-btn cell-down-btn" data-cell-id="${id}" title="下移">↓</button>
          <button class="cell-action-btn cell-duplicate-btn" data-cell-id="${id}" title="复制">⧉</button>
          <button class="cell-action-btn cell-delete-btn" data-cell-id="${id}" title="删除">✕</button>
        </div>
      </div>
      <textarea class="cell-editor" data-cell-id="${id}" placeholder="输入 Markdown..."></textarea>
      <div class="cell-output markdown-body" data-cell-id="${id}"></div>
    `;

    const addBtn = document.createElement('button');
    addBtn.className = 'add-cell-btn';
    addBtn.textContent = '+ 新建 Cell';
    addBtn.dataset.afterCellId = id;

    const cellData = {
      id,
      div: cellDiv,
      addBtn,
      textarea: cellDiv.querySelector('.cell-editor'),
      output: cellDiv.querySelector('.cell-output'),
      statusDot: cellDiv.querySelector('.cell-status-dot'),
      linesLabel: cellDiv.querySelector('.cell-lines'),
      lastRunContent: ''
    };
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

    if (initialContent) {
      cellData.textarea.value = initialContent;
    }

    // 事件绑定
    bindCellEvents(cellData);

    activeCellId = id;
    renumberCells();
    updateStatusbar();
    cellData.textarea.focus();

    return cellData;
  }

  function bindCellEvents(cellData) {
    const { id, textarea, div } = cellData;

    textarea.addEventListener('focus', () => {
      activeCellId = id;
      document.querySelectorAll('.cell.cell-active').forEach(c => c.classList.remove('cell-active'));
      div.classList.add('cell-active');
      updateStatusbar();
    });

    textarea.addEventListener('input', () => {
      onTextareaInput({ target: textarea });
      updateCellMeta(cellData);
      markModified(cellData);
      updateStatusbar();
    });

    textarea.addEventListener('keydown', onTextareaKeydown);
    textarea.addEventListener('keyup', () => updateStatusbar());
    textarea.addEventListener('click', () => updateStatusbar());
    textarea.addEventListener('select', () => updateSelectionToolbar({ target: textarea }));
    textarea.addEventListener('mouseup', () => updateSelectionToolbar({ target: textarea }));
    textarea.addEventListener('blur', () => {
      setTimeout(hideSelectionToolbar, 150);
      setTimeout(hideAutocomplete, 150);
    });

    div.querySelector('.cell-run-btn').addEventListener('click', () => runCell(id));
    div.querySelector('.cell-delete-btn').addEventListener('click', () => deleteCell(id));
    div.querySelector('.cell-up-btn').addEventListener('click', () => moveCell(id, -1));
    div.querySelector('.cell-down-btn').addEventListener('click', () => moveCell(id, 1));
    div.querySelector('.cell-duplicate-btn').addEventListener('click', () => duplicateCell(id));

    // 右键菜单
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      contextMenuCellId = id;
      showContextMenu(e.clientX, e.clientY);
    });

    cellData.addBtn.addEventListener('click', () => createCell(id));
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
      const newIdx = Math.min(idx, cells.length - 1);
      activeCellId = cells[newIdx].id;
      cells[newIdx].textarea.focus();
    }
    renumberCells();
    updateStatusbar();
  }

  function moveCell(id, direction) {
    const idx = cells.findIndex(c => c.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= cells.length) return;

    const cell = cells[idx];
    const other = cells[newIdx];

    // 交换 cells 数组顺序
    cells[idx] = other;
    cells[newIdx] = cell;

    // 重新排序 DOM：按 cells 数组顺序重建
    rebuildCellDOMOrder();

    renumberCells();
    cell.textarea.focus();
  }

  function rebuildCellDOMOrder() {
    // 清空 editorMain 并按新顺序重新插入
    editorMain.innerHTML = '';
    cells.forEach(cell => {
      editorMain.appendChild(cell.div);
      cell.div.after(cell.addBtn);
    });
  }

  function duplicateCell(id) {
    const cell = getCell(id);
    if (!cell) return;
    const newCell = createCell(id, cell.textarea.value);
  }

  function renumberCells() {
    cells.forEach((c, i) => {
      c.div.querySelector('.cell-num').textContent = i + 1;
    });
  }

  function updateCellMeta(cellData) {
    const lines = cellData.textarea.value.split('\n').length;
    cellData.linesLabel.textContent = `${lines} 行`;
  }

  function markModified(cellData) {
    if (cellData.lastRunContent !== '' && cellData.textarea.value !== cellData.lastRunContent) {
      cellData.statusDot.classList.remove('run');
      cellData.statusDot.classList.add('modified');
    }
  }

  function markRun(cellData) {
    cellData.statusDot.classList.remove('modified');
    cellData.statusDot.classList.add('run');
    cellData.lastRunContent = cellData.textarea.value;
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

    html = html.replace(/LATEXPROTECT_(\d+)_/g, (m, idx) => {
      return `<div class="katex-block">${blocks[parseInt(idx)]}</div>`;
    });

    outputElement.innerHTML = html;
    processImages(outputElement);
    initSliders(outputElement);

    if (window.hljs) {
      outputElement.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    }

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

    cell.div.classList.add('cell-running');
    setTimeout(() => cell.div.classList.remove('cell-running'), 600);

    renderCellMarkdown(content, cell.output);
    markRun(cell);
    activeCellId = id;
    updateStatusbar();
  }

  function runAllCells() {
    cells.forEach(c => runCell(c.id));
  }

  function runCellAndBelow(id) {
    const idx = cells.findIndex(c => c.id === id);
    if (idx === -1) return;
    for (let i = idx; i < cells.length; i++) {
      runCell(cells[i].id);
    }
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
    updateCellMeta(getCell(parseInt(textarea.dataset.cellId)));
    updateStatusbar();
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
      else if (action === 'download-all-md') downloadAllMd();
      closeAllDropdowns();
    });
  });

  // ============== 选中文字浮动工具栏 ==============

  function updateSelectionToolbar(e) {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      hideSelectionToolbar();
      return;
    }

    // 估算选区位置：基于 textarea 的位置 + 当前行偏移
    const rect = textarea.getBoundingClientRect();
    const textBeforeSelection = textarea.value.substring(0, start);
    const linesBefore = textBeforeSelection.split('\n');
    const currentLine = linesBefore.length;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 22;
    const scrollTop = textarea.scrollTop;
    const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 14;

    const y = rect.top + paddingTop + (currentLine - 1) * lineHeight - scrollTop;
    const x = rect.left + 20;

    selectionToolbar.style.top = (y - 44) + 'px';
    selectionToolbar.style.left = x + 'px';
    selectionToolbar.classList.add('visible');
  }

  function hideSelectionToolbar() {
    selectionToolbar.classList.remove('visible');
  }

  // 浮动工具栏按钮点击
  selectionToolbar.querySelectorAll('.sel-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // 防止 textarea 失焦
      const format = btn.dataset.format;
      const cell = getActiveCell();
      if (!cell) return;
      applyFormat(cell.textarea, format);
      hideSelectionToolbar();
    });
  });

  function applyFormat(textarea, format) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.substring(start, end);

    if (!selected && format !== 'h1' && format !== 'h2' && format !== 'h3' && format !== 'ul' && format !== 'quote') {
      return;
    }

    let newText = value;
    let newCursorStart = start;
    let newCursorEnd = end;

    switch (format) {
      case 'bold':
        newText = value.substring(0, start) + `**${selected}**` + value.substring(end);
        newCursorStart = start + 2;
        newCursorEnd = end + 2;
        break;
      case 'italic':
        newText = value.substring(0, start) + `*${selected}*` + value.substring(end);
        newCursorStart = start + 1;
        newCursorEnd = end + 1;
        break;
      case 'strike':
        newText = value.substring(0, start) + `~~${selected}~~` + value.substring(end);
        newCursorStart = start + 2;
        newCursorEnd = end + 2;
        break;
      case 'code':
        newText = value.substring(0, start) + `\`${selected}\`` + value.substring(end);
        newCursorStart = start + 1;
        newCursorEnd = end + 1;
        break;
      case 'link': {
        const url = prompt('输入链接 URL:', 'https://');
        if (!url) return;
        newText = value.substring(0, start) + `[${selected || '链接文字'}](${url})` + value.substring(end);
        newCursorStart = start;
        newCursorEnd = start + (selected || '链接文字').length + url.length + 4;
        break;
      }
      case 'h1':
      case 'h2':
      case 'h3': {
        const prefix = format === 'h1' ? '# ' : format === 'h2' ? '## ' : '### ';
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
        newCursorStart = start + prefix.length;
        newCursorEnd = end + prefix.length;
        break;
      }
      case 'quote': {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        newText = value.substring(0, lineStart) + '> ' + value.substring(lineStart);
        newCursorStart = start + 2;
        newCursorEnd = end + 2;
        break;
      }
      case 'ul': {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        newText = value.substring(0, lineStart) + '- ' + value.substring(lineStart);
        newCursorStart = start + 2;
        newCursorEnd = end + 2;
        break;
      }
    }

    textarea.value = newText;
    textarea.selectionStart = newCursorStart;
    textarea.selectionEnd = newCursorEnd;
    textarea.focus();
    updateCellMeta(getCell(parseInt(textarea.dataset.cellId)));
    markModified(getCell(parseInt(textarea.dataset.cellId)));
    updateStatusbar();
  }

  // ============== Cell 右键上下文菜单 ==============

  function showContextMenu(x, y) {
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.add('visible');

    // 边界检查
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      contextMenu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      contextMenu.style.top = (y - rect.height) + 'px';
    }

    // 禁用/启用菜单项
    const idx = cells.findIndex(c => c.id === contextMenuCellId);
    const moveUpItem = contextMenu.querySelector('[data-action="ctx-move-up"]');
    const moveDownItem = contextMenu.querySelector('[data-action="ctx-move-down"]');
    moveUpItem.classList.toggle('context-menu-item-disabled', idx <= 0);
    moveDownItem.classList.toggle('context-menu-item-disabled', idx >= cells.length - 1);
  }

  function hideContextMenu() {
    contextMenu.classList.remove('visible');
  }

  contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      if (item.classList.contains('context-menu-item-disabled')) return;
      const action = item.dataset.action;
      const id = contextMenuCellId;
      if (!id) return;

      switch (action) {
        case 'ctx-run': runCell(id); break;
        case 'ctx-run-below': runCellAndBelow(id); break;
        case 'ctx-insert-above': {
          const idx = cells.findIndex(c => c.id === id);
          const newCell = createCell(idx > 0 ? cells[idx - 1].id : null);
          // 如果是第一个，需要特殊处理：插入到最前面
          if (idx === 0) {
            editorMain.insertBefore(newCell.div, cells[1].div);
            editorMain.insertBefore(newCell.addBtn, cells[1].div);
          }
          renumberCells();
          break;
        }
        case 'ctx-insert-below': createCell(id); break;
        case 'ctx-move-up': moveCell(id, -1); break;
        case 'ctx-move-down': moveCell(id, 1); break;
        case 'ctx-duplicate': duplicateCell(id); break;
        case 'ctx-clear-output': {
          const cell = getCell(id);
          if (cell) {
            cell.output.innerHTML = '';
            cell.output.classList.remove('visible');
            cell.statusDot.classList.remove('run');
          }
          break;
        }
        case 'ctx-clear-content': {
          const cell = getCell(id);
          if (cell) {
            cell.textarea.value = '';
            cell.output.innerHTML = '';
            cell.output.classList.remove('visible');
            cell.statusDot.classList.remove('run', 'modified');
            updateCellMeta(cell);
            cell.textarea.focus();
          }
          break;
        }
        case 'ctx-delete': deleteCell(id); break;
      }
      hideContextMenu();
    });
  });

  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) hideContextMenu();
  });
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.cell')) hideContextMenu();
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

    const rect = textarea.getBoundingClientRect();
    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
    const linesBefore = textBeforeCursor.split('\n');
    const currentLine = linesBefore.length;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 22;
    const scrollTop = textarea.scrollTop;
    const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 14;

    autocompleteList.style.top = (rect.top + paddingTop + currentLine * lineHeight - scrollTop + 4) + 'px';
    autocompleteList.style.left = (rect.left + 16) + 'px';
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
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    const atPos = val.indexOf('@', lineStart);
    if (atPos >= 0 && atPos < pos) {
      textarea.value = val.substring(0, atPos) + item.insert + val.substring(pos);
      textarea.selectionStart = textarea.selectionEnd = atPos + item.insert.length;
    }
    hideAutocomplete();
    textarea.focus();
    updateCellMeta(getCell(parseInt(textarea.dataset.cellId)));
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

    // 格式快捷键
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyFormat(textarea, 'bold');
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyFormat(textarea, 'italic');
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        applyFormat(textarea, 'link');
        return;
      }
      if (e.key === '`') {
        e.preventDefault();
        applyFormat(textarea, 'code');
        return;
      }
    }

    // Tab: 插入空格
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      updateCellMeta(getCell(parseInt(textarea.dataset.cellId)));
    }

    // Shift+Tab: 移除行首空格
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const start = textarea.selectionStart;
      const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
      if (textarea.value.substring(lineStart, lineStart + 2) === '  ') {
        textarea.value = textarea.value.substring(0, lineStart) + textarea.value.substring(lineStart + 2);
        textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 2);
        updateCellMeta(getCell(parseInt(textarea.dataset.cellId)));
      }
    }
  }

  // ============== 状态栏 ==============

  function updateStatusbar() {
    // Cell 数量
    statusCellCount.textContent = `${cells.length} Cell`;
    cellCountBadge.textContent = `${cells.length} Cell`;

    // 活跃 Cell
    if (activeCellId) {
      const idx = cells.findIndex(c => c.id === activeCellId);
      statusActive.textContent = `活跃: Cell ${idx + 1}`;
    } else {
      statusActive.textContent = '无活跃 Cell';
    }

    // 字数与行数（全部 Cell 汇总）
    let totalWords = 0;
    let totalLines = 0;
    cells.forEach(c => {
      const val = c.textarea.value;
      totalLines += val.split('\n').length;
      // 中文字数 + 英文单词数
      const chineseChars = val.match(/[\u4e00-\u9fa5]/g) || [];
      const englishWords = val.match(/[a-zA-Z]+/g) || [];
      totalWords += chineseChars.length + englishWords.length;
    });
    statusWords.textContent = `${totalWords} 字`;
    statusLines.textContent = `${totalLines} 行`;

    // 光标位置
    const cell = getActiveCell();
    if (cell) {
      const pos = cell.textarea.selectionStart;
      const before = cell.textarea.value.substring(0, pos);
      const lines = before.split('\n');
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      statusCursor.textContent = `行 ${line}, 列 ${col}`;
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
    const idx = cells.findIndex(c => c.id === activeCellId) + 1;
    downloadBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), `cell-${idx}.md`);
  }

  function downloadCurrentHtml() {
    const cell = getActiveCell();
    if (!cell) return;
    const html = cell.output.innerHTML;
    if (!html.trim()) { alert('请先运行当前 Cell'); return; }
    const idx = cells.findIndex(c => c.id === activeCellId) + 1;
    const fullHtml = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Cell ${idx}</title><link rel="stylesheet" href="iris/styles.css"><link rel="stylesheet" href="iris/css/galleries.css"><link rel="stylesheet" href="iris/vendor/highlight.js/styles/github.css"><link rel="stylesheet" href="iris/vendor/katex/katex.min.css"></head><body><article class="markdown-body" style="max-width:800px;margin:40px auto;padding:0 20px;">${html}</article></body></html>`;
    downloadBlob(new Blob([fullHtml], { type: 'text/html;charset=utf-8' }), `cell-${idx}.html`);
  }

  function downloadCurrentPdf() {
    const cell = getActiveCell();
    if (!cell) return;
    const html = cell.output.innerHTML;
    if (!html.trim()) { alert('请先运行当前 Cell'); return; }
    const idx = cells.findIndex(c => c.id === activeCellId) + 1;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cell ${idx}</title><link rel="stylesheet" href="iris/styles.css"><link rel="stylesheet" href="iris/css/galleries.css"><link rel="stylesheet" href="iris/vendor/highlight.js/styles/github.css"><link rel="stylesheet" href="iris/vendor/katex/katex.min.css"><style>@media print{body{margin:0;}}</style></head><body><article class="markdown-body" style="max-width:800px;margin:20px auto;padding:0 20px;">${html}</article></body></html>`);
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

  function downloadAllMd() {
    const content = cells.map(c => c.textarea.value).join('\n\n---\n\n');
    downloadBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), 'all-cells.md');
  }

  // ============== 清空所有 Cell ==============

  clearAllBtn?.addEventListener('click', () => {
    if (!confirm('确定清空所有 Cell 内容吗？此操作不可撤销。')) return;
    cells.forEach(c => {
      c.textarea.value = '';
      c.output.innerHTML = '';
      c.output.classList.remove('visible');
      c.statusDot.classList.remove('run', 'modified');
      c.lastRunContent = '';
      updateCellMeta(c);
    });
    updateStatusbar();
    cells[0]?.textarea.focus();
  });

  // ============== 事件绑定 ==============

  runCurrentBtn.addEventListener('click', () => {
    if (activeCellId) runCell(activeCellId);
  });

  runAllBtn.addEventListener('click', runAllCells);

  // 全局键盘快捷键
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey && !e.target.classList.contains('cell-editor')) {
      e.preventDefault();
      if (activeCellId) runCell(activeCellId);
    }
    if (e.key === 'Escape') {
      hideContextMenu();
      hideAutocomplete();
      hideSelectionToolbar();
    }
  });

  // 滚动时隐藏浮动工具栏（位置会错位）
  window.addEventListener('scroll', hideSelectionToolbar, true);

  // ============== 初始化 ==============

  createCell();

})();
