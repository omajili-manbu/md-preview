(function() {
  const fileTree = document.getElementById('fileTree');
  const markdownContent = document.getElementById('markdownContent');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const progressBar = document.getElementById('progressBar');
  const readingProgressBar = document.querySelector('.reading-progress-bar');
  const modeFiles = document.getElementById('modeFiles');
  const modeIndex = document.getElementById('modeIndex');
  const indexTree = document.getElementById('indexTree');
  
  const CONFIG = {
    owner: 'theforeveriris',
    repo: 'md-preview'
  };
  
  let fileTreeData = [];
  let currentMode = 'files';
  let currentFilePath = '';
  let currentHeadings = [];
  let mermaidInitialized = false;
  
  function initMermaid() {
    if (typeof mermaid !== 'undefined' && !mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor: '#d4a5c9',
          primaryTextColor: '#333333',
          primaryBorderColor: '#d4a5c9',
          lineColor: '#888888',
          secondaryColor: '#f2c4ce',
          tertiaryColor: '#f8f8f8',
          background: '#ffffff',
          mainBkg: '#ffffff',
          nodeBorder: '#d4a5c9',
          clusterBkg: '#f8f8f8',
          titleColor: '#333333',
          edgeLabelBackground: '#ffffff'
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        },
        sequence: {
          useMaxWidth: true,
          diagramMarginX: 20,
          diagramMarginY: 20
        }
      });
      mermaidInitialized = true;
    }
  }
  
  function init() {
    initMermaid();
    loadFileTree();
    setupEventListeners();
    setupScrollProgress();
  }
  
  async function loadFileTree() {
    try {
      const apiUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/main?recursive=1`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file tree from GitHub API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      fileTreeData = buildTreeFromFlatList(data.tree);
      renderFileTree(fileTreeData);
    } catch (error) {
      console.error('Error loading file tree:', error);
      fileTree.innerHTML = '<div class="file-item" style="color: var(--color-text-muted);">无法加载文件列表，请检查网络或手动配置</div>';
    }
  }
  
  function buildTreeFromFlatList(tree) {
    const root = [];
    const map = {};
    
    tree.forEach(item => {
      if (item.type === 'blob' && item.path.endsWith('.md')) {
        const parts = item.path.split('/');
        let currentLevel = root;
        let pathSoFar = '';
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (i === parts.length - 1) {
            currentLevel.push({
              name: part,
              type: 'file',
              path: item.path
            });
          } else {
            pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
            let existingFolder = map[pathSoFar];
            if (!existingFolder) {
              existingFolder = {
                name: part,
                type: 'folder',
                children: []
              };
              map[pathSoFar] = existingFolder;
              currentLevel.push(existingFolder);
            }
            currentLevel = existingFolder.children;
          }
        }
      }
    });
    
    function sortTree(items) {
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      items.forEach(item => {
        if (item.type === 'folder' && item.children) {
          sortTree(item.children);
        }
      });
    }
    sortTree(root);
    return root;
  }
  
  function renderFileTree(files, container = fileTree, level = 0) {
    files.forEach((item, index) => {
      if (item.type === 'folder') {
        const folderEl = document.createElement('div');
        folderEl.className = 'folder-item';
        folderEl.innerHTML = `
          <svg class="folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          <span>${item.name}</span>
        `;
        
        const childrenEl = document.createElement('div');
        childrenEl.className = 'folder-children';
        
        folderEl.addEventListener('click', () => {
          folderEl.classList.toggle('expanded');
          childrenEl.classList.toggle('expanded');
        });
        
        container.appendChild(folderEl);
        renderFileTree(item.children || [], childrenEl, level + 1);
        container.appendChild(childrenEl);
        
        if (level === 0) {
          childrenEl.classList.add('expanded');
          folderEl.classList.add('expanded');
        }
      } else if (item.type === 'file' && item.name.endsWith('.md')) {
        const fileEl = document.createElement('a');
        fileEl.className = 'file-item';
        fileEl.href = '#';
        fileEl.textContent = item.name.replace('.md', '');
        fileEl.dataset.path = item.path;
        
        fileEl.addEventListener('click', (e) => {
          e.preventDefault();
          loadMarkdownFile(item.path);
          setActiveFile(fileEl);
          closeSidebarOnMobile();
        });
        
        container.appendChild(fileEl);
      }
    });
  }
  
  function setActiveFile(fileEl) {
    document.querySelectorAll('.file-item.active').forEach(el => {
      el.classList.remove('active');
    });
    fileEl.classList.add('active');
  }
  
  async function loadMarkdownFile(path) {
    try {
      updateProgress(30);
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error('Failed to load markdown file');
      }
      updateProgress(60);
      const markdown = await response.text();
      updateProgress(100);
      currentFilePath = path;
      renderMarkdown(markdown, path);
      extractAndRenderIndex(markdown);
    } catch (error) {
      console.error('Error loading markdown:', error);
      markdownContent.innerHTML = '<div class="welcome-state"><p class="welcome-text">无法加载文件</p></div>';
      setTimeout(() => updateProgress(0), 500);
    }
  }
  
  function renderMarkdown(markdown, currentPath = '') {
    const html = marked.parse(markdown, {
      breaks: true,
      gfm: true
    });
    markdownContent.innerHTML = html;
    
    document.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6').forEach(heading => {
      const text = heading.textContent;
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
      heading.id = id;
    });
    
    document.querySelectorAll('.markdown-body pre').forEach(pre => {
      pre.addEventListener('click', () => {
        copyCodeToClipboard(pre);
      });
    });
    
    interceptLinks(currentPath);
    
    setTimeout(() => {
      renderMermaidDiagrams();
    }, 100);
  }
  
  async function renderMermaidDiagrams() {
    if (typeof mermaid === 'undefined') {
      console.error('Mermaid library is not loaded');
      return;
    }
    
    if (!mermaidInitialized) {
      initMermaid();
    }
    
    const mermaidBlocks = document.querySelectorAll('.markdown-body pre code.language-mermaid');
    
    for (let i = 0; i < mermaidBlocks.length; i++) {
      const codeElement = mermaidBlocks[i];
      const preElement = codeElement.closest('pre');
      
      if (!preElement) continue;
      
      const mermaidCode = codeElement.textContent.trim();
      const id = 'mermaid-diagram-' + Date.now() + '-' + i;
      
      try {
        const { svg } = await mermaid.render(id, mermaidCode);
        const container = document.createElement('div');
        container.className = 'mermaid-diagram';
        container.innerHTML = svg;
        
        preElement.replaceWith(container);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        preElement.style.borderColor = '#ff6b6b';
        preElement.title = 'Mermaid 渲染错误: ' + error.message;
      }
    }
  }
  
  function interceptLinks(currentPath) {
    document.querySelectorAll('.markdown-body a').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        // 检查是否是指向 .md 文件的链接
        if (href.endsWith('.md')) {
          e.preventDefault();
          
          // 处理相对路径
          let targetPath = href;
          if (!href.startsWith('/') && currentPath) {
            // 获取当前文件所在文件夹
            const currentDir = currentPath.split('/').slice(0, -1).join('/');
            targetPath = currentDir ? `${currentDir}/${href}` : href;
            // 简化路径，处理 .. 和 .
            targetPath = simplifyPath(targetPath);
          }
          
          // 移除开头的 /
          if (targetPath.startsWith('/')) {
            targetPath = targetPath.substring(1);
          }
          
          loadMarkdownFile(targetPath);
          // 尝试在侧边栏高亮对应的文件
          highlightFileInSidebar(targetPath);
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
    currentHeadings = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
      currentHeadings.push({ level, text, id });
    }
    
    renderIndex();
  }
  
  function renderIndex() {
    indexTree.innerHTML = '';
    
    if (currentHeadings.length === 0) {
      indexTree.innerHTML = '<div class="index-item" style="color: var(--color-text-muted);">当前文件无目录</div>';
      return;
    }
    
    currentHeadings.forEach((heading, index) => {
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
      
      indexTree.appendChild(item);
    });
  }
  
  function setActiveIndexItem(item) {
    document.querySelectorAll('.index-item.active').forEach(el => {
      el.classList.remove('active');
    });
    item.classList.add('active');
  }
  
  function switchMode(mode) {
    currentMode = mode;
    
    modeFiles.classList.toggle('active', mode === 'files');
    modeIndex.classList.toggle('active', mode === 'index');
    fileTree.classList.toggle('hidden', mode !== 'files');
    indexTree.classList.toggle('hidden', mode !== 'index');
  }
  
  function highlightFileInSidebar(path) {
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(el => {
      if (el.dataset.path === path) {
        setActiveFile(el);
      }
    });
  }
  
  function copyCodeToClipboard(pre) {
    const code = pre.querySelector('code');
    if (code) {
      navigator.clipboard.writeText(code.textContent).then(() => {
        const originalText = code.textContent;
        code.textContent = 'Copied!';
        setTimeout(() => {
          code.textContent = originalText;
        }, 1500);
      });
    }
  }
  
  function updateProgress(percent) {
    progressBar.style.width = percent + '%';
    if (percent === 100) {
      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 300);
    }
  }
  
  function setupScrollProgress() {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      readingProgressBar.style.width = scrollPercent + '%';
      progressBar.style.width = scrollPercent + '%';
    });
  }
  
  function setupEventListeners() {
    mobileMenuBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    modeFiles.addEventListener('click', () => switchMode('files'));
    modeIndex.addEventListener('click', () => switchMode('index'));
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
      }
    });
  }
  
  function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
  }
  
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  }
  
  function closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
