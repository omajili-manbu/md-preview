(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  window.MarkdownPreview.renderers = window.MarkdownPreview.renderers || {};
  
  function render() {
    if (typeof katex === 'undefined' || typeof renderMathInElement === 'undefined') {
      console.error('KaTeX library is not loaded');
      return;
    }
    
    const markdownBody = document.querySelector('.markdown-body');
    if (!markdownBody) return;
    
    try {
      renderMathInElement(markdownBody, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\[', right: '\\]', display: true},
          {left: '\\(', right: '\\)', display: false}
        ],
        ignoredTags: [
          'script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'
        ],
        throwOnError: false,
        trust: true,
        strict: false,
        macros: {
          '\\f': '#1f(#2)',
          '\\bm': '\\boldsymbol{#1}',
          '\\dif': '\\mathrm{d}',
          '\\pdif': '\\partial'
        }
      });
      
      document.querySelectorAll('.katex-block').forEach(block => {
        const latex = block.textContent;
        if (latex && !block.querySelector('.katex')) {
          try {
            katex.render(latex, block, {
              displayMode: true,
              throwOnError: false,
              trust: true,
              strict: false
            });
          } catch (e) {
            console.error('KaTeX block rendering error:', e);
          }
        }
      });
    } catch (error) {
      console.error('KaTeX rendering error:', error);
    }
  }
  
  window.MarkdownPreview.renderers.katex = {
    render
  };
})();
