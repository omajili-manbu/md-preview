(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  window.MarkdownPreview.search = {};
  
  let searchIndex = null;
  let documents = [];
  let debounceTimer = null;
  
  async function loadSearchIndex() {
    try {
      console.log('Loading search index...');
      const response = await fetch('search-index.json');
      if (!response.ok) {
        console.warn('Search index not found, status:', response.status);
        return [];
      }
      const data = await response.json();
      console.log('Search index loaded:', data.length, 'documents');
      return data;
    } catch (e) {
      console.error('Failed to load search index:', e);
      return [];
    }
  }
  
  function initSearchIndex(indexData) {
    if (searchIndex) return;
    
    if (!window.FlexSearch) {
      console.error('FlexSearch not loaded!');
      return;
    }
    
    console.log('Initializing search index...');
    
    documents = indexData;
    
    searchIndex = new window.FlexSearch.Index({
      tokenize: 'forward',
      cache: true,
      document: {
        id: 'path',
        index: ['title', 'preview']
      }
    });
    
    for (const item of documents) {
      searchIndex.add(item);
    }
    
    console.log('Search index initialized with', documents.length, 'documents');
  }
  
  async function buildIndex() {
    const indexData = await loadSearchIndex();
    initSearchIndex(indexData);
    return indexData.length;
  }
  
  function performSearch(query) {
    const { dom } = window.MarkdownPreview;
    if (!searchIndex || !query.trim()) {
      hideSearchResults();
      return;
    }
    
    console.log('Searching for:', query);
    
    const results = searchIndex.search(query, {
      limit: 20,
      enrich: true
    });
    
    console.log('Search results raw:', results);
    
    displaySearchResults(results);
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
    
    for (const result of results) {
      const path = typeof result === 'string' ? result : (result.path || result.id);
      if (!path || seen.has(path)) continue;
      
      seen.add(path);
      const doc = documents.find(d => d.path === path);
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
        <div class="search-result-title">${escapeHtml(result.title)}</div>
        <div class="search-result-path">${escapeHtml(result.path)}</div>
        ${result.preview ? `<div class="search-result-preview">${escapeHtml(result.preview)}</div>` : ''}
      `;
      
      item.addEventListener('click', () => {
        markdown.loadMarkdownFile('docs/' + result.path);
        fileTree.highlightFileInSidebar('docs/' + result.path);
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
  
  async function setupSearchEvents() {
    const { dom } = window.MarkdownPreview;
    if (!dom.searchInput) {
      console.error('searchInput not found!');
      return;
    }
    
    console.log('Setting up search events...');
    
    dom.searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        performSearch(e.target.value);
      }, 300);
    });
    
    dom.searchInput.addEventListener('focus', async () => {
      if (!searchIndex) {
        const count = await buildIndex();
        console.log(`Search index loaded: ${count} documents`);
      }
    });
    
    document.addEventListener('click', (e) => {
      if (!dom.searchInput.contains(e.target) && !dom.searchResults.contains(e.target)) {
        hideSearchResults();
      }
    });
  }
  
  window.MarkdownPreview.search = {
    init: setupSearchEvents,
    buildIndex: buildIndex
  };
})();
