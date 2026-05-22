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
  
  function calculateReadingTime(text) {
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    const englishCount = englishWords.reduce((sum, word) => sum + word.length, 0);
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const chineseCount = chineseChars.length;
    
    const englishMinutes = englishCount / 200;
    const chineseMinutes = chineseCount / 400;
    
    return Math.ceil(englishMinutes + chineseMinutes);
  }
  
  function processGitHubAlerts(markdownText) {
    const alertTypes = {
      'NOTE': { icon: 'ℹ️', class: 'alert-note', title: 'Note' },
      'IMPORTANT': { icon: '💡', class: 'alert-important', title: 'Important' },
      'WARNING': { icon: '⚠️', class: 'alert-warning', title: 'Warning' },
      'TIP': { icon: '💡', class: 'alert-tip', title: 'Tip' },
      'CAUTION': { icon: '⚠️', class: 'alert-caution', title: 'Caution' }
    };
    
    let processed = markdownText;
    let result = '';
    const lines = markdownText.split('\n');
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const alertMatch = line.match(/^> \[!([A-Z]+)\](.*)$/);
      
      if (alertMatch) {
        const alertType = alertTypes[alertMatch[1]];
        if (alertType) {
          const alertContentLines = [];
          i++;
          
          while (i < lines.length && (lines[i].startsWith('> ') || lines[i].trim() === '')) {
            if (lines[i].trim() === '') {
              alertContentLines.push('');
            } else {
              alertContentLines.push(lines[i].substring(2));
            }
            i++;
          }
          
          const alertContent = alertContentLines.join('\n').trim();
          const parsedContent = marked.parse(alertContent, { breaks: true, gfm: true });
          
          result += `<div class="alert ${alertType.class}">
            <div class="alert-header">
              <span class="alert-icon">${alertType.icon}</span>
              <span class="alert-title">${alertType.title}</span>
            </div>
            <div class="alert-content">${parsedContent}</div>
          </div>\n`;
        } else {
          result += line + '\n';
          i++;
        }
      } else {
        result += line + '\n';
        i++;
      }
    }
    
    return result;
  }
  
  function processImages(container) {
    const images = container.querySelectorAll('img');
    
    images.forEach(img => {
      img.setAttribute('loading', 'lazy');
      
      const src = img.getAttribute('src') || '';
      const filename = src.split('/').pop() || 'image';
      const alt = img.getAttribute('alt') || filename;
      
      img.onerror = function() {
        this.onerror = null;
        this.style.display = 'none';
        
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder';
        placeholder.innerHTML = `
          <div class="placeholder-icon">🖼️</div>
          <div class="placeholder-text">${alt}</div>
          <div class="placeholder-filename">${filename}</div>
        `;
        
        this.parentNode.insertBefore(placeholder, this);
      };
    });
    
    const galleryMode = container.querySelectorAll('img');
    if (galleryMode.length >= 2) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = container.innerHTML;
      
      const allElements = Array.from(tempDiv.childNodes);
      const galleryGroups = [];
      let currentGroup = [];
      
      allElements.forEach(node => {
        if (node.nodeName === 'P') {
          const imgs = node.querySelectorAll('img');
          const textContent = node.textContent.trim();
          
          if (imgs.length > 0 && textContent === '') {
            imgs.forEach(img => currentGroup.push(img.cloneNode(true)));
            if (node.nextSibling && node.nextSibling.nodeName === 'P') {
              const nextImgs = node.nextSibling.querySelectorAll('img');
              const nextText = node.nextSibling.textContent.trim();
              if (nextImgs.length > 0 && nextText === '') {
                return;
              }
            }
          } else if (currentGroup.length > 0) {
            galleryGroups.push([...currentGroup]);
            currentGroup = [];
          }
        }
        
        if (currentGroup.length > 0 && node.nodeName !== 'P') {
          galleryGroups.push([...currentGroup]);
          currentGroup = [];
        }
      });
      
      if (currentGroup.length > 0) {
        galleryGroups.push(currentGroup);
      }
      
      galleryGroups.forEach(group => {
        if (group.length >= 2) {
          const galleryDiv = document.createElement('div');
          galleryDiv.className = 'image-gallery';
          
          const firstImg = group[0];
          if (firstImg.parentNode) {
            firstImg.parentNode.insertBefore(galleryDiv, firstImg);
            group.forEach(img => {
              if (img.parentNode && img.parentNode !== galleryDiv) {
                galleryDiv.appendChild(img.cloneNode(true));
                if (img.parentNode) {
                  img.parentNode.removeChild(img);
                }
              }
            });
          }
        }
      });
      
      container.innerHTML = tempDiv.innerHTML;
    }
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
    
    const processedContent = processGitHubAlerts(content);
    let html = marked.parse(processedContent, {
      breaks: true,
      gfm: true
    });
    
    const plainText = content.replace(/[#*`\[\]()_{}]/g, '').replace(/\n+/g, ' ').trim();
    const readingTime = calculateReadingTime(plainText);
    const readingTimeHtml = `<div class="reading-time">预计阅读 ${readingTime} 分钟</div>`;
    
    const headingMatch = html.match(/<h1[^>]*>/);
    let finalHtml;
    if (headingMatch) {
      const insertIndex = headingMatch.index + headingMatch[0].length;
      finalHtml = html.slice(0, insertIndex) + readingTimeHtml + html.slice(insertIndex);
    } else {
      finalHtml = readingTimeHtml + html;
    }
    
    dom.markdownContent.innerHTML = finalHtml;
    
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
    
    processImages(dom.markdownContent);
    
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
    
    const giscusFrame = dom.giscusContainer.querySelector('iframe');
    
    if (giscusFrame) {
      giscusFrame.contentWindow.postMessage({
        giscus: {
          setConfig: {
            term: path,
            mapping: giscusConfig.mapping,
            strict: giscusConfig.strict === '1'
          }
        }
      }, 'https://giscus.app');
      return;
    }
    
    dom.giscusContainer.innerHTML = '';
    
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
    
    script.onload = function() {
      const receiveMessage = function(event) {
        if (event.origin !== 'https://giscus.app') return;
        if (!event.data.giscus) return;
        if (event.data.giscus.event === 'loaded') {
          window.removeEventListener('message', receiveMessage);
        }
      };
      window.addEventListener('message', receiveMessage);
    };
    
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
    loadGiscus,
    calculateReadingTime
  };
})();
