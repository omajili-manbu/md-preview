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
    indexTree: document.getElementById('indexTree'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
    pageHeader: document.getElementById('pageHeader'),
    pageBreadcrumbs: document.getElementById('pageBreadcrumbs'),
    editPageBtn: document.getElementById('editPageBtn'),
    commentsSection: document.getElementById('commentsSection'),
    giscusContainer: document.getElementById('giscusContainer'),
    docFeedback: document.getElementById('docFeedback'),
    floatingMenu: document.getElementById('floatingMenu'),
    menuTrigger: document.getElementById('menuTrigger'),
    menuItems: document.querySelector('.menu-items'),
    backToTopBtn: document.getElementById('backToTopBtn'),
    goToCommentsBtn: document.getElementById('goToCommentsBtn'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    settingsOverlay: document.getElementById('settingsOverlay'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    showCommentsToggle: document.getElementById('showCommentsToggle'),
    showReadingProgressToggle: document.getElementById('showReadingProgressToggle')
  };
})();
