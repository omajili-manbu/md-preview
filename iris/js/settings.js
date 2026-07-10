(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};

  const STORAGE_KEY = 'md-preview-settings';

  const defaultSettings = {
    showReadingProgress: true,
    showWordCount: false,
    codeTheme: 'github'
  };

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { 
          ...defaultSettings, 
          showReadingProgress: parsed.showReadingProgress ?? defaultSettings.showReadingProgress,
          showWordCount: parsed.showWordCount ?? defaultSettings.showWordCount,
          codeTheme: parsed.codeTheme ?? defaultSettings.codeTheme
        };
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
    const showReadingProgressToggle = document.getElementById('showReadingProgressToggle');
    const showWordCountToggle = document.getElementById('showWordCountToggle');
    const codeThemeSelect = document.getElementById('codeThemeSelect');

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

    showReadingProgressToggle?.addEventListener('change', (e) => {
      const settings = loadSettings();
      settings.showReadingProgress = e.target.checked;
      saveSettings(settings);
      toggleReadingProgress(settings.showReadingProgress);
    });

    showWordCountToggle?.addEventListener('change', (e) => {
      const settings = loadSettings();
      settings.showWordCount = e.target.checked;
      saveSettings(settings);
      toggleWordCount(settings.showWordCount);
    });

    codeThemeSelect?.addEventListener('change', (e) => {
      const settings = loadSettings();
      settings.codeTheme = e.target.value;
      saveSettings(settings);
      applyCodeTheme(settings.codeTheme);
    });
  }

  function applyCodeTheme(theme) {
    const link = document.getElementById('hljs-theme');
    if (link) {
      link.href = `iris/vendor/highlight.js/styles/${theme}.css`;
    }
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

  function toggleReadingProgress(show) {
    const readingProgress = document.getElementById('readingProgress');
    if (readingProgress) {
      readingProgress.style.display = show ? 'block' : 'none';
    }
  }
  
  function toggleWordCount(show) {
    if (window.MarkdownPreview?.fileTree?.setWordCountVisibility) {
      window.MarkdownPreview.fileTree.setWordCountVisibility(show);
    }
  }
  
  function downloadCurrentFile() {
    const { state } = window.MarkdownPreview;
    const currentPath = state.currentFilePath;
    
    if (!currentPath) {
      alert('请先打开一个文档');
      return;
    }
    
    const fileName = currentPath.split('/').pop().replace('.md', '');
    downloadMarkdown(currentPath, fileName);
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
  
  function initDownloadButtons() {
    const downloadMdBtn = document.getElementById('downloadMdBtn');
    
    downloadMdBtn?.addEventListener('click', () => downloadCurrentFile());
  }

  function init() {
    const settings = loadSettings();
    initFloatingMenu();
    initSettingsPanel();
    initDownloadButtons();
    toggleReadingProgress(settings.showReadingProgress);
    toggleWordCount(settings.showWordCount);
    applyCodeTheme(settings.codeTheme);

    const showReadingProgressToggle = document.getElementById('showReadingProgressToggle');
    const showWordCountToggle = document.getElementById('showWordCountToggle');
    const codeThemeSelect = document.getElementById('codeThemeSelect');

    if (showReadingProgressToggle) showReadingProgressToggle.checked = settings.showReadingProgress;
    if (showWordCountToggle) showWordCountToggle.checked = settings.showWordCount;
    if (codeThemeSelect) codeThemeSelect.value = settings.codeTheme;
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
