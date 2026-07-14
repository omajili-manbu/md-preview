/**
 * Packet Tracer 拓扑渲染器
 *
 * 功能：
 * - 读取预处理好的 JSON，用 Cytoscape.js 渲染网络拓扑
 * - 节点：设备图标 + 名称标签 + 主 IP
 * - 连线：贝塞尔曲线 + 颜色编码线缆类型 + 粗细编码速率
 * - 交互：缩放平移 / 节点拖拽 / hover 高亮 / 点击展开右侧抽屉
 * - 详情抽屉：Tab 分页（接口表/配置/VLAN/ACL/路由）+ IOS 高亮 + 折叠
 * - 搜索：按设备名/IP/类型搜索高亮
 * - 布局切换：PT 坐标 ↔ 力导向
 * - 导出：PNG / JSON / Markdown 表格
 * - 主题：自动跟随 CSS 变量
 * - 移动端：触摸优化 + 底部抽屉
 */

(function() {
  'use strict';

  window.MarkdownPreview = window.MarkdownPreview || {};

  // ============== 设备类型 → SVG 图标映射 ==============
  const DEVICE_ICONS = {
    'router': 'pkt-router',
    'switch': 'pkt-switch',
    'pc': 'pkt-pc',
    'server': 'pkt-server',
    'laptop': 'pkt-laptop',
    'firewall': 'pkt-firewall',
    'phone': 'pkt-phone',
    'access-point': 'pkt-access-point',
    'cloud': 'pkt-cloud',
    'hub': 'pkt-hub',
    'tv': 'pkt-tv',
    'tablet': 'pkt-tablet',
    'unknown': 'pkt-unknown',
  };

  // ============== 线缆类型颜色 ==============
  const CABLE_COLORS = {
    'straight': '#3498db',
    'crossover': '#e74c3c',
    'fiber': '#9b59b6',
    'serial': '#f39c12',
    'serial-dce': '#e67e22',
    'serial-dte': '#d35400',
    'console': '#27ae60',
    'coaxial': '#7f8c8d',
    'wireless': '#1abc9c',
    'unknown': '#bdc3c7',
  };

  // ============== IOS 语法高亮 ==============

  const IOS_KEYWORDS = [
    'interface', 'router', 'ip', 'no', 'shutdown', 'exit',
    'description', 'bandwidth', 'duplex', 'speed', 'vlan',
    'access-list', 'route', 'network', 'area', 'switchport',
    'access', 'trunk', 'encapsulation', 'channel-group',
    'standby', 'priority', 'preempt', 'track', 'ppp',
    'clock', 'rate',
  ];

  function highlightIOS(text) {
    if (!text) return '';
    // 转义 HTML
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 注释（! 开头的行）
    html = html.replace(/^!.*$/gm, m => `<span class="ios-comment">${m}</span>`);

    // interface 行
    html = html.replace(/^(\s*)(interface\s+\S+)/gm, (m, indent, iface) =>
      `${indent}<span class="ios-interface">${iface}</span>`);

    // shutdown
    html = html.replace(/^(\s*)(shutdown)$/gm, (m, indent, s) =>
      `${indent}<span class="ios-shutdown">${s}</span>`);

    // IP 地址
    html = html.replace(/(\d+\.\d+\.\d+\.\d+)/g, '<span class="ios-ip">$1</span>');

    // 数字
    html = html.replace(/\b(\d+)\b/g, '<span class="ios-number">$1</span>');

    // 关键字
    const kwPattern = new RegExp(`\\b(${IOS_KEYWORDS.join('|')})\\b`, 'g');
    html = html.replace(kwPattern, '<span class="ios-keyword">$1</span>');

    return html;
  }

  // ============== 渲染单个拓扑 ==============

  function renderTopology(container, jsonData, options) {
    options = options || {};
    const sourceFile = jsonData.meta?.source || 'unknown.pkt';

    // 错误处理
    if (jsonData.error) {
      container.innerHTML = `
        <div class="pkt-topology-container">
          <div class="pkt-error-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <div class="pkt-error-title">解析失败：${sourceFile}</div>
            <div class="pkt-error-message">${jsonData.error.message || '未知错误'}</div>
            <div class="pkt-error-detail">${jsonData.error.detail || jsonData.error.message || ''}</div>
          </div>
        </div>
      `;
      return null;
    }

    // 构建 DOM 结构
    const wrapper = document.createElement('div');
    wrapper.className = 'pkt-topology-container';
    wrapper.innerHTML = `
      <div class="pkt-toolbar">
        <div class="pkt-toolbar-left">
          <span class="pkt-toolbar-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="6" cy="6" r="2"/>
              <circle cx="18" cy="6" r="2"/>
              <circle cx="6" cy="18" r="2"/>
              <circle cx="18" cy="18" r="2"/>
              <path d="M8 6h8M6 8v8M18 8v8M8 18h8"/>
            </svg>
            ${sourceFile}
          </span>
        </div>
        <div class="pkt-toolbar-right">
          <input type="search" class="pkt-search-input" placeholder="搜索设备..." />
          <button class="pkt-btn" data-action="layout-pt" title="使用 PT 原始坐标布局">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg>
            PT 坐标
          </button>
          <button class="pkt-btn" data-action="layout-force" title="力导向自动布局">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 6h8M6 8l4 8M18 8l-4 8"/></svg>
            力导向
          </button>
          <button class="pkt-btn" data-action="toggle-grid" title="切换网格背景">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
            网格
          </button>
          <button class="pkt-btn" data-action="fit" title="适应屏幕">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"/></svg>
            复位
          </button>
          <button class="pkt-btn" data-action="export" title="导出">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            导出
          </button>
        </div>
      </div>
      <div class="pkt-canvas-wrapper">
        <div class="pkt-canvas"></div>
      </div>
      <div class="pkt-statusbar">
        <div class="pkt-statusbar-left">
          <span class="pkt-statusbar-item">设备 <strong>${jsonData.meta.deviceCount}</strong></span>
          <span class="pkt-statusbar-item">链路 <strong>${jsonData.meta.linkCount}</strong></span>
          <span class="pkt-statusbar-item">配置 <strong>${jsonData.meta.configCount}</strong></span>
          <span class="pkt-statusbar-item">${jsonData.meta.ptVersion || ''}</span>
        </div>
        <div class="pkt-statusbar-right">
          <span class="pkt-zoom-display">100%</span>
        </div>
      </div>
    `;
    container.appendChild(wrapper);

    const canvasEl = wrapper.querySelector('.pkt-canvas');
    const canvasWrapper = wrapper.querySelector('.pkt-canvas-wrapper');

    // 构建 Cytoscape 元素
    const elements = [];

    // 设备节点
    (jsonData.devices || []).forEach(dev => {
      elements.push({
        group: 'nodes',
        data: {
          id: dev.id,
          label: dev.name,
          deviceType: dev.type,
          primaryIp: dev.primaryIp || '',
          model: dev.model || '',
          rawType: dev.rawType || '',
        },
        position: { x: dev.x || 0, y: dev.y || 0 },
      });
    });

    // 链路边
    (jsonData.links || []).forEach(link => {
      if (link.source && link.target) {
        elements.push({
          group: 'edges',
          data: {
            id: link.id || `e-${link.source}-${link.target}`,
            source: link.source,
            target: link.target,
            cableType: link.cableType,
            cableRawType: link.cableRawType || '',
            sourceInterface: link.sourceInterface || '',
            targetInterface: link.targetInterface || '',
            bandwidth: link.bandwidth,
          },
        });
      }
    });

    // 初始化 Cytoscape
    const cy = cytoscape({
      container: canvasEl,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'width': 40,
            'height': 40,
            'shape': 'rectangle',
            'background-color': '#fff',
            'background-opacity': 0,
            'label': 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 4,
            'font-size': '11px',
            'font-weight': 500,
            'color': getCSSVar('--color-text', '#333'),
            'overlay-padding': '6px',
            'overlay-opacity': 0,
          },
        },
        {
          selector: 'node[type="router"]',
          style: { 'background-image': getIconDataURI('router'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="switch"]',
          style: { 'background-image': getIconDataURI('switch'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="pc"]',
          style: { 'background-image': getIconDataURI('pc'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="server"]',
          style: { 'background-image': getIconDataURI('server'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="firewall"]',
          style: { 'background-image': getIconDataURI('firewall'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="laptop"]',
          style: { 'background-image': getIconDataURI('laptop'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="phone"]',
          style: { 'background-image': getIconDataURI('phone'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="access-point"]',
          style: { 'background-image': getIconDataURI('access-point'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="cloud"]',
          style: { 'background-image': getIconDataURI('cloud'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="hub"]',
          style: { 'background-image': getIconDataURI('hub'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="tv"]',
          style: { 'background-image': getIconDataURI('tv'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="tablet"]',
          style: { 'background-image': getIconDataURI('tablet'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[type="unknown"]',
          style: { 'background-image': getIconDataURI('unknown'), 'background-fit': 'contain', 'background-opacity': 1, 'background-color': 'transparent' },
        },
        {
          selector: 'node[?primaryIp]',
          style: { 'text-wrap': 'wrap', 'text-max-width': '80px' },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'curve-style': 'bezier',
            'line-color': getCSSVar('--color-border', '#ccc'),
            'target-arrow-color': getCSSVar('--color-border', '#ccc'),
            'target-arrow-shape': 'none',
            'arrow-scale': 0.8,
            'opacity': 0.7,
            'label': '',
          },
        },
        {
          selector: 'edge[cableType="straight"]',
          style: { 'line-color': CABLE_COLORS.straight, 'width': 2 },
        },
        {
          selector: 'edge[cableType="crossover"]',
          style: { 'line-color': CABLE_COLORS.crossover, 'width': 2 },
        },
        {
          selector: 'edge[cableType="fiber"]',
          style: { 'line-color': CABLE_COLORS.fiber, 'width': 3 },
        },
        {
          selector: 'edge[cableType="serial"]',
          style: { 'line-color': CABLE_COLORS.serial, 'width': 2 },
        },
        {
          selector: 'edge[cableType="console"]',
          style: { 'line-color': CABLE_COLORS.console, 'width': 1, 'line-style': 'dashed' },
        },
        {
          selector: 'edge[cableType="wireless"]',
          style: { 'line-color': CABLE_COLORS.wireless, 'width': 2, 'line-style': 'dotted' },
        },
        {
          selector: '.highlighted',
          style: { 'opacity': 1, 'border-width': 3, 'border-color': getCSSVar('--color-accent-purple', '#9b59b6') },
        },
        {
          selector: '.faded',
          style: { 'opacity': 0.2 },
        },
        {
          selector: ':selected',
          style: { 'border-width': 3, 'border-color': getCSSVar('--color-accent-purple', '#9b59b6') },
        },
      ],
      layout: { name: 'preset', fit: true, padding: 40 },
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 3,
    });

    // 设置节点 type 属性（用于样式选择器）
    cy.nodes().forEach(node => {
      const devType = node.data('deviceType') || 'unknown';
      node.addClass(`type-${devType}`);
      // 直接设置 background-image
      const iconURI = getIconDataURI(devType);
      if (iconURI) {
        node.style('background-image', iconURI);
        node.style('background-fit', 'contain');
        node.style('background-opacity', 1);
        node.style('background-color', 'transparent');
      }
    });

    // 适应屏幕
    cy.fit(cy.elements(), 40);

    // 更新缩放显示
    const zoomDisplay = wrapper.querySelector('.pkt-zoom-display');
    const updateZoom = () => {
      if (zoomDisplay) zoomDisplay.textContent = Math.round(cy.zoom() * 100) + '%';
    };
    cy.on('zoom', updateZoom);
    updateZoom();

    // hover 高亮链路
    cy.edges().on('mouseover', evt => {
      const edge = evt.target;
      edge.style('width', parseFloat(edge.style('width')) + 2);
      edge.style('opacity', 1);
      // 显示 tooltip
      const cableType = edge.data('cableType') || 'unknown';
      const srcIf = edge.data('sourceInterface');
      const dstIf = edge.data('targetInterface');
      const bw = edge.data('bandwidth');
      let tooltip = `${cableType}`;
      if (srcIf || dstIf) tooltip += `\n${srcIf || '?'} ↔ ${dstIf || '?'}`;
      if (bw) tooltip += `\n带宽: ${bw} Kbps`;
      showTooltip(evt.originalEvent, tooltip);
    });

    cy.edges().on('mouseout', evt => {
      const edge = evt.target;
      const cableType = edge.data('cableType');
      const width = cableType === 'fiber' ? 3 : 2;
      edge.style('width', width);
      edge.style('opacity', 0.7);
      hideTooltip();
    });

    // 点击设备节点 → 打开详情抽屉
    cy.nodes().on('tap', evt => {
      const node = evt.target;
      openDrawer(node, jsonData);
    });

    // ============== 工具栏按钮 ==============

    wrapper.querySelector('[data-action="layout-pt"]').addEventListener('click', () => {
      cy.layout({ name: 'preset', fit: true, padding: 40 }).run();
      setActiveBtn(wrapper, 'layout-pt');
    });

    wrapper.querySelector('[data-action="layout-force"]').addEventListener('click', () => {
      cy.layout({
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        padding: 40,
      }).run();
      setActiveBtn(wrapper, 'layout-force');
    });

    wrapper.querySelector('[data-action="toggle-grid"]').addEventListener('click', () => {
      canvasWrapper.classList.toggle('grid');
      wrapper.querySelector('[data-action="toggle-grid"]').classList.toggle('active');
    });

    wrapper.querySelector('[data-action="fit"]').addEventListener('click', () => {
      cy.fit(cy.elements(), 40);
    });

    wrapper.querySelector('[data-action="export"]').addEventListener('click', (e) => {
      showExportMenu(e, cy, jsonData, sourceFile);
    });

    // 搜索
    const searchInput = wrapper.querySelector('.pkt-search-input');
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        cy.elements().removeClass('faded highlighted');
        return;
      }
      cy.elements().removeClass('highlighted').addClass('faded');
      const matched = cy.nodes().filter(node => {
        const name = (node.data('label') || '').toLowerCase();
        const ip = (node.data('primaryIp') || '').toLowerCase();
        const type = (node.data('deviceType') || '').toLowerCase();
        return name.includes(query) || ip.includes(query) || type.includes(query);
      });
      matched.removeClass('faded').addClass('highlighted');
      matched.connectedEdges().removeClass('faded');
    });

    // 触摸优化（移动端双指缩放由 Cytoscape 默认支持）

    return cy;
  }

  // ============== 辅助函数 ==============

  function getCSSVar(name, fallback) {
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return val || fallback;
  }

  function getIconDataURI(deviceType) {
    const symbolId = DEVICE_ICONS[deviceType] || DEVICE_ICONS['unknown'];
    const symbol = document.querySelector(`#${symbolId}`);
    if (!symbol) return '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="${getCSSVar('--color-text', '#333')}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${symbol.innerHTML}</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function setActiveBtn(wrapper, action) {
    wrapper.querySelectorAll('.pkt-btn').forEach(btn => btn.classList.remove('active'));
    const btn = wrapper.querySelector(`[data-action="${action}"]`);
    if (btn) btn.classList.add('active');
  }

  // ============== Tooltip ==============

  let tooltipEl = null;

  function showTooltip(event, text) {
    hideTooltip();
    tooltipEl = document.createElement('div');
    tooltipEl.style.cssText = `
      position: fixed;
      z-index: 9999;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      border-radius: 4px;
      pointer-events: none;
      white-space: pre;
      line-height: 1.5;
      max-width: 300px;
    `;
    tooltipEl.textContent = text;
    document.body.appendChild(tooltipEl);
    tooltipEl.style.left = (event.clientX + 12) + 'px';
    tooltipEl.style.top = (event.clientY + 12) + 'px';
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
  }

  // ============== 右侧抽屉 ==============

  let drawerEl = null;
  let drawerOverlayEl = null;

  function openDrawer(node, jsonData) {
    closeDrawer();

    const devId = node.data('id');
    const devName = node.data('label');
    const devType = node.data('deviceType') || 'unknown';
    const primaryIp = node.data('primaryIp') || '';
    const model = node.data('model') || '';
    const rawType = node.data('rawType') || '';

    const config = (jsonData.configs || []).find(c => c.deviceId === devId);
    const interfaces = jsonData.interfaces?.[devId] || [];
    const vlans = jsonData.vlans?.[devId] || [];
    const acls = jsonData.acls?.[devId] || [];
    const routes = jsonData.routes?.[devId] || [];

    const iconId = DEVICE_ICONS[devType] || DEVICE_ICONS['unknown'];

    // 创建遮罩
    drawerOverlayEl = document.createElement('div');
    drawerOverlayEl.className = 'pkt-drawer-overlay';
    drawerOverlayEl.addEventListener('click', closeDrawer);
    document.body.appendChild(drawerOverlayEl);

    // 创建抽屉
    drawerEl = document.createElement('div');
    drawerEl.className = 'pkt-drawer';
    drawerEl.innerHTML = `
      <div class="pkt-drawer-header">
        <div class="pkt-drawer-title">
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6">
            <use href="#${iconId}"/>
          </svg>
          ${devName}
        </div>
        <button class="pkt-drawer-close" title="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="pkt-drawer-meta">
        <div class="pkt-meta-item">
          <span class="pkt-meta-label">类型</span>
          <span class="pkt-meta-value">${devType}</span>
        </div>
        <div class="pkt-meta-item">
          <span class="pkt-meta-label">主 IP</span>
          <span class="pkt-meta-value">${primaryIp || '-'}</span>
        </div>
        <div class="pkt-meta-item">
          <span class="pkt-meta-label">型号</span>
          <span class="pkt-meta-value">${model || rawType || '-'}</span>
        </div>
      </div>
      <div class="pkt-drawer-tabs">
        <button class="pkt-tab active" data-tab="interfaces">接口 (${interfaces.length})</button>
        <button class="pkt-tab" data-tab="config">配置</button>
        <button class="pkt-tab" data-tab="vlans">VLAN (${vlans.length})</button>
        <button class="pkt-tab" data-tab="acls">ACL (${acls.length})</button>
        <button class="pkt-tab" data-tab="routes">路由 (${routes.length})</button>
      </div>
      <div class="pkt-drawer-body">
        ${renderInterfacesTab(interfaces)}
        ${renderConfigTab(config?.config || '')}
        ${renderVlansTab(vlans)}
        ${renderAclsTab(acls)}
        ${renderRoutesTab(routes)}
      </div>
    `;
    document.body.appendChild(drawerEl);

    // 触发动画
    requestAnimationFrame(() => {
      drawerOverlayEl.classList.add('visible');
      drawerEl.classList.add('visible');
    });

    // 关闭按钮
    drawerEl.querySelector('.pkt-drawer-close').addEventListener('click', closeDrawer);

    // Tab 切换
    drawerEl.querySelectorAll('.pkt-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        drawerEl.querySelectorAll('.pkt-tab').forEach(t => t.classList.remove('active'));
        drawerEl.querySelectorAll('.pkt-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        drawerEl.querySelector(`.pkt-tab-content[data-tab="${tab.dataset.tab}"]`).classList.add('active');
      });
    });

    // 配置折叠
    drawerEl.querySelectorAll('.pkt-config-header').forEach(header => {
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('collapsed');
      });
    });
  }

  function closeDrawer() {
    if (drawerEl) {
      drawerEl.classList.remove('visible');
      drawerOverlayEl?.classList.remove('visible');
      setTimeout(() => {
        drawerEl?.remove();
        drawerOverlayEl?.remove();
        drawerEl = null;
        drawerOverlayEl = null;
      }, 250);
    }
  }

  // ============== Tab 内容渲染 ==============

  function renderInterfacesTab(interfaces) {
    if (!interfaces.length) {
      return `<div class="pkt-tab-content active" data-tab="interfaces"><p style="color:var(--color-text-muted,#888);font-size:13px;text-align:center;padding:20px;">无接口信息</p></div>`;
    }
    const rows = interfaces.map(iface => `
      <tr>
        <td>${iface.name}</td>
        <td>${iface.ip || '-'}</td>
        <td>${iface.mask || '-'}</td>
        <td><span class="pkt-status-badge ${iface.status}">${iface.status}</span></td>
        <td>${iface.duplex || '-'}</td>
        <td>${iface.speed || '-'}</td>
        <td>${iface.description || '-'}</td>
      </tr>
    `).join('');
    return `
      <div class="pkt-tab-content active" data-tab="interfaces">
        <table class="pkt-interface-table">
          <thead>
            <tr>
              <th>接口</th><th>IP</th><th>掩码</th><th>状态</th><th>双工</th><th>速率</th><th>描述</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderConfigTab(configText) {
    if (!configText) {
      return `<div class="pkt-tab-content" data-tab="config"><p style="color:var(--color-text-muted,#888);font-size:13px;text-align:center;padding:20px;">无配置信息</p></div>`;
    }
    // 按 interface 分块
    const blocks = configText.split(/^(interface\s+\S+)/m);
    const htmlBlocks = [];

    // 第一块（interface 之前的内容）
    if (blocks[0] && blocks[0].trim()) {
      htmlBlocks.push(renderConfigBlock('全局配置', blocks[0]));
    }

    // 后续每两块一组（interface 名 + 内容）
    for (let i = 1; i < blocks.length; i += 2) {
      const name = blocks[i];
      const body = blocks[i + 1] || '';
      htmlBlocks.push(renderConfigBlock(name, body));
    }

    return `
      <div class="pkt-tab-content" data-tab="config">
        ${htmlBlocks.join('')}
      </div>
    `;
  }

  function renderConfigBlock(name, body) {
    const highlighted = highlightIOS(body);
    return `
      <div class="pkt-config-block">
        <div class="pkt-config-header">
          <span>${name}</span>
          <span class="pkt-config-toggle">▼</span>
        </div>
        <pre class="pkt-config-body">${highlighted}</pre>
      </div>
    `;
  }

  function renderVlansTab(vlans) {
    if (!vlans.length) {
      return `<div class="pkt-tab-content" data-tab="vlans"><p style="color:var(--color-text-muted,#888);font-size:13px;text-align:center;padding:20px;">无 VLAN 信息</p></div>`;
    }
    const items = vlans.map(v => `
      <div class="pkt-vlan-item">
        <span class="pkt-vlan-id">${v.id}</span>
        <span class="pkt-vlan-name">${v.name}</span>
      </div>
    `).join('');
    return `<div class="pkt-tab-content" data-tab="vlans"><div class="pkt-vlan-list">${items}</div></div>`;
  }

  function renderAclsTab(acls) {
    if (!acls.length) {
      return `<div class="pkt-tab-content" data-tab="acls"><p style="color:var(--color-text-muted,#888);font-size:13px;text-align:center;padding:20px;">无 ACL 信息</p></div>`;
    }
    const items = acls.map(acl => {
      const rules = acl.rules.map(r => {
        const cls = r.includes('permit') ? 'acl-permit' : (r.includes('deny') ? 'acl-deny' : '');
        return `<div class="${cls}">${r}</div>`;
      }).join('');
      return `
        <div class="pkt-acl-item">
          <div class="pkt-acl-header">${acl.name} (${acl.type})</div>
          <div class="pkt-acl-rules">${rules}</div>
        </div>
      `;
    }).join('');
    return `<div class="pkt-tab-content" data-tab="acls">${items}</div>`;
  }

  function renderRoutesTab(routes) {
    if (!routes.length) {
      return `<div class="pkt-tab-content" data-tab="routes"><p style="color:var(--color-text-muted,#888);font-size:13px;text-align:center;padding:20px;">无路由信息</p></div>`;
    }
    const rows = routes.map(r => `
      <tr>
        <td><span class="pkt-route-type ${r.type}">${r.type}</span></td>
        <td>${r.network}</td>
        <td>${r.mask}</td>
        <td>${r.nextHop}</td>
        <td>${r.interface || '-'}</td>
      </tr>
    `).join('');
    return `
      <div class="pkt-tab-content" data-tab="routes">
        <table class="pkt-route-table">
          <thead>
            <tr><th>类型</th><th>网络</th><th>掩码</th><th>下一跳</th><th>接口</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // ============== 导出菜单 ==============

  function showExportMenu(event, cy, jsonData, filename) {
    // 移除已有菜单
    document.querySelector('.pkt-export-menu')?.remove();

    const menu = document.createElement('div');
    menu.className = 'pkt-export-menu';
    menu.style.cssText = `
      position: fixed;
      z-index: 9999;
      padding: 4px 0;
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #e0e0e0);
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      font-size: 13px;
      min-width: 160px;
    `;

    const addOption = (label, action) => {
      const item = document.createElement('button');
      item.textContent = label;
      item.style.cssText = `
        display: block;
        width: 100%;
        padding: 7px 14px;
        border: none;
        background: none;
        color: var(--color-text, #333);
        text-align: left;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
      `;
      item.onmouseenter = () => item.style.background = 'rgba(212, 165, 201, 0.12)';
      item.onmouseleave = () => item.style.background = 'none';
      item.addEventListener('click', () => {
        action();
        menu.remove();
      });
      menu.appendChild(item);
    };

    addOption('导出 PNG 图片', () => {
      const png = cy.png({ scale: 2, full: true, bg: getCSSVar('--color-surface', '#fff') });
      const a = document.createElement('a');
      a.href = png;
      a.download = filename.replace(/\.\w+$/, '') + '.png';
      a.click();
    });

    addOption('导出 JSON 数据', () => {
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace(/\.\w+$/, '') + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    addOption('导出 Markdown 表格', () => {
      const md = exportMarkdown(jsonData);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace(/\.\w+$/, '') + '.md';
      a.click();
      URL.revokeObjectURL(url);
    });

    document.body.appendChild(menu);
    const x = Math.min(event.clientX, window.innerWidth - 180);
    const y = Math.min(event.clientY, window.innerHeight - 120);
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    // 点击外部关闭
    setTimeout(() => {
      document.addEventListener('click', function close(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', close);
        }
      });
    }, 0);
  }

  function exportMarkdown(jsonData) {
    let md = `# 拓扑：${jsonData.meta.source}\n\n`;
    md += `> 设备 ${jsonData.meta.deviceCount} / 链路 ${jsonData.meta.linkCount} / 版本 ${jsonData.meta.ptVersion}\n\n`;

    md += `## 设备列表\n\n`;
    md += `| 名称 | 类型 | 主 IP | 型号 |\n`;
    md += `|------|------|-------|------|\n`;
    (jsonData.devices || []).forEach(dev => {
      md += `| ${dev.name} | ${dev.type} | ${dev.primaryIp || '-'} | ${dev.model || '-'} |\n`;
    });

    md += `\n## 链路列表\n\n`;
    md += `| 源设备 | 源接口 | 目标设备 | 目标接口 | 线缆类型 |\n`;
    md += `|--------|--------|----------|----------|----------|\n`;
    (jsonData.links || []).forEach(link => {
      md += `| ${link.source} | ${link.sourceInterface || '-'} | ${link.target} | ${link.targetInterface || '-'} | ${link.cableType} |\n`;
    });

    return md;
  }

  // ============== 加载 JSON 并渲染 ==============

  async function loadAndRender(container, jsonPath, options) {
    // 显示加载状态
    container.innerHTML = `
      <div class="pkt-topology-container">
        <div class="pkt-loading">
          <div class="pkt-loading-spinner"></div>
          <div>正在加载拓扑数据...</div>
        </div>
      </div>
    `;

    try {
      const base = getBasePath();
      // 对文件名做 URL 编码（先 decode 防止重复编码，如 %20 → %2520）
      let safePath = jsonPath;
      if (!jsonPath.startsWith('http') && !jsonPath.startsWith('/')) {
        try {
          safePath = decodeURIComponent(jsonPath);
        } catch (e) { /* 已是原始字符串，decode 失败则原样使用 */ }
        safePath = encodeURIComponent(safePath);
      }
      const url = jsonPath.startsWith('http') || jsonPath.startsWith('/')
        ? jsonPath
        : `${base}iris/data/pkt/json/${safePath}.json`;

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      container.innerHTML = '';
      return renderTopology(container, data, options);
    } catch (err) {
      container.innerHTML = `
        <div class="pkt-topology-container">
          <div class="pkt-error-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <div class="pkt-error-title">加载失败</div>
            <div class="pkt-error-message">${err.message}</div>
            <div class="pkt-error-detail">路径: ${jsonPath}</div>
          </div>
        </div>
      `;
      return null;
    }
  }

  function getBasePath() {
    // GitHub Pages 子路径适配
    const path = window.location.pathname;
    if (path.includes('/md-preview/')) return '/md-preview/';
    return '/';
  }

  // ============== 暴露 API ==============

  window.MarkdownPreview.pkt = {
    renderTopology,
    loadAndRender,
    highlightIOS,
  };

  // ============== 自动加载设备 SVG 图标 sprite ==============

  let iconsLoaded = false;
  function loadIconsSprite() {
    if (iconsLoaded) return;
    iconsLoaded = true;
    // 检查是否已存在
    if (document.querySelector('#pkt-router')) return;
    const base = getBasePath();
    fetch(`${base}iris/data/pkt/icons.svg`)
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(svgText => {
        const div = document.createElement('div');
        div.innerHTML = svgText;
        const svg = div.querySelector('svg');
        if (svg) {
          svg.setAttribute('aria-hidden', 'true');
          svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
          document.body.insertBefore(svg, document.body.firstChild);
        }
      })
      .catch(err => console.warn('[PKT] 图标 sprite 加载失败:', err));
  }

  // DOMContentLoaded 后加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadIconsSprite);
  } else {
    loadIconsSprite();
  }
})();
