(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};

  const STORAGE_KEY = 'md-preview-settings';

  const defaultSettings = {
    showComments: true,
    showReadingProgress: true
  };

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, showComments: parsed.showComments ?? defaultSettings.showComments, showReadingProgress: parsed.showReadingProgress ?? defaultSettings.showReadingProgress };
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return defaultSettings;
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  function initFloatingMenu() {
    const floatingMenu = document.getElementById('floatingMenu');
    const menuTrigger = document.getElementById('menuTrigger');
    const menuItems = document.querySelector('.menu-items');
    const backToTopBtn = document.getElementById('backToTopBtn');
    const goToCommentsBtn = document.getElementById('goToCommentsBtn');
    const openSettingsBtn = document.getElementById('openSettingsBtn');

    if (!floatingMenu || !menuTrigger || !menuItems) {
      return;
    }

    menuTrigger.addEventListener('click', () => {
      const isOpen = menuItems.classList.contains('open');
      menuItems.classList.toggle('open');
      menuTrigger.classList.toggle('active');
    });

    backToTopBtn?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      menuItems.classList.remove('open');
      menuTrigger.classList.remove('active');
    });

    goToCommentsBtn?.addEventListener('click', () => {
      const commentsSection = document.getElementById('commentsSection');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth' });
      }
      menuItems.classList.remove('open');
      menuTrigger.classList.remove('active');
    });

    openSettingsBtn?.addEventListener('click', () => {
      openSettingsPanel();
      menuItems.classList.remove('open');
      menuTrigger.classList.remove('active');
    });

    document.addEventListener('click', (e) => {
      if (!floatingMenu.contains(e.target) && menuItems.classList.contains('open')) {
        menuItems.classList.remove('open');
        menuTrigger.classList.remove('active');
      }
    });
  }

  function initSettingsPanel() {
    const settingsOverlay = document.getElementById('settingsOverlay');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const showCommentsToggle = document.getElementById('showCommentsToggle');
    const showReadingProgressToggle = document.getElementById('showReadingProgressToggle');

    if (!settingsOverlay) {
      return;
    }

    closeSettingsBtn?.addEventListener('click', () => {
      closeSettingsPanel();
    });

    settingsOverlay.addEventListener('click', (e) => {
      if (e.target === settingsOverlay) {
        closeSettingsPanel();
      }
    });

    showCommentsToggle?.addEventListener('change', (e) => {
      const settings = loadSettings();
      settings.showComments = e.target.checked;
      saveSettings(settings);
      toggleComments(settings.showComments);
    });

    showReadingProgressToggle?.addEventListener('change', (e) => {
      const settings = loadSettings();
      settings.showReadingProgress = e.target.checked;
      saveSettings(settings);
      toggleReadingProgress(settings.showReadingProgress);
    });
  }

  function openSettingsPanel() {
    const settingsOverlay = document.getElementById('settingsOverlay');
    if (settingsOverlay) {
      settingsOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSettingsPanel() {
    const settingsOverlay = document.getElementById('settingsOverlay');
    if (settingsOverlay) {
      settingsOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function toggleComments(show) {
    const commentsSection = document.getElementById('commentsSection');
    if (commentsSection) {
      commentsSection.style.display = show ? 'block' : 'none';
    }
  }

  function toggleReadingProgress(show) {
    const readingProgress = document.getElementById('readingProgress');
    if (readingProgress) {
      readingProgress.style.display = show ? 'block' : 'none';
    }
  }
  
  function downloadCurrentFile(format) {
    const { state } = window.MarkdownPreview;
    const currentPath = state.currentFilePath;
    
    if (!currentPath) {
      alert('请先打开一个文档');
      return;
    }
    
    const fileName = currentPath.split('/').pop().replace('.md', '');
    
    if (format === 'md') {
      downloadMarkdown(currentPath, fileName);
    } else if (format === 'pdf') {
      downloadPDF(fileName);
    }
  }
  
  async function downloadMarkdown(path, fileName) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const content = await response.text();
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('下载失败，请重试');
    }
  }
  
  function downloadPDF(fileName) {
    const markdownContent = document.getElementById('markdownContent');
    if (!markdownContent) {
      alert('无法获取文档内容');
      return;
    }
    
    const originalTitle = document.title;
    document.title = fileName;
    
    const printStyle = document.createElement('style');
    printStyle.id = 'print-style-temp';
    printStyle.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        #markdownContent,
        #markdownContent * {
          visibility: visible;
        }
        #markdownContent {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          padding: 20px;
        }
        .page-header,
        .doc-navigation,
        #commentsSection,
        #floatingMenuBtn,
        #settingsPanel {
          display: none !important;
        }
        .markdown-body h1, h2, h3, h4, h5, h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          page-break-after: avoid;
        }
        pre, img, .geo-map, table {
          page-break-inside: avoid;
        }
        .geo-map {
          height: 300px !important;
        }
        @page {
          margin: 2cm;
        }
      }
    `;
    document.head.appendChild(printStyle);
    
    const onAfterPrint = () => {
      document.title = originalTitle;
      const style = document.getElementById('print-style-temp');
      if (style) style.remove();
      window.removeEventListener('afterprint', onAfterPrint);
    };
    
    window.addEventListener('afterprint', onAfterPrint);
    
    setTimeout(() => {
      window.print();
    }, 100);
  }
  
  function initDownloadButtons() {
    const downloadMdBtn = document.getElementById('downloadMdBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    
    downloadMdBtn?.addEventListener('click', () => downloadCurrentFile('md'));
    downloadPdfBtn?.addEventListener('click', () => downloadCurrentFile('pdf'));
  }

  function init() {
    const settings = loadSettings();
    initFloatingMenu();
    initSettingsPanel();
    initDownloadButtons();
    toggleComments(settings.showComments);
    toggleReadingProgress(settings.showReadingProgress);

    const showCommentsToggle = document.getElementById('showCommentsToggle');
    const showReadingProgressToggle = document.getElementById('showReadingProgressToggle');

    if (showCommentsToggle) showCommentsToggle.checked = settings.showComments;
    if (showReadingProgressToggle) showReadingProgressToggle.checked = settings.showReadingProgress;
  }

  window.MarkdownPreview.settings = {
    load: loadSettings,
    save: saveSettings,
    open: openSettingsPanel,
    close: closeSettingsPanel,
    init: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
