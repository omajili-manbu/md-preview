(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  
  const { dom, state, CONFIG } = window.MarkdownPreview;
  
  async function loadMarkdownFile(path) {
    try {
      // 立即更新 URL，提供即时反馈
      const { router } = window.MarkdownPreview;
      if (router && router.updateHash) {
        router.updateHash(path);
      }
      
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
      updateBreadcrumbs(path);
      setupHeadingNavigation();
    } catch (error) {
      console.error('Error loading markdown:', error);
      dom.markdownContent.innerHTML = '<div class="welcome-state"><p class="welcome-text">无法加载文件</p></div>';
      setTimeout(() => window.MarkdownPreview.ui.updateProgress(0), 300);
    }
  }
  
  function parseFrontmatter(markdown) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*/;
    const match = markdown.match(frontmatterRegex);
    
    if (!match) {
      return { frontmatter: {}, content: markdown };
    }
    
    const frontmatterStr = match[1];
    const content = markdown.substring(match[0].length);
    
    const frontmatter = {};
    const lines = frontmatterStr.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        let value = trimmed.substring(colonIndex + 1).trim();
        
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        frontmatter[key] = value;
      }
    }
    
    return { frontmatter, content };
  }
  
  function renderMarkdown(markdown, currentPath = '') {
    const { frontmatter, content } = parseFrontmatter(markdown);
    
    if (frontmatter.title) {
      document.title = frontmatter.title + ' | ' + (CONFIG.repo || 'Markdown Preview');
    } else {
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        document.title = titleMatch[1] + ' | ' + (CONFIG.repo || 'Markdown Preview');
      } else {
        document.title = CONFIG.repo || 'Markdown Preview';
      }
    }
    
    state.currentFrontmatter = frontmatter;
    
    const html = marked.parse(content, {
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
    
    loadGiscus(currentPath);
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
      dom.editPageBtn.style.display = 'none';
      return;
    }
    
    dom.pageHeader.style.display = 'flex';
    dom.editPageBtn.style.display = 'flex';
    
    const editUrl = `https://github.com/${CONFIG.owner}/${CONFIG.repo}/edit/main/${path}`;
    dom.editPageBtn.href = editUrl;
  }
  
  function updateBreadcrumbs(path) {
    if (!dom.pageBreadcrumbs) return;
    
    dom.pageBreadcrumbs.innerHTML = '';
    
    if (!path) return;
    
    const parts = path.split('/');
    
    const rootCrumb = document.createElement('span');
    rootCrumb.className = 'breadcrumb-item';
    rootCrumb.textContent = CONFIG.repo || 'Docs';
    rootCrumb.style.cursor = 'pointer';
    rootCrumb.style.color = 'var(--color-accent-purple-deep)';
    rootCrumb.addEventListener('click', () => {
      dom.markdownContent.innerHTML = '<div class="welcome-state"><p class="welcome-text">选择一个文件开始阅读</p></div>';
      state.currentFilePath = '';
      window.history.replaceState(null, '', window.location.pathname);
      dom.pageHeader.style.display = 'none';
    });
    dom.pageBreadcrumbs.appendChild(rootCrumb);
    
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      
      const separator = document.createElement('span');
      separator.textContent = '/';
      separator.style.margin = '0 4px';
      separator.style.color = 'var(--color-text-muted)';
      dom.pageBreadcrumbs.appendChild(separator);
      
      currentPath = currentPath ? currentPath + '/' + part : part;
      
      const crumb = document.createElement('span');
      crumb.className = 'breadcrumb-item';
      
      if (i === parts.length - 1) {
        crumb.textContent = part.replace('.md', '');
        crumb.style.color = 'var(--color-text)';
        crumb.style.fontWeight = '500';
      } else {
        crumb.textContent = part;
        crumb.style.color = 'var(--color-accent-purple-deep)';
        crumb.style.cursor = 'pointer';
      }
      
      dom.pageBreadcrumbs.appendChild(crumb);
    }
  }
  
  function setupHeadingNavigation() {
    if (!dom.markdownContent) return;
    
    const oldHeadings = dom.markdownContent.querySelectorAll('.heading-clickable');
    oldHeadings.forEach(h => {
      h.classList.remove('heading-clickable');
      h.style.cursor = '';
    });
    
    const headings = dom.markdownContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      heading.classList.add('heading-clickable');
      heading.style.cursor = 'pointer';
      heading.style.position = 'relative';
      
      heading.addEventListener('mouseenter', () => {
        heading.style.borderLeft = '3px solid var(--color-accent-purple)';
        heading.style.paddingLeft = '8px';
        heading.style.marginLeft = '-11px';
      });
      
      heading.addEventListener('mouseleave', () => {
        heading.style.borderLeft = '';
        heading.style.paddingLeft = '';
        heading.style.marginLeft = '';
      });
      
      heading.addEventListener('click', () => {
        const id = heading.id;
        if (id) {
          window.location.hash = '#' + id;
          
          const indexItems = dom.indexTree.querySelectorAll('.index-item');
          indexItems.forEach(item => {
            if (item.dataset.id === id) {
              setActiveIndexItem(item);
            }
          });
        }
      });
    });
  }
  
  function loadGiscus(path) {
    if (!dom.giscusContainer || !dom.commentsSection) return;
    
    const giscusConfig = CONFIG.giscus;
    
    if (!giscusConfig || !giscusConfig.enabled || !giscusConfig.repo) {
      dom.commentsSection.style.display = 'none';
      return;
    }
    
    if (!path) {
      dom.commentsSection.style.display = 'none';
      return;
    }
    
    dom.commentsSection.style.display = 'block';
    
    dom.giscusContainer.innerHTML = '';
    
    if (window.giscus) {
      window.giscus.destroy?.();
    }
    
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', giscusConfig.repo);
    script.setAttribute('data-repo-id', giscusConfig.repoId);
    script.setAttribute('data-category', giscusConfig.category);
    script.setAttribute('data-category-id', giscusConfig.categoryId);
    script.setAttribute('data-mapping', giscusConfig.mapping);
    script.setAttribute('data-strict', giscusConfig.strict);
    script.setAttribute('data-reactions-enabled', giscusConfig.reactionsEnabled);
    script.setAttribute('data-emit-metadata', giscusConfig.emitMetadata);
    script.setAttribute('data-input-position', giscusConfig.inputPosition);
    script.setAttribute('data-theme', giscusConfig.theme);
    script.setAttribute('data-lang', giscusConfig.lang);
    script.setAttribute('data-loading', giscusConfig.loading);
    script.setAttribute('data-term', path);
    script.crossOrigin = 'anonymous';
    script.async = true;
    
    dom.giscusContainer.appendChild(script);
  }
  
  window.MarkdownPreview.markdown = {
    loadMarkdownFile,
    renderMarkdown,
    interceptLinks,
    simplifyPath,
    extractAndRenderIndex,
    renderIndex,
    setActiveIndexItem,
    updateEditButton,
    parseFrontmatter,
    updateBreadcrumbs,
    setupHeadingNavigation,
    loadGiscus
  };
})();
