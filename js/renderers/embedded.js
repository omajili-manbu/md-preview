(function() {
  window.MarkdownPreview = window.MarkdownPreview || {};
  window.MarkdownPreview.renderers = window.MarkdownPreview.renderers || {};
  
  const { dom } = window.MarkdownPreview;
  
  function render() {
    const content = dom.markdownContent.innerHTML;
    let processedContent = content;
    
    // 支持的嵌入语言类型
    const embedLanguages = ['embed', 'geojson', 'topojson', 'twitter', 'x'];
    
    // 处理代码块中的 @[...] 语法（仅当语言类型匹配时）
    const preTags = processedContent.match(/<pre[^>]*>[\s\S]*?<\/pre>/gi) || [];
    const prePlaceholders = [];
    
    preTags.forEach((pre, idx) => {
      const placeholder = `__PRE_PLACEHOLDER_${idx}__`;
      prePlaceholders.push({ placeholder, content: pre });
      processedContent = processedContent.replace(pre, placeholder);
    });
    
    // 在非代码块区域渲染 @[...]
    const embedRegex = /@\[(\w+)\]\(([^)]+)\)/g;
    let match;
    while ((match = embedRegex.exec(processedContent)) !== null) {
      const service = match[1].toLowerCase();
      const url = match[2];
      
      if (service === 'geojson' || service === 'topojson') {
        window.MarkdownPreview.renderers.geo.renderGeoData(service, url, match[0]);
      } else if (service === 'twitter' || service === 'x') {
        renderTwitterEmbed(service, url, match[0]);
      } else {
        const iframe = createEmbedIframe(service, url);
        if (iframe) {
          processedContent = processedContent.replace(match[0], iframe);
        }
      }
    }
    
    // 恢复代码块，并根据语言类型处理
    prePlaceholders.forEach(({ placeholder, content }) => {
      let shouldRender = false;
      let detectedLanguage = '';
      
      for (const lang of embedLanguages) {
        if (content.includes(`language-${lang}`)) {
          shouldRender = true;
          detectedLanguage = lang;
          break;
        }
      }
      
      if (shouldRender) {
        let newContent = content;
        const innerEmbedRegex = /@\[(\w+)\]\(([^)]+)\)/g;
        let innerMatch;
        while ((innerMatch = innerEmbedRegex.exec(newContent)) !== null) {
          const service = innerMatch[1].toLowerCase();
          const url = innerMatch[2];
          
          if (service === 'geojson' || service === 'topojson') {
            const mapId = 'map-' + Date.now();
            const container = `<div id="${mapId}" class="geo-map" style="height:400px;border-radius:8px;overflow:hidden"></div>`;
            newContent = newContent.replace(innerMatch[0], container);
            
            setTimeout(() => {
              window.MarkdownPreview.renderers.geo.renderGeoData(service, url, innerMatch[0]);
            }, 10);
          } else if (service === 'twitter' || service === 'x') {
            renderTwitterEmbed(service, url, innerMatch[0]);
          } else {
            const iframe = createEmbedIframe(service, url);
            if (iframe) {
              newContent = newContent.replace(innerMatch[0], iframe);
            }
          }
        }
        processedContent = processedContent.replace(placeholder, newContent);
      } else {
        processedContent = processedContent.replace(placeholder, content);
      }
    });
    
    // 更新 DOM
    dom.markdownContent.innerHTML = processedContent;
  }
  
  function renderTwitterEmbed(service, url, originalMatch) {
    try {
      let embedCode = '';
      
      // 推文嵌入
      const tweetMatch = url.match(/twitter\.com\/\w+\/status\/(\d+)/);
      if (tweetMatch) {
        embedCode = '<blockquote class="twitter-tweet"><a href="' + url + '">Loading tweet...</a></blockquote>';
      }
      // 时间线嵌入
      else if (url.includes('twitter.com') && (url.includes('/likes') || url.includes('/with_replies') || url.includes('/media') || url.includes('/ Follow'))) {
        embedCode = '<a class="twitter-timeline" href="' + url + '">Loading Twitter timeline...</a>';
      }
      // 简单时间线
      else if (url.includes('twitter.com')) {
        const handle = url.match(/twitter\.com\/([^\/?]+)/)?.[1];
        if (handle && !url.includes('/status/')) {
          embedCode = '<a class="twitter-timeline" href="https://twitter.com/' + handle + '?ref_src=twsrc%5Etfw">Tweets by @' + handle + '</a>';
        }
      }
      
      if (embedCode) {
        processedContent = processedContent.replace(originalMatch, embedCode);
        
        // 异步加载 Twitter widgets
        if (typeof twttr !== 'undefined' && twttr.widgets) {
          twttr.widgets.load();
        } else {
          // 如果 twttr 还未加载，等待加载
          const checkTwitter = setInterval(() => {
            if (typeof twttr !== 'undefined' && twttr.widgets) {
              twttr.widgets.load();
              clearInterval(checkTwitter);
            }
          }, 100);
          // 最多等待 5 秒
          setTimeout(() => clearInterval(checkTwitter), 5000);
        }
      }
    } catch (error) {
      console.error('Twitter embed error:', error);
    }
  }
  
  function createEmbedIframe(service, url) {
    const iframeBase = '<iframe src="{src}" width="100%" height="{height}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>';
    
    let src = '';
    let height = '400';
    
    switch (service) {
      case 'youtube':
        const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/)?.[1] || url;
        src = 'https://www.youtube.com/embed/' + videoId;
        height = '315';
        break;
        
      case 'bilibili':
        const bvid = url.match(/BV[\w]+/)?.[0] || url;
        src = 'https://player.bilibili.com/player.html?bvid=' + bvid + '&page=1';
        height = '315';
        break;
        
      case 'vimeo':
        const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1] || url;
        src = 'https://player.vimeo.com/video/' + vimeoId;
        height = '315';
        break;
        
      case 'figma':
        const figmaId = url.match(/figma\.com\/file\/([^\/?]+)/)?.[1] || url;
        src = 'https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/file/' + figmaId;
        height = '400';
        break;
        
      case 'codepen':
        const codepenMatch = url.match(/codepen\.io\/([^\/]+)\/pen\/([^\/?]+)/);
        if (codepenMatch) {
          src = 'https://codepen.io/' + codepenMatch[1] + '/embed/' + codepenMatch[2];
        } else {
          src = url + '/embed';
        }
        height = '300';
        break;
        
      case 'jsfiddle':
        const fiddleId = url.match(/jsfiddle\.net\/([^\/?]+)/)?.[1] || url;
        src = 'https://jsfiddle.net/' + fiddleId + '/embedded/';
        height = '300';
        break;
        
      case 'stackblitz':
        src = url + '/embed';
        height = '500';
        break;
        
      case 'replit':
        const replitMatch = url.match(/replit\.com\/@([^\/]+)\/([^\/?]+)/);
        if (replitMatch) {
          src = 'https://replit.com/embed/' + replitMatch[1] + '/' + replitMatch[2];
        } else {
          src = url + '/embed';
        }
        height = '400';
        break;
        
      case 'googlemaps':
        src = url;
        height = '300';
        break;
        
      case 'openstreetmap':
        src = url;
        height = '300';
        break;
        
      case 'googledocs':
        src = url;
        height = '400';
        break;
        
      case 'gist':
        const gistMatch = url.match(/gist\.github\.com\/([^\/]+)\/([^\/?]+)/);
        if (gistMatch) {
          src = 'https://gist.github.com/' + gistMatch[1] + '/' + gistMatch[2] + '.js';
          return '<script src="' + src + '"></script>';
        }
        return null;
        
      default:
        console.warn('Unsupported embed service:', service);
        return null;
    }
    
    return iframeBase.replace('{src}', src).replace('{height}', height);
  }
  
  window.MarkdownPreview.renderers.embedded = {
    render,
    renderTwitterEmbed,
    createEmbedIframe
  };
})();
