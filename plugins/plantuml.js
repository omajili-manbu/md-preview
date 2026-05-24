export default {
  name: 'plantuml',
  description: 'PlantUML diagram rendering',
  
  test(code, language) {
    return language === 'plantuml';
  },
  
  encode64(data) {
    let r = '';
    for (let i = 0; i < data.length; i += 3) {
      if (i + 2 === data.length) {
        r += this.append3bytes(data[i], data[i + 1], 0);
      } else if (i + 1 === data.length) {
        r += this.append3bytes(data[i], 0, 0);
      } else {
        r += this.append3bytes(data[i], data[i + 1], data[i + 2]);
      }
    }
    return r;
  },
  
  append3bytes(b1, b2, b3) {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3F;
    return this.encode6bit(c1 & 0x3F) + this.encode6bit(c2 & 0x3F) + this.encode6bit(c3 & 0x3F) + this.encode6bit(c4 & 0x3F);
  },
  
  encode6bit(b) {
    if (b < 10) {
      return String.fromCharCode(48 + b);
    }
    b -= 10;
    if (b < 26) {
      return String.fromCharCode(65 + b);
    }
    b -= 26;
    if (b < 26) {
      return String.fromCharCode(97 + b);
    }
    b -= 26;
    if (b === 0) {
      return '-';
    }
    if (b === 1) {
      return '_';
    }
    return '?';
  },
  
  render(code, container) {
    if (typeof pako === 'undefined') {
      throw new Error('Pako library is not loaded');
    }
    
    const encoder = new TextEncoder();
    const utf8 = encoder.encode(code);
    const compressed = pako.deflateRaw(utf8);
    const encoded = this.encode64(compressed);
    
    const div = document.createElement('div');
    div.className = 'plantuml-diagram';
    div.innerHTML = `<img src="https://www.plantuml.com/plantuml/svg/${encoded}" alt="PlantUML 图" loading="lazy">`;
    
    container.innerHTML = '';
    container.appendChild(div);
  }
};
