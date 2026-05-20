(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  window.MarkdownPreview.renderers = window.MarkdownPreview.renderers || {};
  
  function render() {
    console.log('Checking music libraries...');
    console.log('  - abcjs:', typeof ABCJS !== 'undefined' ? 'loaded' : 'not loaded');
    console.log('  - verovio:', typeof verovio !== 'undefined' || typeof Verovio !== 'undefined' ? 'loaded' : 'not loaded');
    console.log('  - opensheetmusicdisplay:', (typeof opensheetmusicdisplay !== 'undefined' || typeof OpenSheetMusicDisplay !== 'undefined') ? 'loaded' : 'not loaded');
    
    const allPres = Array.from(document.querySelectorAll('.markdown-body pre'));
    
    // 反向遍历，避免 DOM 修改影响索引
    for (let i = allPres.length - 1; i >= 0; i--) {
      const pre = allPres[i];
      const codeElement = pre.querySelector('code');
      
      if (!codeElement) continue;
      
      const classList = codeElement.className;
      if (!classList) continue;
      
      const container = document.createElement('div');
      container.className = 'music-notation';
      container.style.margin = '1.5em 0';
      container.style.padding = '1.5em';
      container.style.background = 'var(--color-surface)';
      container.style.borderRadius = '12px';
      container.style.border = '1px solid var(--color-border)';
      container.style.overflowX = 'auto';
      
      if (classList.includes('language-abc')) {
        renderABCNotation(codeElement.textContent.trim(), container, pre);
      } else if (classList.includes('language-musicxml')) {
        renderMusicXML(codeElement.textContent.trim(), container, pre);
      } else if (classList.includes('language-osmd')) {
        renderOSMD(codeElement.textContent.trim(), container, pre);
      }
    }
  }
  
  function renderABCNotation(code, container, pre) {
    if (typeof ABCJS === 'undefined') {
      console.error('ABCJS library is not loaded');
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'ABCJS 库未加载';
      container.appendChild(errorDiv);
      if (pre.parentNode) {
        pre.parentNode.replaceChild(container, pre);
      }
      return;
    }
    
    try {
      const div = document.createElement('div');
      div.className = 'abc-container';
      container.appendChild(div);
      
      ABCJS.renderAbc(div, code, {
        responsive: 'resize',
        add_classes: true,
        staffwidth: 700
      });
      
      if (pre.parentNode) {
        pre.parentNode.replaceChild(container, pre);
      }
    } catch (error) {
      console.error('ABC notation rendering error:', error);
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'ABC 乐谱渲染错误: ' + error.message;
      container.appendChild(errorDiv);
      if (pre.parentNode) {
        pre.parentNode.replaceChild(container, pre);
      }
    }
  }
  
  function renderMusicXML(code, container, pre) {
    console.log('Checking Verovio library...', typeof verovio);
    // 尝试多种可能的全局命名空间
    const verovioLib = window.verovio || window.Verovio;
    if (typeof verovioLib === 'undefined') {
      console.error('Verovio library is not loaded');
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'Verovio 库未加载';
      container.appendChild(errorDiv);
      if (pre.parentNode) {
        pre.parentNode.replaceChild(container, pre);
      }
      return;
    }
    
    try {
      // 获取 toolkit 构造函数
      const ToolkitClass = verovioLib.toolkit || verovioLib.Toolkit || verovioLib;
      const tk = new ToolkitClass();
      
      const formattedCode = code
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\?xml[^>]*\?>/gi, '')
        .replace(/<!DOCTYPE score-partwise[^>]*>/gi, '')
        .trim();
      
      const svg = tk.renderData(formattedCode, {});
      const div = document.createElement('div');
      div.className = 'musicxml-container';
      div.innerHTML = svg;
      div.style.display = 'flex';
      div.style.justifyContent = 'center';
      div.style.overflowX = 'auto';
      container.appendChild(div);
      
      if (pre.parentNode) {
        pre.parentNode.replaceChild(container, pre);
      }
    } catch (error) {
      console.error('MusicXML rendering error:', error);
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'MusicXML 乐谱渲染错误: ' + error.message;
      container.appendChild(errorDiv);
      if (pre.parentNode) {
        pre.parentNode.replaceChild(container, pre);
      }
    }
  }
  
  function renderOSMD(code, container, pre) {
    // 尝试多种可能的全局命名空间
    const osmdLib = window.opensheetmusicdisplay || window.OpenSheetMusicDisplay;
    console.log('Checking OSMD library...', typeof osmdLib);
    
    if (typeof osmdLib === 'undefined') {
      console.error('OSMD library is not loaded');
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = 'OSMD 库未加载';
      container.appendChild(errorDiv);
      if (pre.parentNode) {
        pre.parentNode.replaceChild(container, pre);
      }
      return;
    }
    
    try {
      const div = document.createElement('div');
      div.className = 'osmd-container';
      div.style.minHeight = '300px';
      container.appendChild(div);
      
      const formattedCode = code
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\?xml[^>]*\?>/gi, '')
        .trim();
      
      // 先替换 DOM 元素
      if (pre.parentNode) {
        pre.parentNode.replaceChild(container, pre);
      }
      
      // 正确获取构造函数 - 简化
      const OSMDClass = osmdLib.OpenSheetMusicDisplay || osmdLib;
      const osmd = new OSMDClass(div);
      
      // 尝试直接渲染，简单配置
      try {
        // 有些版本可能需要不同的调用方式
        osmd.load(formattedCode).then(() => {
          osmd.render();
        }).catch(err => {
          console.error('OSMD loading error:', err);
          showFallbackError(container, 'OSMD 加载失败，请使用 Verovio 渲染');
        });
      } catch (loadErr) {
        console.error('OSMD direct loading failed:', loadErr);
        showFallbackError(container, 'OSMD 渲染失败，请使用 Verovio 渲染');
      }
    } catch (error) {
      console.error('OSMD rendering error:', error);
      showFallbackError(container, 'OSMD 渲染错误: ' + error.message);
      if (pre.parentNode) {
        pre.parentNode.replaceChild(container, pre);
      }
    }
  }
  
  // 辅助函数：显示错误信息
  function showFallbackError(container, message) {
    container.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.style.color = '#ff6b6b';
    errorDiv.style.padding = '10px';
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
  }
  
  window.MarkdownPreview.renderers.musicNotation = {
    render,
    renderABCNotation,
    renderMusicXML,
    renderOSMD
  };
})();
