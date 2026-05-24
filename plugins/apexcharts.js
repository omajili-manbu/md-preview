export default {
  name: 'apexcharts',
  description: 'ApexCharts chart rendering',
  
  test(code, language) {
    if (language === 'apexcharts') {
      try {
        JSON.parse(code);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  },
  
  render(code, container) {
    if (typeof ApexCharts === 'undefined') {
      throw new Error('ApexCharts library is not loaded');
    }
    
    const chartConfig = JSON.parse(code);
    const chartId = 'apexchart-' + Date.now();
    
    const chartContainer = document.createElement('div');
    chartContainer.id = chartId;
    chartContainer.className = 'apex-chart';
    chartContainer.style.minHeight = '400px';
    
    const mergedConfig = {
      ...chartConfig,
      chart: {
        ...chartConfig.chart,
        id: chartId,
        toolbar: { show: true }
      },
      colors: chartConfig.colors || ['#8B5CF6', '#D946EF', '#3B82F6', '#10B981', '#F59E0B'],
      theme: { mode: 'light' }
    };
    
    container.innerHTML = '';
    container.appendChild(chartContainer);
    
    setTimeout(() => {
      const chart = new ApexCharts(chartContainer, mergedConfig);
      chart.render();
    }, 50);
  }
};
