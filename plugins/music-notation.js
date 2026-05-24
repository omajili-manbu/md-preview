export default {
  name: 'music-notation',
  description: 'Music notation rendering (ABC, MusicXML, OSMD)',
  supportedLanguages: ['abc', 'musicxml', 'osmd'],
  
  test(code, language) {
    return this.supportedLanguages.includes(language);
  },
  
  render(code, container) {
    const language = this.detectLanguage(code);
    
    container.innerHTML = '';
    container.className = 'music-notation';
    container.style.margin = '1.5em 0';
    container.style.padding = '1.5em';
    container.style.background = 'var(--color-surface)';
    container.style.borderRadius = '12px';
    container.style.border = '1px solid var(--color-border)';
    container.style.overflowX = 'auto';
    
    switch (language) {
      case 'abc':
        this.renderABC(code, container);
        break;
      case 'musicxml':
        this.renderMusicXML(code, container);
        break;
      case 'osmd':
        this.renderOSMD(code, container);
        break;
    }
  },
  
  detectLanguage(code) {
    if (code.includes('<score-partwise') || code.includes('<!DOCTYPE score-partwise')) {
      return 'musicxml';
    }
    if (code.includes('X:') && code.includes('M:')) {
      return 'abc';
    }
    return 'osmd';
  },
  
  renderABC(code, container) {
    if (typeof ABCJS === 'undefined') {
      throw new Error('ABCJS library is not loaded');
    }
    
    const div = document.createElement('div');
    div.className = 'abc-container';
    container.appendChild(div);
    
    ABCJS.renderAbc(div, code, {
      responsive: 'resize',
      add_classes: true,
      staffwidth: 700
    });
  },
  
  renderMusicXML(code, container) {
    const verovioLib = window.verovio || window.Verovio;
    if (typeof verovioLib === 'undefined') {
      throw new Error('Verovio library is not loaded');
    }
    
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
  },
  
  renderOSMD(code, container) {
    const osmdLib = window.opensheetmusicdisplay || window.OpenSheetMusicDisplay;
    if (typeof osmdLib === 'undefined') {
      throw new Error('OSMD library is not loaded');
    }
    
    const div = document.createElement('div');
    div.className = 'osmd-container';
    div.style.minHeight = '300px';
    container.appendChild(div);
    
    const formattedCode = code
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<\?xml[^>]*\?>/gi, '')
      .trim();
    
    const OSMDClass = osmdLib.OpenSheetMusicDisplay || osmdLib;
    const osmd = new OSMDClass(div);
    
    osmd.load(formattedCode).then(() => {
      osmd.render();
    }).catch(err => {
      throw new Error('OSMD 加载失败: ' + err.message);
    });
  }
};
