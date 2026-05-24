  async function renderWithPlugins() {
    const plugins = window.MarkdownPreview.plugins;
    console.log('[Plugins] renderWithPlugins called');
    if (!plugins || typeof plugins.find !== 'function') {
      console.log('[Plugins] Plugins system not ready');
      return;
    }
    
    const allPres = document.querySelectorAll('.markdown-body pre');
    console.log('[Plugins] Found pre elements:', allPres.length);
    
    for (const pre of allPres) {
      const codeElement = pre.querySelector('code');
      if (!codeElement) continue;
      
      const classList = codeElement.className;
      const languageMatch = classList ? classList.match(/language-(\S+)/) : null;
      const language = languageMatch ? languageMatch[1] : '';
      const code = codeElement.textContent.trim();
      
      console.log('[Plugins] Checking code block, language:', language);
      
      const plugin = plugins.find(code, language);
      if (plugin) {
        console.log('[Plugins] Found plugin for language:', language, 'Plugin:', plugin.name);
        try {
          const container = document.createElement('div');
          container.className = `plugin-rendered plugin-${plugin.name}`;
          pre.parentNode.replaceChild(container, pre);
          plugin.render(code, container);
        } catch (error) {
          console.error(`[Plugins] Plugin ${plugin.name} render error:`, error);
        }
      }
    }
  }
