(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  window.MarkdownPreview.renderers = window.MarkdownPreview.renderers || {};
  
  async function render() {
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
  
  window.MarkdownPreview.renderers.mermaid = {
    render
  };
})();
