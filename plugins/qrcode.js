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
    canvas.style.borderRadius = '8px';

    renderQRCode(canvas, data);
    container.appendChild(canvas);

    const textDiv = document.createElement('div');
    textDiv.style.marginTop = '1em';
    textDiv.style.color = 'var(--color-text-secondary)';
    textDiv.style.fontSize = '0.875em';
    textDiv.textContent = data.length > 100 ? data.substring(0, 97) + '...' : data;
    container.appendChild(textDiv);
  }
};

function renderQRCode(canvas, data) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  
  const modules = encodeQRCode(data);
  const moduleSize = size / modules.length;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  ctx.fillStyle = '#000000';
  for (let i = 0; i < modules.length; i++) {
    for (let j = 0; j < modules[i].length; j++) {
      if (modules[i][j]) {
        ctx.fillRect(j * moduleSize, i * moduleSize, moduleSize, moduleSize);
      }
    }
  }
}

function encodeQRCode(data) {
  const version = 1;
  const modules = [];
  const size = 21 + (version - 1) * 4;
  
  for (let i = 0; i < size; i++) {
    modules[i] = [];
    for (let j = 0; j < size; j++) {
      modules[i][j] = false;
    }
  }
  
  addPositionPatterns(modules, size);
  addTimingPatterns(modules, size);
  addData(modules, data, size);
  
  return modules;
}

function addPositionPatterns(modules, size) {
  const drawPattern = (x, y) => {
    for (let i = 0; i <= 6; i++) {
      for (let j = 0; j <= 6; j++) {
        const px = x + j;
        const py = y + i;
        if (px >= 0 && px < size && py >= 0 && py < size) {
          modules[py][px] = true;
        }
      }
    }
    
    for (let i = 1; i <= 5; i++) {
      for (let j = 1; j <= 5; j++) {
        const px = x + j;
        const py = y + i;
        if (px >= 0 && px < size && py >= 0 && py < size) {
          modules[py][px] = false;
        }
      }
    }
    
    for (let i = 2; i <= 4; i++) {
      for (let j = 2; j <= 4; j++) {
        const px = x + j;
        const py = y + i;
        if (px >= 0 && px < size && py >= 0 && py < size) {
          modules[py][px] = true;
        }
      }
    }
  };

  drawPattern(0, 0);
  drawPattern(size - 7, 0);
  drawPattern(0, size - 7);
}

function addTimingPatterns(modules, size) {
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = i % 2 === 0;
    modules[i][6] = i % 2 === 0;
  }
}

function addData(modules, data, size) {
  const binary = encodeData(data);
  let bitIndex = 0;
  
  for (let i = size - 1; i >= 0; i--) {
    const direction = (i % 2 === 0) ? 1 : -1;
    const startCol = (i % 2 === 0) ? 0 : size - 1;
    
    for (let j = startCol; j >= 0 && j < size; j += direction) {
      if (j === 6) continue;
      
      if (!modules[i][j]) {
        modules[i][j] = getBit(binary, bitIndex);
        bitIndex++;
      }
    }
  }
}

function encodeData(data) {
  const binary = [];
  
  binary.push(0,1,0,0);
  
  const length = data.length;
  for (let i = 7; i >= 0; i--) {
    binary.push((length >> i) & 1);
  }
  
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    for (let j = 7; j >= 0; j--) {
      binary.push((code >> j) & 1);
    }
  }
  
  while (binary.length % 8 !== 0) {
    binary.push(0);
  }
  
  const padCode1 = [1,1,0,1,1,0,0,0];
  const padCode2 = [0,0,0,1,1,0,1,1];
  
  while (binary.length < 236) {
    binary.push(...(binary.length % 16 < 8 ? padCode1 : padCode2));
  }
  
  return binary;
}

function getBit(binary, index) {
  if (index >= binary.length) {
    return (index + 1) % 2 === 0;
  }
  return binary[index] === 1;
}
