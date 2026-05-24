export default {
  name: 'embedded',
  description: 'External service embedding (@[service](url) syntax)',
  type: 'inline',
  
  pattern: /@\[(\w+)\]\(([^)]+)\)/g,
  
  test(code, language) {
    return this.pattern.test(code);
  },
  
  processMatches(matches) {
    const results = [];
    for (const match of matches) {
      results.push({
        service: match[1].toLowerCase(),
        url: match[2],
        original: match[0]
      });
    }
    return results;
  },
  
  render(code, container, matches) {
    container.innerHTML = '';
    
    for (const match of matches) {
      const { service, url, original } = match;
      
      let embedCode = '';
      
      if (service === 'geojson' || service === 'topojson') {
        embedCode = this.renderGeoEmbed(service, url, original);
      } else if (service === 'twitter' || service === 'x') {
        embedCode = this.renderTwitterEmbed(url);
      } else {
        embedCode = this.createEmbedCode(service, url);
      }
      
      if (embedCode) {
        container.innerHTML += embedCode;
      }
    }
  },
  
  renderGeoEmbed(service, url, original) {
    const mapId = 'map-' + Date.now();
    return `<div id="${mapId}" class="geo-map" style="height: 400px; border-radius: 8px; overflow: hidden;" data-type="${service}" data-url="${encodeURIComponent(url)}"></div>`;
  },
  
  renderTwitterEmbed(url) {
    let embedCode = '';
    
    const tweetMatch = url.match(/twitter\.com\/\w+\/status\/(\d+)/);
    if (tweetMatch) {
      embedCode = '<blockquote class="twitter-tweet"><a href="' + url + '">Loading tweet...</a></blockquote>';
    }
    else if (url.includes('twitter.com') && (url.includes('/likes') || url.includes('/with_replies') || url.includes('/media'))) {
      embedCode = '<a class="twitter-timeline" href="' + url + '">Loading Twitter timeline...</a>';
    }
    else if (url.includes('twitter.com')) {
      const handle = url.match(/twitter\.com\/([^\/?]+)/)?.[1];
      if (handle && !url.includes('/status/')) {
        embedCode = '<a class="twitter-timeline" href="https://twitter.com/' + handle + '">Tweets by @' + handle + '</a>';
      }
    }
    
    return embedCode;
  },
  
  createEmbedCode(service, url) {
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
          return '<script src="https://gist.github.com/' + gistMatch[1] + '/' + gistMatch[2] + '.js"></script>';
        }
        return '';
        
      default:
        console.warn('Unsupported embed service:', service);
        return '';
    }
    
    return iframeBase.replace('{src}', src).replace('{height}', height);
  }
};
