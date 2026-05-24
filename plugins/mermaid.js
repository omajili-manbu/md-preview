export default {
  name: 'mermaid',
  description: 'Mermaid diagram rendering',
  
  test(code, language) {
    return language === 'mermaid';
  },
  
  async render(code, container) {
    if (typeof mermaid === 'undefined') {
      throw new Error('Mermaid library is not loaded');
    }
    
    const id = 'mermaid-' + Date.now();
    
    try {
      const { svg } = await mermaid.render(id, code);
      const div = document.createElement('div');
      div.className = 'mermaid-diagram';
      div.innerHTML = svg;
      container.innerHTML = '';
      container.appendChild(div);
    } catch (error) {
      throw new Error('Mermaid 渲染错误: ' + error.message);
    }
  }
};
