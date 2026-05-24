export default {
  name: 'diff',
  description: 'Git diff visualization',
  
  test(code, language) {
    return language === 'diff';
  },
  
  render(code, container) {
    if (typeof Diff2Html === 'undefined' || typeof Diff2HtmlUI === 'undefined') {
      throw new Error('Diff2Html library is not loaded');
    }
    
    container.innerHTML = '';
    container.className = 'diff-container';
    container.style.margin = '1.5em 0';
    
    const configuration = {
      drawFileList: true,
      fileListToggle: true,
      outputFormat: 'line-by-line',
      matching: 'lines',
      synchronisedScroll: true,
      highlight: true
    };
    
    const diffJson = Diff2Html.parse(code);
    const diffHtml = Diff2Html.html(diffJson, configuration);
    container.innerHTML = diffHtml;
    
    const diff2htmlUi = new Diff2HtmlUI(container, code, configuration);
    diff2htmlUi.highlightCode();
  }
};
