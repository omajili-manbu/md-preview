(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  window.MarkdownPreview.search = {};
  
  let documents = [];
  let debounceTimer = null;
  let isIndexLoaded = false;
  let currentQuery = '';
  let currentScope = 'all'; // 'all' = 全文, 'title' = 仅标题
  
  async function loadSearchIndex() {
    try {
      const response = await fetch('iris/data/search-index.json');
      if (!response.ok) {
        console.warn('Search index not found');
        return [];
      }
      return await response.json();
    } catch (e) {
      console.error('Failed to load search index:', e);
      return [];
    }
  }
  
  function initSearchIndex(indexData) {
    documents = indexData;
    isIndexLoaded = true;
    console.log('Search index initialized with', documents.length, 'documents');
  }
  
  async function buildIndex() {
    const indexData = await loadSearchIndex();
    initSearchIndex(indexData);
    return indexData.length;
  }
  
  async function ensureIndexLoaded() {
    if (!isIndexLoaded) {
      await buildIndex();
    }
  }
  
  function simpleSearch(query, scope) {
    const s = scope || currentScope;
    const results = [];
    const queryLower = query.toLowerCase();
    
    documents.forEach((doc, index) => {
      const titleLower = doc.title.toLowerCase();
      const pathLower = doc.path.toLowerCase();
      
      let score = 0;
      
      if (titleLower.includes(queryLower)) {
        score += 10;
        const indexInTitle = titleLower.indexOf(queryLower);
        if (indexInTitle === 0) score += 5;
      }
      
      if (s === 'title') {
        // 仅标题模式：只算标题和路径命中，不看正文
        if (pathLower.includes(queryLower)) {
          score += 2;
        }
      } else {
        // 全文模式：标题 + 正文 + 路径
        const previewLower = doc.preview ? doc.preview.toLowerCase() : '';
        if (previewLower.includes(queryLower)) {
          score += 5;
        }
        if (pathLower.includes(queryLower)) {
          score += 2;
        }
      }
      
      if (score > 0) {
        results.push({
          index: index,
          score: score,
          doc: doc
        });
      }
    });
    
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 20).map(r => r.index);
  }
  
  async function performSearch(query) {
    await ensureIndexLoaded();

    const { dom } = window.MarkdownPreview;
    if (!query.trim()) {
      hideSearchResults();
      return;
    }

    currentQuery = query.trim();

    console.log('Searching for:', query);

    try {
      const results = simpleSearch(query, currentScope);

      console.log('Search results raw:', results);
      console.log('Results count:', results.length);

      displaySearchResults(results);
    } catch (e) {
      console.error('Search error:', e);
      console.error('Error stack:', e.stack);
      hideSearchResults();
    }
  }
  
  function displaySearchResults(results) {
    const { dom, fileTree, markdown } = window.MarkdownPreview;
    const container = dom.searchResults;
    container.innerHTML = '';
    container.classList.add('active');
    
    if (!results || results.length === 0) {
      container.innerHTML = '<div class="search-no-results">没有找到相关文档</div>';
      return;
    }
    
    const seen = new Set();
    const merged = [];
    
    for (const index of results) {
      if (seen.has(index)) continue;
      seen.add(index);
      const doc = documents[index];
      if (doc) {
        merged.push(doc);
      }
    }
    
    console.log('Merged results:', merged.length);
    
    if (merged.length === 0) {
      container.innerHTML = '<div class="search-no-results">没有找到相关文档</div>';
      return;
    }
    
    merged.slice(0, 15).forEach(result => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <div class="search-result-title">${highlightMatch(result.title, currentQuery)}</div>
        <div class="search-result-path">${highlightMatch(result.path, currentQuery)}</div>
        ${result.preview ? `<div class="search-result-preview">${highlightMatch(result.preview, currentQuery)}</div>` : ''}
      `;

      item.addEventListener('click', () => {
        markdown.loadMarkdownFile(result.path);
        fileTree.highlightFileInSidebar(result.path);
        hideSearchResults();
        dom.searchInput.value = '';
      });

      container.appendChild(item);
    });
  }
  
  function hideSearchResults() {
    const { dom } = window.MarkdownPreview;
    dom.searchResults.classList.remove('active');
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 转义 HTML 后，将命中关键词片段用 <mark> 包裹（大小写不敏感）
  function highlightMatch(text, query) {
    if (!text) return '';
    const escaped = escapeHtml(text);
    if (!query) return escaped;
    // 转义正则特殊字符
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const regex = new RegExp(safeQuery, 'gi');
      return escaped.replace(regex, function (m) {
        return '<mark>' + m + '</mark>';
      });
    } catch (e) {
      return escaped;
    }
  }
  
  function setupSearchEvents() {
    const { dom } = window.MarkdownPreview;
    if (!dom.searchInput) {
      console.error('searchInput not found!');
      return;
    }
    
    dom.searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        performSearch(e.target.value);
      }, 300);
    });
    
    // 搜索范围切换
    const scopeContainer = document.getElementById('searchScope');
    if (scopeContainer) {
      scopeContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.scope-btn');
        if (!btn) return;
        scopeContainer.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentScope = btn.dataset.scope;
        // 切换后立即重新搜索
        if (dom.searchInput.value.trim()) {
          performSearch(dom.searchInput.value);
        }
      });
    }
    
    document.addEventListener('click', (e) => {
      if (!dom.searchInput.contains(e.target) && !dom.searchResults.contains(e.target)) {
        hideSearchResults();
      }
    });
  }
  
  function init() {
    setupSearchEvents();
    buildIndex();
  }
  
  window.MarkdownPreview.search = {
    init: init,
    buildIndex: buildIndex
  };
})();