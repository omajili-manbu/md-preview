(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  
  const { dom, state, CONFIG } = window.MarkdownPreview;
  
  async function loadMarkdownFile(path) {
    try {
      window.MarkdownPreview.ui.updateProgress(30);
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error('Failed to load markdown file');
      }
      window.MarkdownPreview.ui.updateProgress(60);
      const markdown = await response.text();
      window.MarkdownPreview.ui.updateProgress(100);
      state.currentFilePath = path;
      renderMarkdown(markdown, path);
      extractAndRenderIndex(markdown);
      updateEditButton(path);
    } catch (error) {
      console.error('Error loading markdown:', error);
      dom.markdownContent.innerHTML = '<div class="welcome-state"><p class="welcome-text">无法加载文件</p></div>';
      setTimeout(() => window.MarkdownPreview.ui.updateProgress(0), 300);
    }
  }
  
  function renderMarkdown(markdown, currentPath = '') {
    const html = marked.parse(markdown, {
      breaks: true,
      gfm: true
    });
    dom.markdownContent.innerHTML = html;
    
    document.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6').forEach(heading => {
      const text = heading.textContent;
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
      heading.id = id;
    });
    
    document.querySelectorAll('.markdown-body pre').forEach(pre => {
      pre.addEventListener('click', () => {
        window.MarkdownPreview.ui.copyCodeToClipboard(pre);
      });
    });
    
    interceptLinks(currentPath);
    
    setTimeout(() => {
      window.MarkdownPreview.renderers.apexcharts.render();
      window.MarkdownPreview.renderers.musicNotation.render();
      window.MarkdownPreview.renderers.diff.render();
      window.MarkdownPreview.renderers.mermaid.render();
      window.MarkdownPreview.renderers.plantuml.render();
      window.MarkdownPreview.renderers.embedded.render();
    }, 100);
  }
  
  function interceptLinks(currentPath) {
    document.querySelectorAll('.markdown-body a').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        if (href.endsWith('.md')) {
          e.preventDefault();
          
          let targetPath = href;
          if (!href.startsWith('/') && currentPath) {
            const currentDir = currentPath.split('/').slice(0, -1).join('/');
            targetPath = currentDir ? `${currentDir}/${href}` : href;
            targetPath = simplifyPath(targetPath);
          }
          
          if (targetPath.startsWith('/')) {
            targetPath = targetPath.substring(1);
          }
          
          loadMarkdownFile(targetPath);
          window.MarkdownPreview.fileTree.highlightFileInSidebar(targetPath);
        }
      });
    });
  }
  
  function simplifyPath(path) {
    const parts = path.split('/');
    const result = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === '..') {
        result.pop();
      } else if (part !== '.' && part !== '') {
        result.push(part);
      }
    }
    return result.join('/');
  }
  
  function extractAndRenderIndex(markdown) {
    state.currentHeadings = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
      state.currentHeadings.push({ level, text, id });
    }
    
    renderIndex();
  }
  
  function renderIndex() {
    dom.indexTree.innerHTML = '';
    
    if (state.currentHeadings.length === 0) {
      dom.indexTree.innerHTML = '<div class="index-item" style="color: var(--color-text-muted);">当前文件无目录</div>';
      return;
    }
    
    state.currentHeadings.forEach((heading, index) => {
      const item = document.createElement('a');
      item.className = 'index-item';
      item.href = '#' + heading.id;
      item.textContent = heading.text;
      item.style.paddingLeft = (20 + (heading.level - 1) * 16) + 'px';
      item.dataset.id = heading.id;
      
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(heading.id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setActiveIndexItem(item);
      });
      
      dom.indexTree.appendChild(item);
    });
  }
  
  function setActiveIndexItem(item) {
    document.querySelectorAll('.index-item.active').forEach(el => {
      el.classList.remove('active');
    });
    item.classList.add('active');
  }
  
  function updateEditButton(path) {
    if (!dom.editPageBtn || !dom.pageHeader) return;
    
    if (!path) {
      dom.pageHeader.style.display = 'none';
      return;
    }
    
    dom.pageHeader.style.display = 'flex';
    
    // GitHub 编辑链接格式
    // https://github.com/[owner]/[repo]/edit/[branch]/[path]
    const editUrl = `https://github.com/${CONFIG.owner}/${CONFIG.repo}/edit/main/${path}`;
    dom.editPageBtn.href = editUrl;
  }
  
  window.MarkdownPreview.markdown = {
    loadMarkdownFile,
    renderMarkdown,
    interceptLinks,
    simplifyPath,
    extractAndRenderIndex,
    renderIndex,
    setActiveIndexItem,
    updateEditButton
  };
})();
