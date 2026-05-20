(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  
  window.MarkdownPreview.dom = {
    fileTree: document.getElementById('fileTree'),
    markdownContent: document.getElementById('markdownContent'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    progressBar: document.getElementById('progressBar'),
    readingProgressBar: document.querySelector('.reading-progress-bar'),
    modeFiles: document.getElementById('modeFiles'),
    modeIndex: document.getElementById('modeIndex'),
    indexTree: document.getElementById('indexTree')
  };
})();
