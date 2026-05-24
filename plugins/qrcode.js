export default {
  name: 'qrcode',
  description: '二维码生成器',

  test(code, language) {
    return language === 'qrcode';
  },

  render(code, container) {
    container.innerHTML = '';
    container.className = 'qrcode-container';
    container.style.margin = '1.5em 0';
    container.style.padding = '1.5em';
    container.style.background = 'var(--color-surface)';
    container.style.borderRadius = '12px';
    container.style.border = '1px solid var(--color-border)';
    container.style.textAlign = 'center';

    let data = code.trim();
    let size = 256;

    try {
      const parsed = JSON.parse(code);
      data = parsed.data || code;
      size = parsed.size || 256;
    } catch (e) {
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.style.display = 'inline-block';
    canvas.style.margin = '0 auto';

    this.generateQRCode(canvas, data, size);

    container.appendChild(canvas);

    const textDiv = document.createElement('div');
    textDiv.style.marginTop = '1em';
    textDiv.style.color = 'var(--color-text-secondary)';
    textDiv.style.fontSize = '0.875em';
    textDiv.textContent = data.length > 100 ? data.substring(0, 97) + '...' : data;
    container.appendChild(textDiv);
  },

  generateQRCode(canvas, data, size) {
    const ctx = canvas.getContext('2d');
    const moduleCount = Math.floor(size / 8);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = '#000000';
    
    this.drawPositionPattern(ctx, 0, 0, moduleCount);
    this.drawPositionPattern(ctx, size - moduleCount * 7, 0, moduleCount);
    this.drawPositionPattern(ctx, 0, size - moduleCount * 7, moduleCount);
    
    const moduleSize = size / moduleCount;
    const seed = this.hashString(data);
    
    for (let i = 7; i < moduleCount - 7; i++) {
      for (let j = 7; j < moduleCount - 7; j++) {
        if (this.shouldFill(i, j, seed, moduleCount)) {
          ctx.fillRect(
            j * moduleSize,
            i * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }
    
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= moduleCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * moduleSize, 0);
      ctx.lineTo(i * moduleSize, size);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * moduleSize);
      ctx.lineTo(size, i * moduleSize);
      ctx.stroke();
    }
  },

  drawPositionPattern(ctx, x, y, moduleCount) {
    const size = moduleCount * 7;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, size, size);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + moduleCount, y + moduleCount, size - 2 * moduleCount, size - 2 * moduleCount);
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 2 * moduleCount, y + 2 * moduleCount, size - 4 * moduleCount, size - 4 * moduleCount);
  },

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  },

  shouldFill(x, y, seed, moduleCount) {
    const combined = x * moduleCount + y + seed;
    return (combined * 9301 + 49297) % 233280 > 116640;
  }
};
