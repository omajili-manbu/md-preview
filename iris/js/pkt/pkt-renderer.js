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
  // pkt 用 straight/crossover，ensp 用 copper/crossover，二者都是双绞线，统一映射为蓝色系
  const CABLE_COLORS = {
    'straight': '#3498db',
    'copper': '#3498db',      // eNSP 的 Copper 双绞线，等价于 PT 的 straight
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

    // PC 专有：ip default-gateway / ip name-server 命令高亮
    html = html.replace(/^(\s*)(ip\s+(?:default-gateway|name-server))(?=\s)/gm, (m, indent, cmd) =>
      `${indent}<span class="ios-gateway">${cmd}</span>`);

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
          <button class="pkt-btn active" data-action="toggle-iface" title="显示/隐藏接口名">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h10M4 17h7"/></svg>
            接口名
          </button>
          <button class="pkt-btn active" data-action="toggle-subnet" title="显示/隐藏网段">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>
            网段
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
          type: dev.type,  // 兼容 CSS 选择器 node[type="..."]
          primaryIp: dev.primaryIp || '',
          model: dev.model || '',
          rawType: dev.rawType || '',
          // 新增字段（旧 JSON 没有时为空字符串，向后兼容）
          gateway: dev.gateway || '',
          dns: dev.dns || '',
          mac: dev.mac || '',
        },
        position: { x: dev.x || 0, y: dev.y || 0 },
      });
    });

    // 链路边
    (jsonData.links || []).forEach(link => {
      if (link.source && link.target) {
        const srcIf = link.sourceInterface || '';
        const dstIf = link.targetInterface || '';
        const subnet = link.subnet || '';
        elements.push({
          group: 'edges',
          data: {
            id: link.id || `e-${link.source}-${link.target}`,
            source: link.source,
            target: link.target,
            cableType: link.cableType,
            cableRawType: link.cableRawType || '',
            sourceInterface: srcIf,
            targetInterface: dstIf,
            // 简化后的接口名，用于常驻标注（source-label / target-label）
            'source-text': shortIfName(srcIf),
            'target-text': shortIfName(dstIf),
            bandwidth: link.bandwidth,
            // 新增字段（旧 JSON 没有时为空，向后兼容）
            subnet: subnet,
            srcIp: link.srcIp || '',
            dstIp: link.dstIp || '',
            // 中间网段标签：用 label 字段，空时不显示
            label: subnet,
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
            // 节点底色完全透明，只显示 background-image（SVG 图标本身透明）
            'background-color': 'transparent',
            'background-opacity': 0,
            'background-image-opacity': 1,
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
          style: { 'background-image': getIconDataURI('router'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="switch"]',
          style: { 'background-image': getIconDataURI('switch'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="pc"]',
          style: { 'background-image': getIconDataURI('pc'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="server"]',
          style: { 'background-image': getIconDataURI('server'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="firewall"]',
          style: { 'background-image': getIconDataURI('firewall'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="laptop"]',
          style: { 'background-image': getIconDataURI('laptop'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="phone"]',
          style: { 'background-image': getIconDataURI('phone'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="access-point"]',
          style: { 'background-image': getIconDataURI('access-point'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="cloud"]',
          style: { 'background-image': getIconDataURI('cloud'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="hub"]',
          style: { 'background-image': getIconDataURI('hub'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="tv"]',
          style: { 'background-image': getIconDataURI('tv'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="tablet"]',
          style: { 'background-image': getIconDataURI('tablet'), 'background-fit': 'contain' },
        },
        {
          selector: 'node[type="unknown"]',
          style: { 'background-image': getIconDataURI('unknown'), 'background-fit': 'contain' },
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
            // 中间网段标签（如 172.16.1.0/24），用 label 数据字段
            // 注意：Cytoscape 3.x 中 source/target 标签共享主标签的
            // color/font-size/text-background-* 样式，无法单独设置颜色
            'label': 'data(label)',
            'font-size': '9px',
            'color': '#666',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-background-color': 'rgba(255,255,255,0.8)',
            'text-background-opacity': 1,
            'text-background-padding': '2px',
            'text-background-shape': 'round-rectangle',
            // 源端接口名常驻标注（简化后，如 Fa0/0）
            'source-label': 'data(source-text)',
            'source-text-offset': 20,
            'source-text-margin-y': 8,
            // 目的端接口名常驻标注
            'target-label': 'data(target-text)',
            'target-text-offset': 20,
            'target-text-margin-y': 8,
          },
        },
        {
          selector: 'edge[cableType="straight"]',
          style: { 'line-color': CABLE_COLORS.straight, 'width': 2 },
        },
        {
          selector: 'edge[cableType="copper"]',
          style: { 'line-color': CABLE_COLORS.copper, 'width': 2 },
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
      layout: { name: 'preset', fit: false, padding: 40 },
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 3,
    });

    // 设置节点 type 属性（用于样式选择器）
    cy.nodes().forEach(node => {
      const devType = node.data('deviceType') || 'unknown';
      node.addClass(`type-${devType}`);
      // 直接设置 background-image（兼容 CSS 选择器失效的场景）
      // 注意：不要设置 background-opacity > 0，否则 Cytoscape 会先画一层不透明底色
      const iconURI = getIconDataURI(devType);
      if (iconURI) {
        node.style('background-image', iconURI);
        node.style('background-fit', 'contain');
        node.style('background-image-opacity', 1);
        node.style('background-color', 'transparent');
        node.style('background-opacity', 0);
      }
    });

    // 适应屏幕（排除离群点，避免正常设备被缩成不可见的小点）
    // 策略：只对参与链路的节点 + 坐标在合理范围内的节点做 fit
    const fitEls = computeFitElements(cy, jsonData);
    cy.fit(fitEls.length ? fitEls : cy.elements(), 40);

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
      // 显示 tooltip（含接口 IP 和网段）
      const cableType = edge.data('cableType') || 'unknown';
      const srcIf = edge.data('sourceInterface');
      const dstIf = edge.data('targetInterface');
      const srcIp = edge.data('srcIp');
      const dstIp = edge.data('dstIp');
      const subnet = edge.data('subnet');
      const bw = edge.data('bandwidth');
      let tooltip = `${cableType}`;
      // 接口行：带 IP 显示，如 "Fa0/0 (172.16.1.1) ↔ Fa0/0 (172.16.1.2)"
      const srcPart = srcIf ? (srcIp ? `${srcIf} (${srcIp})` : srcIf) : '?';
      const dstPart = dstIf ? (dstIp ? `${dstIf} (${dstIp})` : dstIf) : '?';
      tooltip += `\n${srcPart} ↔ ${dstPart}`;
      if (subnet) tooltip += `\n网段: ${subnet}`;
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
      // PT 坐标布局：用保存的原始位置重跑 preset，再 fit 到非离群元素
      cy.layout({ name: 'preset', fit: false, padding: 40 }).run();
      const fitEls = computeFitElements(cy, jsonData);
      cy.fit(fitEls.length ? fitEls : cy.elements(), 40);
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
        fit: true,
      }).run();
      setActiveBtn(wrapper, 'layout-force');
    });

    wrapper.querySelector('[data-action="toggle-grid"]').addEventListener('click', () => {
      canvasWrapper.classList.toggle('grid');
      // 确保 canvas 背景透明，让 wrapper 的网格能透出来
      const canvasChild = canvasEl.querySelector('canvas');
      if (canvasChild) {
        canvasChild.style.background = 'transparent';
      }
      wrapper.querySelector('[data-action="toggle-grid"]').classList.toggle('active');
    });

    // ============== 接口名 / 网段 显示开关 ==============
    // 状态保存在 wrapper 上，便于在多次切换间持久化
    const labelState = { showIface: true, showSubnet: true };

    function applyEdgeLabels() {
      cy.edges().forEach(edge => {
        const srcIf = edge.data('sourceInterface') || '';
        const dstIf = edge.data('targetInterface') || '';
        const subnet = edge.data('subnet') || '';
        // 接口名开关
        edge.style('source-label', labelState.showIface ? shortIfName(srcIf) : '');
        edge.style('target-label', labelState.showIface ? shortIfName(dstIf) : '');
        // 网段开关
        edge.style('label', labelState.showSubnet ? subnet : '');
      });
    }

    wrapper.querySelector('[data-action="toggle-iface"]').addEventListener('click', () => {
      labelState.showIface = !labelState.showIface;
      const btn = wrapper.querySelector('[data-action="toggle-iface"]');
      btn.classList.toggle('active', labelState.showIface);
      applyEdgeLabels();
    });

    wrapper.querySelector('[data-action="toggle-subnet"]').addEventListener('click', () => {
      labelState.showSubnet = !labelState.showSubnet;
      const btn = wrapper.querySelector('[data-action="toggle-subnet"]');
      btn.classList.toggle('active', labelState.showSubnet);
      applyEdgeLabels();
    });

    wrapper.querySelector('[data-action="fit"]').addEventListener('click', () => {
      const fitEls = computeFitElements(cy, jsonData);
      cy.fit(fitEls.length ? fitEls : cy.elements(), 40);
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

  // 接口名简化：FastEthernet0/0 → Fa0/0, GigabitEthernet0/0 → Gi0/0
  // 支持 FastEthernet, GigabitEthernet, Serial, Ethernet, Vlan, Loopback
  // 旧数据或未识别类型原样返回
  const IF_NAME_ABBR = [
    [/^FastEthernet/i, 'Fa'],
    [/^GigabitEthernet/i, 'Gi'],
    [/^TenGigabitEthernet/i, 'Ten'],
    [/^Serial/i, 'Se'],
    [/^Ethernet/i, 'Eth'],
    [/^Vlan/i, 'Vl'],
    [/^Loopback/i, 'Lo'],
    [/^Port-channel/i, 'Po'],
  ];

  function shortIfName(name) {
    if (!name) return '';
    let result = name;
    for (const [re, abbr] of IF_NAME_ABBR) {
      if (re.test(result)) {
        result = result.replace(re, abbr);
        break;
      }
    }
    return result;
  }

  // 计算 fit 时应包含的元素：排除坐标离群点
  // 策略：先按链路找出参与连接的节点；再用这些节点的坐标中位数作为基准，
  //       剔除距离中位数过远（>2.5 倍中位绝对偏差）的离群节点
  function computeFitElements(cy, jsonData) {
    const linkedIds = new Set();
    (jsonData.links || []).forEach(l => {
      if (l.source) linkedIds.add(String(l.source));
      if (l.target) linkedIds.add(String(l.target));
    });

    // 参与链路的节点（孤立节点不参与 fit，避免把画布撑大）
    const linkedNodes = cy.nodes().filter(n => linkedIds.has(String(n.data('id'))));
    if (linkedNodes.length === 0) return cy.elements();

    // 统计这些节点的坐标，计算中位数
    const xs = linkedNodes.map(n => n.position().x).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    const ys = linkedNodes.map(n => n.position().y).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    if (xs.length === 0 || ys.length === 0) return cy.elements();

    const median = arr => arr.length % 2 === 0
      ? (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2
      : arr[Math.floor(arr.length / 2)];
    const mx = median(xs), my = median(ys);

    // 计算到中位数的距离，用 MAD（中位绝对偏差）作为离群判定
    const dists = linkedNodes.map(n => Math.hypot(n.position().x - mx, n.position().y - my));
    const sortedDists = [...dists].sort((a, b) => a - b);
    const medDist = median(sortedDists);
    const mad = median(sortedDists.map(d => Math.abs(d - medDist)));
    // 阈值：距离中位数 > medDist + 3 * mad + 500 也视为离群
    // （加 500 是为了在所有节点都很近时也能容忍正常布局间距）
    const threshold = medDist + 3 * Math.max(mad, 1) + 500;

    const fitNodes = linkedNodes.filter(n => {
      const p = n.position();
      return Math.hypot(p.x - mx, p.y - my) <= threshold;
    });

    // 返回节点 + 它们的连接边
    return fitNodes.union(fitNodes.connectedEdges());
  }

  function getIconDataURI(deviceType) {
    const symbolId = DEVICE_ICONS[deviceType] || DEVICE_ICONS['unknown'];
    const symbol = document.querySelector(`#${symbolId}`);
    if (!symbol) return '';
    // 读取 symbol 自身的 viewBox（Clarity 36x36 / Tabler 24x24），并通过 color 注入主题色，
    // 使 symbol 内 <g fill="currentColor">/<g stroke="currentColor"> 正确着色。
    const viewBox = symbol.getAttribute('viewBox') || '0 0 36 36';
    // 显式声明透明背景，避免某些渲染路径（canvas/data-URI）填充默认黑/白底
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="36" height="36" style="background:transparent;color:${getCSSVar('--color-text', '#333')}">${symbol.innerHTML}</svg>`;
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
    // 新增字段（旧 JSON 没有时为空字符串，向后兼容）
    const devMac = node.data('mac') || '';
    const devGateway = node.data('gateway') || '';
    const devDns = node.data('dns') || '';

    const config = (jsonData.configs || []).find(c => c.deviceId === devId);
    const interfaces = jsonData.interfaces?.[devId] || [];
    const vlans = jsonData.vlans?.[devId] || [];
    const acls = jsonData.acls?.[devId] || [];
    const routes = jsonData.routes?.[devId] || [];

    const iconId = DEVICE_ICONS[devType] || DEVICE_ICONS['unknown'];

    // 构建元数据项（条件显示：MAC/DNS 仅在有值时显示，网关仅 PC 显示）
    const metaItems = [
      { label: '类型', value: devType },
      { label: '型号', value: model || rawType || '-' },
      { label: '主 IP', value: primaryIp || '-' },
    ];
    if (devMac) metaItems.push({ label: 'MAC', value: devMac });
    if (devType === 'pc') metaItems.push({ label: '网关', value: devGateway || '-' });
    if (devDns) metaItems.push({ label: 'DNS', value: devDns });

    const metaHtml = metaItems.map(m => `
      <div class="pkt-meta-item">
        <span class="pkt-meta-label">${m.label}</span>
        <span class="pkt-meta-value">${m.value}</span>
      </div>
    `).join('');

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
      <div class="pkt-drawer-meta">${metaHtml}</div>
      <div class="pkt-drawer-tabs">
        <button class="pkt-tab active" data-tab="interfaces">接口 (${interfaces.length})</button>
        <button class="pkt-tab" data-tab="config">配置</button>
        <button class="pkt-tab" data-tab="vlans">VLAN (${vlans.length})</button>
        <button class="pkt-tab" data-tab="acls">ACL (${acls.length})</button>
        <button class="pkt-tab" data-tab="routes">路由 (${routes.length})</button>
        <button class="pkt-tab" data-tab="process">可能的配置过程</button>
      </div>
      <div class="pkt-drawer-body">
        ${renderInterfacesTab(interfaces)}
        ${renderConfigTab(config?.config || '')}
        ${renderVlansTab(vlans)}
        ${renderAclsTab(acls)}
        ${renderRoutesTab(routes)}
        ${renderConfigProcessTab(config?.config || '', devName, devType, jsonData.meta?.ptVersion || '')}
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
        <td>${iface.mac || '-'}</td>
        <td>${iface.gateway || '-'}</td>
        <td>${iface.dhcp === true ? '是' : (iface.dhcp === false ? '否' : '-')}</td>
      </tr>
    `).join('');
    return `
      <div class="pkt-tab-content active" data-tab="interfaces">
        <div class="pkt-table-scroll">
          <table class="pkt-interface-table">
            <thead>
              <tr>
                <th>接口</th><th>IP</th><th>掩码</th><th>状态</th><th>双工</th><th>速率</th><th>描述</th><th>MAC</th><th>网关</th><th>DHCP</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
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
    const rows = routes.map(r => {
      // 构建 CIDR 网段，如 172.16.1.0/24；无 cidr 时只显示 network
      let subnet = r.network || '-';
      if (r.cidr !== undefined && r.cidr !== null && r.cidr !== '') {
        subnet = `${r.network}/${r.cidr}`;
      }
      // 下一跳：BGP 显示 AS 号和邻居信息
      let nextHopHtml = r.nextHop || '-';
      if (r.type === 'bgp') {
        const parts = [];
        if (r.processId) parts.push(`AS ${r.processId}`);
        if (Array.isArray(r.neighbors) && r.neighbors.length) {
          const nbStr = r.neighbors.map(n => `${n.ip || '?'}(AS${n.remoteAs || '?'})`).join(', ');
          parts.push(`邻居: ${nbStr}`);
        }
        if (parts.length) {
          nextHopHtml = `${r.nextHop || 'BGP'}<br><span class="pkt-route-nbr">${parts.join(' · ')}</span>`;
        }
      }
      // 默认路由行特殊高亮
      const rowCls = r.type === 'default' ? ' class="pkt-route-row-default"' : '';
      return `
        <tr${rowCls}>
          <td><span class="pkt-route-type ${r.type}">${r.type}</span></td>
          <td>${r.network}</td>
          <td>${r.mask}</td>
          <td>${subnet}</td>
          <td>${nextHopHtml}</td>
          <td>${r.interface || '-'}</td>
        </tr>
      `;
    }).join('');
    return `
      <div class="pkt-tab-content" data-tab="routes">
        <div class="pkt-table-scroll">
          <table class="pkt-route-table">
            <thead>
              <tr><th>类型</th><th>网络</th><th>掩码</th><th>网段</th><th>下一跳</th><th>接口</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ============== "可能的配置过程" Tab ==============
  // 根据解析出来的配置记录，按真实工程师的操作顺序，重新组织成可逐步执行的 CLI 命令序列。
  // 自动识别 Cisco IOS / Huawei VRP 语法，生成对应的进入配置模式、设主机名、配接口、
  // 配路由协议、配 ACL、保存等步骤。

  function renderConfigProcessTab(configText, devName, devType, ptVersion) {
    if (!configText || !configText.trim()) {
      return `<div class="pkt-tab-content" data-tab="process"><p style="color:var(--color-text-muted,#888);font-size:13px;text-align:center;padding:20px;">无配置信息，无法推算配置过程</p></div>`;
    }

    const vendor = detectVendor(configText, ptVersion);
    const steps = vendor === 'huawei'
      ? generateHuaweiSteps(configText, devName, devType)
      : generateCiscoSteps(configText, devName, devType);

    if (!steps.length) {
      return `<div class="pkt-tab-content" data-tab="process"><p style="color:var(--color-text-muted,#888);font-size:13px;text-align:center;padding:20px;">未能从配置中提取出可识别的配置步骤</p></div>`;
    }

    const vendorLabel = vendor === 'huawei' ? 'Huawei VRP' : 'Cisco IOS';
    const stepsHtml = steps.map((step, idx) => {
      const cmdsHtml = step.commands.map(cmd => {
        // 高亮：以 < 开头是用户视图提示符，[ 开头是系统/子视图提示符，纯命令着色
        let cls = 'pkt-cp-cmd';
        if (/^[<[]/.test(cmd)) cls = 'pkt-cp-prompt';
        return `<div class="${cls}">${escapeHtml(cmd)}</div>`;
      }).join('');
      return `
        <div class="pkt-cp-step">
          <div class="pkt-cp-step-head">
            <span class="pkt-cp-step-no">${idx + 1}</span>
            <span class="pkt-cp-step-title">${escapeHtml(step.title)}</span>
          </div>
          ${step.desc ? `<div class="pkt-cp-step-desc">${escapeHtml(step.desc)}</div>` : ''}
          <pre class="pkt-cp-cmds">${cmdsHtml}</pre>
        </div>
      `;
    }).join('');

    return `
      <div class="pkt-tab-content" data-tab="process">
        <div class="pkt-cp-banner">
          <span class="pkt-cp-vendor">${vendorLabel}</span>
          <span class="pkt-cp-hint">根据已解析的配置记录逆向推算，按典型操作顺序排列。仅包含核心业务配置，省略系统默认项。</span>
        </div>
        ${stepsHtml}
      </div>
    `;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ============== 厂商语法识别 ==============
  function detectVendor(configText, ptVersion) {
    const text = configText || '';
    // 1. ptVersion 强信号
    if (ptVersion && /ensp/i.test(ptVersion)) return 'huawei';
    if (ptVersion && /pt\s*\d/i.test(ptVersion)) return 'cisco';
    // 2. Huawei VRP 强信号
    if (/^\[v\d+r\d+/im.test(text)) return 'huawei';
    if (/^\s*sysname\s+\S+/m.test(text)) return 'huawei';
    if (/^\s*user-interface\s+con\s+/m.test(text)) return 'huawei';
    if (/^\s*(?:ospf|isis|bgp|rip)\s+\d+/m.test(text)) return 'huawei';
    if (/^\s*ip\s+route-static\s+/m.test(text)) return 'huawei';
    if (/^\s*board\s+add\s+/m.test(text)) return 'huawei';
    if (/^\s*undo\s+/m.test(text)) return 'huawei';
    if (/interface\s+(?:gigabitethernet|ethernet|serial)\d+\/\d+\/\d+/i.test(text)) return 'huawei';
    // 3. Cisco IOS 强信号
    if (/^\s*hostname\s+\S+/m.test(text)) return 'cisco';
    if (/^\s*router\s+(?:ospf|bgp|rip|eigrp)\s+/m.test(text)) return 'cisco';
    if (/^\s*ip\s+route\s+\S+\s+\S+\s+\S+/m.test(text)) return 'cisco';
    if (/^\s*no\s+shutdown\s*$/m.test(text)) return 'cisco';
    if (/^version\s+\d+/m.test(text)) return 'cisco';
    if (/^end\s*$/m.test(text)) return 'cisco';
    if (/interface\s+(?:gigabitethernet|fastethernet)\d+\/\d+/i.test(text)) return 'cisco';
    // 4. 默认按 # 分段 → 华为，! 分段 → 思科
    const hashCount = (text.match(/^#/gm) || []).length;
    const bangCount = (text.match(/^!/gm) || []).length;
    if (hashCount > bangCount) return 'huawei';
    if (bangCount > hashCount) return 'cisco';
    return 'cisco';
  }

  // ============== 通用分段工具 ==============
  // 将配置文本按段分隔符切成 [header, bodyLines[]] 列表
  function splitConfigSections(configText, delimiter) {
    const sections = [];
    const rawSections = configText.split(new RegExp('^' + delimiter + '\\s*$', 'm'));
    for (const raw of rawSections) {
      const lines = raw.split(/\r?\n/).map(l => l).filter(l => l.trim() !== '');
      if (!lines.length) continue;
      const header = lines[0].trim();
      const body = lines.slice(1).map(l => l.trim());
      sections.push({ header, body, raw: lines.map(l => l.trim()) });
    }
    return sections;
  }

  // ============== Huawei VRP 配置过程生成 ==============
  function generateHuaweiSteps(configText, devName, devType) {
    const steps = [];
    // 提取 sysname 作为提示符中的设备名
    const sysnameMatch = configText.match(/^\s*sysname\s+(\S+)/m);
    const host = sysnameMatch ? sysnameMatch[1] : (devName || 'Huawei');
    const defaultName = 'Huawei';

    // ---- 步骤 1：进入系统视图 ----
    steps.push({
      title: '进入系统视图',
      desc: '从用户视图切换到系统视图，准备进行全局配置',
      commands: [
        `<${defaultName}>system-view`,
        `[${defaultName}]sysname ${host}`,
        `[${host}]`,
      ],
    });

    const sections = splitConfigSections(configText, '#');

    // ---- 收集各模块 ----
    const vlans = [];
    const interfaces = [];
    const ospfBlocks = [];
    const isisBlocks = [];
    const bgpBlocks = [];
    const ripBlocks = [];
    const staticRoutes = [];
    const acls = [];

    for (const sec of sections) {
      const h = sec.header;
      // VLAN：vlan 10 / vlan batch 10 20
      const vlanM = h.match(/^vlan\s+(.+)$/i);
      if (vlanM) {
        const body = sec.body.join('\n');
        const nameM = body.match(/^\s*name\s+(.+)$/m);
        // vlan batch 10 20 → 拆成多个
        const ids = vlanM[1].startsWith('batch')
          ? vlanM[1].replace(/^batch\s+/i, '').split(/\s+/)
          : [vlanM[1]];
        for (const id of ids) {
          if (id.includes('-')) {
            // 范围 vlan batch 10-20
            const [s, e] = id.split('-').map(Number);
            for (let i = s; i <= e; i++) vlans.push({ id: String(i), name: nameM ? nameM[1] : '' });
          } else {
            vlans.push({ id, name: nameM ? nameM[1] : '' });
          }
        }
        continue;
      }
      // 接口
      const ifM = h.match(/^interface\s+(.+)$/i);
      if (ifM) {
        const ifName = ifM[1].trim();
        const body = sec.body.join('\n');
        const ipM = body.match(/^\s*ip\s+address\s+(\S+)\s+(\S+)/m);
        const descM = body.match(/^\s*description\s+(.+)$/m);
        const shutM = /shutdown/.test(body) && !/undo\s+shutdown/.test(body);
        const linkProtoM = body.match(/^\s*link-protocol\s+(\S+)/m);
        const isisEnM = body.match(/^\s*isis\s+enable\s+(\S+)/m);
        const ospfEnM = body.match(/^\s*ospf\s+enable\s+(\S+)/m);
        const portTypeM = body.match(/^\s*port\s+link-type\s+(\S+)/m);
        const portAccM = body.match(/^\s*port\s+default\s+vlan\s+(\S+)/m);
        const trunkAllowM = body.match(/^\s*port\s+trunk\s+allow-pass\s+vlan\s+(.+)$/m);
        interfaces.push({
          name: ifName,
          ip: ipM ? ipM[1] : '',
          mask: ipM ? ipM[2] : '',
          desc: descM ? descM[1].trim() : '',
          shutdown: shutM,
          linkProtocol: linkProtoM ? linkProtoM[1] : '',
          isisEnable: isisEnM ? isisEnM[1] : '',
          ospfEnable: ospfEnM ? ospfEnM[1] : '',
          portType: portTypeM ? portTypeM[1] : '',
          portAccessVlan: portAccM ? portAccM[1] : '',
          trunkAllow: trunkAllowM ? trunkAllowM[1] : '',
          rawBody: body,
        });
        continue;
      }
      // OSPF
      const ospfM = h.match(/^ospf\s+(\d+)(?:\s+router-id\s+(\S+))?/i);
      if (ospfM) {
        ospfBlocks.push({
          processId: ospfM[1],
          routerId: ospfM[2] || '',
          body: sec.body,
          rawBody: sec.body.join('\n'),
        });
        continue;
      }
      // ISIS
      const isisM = h.match(/^isis\s+(\d+)/i);
      if (isisM) {
        isisBlocks.push({
          processId: isisM[1],
          body: sec.body,
          rawBody: sec.body.join('\n'),
        });
        continue;
      }
      // BGP
      const bgpM = h.match(/^bgp\s+(\d+)/i);
      if (bgpM) {
        bgpBlocks.push({
          asNumber: bgpM[1],
          body: sec.body,
          rawBody: sec.body.join('\n'),
        });
        continue;
      }
      // RIP
      const ripM = h.match(/^rip\s+(\d+)/i);
      if (ripM) {
        ripBlocks.push({
          processId: ripM[1],
          body: sec.body,
          rawBody: sec.body.join('\n'),
        });
        continue;
      }
      // ACL
      const aclM = h.match(/^acl\s+(?:number\s+)?(\S+)/i);
      if (aclM) {
        acls.push({
          name: aclM[1],
          body: sec.body,
        });
        continue;
      }
      // 静态路由（可能不在独立段内，单独扫描）
    }

    // 静态路由：扫描全文 ip route-static
    const routeStaticRe = /^\s*ip\s+route-static\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(.+))?$/gm;
    let rsm;
    while ((rsm = routeStaticRe.exec(configText)) !== null) {
      staticRoutes.push({
        network: rsm[1],
        mask: rsm[2],
        nextHop: rsm[3],
        extra: rsm[4] || '',
      });
    }

    // ---- 步骤 2：创建 VLAN ----
    if (vlans.length) {
      const cmds = [];
      for (const v of vlans) {
        cmds.push(`[${host}]vlan ${v.id}`);
        if (v.name) {
          cmds.push(`[${host}-vlan-${v.id}]name ${v.name}`);
        }
        cmds.push(`[${host}-vlan-${v.id}]quit`);
      }
      steps.push({
        title: '创建 VLAN',
        desc: '在交换机上创建 VLAN 并命名（仅交换机/三层交换机需要）',
        commands: cmds,
      });
    }

    // ---- 步骤 3：配置接口 ----
    if (interfaces.length) {
      const cmds = [];
      for (const iface of interfaces) {
        // 跳过 NULL0 等无配置接口
        if (!iface.ip && !iface.desc && !iface.linkProtocol && !iface.isisEnable &&
            !iface.ospfEnable && !iface.portType && !iface.trunkAllow &&
            iface.name.toUpperCase() !== 'NULL0' && iface.rawBody.trim() === '') {
          continue;
        }
        // 跳过明显的空接口
        if (iface.name.toUpperCase() === 'NULL0' && !iface.ip) continue;

        cmds.push(`[${host}]interface ${iface.name}`);
        const ifPrompt = `[${host}-${iface.name}]`;
        if (iface.desc) cmds.push(`${ifPrompt}description ${iface.desc}`);
        if (iface.linkProtocol) cmds.push(`${ifPrompt}link-protocol ${iface.linkProtocol}`);
        if (iface.ip && iface.mask) cmds.push(`${ifPrompt}ip address ${iface.ip} ${iface.mask}`);
        // 二层接口配置
        if (iface.portType) cmds.push(`${ifPrompt}port link-type ${iface.portType}`);
        if (iface.portAccessVlan) cmds.push(`${ifPrompt}port default vlan ${iface.portAccessVlan}`);
        if (iface.trunkAllow) cmds.push(`${ifPrompt}port trunk allow-pass vlan ${iface.trunkAllow}`);
        // 路由协议使能
        if (iface.isisEnable) cmds.push(`${ifPrompt}isis enable ${iface.isisEnable}`);
        if (iface.ospfEnable) cmds.push(`${ifPrompt}ospf enable ${iface.ospfEnable}`);
        // 接口使能
        if (iface.shutdown) {
          cmds.push(`${ifPrompt}shutdown`);
        } else if (iface.ip || iface.linkProtocol) {
          cmds.push(`${ifPrompt}undo shutdown`);
        }
        cmds.push(`${ifPrompt}quit`);
      }
      if (cmds.length) {
        steps.push({
          title: '配置接口',
          desc: '为每个接口配置 IP 地址、描述、链路协议并使能',
          commands: cmds,
        });
      }
    }

    // ---- 步骤 4：配置 ISIS ----
    for (const isis of isisBlocks) {
      const cmds = [];
      cmds.push(`[${host}]isis ${isis.processId}`);
      const prompt = `[${host}-isis-${isis.processId}]`;
      const body = isis.rawBody;
      const levelM = body.match(/^\s*is-level\s+(\S+)/m);
      if (levelM) cmds.push(`${prompt}is-level ${levelM[1]}`);
      const netM = body.match(/^\s*network-entity\s+(\S+)/m);
      if (netM) cmds.push(`${prompt}network-entity ${netM[1]}`);
      // 其他常见子命令
      const costStyleM = body.match(/^\s*cost-style\s+(.+)/m);
      if (costStyleM) cmds.push(`${prompt}cost-style ${costStyleM[1].trim()}`);
      cmds.push(`${prompt}quit`);
      steps.push({
        title: `配置 IS-IS 进程 ${isis.processId}`,
        desc: '创建 IS-IS 进程，设置级别和网络实体标题',
        commands: cmds,
      });
    }

    // ---- 步骤 5：配置 OSPF ----
    for (const ospf of ospfBlocks) {
      const cmds = [];
      cmds.push(`[${host}]ospf ${ospf.processId}` + (ospf.routerId ? ` router-id ${ospf.routerId}` : ''));
      const prompt = `[${host}-ospf-${ospf.processId}]`;
      const body = ospf.rawBody;
      // 解析 area 块
      const areaLines = body.split('\n');
      let currentArea = '';
      let areaPrompt = '';
      for (const line of areaLines) {
        const trimmed = line.trim();
        const areaM = trimmed.match(/^area\s+(\S+)/);
        if (areaM) {
          currentArea = areaM[1];
          areaPrompt = `[${host}-ospf-${ospf.processId}-area-${currentArea}]`;
          cmds.push(`${prompt}area ${currentArea}`);
          continue;
        }
        const netM = trimmed.match(/^network\s+(\S+)\s+(\S+)/);
        if (netM && currentArea) {
          cmds.push(`${areaPrompt}network ${netM[1]} ${netM[2]}`);
          continue;
        }
        const authM = trimmed.match(/^authentication-mode\s+(.+)/);
        if (authM && currentArea) {
          cmds.push(`${areaPrompt}authentication-mode ${authM[1].trim()}`);
          continue;
        }
        const vlinkM = trimmed.match(/^vlink-peer\s+(\S+)/);
        if (vlinkM && currentArea) {
          cmds.push(`${areaPrompt}vlink-peer ${vlinkM[1]}`);
          continue;
        }
        // 进程级命令
        const importM = trimmed.match(/^import-route\s+(.+)/);
        if (importM && !currentArea) {
          cmds.push(`${prompt}import-route ${importM[1].trim()}`);
        }
        const filterM = trimmed.match(/^filter-policy\s+(.+)/);
        if (filterM && !currentArea) {
          cmds.push(`${prompt}filter-policy ${filterM[1].trim()}`);
        }
      }
      cmds.push(`${prompt}quit`);
      steps.push({
        title: `配置 OSPF 进程 ${ospf.processId}`,
        desc: '创建 OSPF 进程，设置 Router-ID，划分区域并宣告网段',
        commands: cmds,
      });
    }

    // ---- 步骤 6：配置 BGP ----
    for (const bgp of bgpBlocks) {
      const cmds = [];
      cmds.push(`[${host}]bgp ${bgp.asNumber}`);
      const prompt = `[${host}-bgp]`;
      const body = bgp.rawBody;
      const lines = body.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const nbrM = trimmed.match(/^peer\s+(\S+)\s+as-number\s+(\S+)/);
        if (nbrM) {
          cmds.push(`${prompt}peer ${nbrM[1]} as-number ${nbrM[2]}`);
          continue;
        }
        const netM = trimmed.match(/^network\s+(\S+)(?:\s+mask\s+(\S+))?/);
        if (netM) {
          cmds.push(`${prompt}network ${netM[1]}` + (netM[2] ? ` mask ${netM[2]}` : ''));
          continue;
        }
      }
      cmds.push(`${prompt}quit`);
      steps.push({
        title: `配置 BGP AS ${bgp.asNumber}`,
        desc: '建立 BGP 进程，指定邻居 AS 并宣告网段',
        commands: cmds,
      });
    }

    // ---- 步骤 7：配置 RIP ----
    for (const rip of ripBlocks) {
      const cmds = [];
      cmds.push(`[${host}]rip ${rip.processId}`);
      const prompt = `[${host}-rip-${rip.processId}]`;
      const body = rip.rawBody;
      const lines = body.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const netM = trimmed.match(/^network\s+(\S+)/);
        if (netM) { cmds.push(`${prompt}network ${netM[1]}`); continue; }
        const verM = trimmed.match(/^version\s+(\S+)/);
        if (verM) { cmds.push(`${prompt}version ${verM[1]}`); continue; }
        const sumM = trimmed.match(/^undo\s+summary/);
        if (sumM) { cmds.push(`${prompt}undo summary`); continue; }
        const peerM = trimmed.match(/^peer\s+(\S+)/);
        if (peerM) { cmds.push(`${prompt}peer ${peerM[1]}`); continue; }
        const silentM = trimmed.match(/^silent-interface\s+(\S+)/);
        if (silentM) { cmds.push(`${prompt}silent-interface ${silentM[1]}`); continue; }
        const defaultM = trimmed.match(/^default-route\s+originate/);
        if (defaultM) { cmds.push(`${prompt}default-route originate`); continue; }
      }
      cmds.push(`${prompt}quit`);
      steps.push({
        title: `配置 RIP 进程 ${rip.processId}`,
        desc: '创建 RIP 进程，设置版本并宣告网段',
        commands: cmds,
      });
    }

    // ---- 步骤 8：配置静态路由 ----
    if (staticRoutes.length) {
      const cmds = [];
      for (const r of staticRoutes) {
        let cmd = `[${host}]ip route-static ${r.network} ${r.mask} ${r.nextHop}`;
        if (r.extra) cmd += ` ${r.extra}`;
        cmds.push(cmd);
      }
      steps.push({
        title: '配置静态路由',
        desc: '为非直连网段配置静态路由（含默认路由）',
        commands: cmds,
      });
    }

    // ---- 步骤 9：配置 ACL ----
    for (const acl of acls) {
      const cmds = [];
      cmds.push(`[${host}]acl ${acl.name}`);
      // 推断 ACL 提示符：数字 2000-2999 是 basic，3000-3999 是 advanced
      const numMatch = acl.name.match(/^(\d+)/);
      let aclPrompt = `[${host}-acl-adv-${acl.name}]`;
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num >= 2000 && num <= 2999) aclPrompt = `[${host}-acl-basic-${acl.name}]`;
      }
      for (const rule of acl.body) {
        const trimmed = rule.trim();
        if (trimmed.startsWith('rule')) cmds.push(`${aclPrompt}${trimmed}`);
      }
      cmds.push(`${aclPrompt}quit`);
      steps.push({
        title: `配置 ACL ${acl.name}`,
        desc: '创建访问控制列表并添加规则',
        commands: cmds,
      });
    }

    // ---- 步骤 10：保存配置 ----
    steps.push({
      title: '退出并保存配置',
      desc: '返回用户视图并保存配置到设备',
      commands: [
        `[${host}]quit`,
        `<${host}>save`,
        `# 提示后输入 Y 确认保存`,
      ],
    });

    return steps;
  }

  // ============== Cisco IOS 配置过程生成 ==============
  function generateCiscoSteps(configText, devName, devType) {
    const steps = [];
    // 提取 hostname
    const hostM = configText.match(/^\s*hostname\s+(\S+)/m);
    const host = hostM ? hostM[1] : (devName || 'Router');
    const defaultName = 'Router';

    // ---- 步骤 1：进入特权模式与全局配置模式 ----
    steps.push({
      title: '进入特权与全局配置模式',
      desc: '从用户 EXEC 模式进入特权 EXEC，再进入全局配置模式',
      commands: [
        `${defaultName}>enable`,
        `${defaultName}#configure terminal`,
        `Enter configuration commands, one per line. End with CNTL/Z.`,
        `${defaultName}(config)#hostname ${host}`,
        `${host}(config)#`,
      ],
    });

    const sections = splitConfigSections(configText, '!');

    const vlans = [];
    const interfaces = [];
    const ospfBlocks = [];
    const bgpBlocks = [];
    const ripBlocks = [];
    const staticRoutes = [];
    const acls = [];

    for (const sec of sections) {
      const h = sec.header;
      // VLAN：vlan 10 / vlan 20
      const vlanM = h.match(/^vlan\s+(\d+)/i);
      if (vlanM) {
        const body = sec.body.join('\n');
        const nameM = body.match(/^\s*name\s+(.+)$/m);
        vlans.push({ id: vlanM[1], name: nameM ? nameM[1].trim() : '' });
        continue;
      }
      // 接口
      const ifM = h.match(/^interface\s+(.+)$/i);
      if (ifM) {
        const ifName = ifM[1].trim();
        const body = sec.body.join('\n');
        const ipM = body.match(/^\s*ip\s+address\s+(\S+)\s+(\S+)/m);
        const descM = body.match(/^\s*description\s+(.+)$/m);
        const shutM = /shutdown/.test(body) && !/no\s+shutdown/.test(body);
        const duplexM = body.match(/^\s*duplex\s+(\S+)/m);
        const speedM = body.match(/^\s*speed\s+(\S+)/m);
        const swAccM = body.match(/^\s*switchport\s+access\s+vlan\s+(\S+)/m);
        const swModeM = body.match(/^\s*switchport\s+mode\s+(\S+)/m);
        const swTrunkM = body.match(/^\s*switchport\s+trunk\s+(?:allowed\s+)?vlan\s+(.+)$/m);
        interfaces.push({
          name: ifName,
          ip: ipM ? ipM[1] : '',
          mask: ipM ? ipM[2] : '',
          desc: descM ? descM[1].trim() : '',
          shutdown: shutM,
          duplex: duplexM ? duplexM[1] : '',
          speed: speedM ? speedM[1] : '',
          swAccessVlan: swAccM ? swAccM[1] : '',
          swMode: swModeM ? swModeM[1] : '',
          swTrunkVlan: swTrunkM ? swTrunkM[1] : '',
          rawBody: body,
        });
        continue;
      }
      // OSPF
      const ospfM = h.match(/^router\s+ospf\s+(\d+)/i);
      if (ospfM) {
        ospfBlocks.push({
          processId: ospfM[1],
          body: sec.body,
          rawBody: sec.body.join('\n'),
        });
        continue;
      }
      // BGP
      const bgpM = h.match(/^router\s+bgp\s+(\d+)/i);
      if (bgpM) {
        bgpBlocks.push({
          asNumber: bgpM[1],
          body: sec.body,
          rawBody: sec.body.join('\n'),
        });
        continue;
      }
      // RIP
      const ripM = h.match(/^router\s+rip\b/i);
      if (ripM) {
        ripBlocks.push({
          body: sec.body,
          rawBody: sec.body.join('\n'),
        });
        continue;
      }
      // ACL：ip access-list extended NAME / access-list N
      const aclNamedM = h.match(/^ip\s+access-list\s+(?:standard|extended)\s+(\S+)/i);
      if (aclNamedM) {
        acls.push({ name: aclNamedM[1], body: sec.body });
        continue;
      }
      const aclNumM = h.match(/^access-list\s+(\d+)\s+(.+)/i);
      if (aclNumM) {
        acls.push({ name: aclNumM[1], body: [aclNumM[2]] });
        continue;
      }
      // 静态路由（独立行）
      const srM = h.match(/^ip\s+route\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(.+))?/i);
      if (srM) {
        staticRoutes.push({
          network: srM[1],
          mask: srM[2],
          nextHop: srM[3],
          extra: srM[4] || '',
        });
        continue;
      }
    }

    // ---- 步骤 2：创建 VLAN ----
    if (vlans.length) {
      const cmds = [];
      for (const v of vlans) {
        cmds.push(`${host}(config)#vlan ${v.id}`);
        if (v.name) cmds.push(`${host}(config-vlan)#name ${v.name}`);
        cmds.push(`${host}(config-vlan)#exit`);
      }
      steps.push({
        title: '创建 VLAN',
        desc: '在交换机上创建 VLAN 并命名',
        commands: cmds,
      });
    }

    // ---- 步骤 3：配置接口 ----
    if (interfaces.length) {
      const cmds = [];
      for (const iface of interfaces) {
        // 跳过 Vlan1 等无配置接口
        if (!iface.ip && !iface.desc && !iface.swAccessVlan && !iface.swMode &&
            !iface.swTrunkVlan && iface.rawBody.trim() === '') continue;
        if (/^vlan\d+$/i.test(iface.name) && !iface.ip) continue;

        cmds.push(`${host}(config)#interface ${iface.name}`);
        const ifPrompt = `${host}(config-if)#`;
        if (iface.desc) cmds.push(`${ifPrompt}description ${iface.desc}`);
        if (iface.ip && iface.mask) cmds.push(`${ifPrompt}ip address ${iface.ip} ${iface.mask}`);
        if (iface.duplex) cmds.push(`${ifPrompt}duplex ${iface.duplex}`);
        if (iface.speed) cmds.push(`${ifPrompt}speed ${iface.speed}`);
        // 二层接口配置
        if (iface.swMode) cmds.push(`${ifPrompt}switchport mode ${iface.swMode}`);
        if (iface.swAccessVlan) cmds.push(`${ifPrompt}switchport access vlan ${iface.swAccessVlan}`);
        if (iface.swTrunkVlan) cmds.push(`${ifPrompt}switchport trunk allowed vlan ${iface.swTrunkVlan}`);
        // 接口使能
        if (iface.shutdown) {
          cmds.push(`${ifPrompt}shutdown`);
        } else if (iface.ip || iface.swAccessVlan || iface.swMode) {
          cmds.push(`${ifPrompt}no shutdown`);
        }
        cmds.push(`${ifPrompt}exit`);
      }
      if (cmds.length) {
        steps.push({
          title: '配置接口',
          desc: '为每个接口配置 IP 地址、描述、双工/速率并使能',
          commands: cmds,
        });
      }
    }

    // ---- 步骤 4：配置 OSPF ----
    for (const ospf of ospfBlocks) {
      const cmds = [];
      cmds.push(`${host}(config)#router ospf ${ospf.processId}`);
      const prompt = `${host}(config-router)#`;
      const body = ospf.rawBody;
      const netRe = /^\s*network\s+(\S+)\s+(\S+)\s+area\s+(\S+)/gm;
      let nm;
      while ((nm = netRe.exec(body)) !== null) {
        cmds.push(`${prompt}network ${nm[1]} ${nm[2]} area ${nm[3]}`);
      }
      const logM = body.match(/^\s*log-adjacency-changes/m);
      if (logM) cmds.push(`${prompt}log-adjacency-changes`);
      cmds.push(`${prompt}exit`);
      steps.push({
        title: `配置 OSPF 进程 ${ospf.processId}`,
        desc: '创建 OSPF 进程并宣告网段到对应区域',
        commands: cmds,
      });
    }

    // ---- 步骤 5：配置 BGP ----
    for (const bgp of bgpBlocks) {
      const cmds = [];
      cmds.push(`${host}(config)#router bgp ${bgp.asNumber}`);
      const prompt = `${host}(config-router)#`;
      const body = bgp.rawBody;
      const lines = body.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const nbrM = trimmed.match(/^neighbor\s+(\S+)\s+remote-as\s+(\S+)/);
        if (nbrM) { cmds.push(`${prompt}neighbor ${nbrM[1]} remote-as ${nbrM[2]}`); continue; }
        const netM = trimmed.match(/^network\s+(\S+)(?:\s+mask\s+(\S+))?/);
        if (netM) { cmds.push(`${prompt}network ${netM[1]}` + (netM[2] ? ` mask ${netM[2]}` : '')); continue; }
        const noSyncM = trimmed.match(/^no\s+synchronization/);
        if (noSyncM) { cmds.push(`${prompt}no synchronization`); continue; }
        const logM = trimmed.match(/^bgp\s+log-neighbor-changes/);
        if (logM) { cmds.push(`${prompt}bgp log-neighbor-changes`); continue; }
      }
      cmds.push(`${prompt}exit`);
      steps.push({
        title: `配置 BGP AS ${bgp.asNumber}`,
        desc: '建立 BGP 进程，指定邻居 AS 并宣告网段',
        commands: cmds,
      });
    }

    // ---- 步骤 6：配置 RIP ----
    for (const rip of ripBlocks) {
      const cmds = [];
      cmds.push(`${host}(config)#router rip`);
      const prompt = `${host}(config-router)#`;
      const body = rip.rawBody;
      const netRe = /^\s*network\s+(\S+)/gm;
      let nm;
      while ((nm = netRe.exec(body)) !== null) {
        cmds.push(`${prompt}network ${nm[1]}`);
      }
      const verM = body.match(/^\s*version\s+(\S+)/m);
      if (verM) cmds.push(`${prompt}version ${verM[1]}`);
      cmds.push(`${prompt}exit`);
      steps.push({
        title: '配置 RIP',
        desc: '创建 RIP 进程并宣告网段',
        commands: cmds,
      });
    }

    // ---- 步骤 7：配置静态路由 ----
    if (staticRoutes.length) {
      const cmds = [];
      for (const r of staticRoutes) {
        let cmd = `${host}(config)#ip route ${r.network} ${r.mask} ${r.nextHop}`;
        if (r.extra) cmd += ` ${r.extra}`;
        cmds.push(cmd);
      }
      steps.push({
        title: '配置静态路由',
        desc: '为非直连网段配置静态路由（含默认路由）',
        commands: cmds,
      });
    }

    // ---- 步骤 8：配置 ACL ----
    for (const acl of acls) {
      const cmds = [];
      const isNamed = isNaN(Number(acl.name));
      if (isNamed) {
        cmds.push(`${host}(config)#ip access-list extended ${acl.name}`);
      } else {
        cmds.push(`${host}(config)#access-list ${acl.name} ...`);
      }
      const prompt = isNamed ? `${host}(config-ext-nacl)#` : `${host}(config)#`;
      for (const rule of acl.body) {
        const trimmed = rule.trim();
        if (!trimmed) continue;
        if (isNamed) {
          cmds.push(`${prompt}${trimmed}`);
        } else {
          cmds.push(`${prompt}access-list ${acl.name} ${trimmed}`);
        }
      }
      if (isNamed) cmds.push(`${prompt}exit`);
      steps.push({
        title: `配置 ACL ${acl.name}`,
        desc: '创建访问控制列表并添加规则',
        commands: cmds,
      });
    }

    // ---- 步骤 9：保存配置 ----
    steps.push({
      title: '退出并保存配置',
      desc: '返回特权 EXEC 模式并保存配置到 NVRAM',
      commands: [
        `${host}(config)#end`,
        `${host}#`,
        `${host}#write memory`,
        `Building configuration...`,
        `[OK]`,
      ],
    });

    return steps;
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
      let safePath = jsonPath;
      if (!jsonPath.startsWith('http') && !jsonPath.startsWith('/')) {
        try {
          safePath = decodeURIComponent(jsonPath);
        } catch (e) { /* 已是原始字符串，decode 失败则原样使用 */ }
        safePath = encodeURIComponent(safePath);
      }

      let dataPath = 'pkt';
      if (options && typeof options === 'string') {
        if (options === 'ensp') dataPath = 'ensp';
      } else if (options && options.format) {
        if (options.format === 'ensp') dataPath = 'ensp';
      }

      const url = jsonPath.startsWith('http') || jsonPath.startsWith('/')
        ? jsonPath
        : `${base}iris/data/${dataPath}/json/${safePath}.json`;

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
