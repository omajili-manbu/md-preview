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
  
  function init() {
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
      renderApexCharts();
      renderMusicNotation();
      renderMermaidDiagrams();
      renderPlantUMLDiagrams();
      renderEmbeddedServices();
    }, 100);
  }
  
  async function renderMermaidDiagrams() {
    if (typeof mermaid === 'undefined') {
      console.error('Mermaid library is not loaded');
      return;
    }
    
    const allPres = document.querySelectorAll('.markdown-body pre');
    
    for (let i = 0; i < allPres.length; i++) {
      const pre = allPres[i];
      const codeElement = pre.querySelector('code');
      
      if (!codeElement) continue;
      
      const classList = codeElement.className;
      if (!classList || !classList.includes('language-mermaid')) continue;
      
      const mermaidCode = codeElement.textContent.trim();
      const id = 'mermaid-' + Date.now() + '-' + i;
      
      try {
        const { svg } = await mermaid.render(id, mermaidCode);
        const container = document.createElement('div');
        container.className = 'mermaid-diagram';
        container.innerHTML = svg;
        pre.replaceWith(container);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.padding = '10px';
        errorDiv.style.border = '1px solid #ff6b6b';
        errorDiv.style.borderRadius = '4px';
        errorDiv.textContent = 'Mermaid 渲染错误: ' + error.message;
        pre.replaceWith(errorDiv);
      }
    }
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

  function encode64(data) {
    let r = "";
    for (let i = 0; i < data.length; i += 3) {
      if (i + 2 === data.length) {
        r += append3bytes(data[i], data[i + 1], 0);
      } else if (i + 1 === data.length) {
        r += append3bytes(data[i], 0, 0);
      } else {
        r += append3bytes(data[i], data[i + 1], data[i + 2]);
      }
    }
    return r;
  }

  function append3bytes(b1, b2, b3) {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3F;
    return encode6bit(c1 & 0x3F) + encode6bit(c2 & 0x3F) + encode6bit(c3 & 0x3F) + encode6bit(c4 & 0x3F);
  }

  function encode6bit(b) {
    if (b < 10) {
      return String.fromCharCode(48 + b);
    }
    b -= 10;
    if (b < 26) {
      return String.fromCharCode(65 + b);
    }
    b -= 26;
    if (b < 26) {
      return String.fromCharCode(97 + b);
    }
    b -= 26;
    if (b === 0) {
      return "-";
    }
    if (b === 1) {
      return "_";
    }
    return "?";
  }

  function encodePlantUML(source) {
    const encoder = new TextEncoder();
    const utf8 = encoder.encode(source);
    const compressed = pako.deflateRaw(utf8);
    return encode64(compressed);
  }
  
  async function renderPlantUMLDiagrams() {
    if (typeof pako === 'undefined') {
      console.error('Pako library is not loaded');
      return;
    }
    
    const allPres = document.querySelectorAll('.markdown-body pre');
    
    for (let i = 0; i < allPres.length; i++) {
      const pre = allPres[i];
      const codeElement = pre.querySelector('code');
      
      if (!codeElement) continue;
      
      const classList = codeElement.className;
      if (!classList || !classList.includes('language-plantuml')) continue;
      
      const plantumlCode = codeElement.textContent.trim();
      
      try {
        const encoded = encodePlantUML(plantumlCode);
        const container = document.createElement('div');
        container.className = 'plantuml-diagram';
        container.innerHTML = `<img src="https://www.plantuml.com/plantuml/svg/${encoded}" alt="PlantUML 图" loading="lazy">`;
        pre.replaceWith(container);
      } catch (error) {
        console.error('PlantUML encoding error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.padding = '10px';
        errorDiv.style.border = '1px solid #ff6b6b';
        errorDiv.style.borderRadius = '4px';
        errorDiv.textContent = 'PlantUML 渲染错误: ' + error.message;
        pre.replaceWith(errorDiv);
      }
    }
  }
  
  function renderApexCharts() {
    if (typeof ApexCharts === 'undefined') {
      console.error('ApexCharts library is not loaded');
      return;
    }
    
    const allPres = Array.from(document.querySelectorAll('.markdown-body pre'));
    
    for (let i = 0; i < allPres.length; i++) {
      const pre = allPres[i];
      const codeElement = pre.querySelector('code');
      
      if (!codeElement) continue;
      
      const classList = codeElement.className;
      if (!classList || !classList.includes('language-apexcharts')) continue;
      
      const chartConfigStr = codeElement.textContent.trim();
      
      try {
        const chartConfig = JSON.parse(chartConfigStr);
        const chartId = 'apexchart-' + Date.now() + '-' + i;
        
        const container = document.createElement('div');
        container.id = chartId;
        container.className = 'apex-chart';
        container.style.minHeight = '400px';
        
        const mergedConfig = {
          ...chartConfig,
          chart: {
            ...chartConfig.chart,
            id: chartId,
            toolbar: { show: true }
          },
          colors: chartConfig.colors || ['#8B5CF6', '#D946EF', '#3B82F6', '#10B981', '#F59E0B'],
          theme: { mode: 'light' }
        };
        
        pre.parentNode.replaceChild(container, pre);
        
        setTimeout(() => {
          const chartElement = document.getElementById(chartId);
          if (chartElement) {
            try {
              const chart = new ApexCharts(chartElement, mergedConfig);
              chart.render();
            } catch (e) {
              console.error('ApexCharts initialization error:', e);
              chartElement.innerHTML = '<div style="padding: 20px; color: #ff6b6b;">图表渲染失败: ' + e.message + '</div>';
            }
          }
        }, 50);
      } catch (error) {
        console.error('ApexCharts parsing error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.padding = '10px';
        errorDiv.style.border = '1px solid #ff6b6b';
        errorDiv.style.borderRadius = '4px';
        errorDiv.textContent = 'ApexCharts 错误: ' + error.message;
        if (pre.parentNode) {
          pre.parentNode.replaceChild(errorDiv, pre);
        }
      }
    }
  }
  
  function renderMusicNotation() {
    const allPres = Array.from(document.querySelectorAll('.markdown-body pre'));
    
    for (let i = 0; i < allPres.length; i++) {
      const pre = allPres[i];
      const codeElement = pre.querySelector('code');
      
      if (!codeElement) continue;
      
      const classList = codeElement.className;
      if (!classList) continue;
      
      const container = document.createElement('div');
      container.className = 'music-notation';
      container.style.margin = '1.5em 0';
      container.style.padding = '1.5em';
      container.style.background = 'var(--color-surface)';
      container.style.borderRadius = '12px';
      container.style.border = '1px solid var(--color-border)';
      container.style.overflowX = 'auto';
      
      if (classList.includes('language-abc')) {
        renderABCNotation(codeElement.textContent.trim(), container, pre);
      } else if (classList.includes('language-musicxml')) {
        renderMusicXML(codeElement.textContent.trim(), container, pre);
      } else if (classList.includes('language-osmd')) {
        renderOSMD(codeElement.textContent.trim(), container, pre);
      }
    }
  }
  
  function renderABCNotation(code, container, pre) {
    if (typeof ABCJS === 'undefined') {
      console.error('ABCJS library is not loaded');
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'ABCJS 库未加载';
      container.appendChild(errorDiv);
      pre.parentNode.replaceChild(container, pre);
      return;
    }
    
    try {
      const div = document.createElement('div');
      div.className = 'abc-container';
      container.appendChild(div);
      
      ABCJS.renderAbc(div, code, {
        responsive: 'resize',
        add_classes: true,
        staffwidth: 700
      });
      
      pre.parentNode.replaceChild(container, pre);
    } catch (error) {
      console.error('ABC notation rendering error:', error);
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'ABC 乐谱渲染错误: ' + error.message;
      container.appendChild(errorDiv);
      pre.parentNode.replaceChild(container, pre);
    }
  }
  
  function renderMusicXML(code, container, pre) {
    if (typeof verovio === 'undefined') {
      console.error('Verovio library is not loaded');
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'Verovio 库未加载';
      container.appendChild(errorDiv);
      pre.parentNode.replaceChild(container, pre);
      return;
    }
    
    try {
      const tk = new verovio.toolkit();
      
      const formattedCode = code
        .replace(/<!DOCTYPE[^>]*>/i, '')
        .replace(/<\?xml[^>]*\?>/i, '')
        .replace(/<!DOCTYPE score-partwise[^>]*>/i, '')
        .trim();
      
      const svg = tk.renderData(formattedCode, {});
      const div = document.createElement('div');
      div.className = 'musicxml-container';
      div.innerHTML = svg;
      div.style.display = 'flex';
      div.style.justifyContent = 'center';
      div.style.overflowX = 'auto';
      container.appendChild(div);
      
      pre.parentNode.replaceChild(container, pre);
    } catch (error) {
      console.error('MusicXML rendering error:', error);
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'MusicXML 乐谱渲染错误: ' + error.message;
      container.appendChild(errorDiv);
      pre.parentNode.replaceChild(container, pre);
    }
  }
  
  function renderOSMD(code, container, pre) {
    if (typeof OpenSheetMusicDisplay === 'undefined') {
      console.error('OSMD library is not loaded');
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'OSMD 库未加载';
      container.appendChild(errorDiv);
      pre.parentNode.replaceChild(container, pre);
      return;
    }
    
    try {
      const div = document.createElement('div');
      div.className = 'osmd-container';
      div.style.minHeight = '300px';
      container.appendChild(div);
      
      const formattedCode = code
        .replace(/<!DOCTYPE[^>]*>/i, '')
        .replace(/<\?xml[^>]*\?>/i, '')
        .trim();
      
      const osmd = new OpenSheetMusicDisplay(div, {
        autoResize: true,
        backend: 'svg',
        drawTitle: true,
        drawComposer: true,
        drawLyrics: true,
        drawMeasureNumbers: true,
        drawPartNames: true,
        drawMeasureBars: true,
        drawSlurs: true,
        drawTies: true,
        drawBeams: true,
        drawArticulations: true,
        drawOrnaments: true,
        drawDynamics: true,
        drawClefs: true,
        drawTimeSignatures: true,
        drawKeySignatures: true,
        drawTuplets: true
      });
      
      osmd.load(formattedCode).then(() => {
        osmd.render();
      }).catch(err => {
        console.error('OSMD loading error:', err);
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.padding = '10px';
        errorDiv.textContent = 'OSMD 加载错误: ' + err.message;
        container.innerHTML = '';
        container.appendChild(errorDiv);
      });
      
      pre.parentNode.replaceChild(container, pre);
    } catch (error) {
      console.error('OSMD rendering error:', error);
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'OSMD 乐谱渲染错误: ' + error.message;
      container.appendChild(errorDiv);
      pre.parentNode.replaceChild(container, pre);
    }
  }
  
  function renderEmbeddedServices() {
    const content = markdownContent.innerHTML;
    const embedRegex = /@\[(\w+)\]\(([^)]+)\)/g;
    
    let match;
    while ((match = embedRegex.exec(content)) !== null) {
      const service = match[1].toLowerCase();
      const url = match[2];
      
      if (service === 'geojson' || service === 'topojson') {
        renderGeoData(service, url, match[0]);
      } else {
        const iframe = createEmbedIframe(service, url);
        if (iframe) {
          markdownContent.innerHTML = markdownContent.innerHTML.replace(match[0], iframe);
        }
      }
    }
  }
  
  function createEmbedIframe(service, url) {
    const iframeBase = '<iframe src="{src}" width="100%" height="{height}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>';
    
    let src = '';
    let height = '400';
    
    switch (service) {
      case 'youtube':
        const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/)?.[1] || url;
        src = `https://www.youtube.com/embed/${videoId}`;
        height = '315';
        break;
        
      case 'bilibili':
        const bvid = url.match(/BV[\w]+/)?.[0] || url;
        src = `https://player.bilibili.com/player.html?bvid=${bvid}&page=1`;
        height = '315';
        break;
        
      case 'vimeo':
        const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1] || url;
        src = `https://player.vimeo.com/video/${vimeoId}`;
        height = '315';
        break;
        
      case 'figma':
        const figmaId = url.match(/figma\.com\/file\/([^\/?]+)/)?.[1] || url;
        src = `https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/file/${figmaId}`;
        height = '400';
        break;
        
      case 'codepen':
        const codepenMatch = url.match(/codepen\.io\/([^\/]+)\/pen\/([^\/?]+)/);
        if (codepenMatch) {
          src = `https://codepen.io/${codepenMatch[1]}/embed/${codepenMatch[2]}`;
        } else {
          src = `${url}/embed`;
        }
        height = '300';
        break;
        
      case 'jsfiddle':
        const fiddleId = url.match(/jsfiddle\.net\/([^\/?]+)/)?.[1] || url;
        src = `https://jsfiddle.net/${fiddleId}/embedded/`;
        height = '300';
        break;
        
      case 'stackblitz':
        src = `${url}/embed`;
        height = '500';
        break;
        
      case 'replit':
        const replitMatch = url.match(/replit\.com\/@([^\/]+)\/([^\/?]+)/);
        if (replitMatch) {
          src = `https://replit.com/embed/${replitMatch[1]}/${replitMatch[2]}`;
        } else {
          src = `${url}/embed`;
        }
        height = '400';
        break;
        
      case 'googlemaps':
        src = url;
        height = '300';
        break;
        
      case 'openstreetmap':
        src = url;
        height = '300';
        break;
        
      case 'googledocs':
        src = url;
        height = '400';
        break;
        
      case 'gist':
        const gistMatch = url.match(/gist\.github\.com\/([^\/]+)\/([^\/?]+)/);
        if (gistMatch) {
          src = `https://gist.github.com/${gistMatch[1]}/${gistMatch[2]}.js`;
          return `<script src="${src}"></script>`;
        }
        return null;
        
      default:
        console.warn(`Unsupported embed service: ${service}`);
        return null;
    }
    
    return iframeBase.replace('{src}', src).replace('{height}', height);
  }
  
  function renderGeoData(type, dataStr, originalMatch) {
    if (typeof L === 'undefined') {
      console.error('Leaflet library is not loaded');
      return;
    }
    
    try {
      const geoData = JSON.parse(dataStr);
      const mapId = 'map-' + Date.now();
      const container = document.createElement('div');
      container.id = mapId;
      container.className = 'geo-map';
      container.style.height = '400px';
      container.style.borderRadius = '8px';
      container.style.overflow = 'hidden';
      
      markdownContent.innerHTML = markdownContent.innerHTML.replace(originalMatch, container.outerHTML);
      
      setTimeout(() => {
        const mapContainer = document.getElementById(mapId);
        if (!mapContainer) return;
        
        const map = L.map(mapContainer).setView([35.8617, 104.1954], 5);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        if (type === 'geojson') {
          L.geoJSON(geoData, {
            onEachFeature: function(feature, layer) {
              if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name);
              }
            }
          }).addTo(map);
        } else if (type === 'topojson') {
          const geojsonData = topojsonToGeoJson(geoData);
          L.geoJSON(geojsonData, {
            onEachFeature: function(feature, layer) {
              if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name);
              }
            }
          }).addTo(map);
        }
        
        const bounds = map.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds);
        }
      }, 100);
    } catch (error) {
      console.error('Geo data parsing error:', error);
    }
  }
  
  function topojsonToGeoJson(topology) {
    const result = {
      type: 'FeatureCollection',
      features: []
    };
    
    function decodeArc(arcIndex) {
      const arc = topology.arcs[arcIndex];
      const result = [];
      let x = 0, y = 0;
      for (let i = 0; i < arc.length; i++) {
        x += arc[i][0];
        y += arc[i][1];
        result.push([x, y]);
      }
      return result;
    }
    
    function transformGeometry(geometry) {
      const result = {
        type: geometry.type,
        coordinates: []
      };
      
      switch (geometry.type) {
        case 'Point':
          result.coordinates = geometry.coordinates;
          break;
        case 'LineString':
          result.coordinates = geometry.arcs.flatMap(arcIdx => decodeArc(arcIdx));
          break;
        case 'Polygon':
          result.coordinates = geometry.arcs.map(ring => ring.flatMap(arcIdx => decodeArc(arcIdx)));
          break;
        case 'MultiPoint':
          result.coordinates = geometry.coordinates;
          break;
        case 'MultiLineString':
          result.coordinates = geometry.arcs.map(line => line.flatMap(arcIdx => decodeArc(arcIdx)));
          break;
        case 'MultiPolygon':
          result.coordinates = geometry.arcs.map(polygon => polygon.map(ring => ring.flatMap(arcIdx => decodeArc(arcIdx))));
          break;
        case 'GeometryCollection':
          result.geometries = geometry.geometries.map(transformGeometry);
          delete result.coordinates;
          break;
      }
      
      return result;
    }
    
    for (const key in topology.objects) {
      const obj = topology.objects[key];
      if (obj.type === 'GeometryCollection') {
        obj.geometries.forEach(geom => {
          result.features.push({
            type: 'Feature',
            geometry: transformGeometry(geom),
            properties: {}
          });
        });
      } else if (obj.type === 'Polygon' || obj.type === 'LineString' || obj.type === 'Point') {
        result.features.push({
          type: 'Feature',
          geometry: transformGeometry(obj),
          properties: {}
        });
      }
    }
    
    return result;
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
