(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  
  const pluginRegistry = new Map();
  
  function registerPlugin(plugin) {
    if (!plugin.name) {
      console.error('Plugin must have a name property');
      return false;
    }
    
    if (typeof plugin.test !== 'function') {
      console.error(`Plugin ${plugin.name} must have a test function`);
      return false;
    }
    
    if (typeof plugin.render !== 'function') {
      console.error(`Plugin ${plugin.name} must have a render function`);
      return false;
    }
    
    pluginRegistry.set(plugin.name, plugin);
    console.log(`Plugin registered: ${plugin.name}`);
    return true;
  }
  
  function unregisterPlugin(name) {
    return pluginRegistry.delete(name);
  }
  
  function getPlugin(name) {
    return pluginRegistry.get(name);
  }
  
  function getAllPlugins() {
    return Array.from(pluginRegistry.values());
  }
  
  function findPlugin(code, language) {
    for (const plugin of pluginRegistry.values()) {
      try {
        if (plugin.test(code, language)) {
          return plugin;
        }
      } catch (e) {
        console.error(`Plugin ${plugin.name} test error:`, e);
      }
    }
    return null;
  }
  
  async function loadPlugin(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load plugin: ${response.status}`);
      }
      
      const code = await response.text();
      const blob = new Blob([code], { type: 'application/javascript' });
      const moduleUrl = URL.createObjectURL(blob);
      
      const module = await import(moduleUrl);
      const plugin = module.default || module;
      
      registerPlugin(plugin);
      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin from ${url}:`, error);
      return null;
    }
  }
  
  async function loadPluginsFromManifest(manifestUrl) {
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status}`);
      }
      
      const manifest = await response.json();
      const loadPromises = manifest.plugins.map(plugin => loadPlugin(plugin.path));
      
      await Promise.allSettled(loadPromises);
      console.log(`Loaded ${pluginRegistry.size} plugins`);
    } catch (error) {
      console.error('Failed to load plugins from manifest:', error);
    }
  }
  
  async function autoLoadPlugins() {
    try {
      const response = await fetch('plugins/manifest.json');
      if (response.ok) {
        await loadPluginsFromManifest('plugins/manifest.json');
      } else {
        console.warn('No plugin manifest found, loading plugins individually');
        await loadAllPluginsFromDirectory();
      }
    } catch (error) {
      console.warn('Auto plugin loading skipped:', error.message);
    }
  }
  
  async function loadAllPluginsFromDirectory() {
    try {
      const response = await fetch('plugins/');
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = doc.querySelectorAll('a[href$=".js"]');
      
      const loadPromises = [];
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('manifest.json')) {
          loadPromises.push(loadPlugin(href));
        }
      });
      
      if (loadPromises.length > 0) {
        await Promise.allSettled(loadPromises);
      }
    } catch (error) {
      console.warn('Directory listing not available, using manifest:', error.message);
    }
  }
  
  window.MarkdownPreview.plugins = {
    register: registerPlugin,
    unregister: unregisterPlugin,
    get: getPlugin,
    getAll: getAllPlugins,
    find: findPlugin,
    load: loadPlugin,
    loadManifest: loadPluginsFromManifest,
    autoLoad: autoLoadPlugins,
    _registry: pluginRegistry
  };
})();
