(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  
  const { dom, state, CONFIG, search } = window.MarkdownPreview;
  
  async function loadFileTree() {
    try {
      const prebuiltUrl = 'iris/data/file-tree.json';
      let response = await fetch(prebuiltUrl);
      
      if (window.MarkdownPreview.debug && window.MarkdownPreview.debug.incrementApiCalls) {
        window.MarkdownPreview.debug.incrementApiCalls();
      }
      
      if (response.ok) {
        console.log('✅ 使用预构建的文件树');
        if (window.MarkdownPreview.debug && window.MarkdownPreview.debug.incrementCacheHits) {
          window.MarkdownPreview.debug.incrementCacheHits();
        }
        state.fileTreeData = await response.json();
        renderFileTree(state.fileTreeData);
        onFilesLoaded();
        return;
      } else {
        console.log('⚠️ 预构建文件不存在，使用 GitHub API');
        await loadFileTreeFromGitHubAPI();
      }
    } catch (error) {
      console.error('⚠️ 加载预构建文件树失败，使用 GitHub API:', error);
      await loadFileTreeFromGitHubAPI();
    }
  }
  
  async function loadFileTreeFromGitHubAPI() {
    try {
      const apiUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/main?recursive=1`;
      const response = await fetch(apiUrl);
      
      if (window.MarkdownPreview.debug && window.MarkdownPreview.debug.incrementApiCalls) {
        window.MarkdownPreview.debug.incrementApiCalls();
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file tree from GitHub API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      state.fileTreeData = buildTreeFromFlatList(data.tree);
      renderFileTree(state.fileTreeData);
      onFilesLoaded();
    } catch (error) {
      console.error('Error loading file tree:', error);
      dom.fileTree.innerHTML = '<div class="tree-error" style="color: var(--color-text-muted); padding: 16px;">无法加载文件列表，请检查网络或手动配置</div>';
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
  
  function formatWordCount(count) {
    if (!count && count !== 0) return '';
    if (count >= 10000) {
      return (count / 10000).toFixed(1).replace(/\.0$/, '') + ' 万词';
    }
    return count + ' 词';
  }

  function renderFileTree(files) {
    if (!dom.fileTree) return;
    dom.fileTree.innerHTML = '';
    
    const { Tree, Folder, File } = window.MarkdownPreview.FileTree || {};
    if (!Tree || !Folder || !File) {
      console.error('FileTree component not loaded');
      dom.fileTree.innerHTML = '<div style="color: var(--color-text-muted); padding: 16px;">文件树组件加载失败</div>';
      return;
    }
    
    const tree = new Tree();
    
    function addItems(parent, items) {
      items.forEach(item => {
        if (item.type === 'folder') {
          const folder = new Folder(item.name);
          if (item.children && item.children.length > 0) {
            addItems(folder, item.children);
          }
          parent.append(folder);
        } else if (item.type === 'file' && item.name.endsWith('.md')) {
          const file = new File([], item.name);
          file._path = item.path;
          file._wordCount = item.wordCount;
          parent.append(file);
        }
      });
    }
    
    addItems(tree, files);
    
    // Handle file clicks
    tree.addEventListener('click', (event) => {
      const { action, folder, target, path } = event.detail;
      if (action === 'click' && !folder) {
        // Find the file's path from our data
        const filePath = target._path || findFilePath(target.name, state.fileTreeData);
        if (filePath) {
          window.MarkdownPreview.markdown.loadMarkdownFile(filePath);
          closeSidebarOnMobile();
        }
      }
    });
    
    dom.fileTree.appendChild(tree);
    
    // Open all folders by default after a short delay
    requestAnimationFrame(() => {
      tree.querySelectorAll('li.folder').forEach(folder => {
        folder.classList.add('opened');
      });
    });
  }
  
  function findFilePath(fileName, files, parentPath = '') {
    for (const item of files) {
      if (item.type === 'file' && item.name === fileName) {
        return item.path;
      } else if (item.type === 'folder' && item.children) {
        const result = findFilePath(fileName, item.children, parentPath + item.name + '/');
        if (result) return result;
      }
    }
    return null;
  }
  
  function setWordCountVisibility(visible) {
    if (dom.fileTree) {
      dom.fileTree.classList.toggle('show-word-count', visible);
    }
  }
  
  function setActiveFile(path) {
    // For the custom element tree, highlight by path
    const tree = dom.fileTree.querySelector('file-tree');
    if (tree) {
      const { target } = tree.query(path) || {};
      // The component handles selection internally
    }
  }
  
  function highlightFileInSidebar(path) {
    setActiveFile(path);
  }
  
  function toggleSidebar() {
    dom.sidebar.classList.toggle('open');
    dom.sidebarOverlay.classList.toggle('active');
  }
  
  function closeSidebar() {
    dom.sidebar.classList.remove('open');
    dom.sidebarOverlay.classList.remove('active');
  }
  
  function closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }
  
  function onFilesLoaded() {
    setTimeout(() => {
      if (search && search.buildIndex) search.buildIndex();
    }, 500);
    setTimeout(() => {
      if (window.MarkdownPreview.router && window.MarkdownPreview.router.onFileTreeLoaded) {
        window.MarkdownPreview.router.onFileTreeLoaded();
      }
    }, 100);
  }
  
  function getAllFilesInDFSOrder(files = state.fileTreeData) {
    const result = [];
    
    function traverse(items) {
      for (const item of items) {
        if (item.type === 'file' && item.name.endsWith('.md')) {
          result.push({ name: item.name.replace('.md', ''), path: item.path });
        } else if (item.type === 'folder' && item.children) {
          traverse(item.children);
        }
      }
    }
    
    traverse(files);
    return result;
  }
  
  function getAdjacentFiles(currentPath) {
    const allFiles = getAllFilesInDFSOrder();
    const currentIndex = allFiles.findIndex(f => f.path === currentPath);
    
    if (currentIndex === -1) {
      return { prev: null, next: null };
    }
    
    return {
      prev: currentIndex > 0 ? allFiles[currentIndex - 1] : null,
      next: currentIndex < allFiles.length - 1 ? allFiles[currentIndex + 1] : null
    };
  }

  window.MarkdownPreview.fileTree = {
    loadFileTree,
    loadFileTreeFromGitHubAPI,
    buildTreeFromFlatList,
    renderFileTree,
    setActiveFile,
    highlightFileInSidebar,
    toggleSidebar,
    closeSidebar,
    closeSidebarOnMobile,
    onFilesLoaded,
    getAllFilesInDFSOrder,
    getAdjacentFiles,
    setWordCountVisibility
  };
})();
